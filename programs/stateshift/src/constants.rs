// PDA Seeds
pub const CONFIG_SEED: &[u8] = b"config";
pub const ORG_SEED: &[u8] = b"org";
pub const ROLE_SEED: &[u8] = b"role";
pub const MEMBER_SEED: &[u8] = b"member";

// Permission bitmask flags
pub const PERM_READ: u16 = 1 << 0;
pub const PERM_WRITE: u16 = 1 << 1;
pub const PERM_DELETE: u16 = 1 << 2;
pub const PERM_MANAGE_ROLES: u16 = 1 << 3;
pub const PERM_MANAGE_MEMBERS: u16 = 1 << 4;
pub const PERM_TRANSFER: u16 = 1 << 5;
pub const PERM_ADMIN: u16 = 0xFFFF;

// Limits
pub const MAX_ORG_NAME_LEN: usize = 32;
pub const MAX_ROLE_NAME_LEN: usize = 32;
pub const MAX_ROLES_PER_ORG: u8 = 20;
