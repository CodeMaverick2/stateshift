use anchor_lang::prelude::*;

/// Custom error codes for the StateShift RBAC program.
#[error_code]
pub enum StateShiftError {
    #[msg("Organization name exceeds maximum length of 32 characters")]
    OrgNameTooLong,
    #[msg("Role name exceeds maximum length of 32 characters")]
    RoleNameTooLong,
    #[msg("Maximum number of roles per organization reached")]
    MaxRolesReached,
    #[msg("Unauthorized: caller does not have the required permission")]
    Unauthorized,
    #[msg("Organization is not active")]
    OrgNotActive,
    #[msg("Member is not active")]
    MemberNotActive,
    #[msg("Cannot close role with active members")]
    RoleHasMembers,
    #[msg("Invalid permissions bitmask — must be non-zero")]
    InvalidPermissions,
    #[msg("Arithmetic overflow")]
    Overflow,
}
