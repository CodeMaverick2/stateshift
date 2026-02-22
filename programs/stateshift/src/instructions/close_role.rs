use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role};

#[derive(Accounts)]
pub struct CloseRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [ORG_SEED, organization.org_id.to_le_bytes().as_ref()],
        bump = organization.bump,
        has_one = admin @ StateShiftError::Unauthorized,
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        mut,
        close = admin,
        seeds = [ROLE_SEED, organization.key().as_ref(), role.name.as_bytes()],
        bump = role.bump,
        constraint = role.org == organization.key(),
        constraint = role.member_count == 0 @ StateShiftError::RoleHasMembers,
    )]
    pub role: Account<'info, Role>,
}

pub fn handler(ctx: Context<CloseRole>) -> Result<()> {
    let org = &mut ctx.accounts.organization;
    org.role_count = org.role_count.checked_sub(1).ok_or(StateShiftError::Overflow)?;

    msg!("Role closed in org '{}'", org.name);
    Ok(())
}
