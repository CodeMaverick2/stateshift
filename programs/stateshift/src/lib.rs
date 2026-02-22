use anchor_lang::prelude::*;

//! StateShift: On-chain Role-Based Access Control (RBAC) for Solana.
//!
//! Implements a hierarchical permission model with organizations, roles,
//! and members stored as PDAs. Uses a composable bitmask for permissions
//! and Anchor constraints for trustless authorization.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb");

#[program]
pub mod stateshift {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn create_organization(
        ctx: Context<CreateOrganization>,
        name: String,
        admin: Pubkey,
    ) -> Result<()> {
        instructions::create_organization::handler(ctx, name, admin)
    }

    pub fn create_role(
        ctx: Context<CreateRole>,
        role_name: String,
        permissions: u16,
    ) -> Result<()> {
        instructions::create_role::handler(ctx, role_name, permissions)
    }

    pub fn assign_role(ctx: Context<AssignRole>) -> Result<()> {
        instructions::assign_role::handler(ctx)
    }

    pub fn revoke_role(ctx: Context<RevokeRole>) -> Result<()> {
        instructions::revoke_role::handler(ctx)
    }

    pub fn update_role_permissions(
        ctx: Context<UpdateRolePermissions>,
        new_permissions: u16,
    ) -> Result<()> {
        instructions::update_role_permissions::handler(ctx, new_permissions)
    }

    pub fn protected_action(
        ctx: Context<ProtectedAction>,
        required_permission: u16,
    ) -> Result<()> {
        instructions::protected_action::handler(ctx, required_permission)
    }

    pub fn transfer_org_admin(
        ctx: Context<TransferOrgAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        instructions::transfer_org_admin::handler(ctx, new_admin)
    }

    pub fn deactivate_organization(ctx: Context<DeactivateOrganization>) -> Result<()> {
        instructions::deactivate_organization::handler(ctx)
    }

    pub fn close_role(ctx: Context<CloseRole>) -> Result<()> {
        instructions::close_role::handler(ctx)
    }
}
