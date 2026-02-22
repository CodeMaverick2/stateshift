use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role};

#[derive(Accounts)]
#[instruction(role_name: String)]
pub struct CreateRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [ORG_SEED, organization.org_id.to_le_bytes().as_ref()],
        bump = organization.bump,
        has_one = admin @ StateShiftError::Unauthorized,
        constraint = organization.is_active @ StateShiftError::OrgNotActive,
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        init,
        payer = admin,
        space = 8 + Role::INIT_SPACE,
        seeds = [ROLE_SEED, organization.key().as_ref(), role_name.as_bytes()],
        bump,
    )]
    pub role: Account<'info, Role>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateRole>, role_name: String, permissions: u16) -> Result<()> {
    require!(role_name.len() <= MAX_ROLE_NAME_LEN, StateShiftError::RoleNameTooLong);
    require!(permissions != 0, StateShiftError::InvalidPermissions);
    require!(ctx.accounts.organization.role_count < MAX_ROLES_PER_ORG, StateShiftError::MaxRolesReached);

    let org = &mut ctx.accounts.organization;
    let role = &mut ctx.accounts.role;

    role.org = org.key();
    role.name = role_name.clone();
    role.permissions = permissions;
    role.member_count = 0;
    role.bump = ctx.bumps.role;

    org.role_count = org.role_count.checked_add(1).ok_or(StateShiftError::Overflow)?;

    msg!("Role '{}' created with permissions {:#06x}", role_name, permissions);
    Ok(())
}
