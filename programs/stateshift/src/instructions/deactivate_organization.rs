use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Config, Organization};

#[derive(Accounts)]
pub struct DeactivateOrganization<'info> {
    pub super_admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = super_admin @ StateShiftError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [ORG_SEED, organization.org_id.to_le_bytes().as_ref()],
        bump = organization.bump,
        constraint = organization.is_active @ StateShiftError::OrgNotActive,
    )]
    pub organization: Account<'info, Organization>,
}

pub fn handler(ctx: Context<DeactivateOrganization>) -> Result<()> {
    let org = &mut ctx.accounts.organization;
    org.is_active = false;

    msg!("Organization '{}' (id: {}) deactivated", org.name, org.org_id);
    Ok(())
}
