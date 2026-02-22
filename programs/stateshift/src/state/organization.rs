use anchor_lang::prelude::*;

/// A single organization in the RBAC hierarchy, with its own admin, roles, and members.
/// PDA: `["org", org_id.to_le_bytes()]`
#[account]
#[derive(InitSpace)]
pub struct Organization {
    pub admin: Pubkey,
    pub org_id: u64,
    #[max_len(32)]
    pub name: String,
    pub role_count: u8,
    pub member_count: u16,
    pub is_active: bool,
    pub bump: u8,
}
