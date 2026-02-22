use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Config, Organization};

#[derive(Accounts)]
pub struct CreateOrganization<'info> {
    #[account(mut)]
    pub super_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = super_admin @ StateShiftError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = super_admin,
        space = 8 + Organization::INIT_SPACE,
        seeds = [ORG_SEED, config.org_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub organization: Account<'info, Organization>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateOrganization>, name: String, admin: Pubkey) -> Result<()> {
    require!(name.len() <= MAX_ORG_NAME_LEN, StateShiftError::OrgNameTooLong);

    let config = &mut ctx.accounts.config;
    let org = &mut ctx.accounts.organization;

    org.admin = admin;
    org.org_id = config.org_count;
    org.name = name.clone();
    org.role_count = 0;
    org.member_count = 0;
    org.is_active = true;
    org.bump = ctx.bumps.organization;

    config.org_count = config.org_count.checked_add(1).ok_or(StateShiftError::Overflow)?;

    msg!("Organization '{}' created with id {} and admin {}", name, org.org_id, admin);
    Ok(())
}
