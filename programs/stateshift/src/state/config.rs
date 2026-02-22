use anchor_lang::prelude::*;

/// Global singleton — stores the super admin and organization counter.
/// PDA: `["config"]`
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub super_admin: Pubkey,
    pub org_count: u64,
    pub bump: u8,
}
