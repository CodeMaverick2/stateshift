use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::StateShiftError;
use crate::state::{Organization, Role, MemberRole};

#[derive(Accounts)]
pub struct AssignRole<'info> {
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

    /// CHECK: The user wallet receiving the role assignment — only the pubkey is needed.
    pub user: AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + MemberRole::INIT_SPACE,
        seeds = [MEMBER_SEED, organization.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub member_role: Account<'info, MemberRole>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AssignRole>) -> Result<()> {
    let member = &mut ctx.accounts.member_role;
    let role = &mut ctx.accounts.role;
    let org = &mut ctx.accounts.organization;

    member.user = ctx.accounts.user.key();
    member.org = org.key();
    member.role = role.key();
    member.is_active = true;
    member.assigned_at = Clock::get()?.unix_timestamp;
    member.assigned_by = ctx.accounts.admin.key();
    member.bump = ctx.bumps.member_role;

    role.member_count = role.member_count.checked_add(1).ok_or(StateShiftError::Overflow)?;
    org.member_count = org.member_count.checked_add(1).ok_or(StateShiftError::Overflow)?;

    msg!(
        "Assigned role '{}' to user {} in org '{}'",
        role.name,
        member.user,
        org.name,
    );
    Ok(())
}
