#!/bin/bash
# =============================================================================
# StateShift RBAC Demo — Full lifecycle on Solana Devnet
# =============================================================================
# This script demonstrates the complete RBAC lifecycle using the CLI client.
# Prerequisites: npm install && npm run build (in cli/ directory)
# Usage: bash demo.sh [--cluster localnet]
# =============================================================================

set -e

CLUSTER="${1:---cluster devnet}"
CLI="npx ts-node src/index.ts"
cd "$(dirname "$0")/cli"

echo "=========================================="
echo "  StateShift RBAC Demo"
echo "  Cluster: $CLUSTER"
echo "=========================================="
echo ""

# Step 1: Initialize the RBAC system
echo "--- Step 1: Initialize RBAC Config ---"
$CLI init $CLUSTER || echo "(Already initialized — skipping)"
echo ""

# Step 2: Create an organization
echo "--- Step 2: Create Organization ---"
$CLI create-org "Demo Corp" $CLUSTER || echo "(May already exist — skipping)"
echo ""

# Step 3: Create roles with different permission levels
echo "--- Step 3: Create Roles ---"
echo "[Creating admin role with full permissions]"
$CLI create-role 0 admin "admin" $CLUSTER || echo "(May already exist)"
echo ""
echo "[Creating editor role with read+write+delete]"
$CLI create-role 0 editor "read,write,delete" $CLUSTER || echo "(May already exist)"
echo ""
echo "[Creating viewer role with read-only]"
$CLI create-role 0 viewer "read" $CLUSTER || echo "(May already exist)"
echo ""

# Step 4: Show system info
echo "--- Step 4: System Info ---"
$CLI info $CLUSTER
echo ""

# Step 5: Assign editor role to our own wallet (for demo)
WALLET=$(solana address 2>/dev/null || echo "")
if [ -n "$WALLET" ]; then
  echo "--- Step 5: Assign Editor Role ---"
  echo "Assigning editor role to wallet: $WALLET"
  $CLI assign-role 0 editor "$WALLET" $CLUSTER || echo "(May already be assigned)"
  echo ""

  # Step 6: Check role
  echo "--- Step 6: Check Role ---"
  $CLI check-role 0 "$WALLET" $CLUSTER
  echo ""

  # Step 7: Test protected actions
  echo "--- Step 7: Protected Actions ---"
  echo "[Testing READ permission (should succeed)]"
  $CLI protected-action 0 read $CLUSTER
  echo ""
  echo "[Testing WRITE permission (should succeed — editor has write)]"
  $CLI protected-action 0 write $CLUSTER
  echo ""
  echo "[Testing MANAGE_MEMBERS permission (should FAIL — editor lacks this)]"
  $CLI protected-action 0 manage_members $CLUSTER 2>&1 || true
  echo ""

  # Step 8: Update role permissions
  echo "--- Step 8: Update Viewer Permissions ---"
  $CLI update-role-permissions 0 viewer "read,write" $CLUSTER || echo "(Skipped)"
  echo ""
fi

echo "=========================================="
echo "  Demo Complete!"
echo "  Program ID: 4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb"
echo "  Explorer: https://explorer.solana.com/address/4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb?cluster=devnet"
echo "=========================================="
