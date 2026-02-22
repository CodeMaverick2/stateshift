use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role, MemberRole};

#[derive(Accounts)]
#[instruction(required_permission: u16)]
pub struct ProtectedAction<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [ORG_SEED, organization.org_id.to_le_bytes().as_ref()],
        bump = organization.bump,
        constraint = organization.is_active @ StateShiftError::OrgNotActive,
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        seeds = [MEMBER_SEED, organization.key().as_ref(), caller.key().as_ref()],
        bump = member_role.bump,
        constraint = member_role.org == organization.key(),
        constraint = member_role.user == caller.key(),
        constraint = member_role.is_active @ StateShiftError::MemberNotActive,
    )]
    pub member_role: Account<'info, MemberRole>,

    #[account(
        seeds = [ROLE_SEED, organization.key().as_ref(), role.name.as_bytes()],
        bump = role.bump,
        constraint = role.org == organization.key(),
        constraint = member_role.role == role.key(),
    )]
    pub role: Account<'info, Role>,
}

pub fn handler(ctx: Context<ProtectedAction>, required_permission: u16) -> Result<()> {
    let role = &ctx.accounts.role;
    let caller = &ctx.accounts.caller;

    // Check if the user's role has the required permission
    require!(
        role.permissions & required_permission == required_permission,
        StateShiftError::Unauthorized
    );

    msg!(
        "Protected action executed by {} with role '{}' (permissions: {:#06x}, required: {:#06x})",
        caller.key(),
        role.name,
        role.permissions,
        required_permission,
    );
    Ok(())
}
