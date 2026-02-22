use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::Organization;

#[derive(Accounts)]
pub struct TransferOrgAdmin<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [ORG_SEED, organization.org_id.to_le_bytes().as_ref()],
        bump = organization.bump,
        has_one = admin @ StateShiftError::Unauthorized,
        constraint = organization.is_active @ StateShiftError::OrgNotActive,
    )]
    pub organization: Account<'info, Organization>,
}

pub fn handler(ctx: Context<TransferOrgAdmin>, new_admin: Pubkey) -> Result<()> {
    let org = &mut ctx.accounts.organization;
    let old_admin = org.admin;
    org.admin = new_admin;

    msg!(
        "Org '{}' admin transferred: {} -> {}",
        org.name,
        old_admin,
        new_admin,
    );
    Ok(())
}
