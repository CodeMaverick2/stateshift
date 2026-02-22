use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role, MemberRole};

#[derive(Accounts)]
pub struct RevokeRole<'info> {
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
        mut,
        seeds = [ROLE_SEED, organization.key().as_ref(), role.name.as_bytes()],
        bump = role.bump,
        constraint = role.org == organization.key(),
    )]
    pub role: Account<'info, Role>,

    /// CHECK: The user wallet whose role is being revoked — only the pubkey is needed.
    pub user: AccountInfo<'info>,

    #[account(
        mut,
        close = admin,
        seeds = [MEMBER_SEED, organization.key().as_ref(), user.key().as_ref()],
        bump = member_role.bump,
        constraint = member_role.org == organization.key(),
        constraint = member_role.role == role.key(),
    )]
    pub member_role: Account<'info, MemberRole>,
}

pub fn handler(ctx: Context<RevokeRole>) -> Result<()> {
    let role = &mut ctx.accounts.role;
    let org = &mut ctx.accounts.organization;

    role.member_count = role.member_count.checked_sub(1).ok_or(StateShiftError::Overflow)?;
    org.member_count = org.member_count.checked_sub(1).ok_or(StateShiftError::Overflow)?;

    msg!(
        "Revoked role '{}' from user {} in org '{}'",
        role.name,
        ctx.accounts.user.key(),
        org.name,
    );
    Ok(())
}
