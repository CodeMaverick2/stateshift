use anchor_lang::prelude::*;

/// A named role within an organization, carrying a composable permission bitmask.
/// PDA: `["role", org_pubkey, role_name]`
#[account]
#[derive(InitSpace)]
pub struct Role {
    pub org: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub permissions: u16,
    pub member_count: u16,
    pub bump: u8,
}
