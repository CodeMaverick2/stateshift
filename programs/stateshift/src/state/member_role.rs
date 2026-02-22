use anchor_lang::prelude::*;

/// Links a user wallet to a role within an organization (one per user per org).
/// PDA: `["member", org_pubkey, user_pubkey]`
#[account]
#[derive(InitSpace)]
pub struct MemberRole {
    pub user: Pubkey,
    pub org: Pubkey,
    pub role: Pubkey,
    pub is_active: bool,
    pub assigned_at: i64,
    pub assigned_by: Pubkey,
    pub bump: u8,
}
