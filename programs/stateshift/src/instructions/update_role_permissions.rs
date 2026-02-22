use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role};

#[derive(Accounts)]
pub struct UpdateRolePermissions<'info> {
    pub admin: Signer<'info>,

    #[account(
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
}

pub fn handler(ctx: Context<UpdateRolePermissions>, new_permissions: u16) -> Result<()> {
    require!(new_permissions != 0, StateShiftError::InvalidPermissions);

    let role = &mut ctx.accounts.role;
    let old_permissions = role.permissions;
    role.permissions = new_permissions;

    msg!(
        "Updated role '{}' permissions: {:#06x} -> {:#06x}",
        role.name,
        old_permissions,
        new_permissions,
    );
    Ok(())
}
