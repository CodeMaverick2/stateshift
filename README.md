# StateShift: On-Chain RBAC System

> A traditional Role-Based Access Control (RBAC) backend system rebuilt as a Solana on-chain program in Rust using the Anchor framework.

## What This Demonstrates

This project takes a familiar Web2 backend pattern — **Role-Based Access Control (RBAC)** — and rebuilds it as a Solana program to show that Solana can serve as a **distributed state-machine backend**, not just a crypto tool.

Every backend developer knows RBAC: users, roles, permissions, middleware guards. This project maps those concepts directly to Solana's account model, making the paradigm shift concrete and understandable.

**Two clients included**: a CLI for scripting and a React dashboard for visual interaction. Both connect to the same on-chain program on Devnet.

---

## How RBAC Works in Web2

In a traditional backend, RBAC uses a **relational database** and **middleware**:

```
┌─────────────────────────────────────────────────┐
│                 Web2 RBAC Stack                  │
├─────────────────────────────────────────────────┤
│  Client Request (HTTP + JWT token)               │
│       ↓                                          │
│  Auth Middleware (validate JWT, extract user)     │
│       ↓                                          │
│  RBAC Middleware (SELECT roles FROM user_roles)   │
│       ↓                                          │
│  Route Handler (if authorized, run logic)        │
│       ↓                                          │
│  PostgreSQL Database                             │
│    ├── users (id, email, password_hash)          │
│    ├── roles (id, name, permissions_bitmask)     │
│    └── user_roles (user_id, role_id, granted_by) │
└─────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Centralized store**: All state lives in a single database
- **Middleware chain**: Permission checks happen in application code before route handlers
- **SQL queries**: Role lookups are `SELECT * FROM user_roles WHERE user_id = ? AND org_id = ?`
- **Mutable by admin**: A DB admin can directly modify any row
- **Single point of failure**: If the database goes down, access control fails

---

## How RBAC Works on Solana (StateShift)

On Solana, we replace the database with **Program Derived Addresses (PDAs)** and middleware with **Anchor account constraints**:

```
┌──────────────────────────────────────────────────────────┐
│              On-Chain RBAC (StateShift)                   │
├──────────────────────────────────────────────────────────┤
│  Client Transaction (signed by wallet keypair)            │
│       ↓                                                   │
│  Solana Runtime (cryptographic signature verification)    │
│       ↓                                                   │
│  Anchor Account Validation                                │
│    ├── PDA derivation = "role lookup"                      │
│    ├── has_one constraint = "ownership check"              │
│    ├── Signer<'info> = "authentication"                    │
│    └── constraint = "business rule enforcement"            │
│       ↓                                                   │
│  Instruction Handler (business logic)                     │
│       ↓                                                   │
│  On-Chain Accounts (PDAs)                                 │
│    ├── Config PDA [seed: "config"]                         │
│    │   └── { super_admin, org_count }                      │
│    ├── Organization PDA [seed: "org", org_id]              │
│    │   └── { admin, name, role_count, member_count }       │
│    ├── Role PDA [seed: "role", org, role_name]             │
│    │   └── { permissions_bitmask, member_count }           │
│    └── MemberRole PDA [seed: "member", org, user]          │
│        └── { user, role, is_active, assigned_at }          │
└──────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Decentralized store**: State is distributed across the Solana network
- **Compile-time + runtime validation**: Anchor constraints enforce access rules before any logic runs
- **Deterministic addresses**: PDA derivation replaces SQL lookups — the "query" is computing the address from seeds
- **Trustless mutations**: All changes go through program instructions — no "backdoor" DB access
- **High availability**: The Solana network is decentralized and fault-tolerant

---

## Tradeoffs & Constraints

| Aspect | Web2 (PostgreSQL + Express) | Solana (StateShift) |
|--------|---------------------------|---------------------|
| **State storage** | Database rows (cheap, unlimited) | PDA accounts (rent-exempt deposit ~0.002 SOL each) |
| **Authentication** | JWT/session tokens (revocable) | Ed25519 signatures (cryptographic, non-revocable keys) |
| **Authorization check** | Middleware + DB query (~1ms) | Account constraint validation (~0.4s block time) |
| **Role lookup** | `SELECT * FROM user_roles WHERE ...` | PDA derivation: `sha256("member" + org + user)` |
| **Data modification** | `UPDATE roles SET ... WHERE ...` | Submit transaction, pay fee, wait for confirmation |
| **Availability** | Single server (can fail) | 1000+ validators globally |
| **Audit trail** | Application-level logging (can be deleted) | Every transaction is permanently on-chain |
| **Admin override** | Direct DB access possible | Must go through program instructions |
| **Cost model** | Server hosting ($20-200/mo) | Per-transaction fee (~$0.00025) + storage rent |
| **Scalability** | Vertical/horizontal sharding | Parallel execution by account |
| **Data privacy** | Private by default | Public by default (all state readable) |
| **Latency** | ~1-10ms | ~400ms (block time) |
| **Schema changes** | ALTER TABLE (easy) | Program upgrade (requires redeploy) |

### When On-Chain RBAC Makes Sense
- Trustless multi-party organizations (DAOs)
- Auditable access control (compliance, governance)
- Cross-application permission sharing
- Permissionless composability (other programs can verify roles)

### When Traditional RBAC Is Better
- Private/sensitive role data
- Sub-millisecond authorization checks
- Frequent role changes (cost per transaction)
- Complex query patterns (JOINs, aggregations)

---

## Account Model

```
Config (1 per program)
├── super_admin: Pubkey     [32 bytes]
├── org_count: u64          [8 bytes]
└── bump: u8                [1 byte]
    PDA: ["config"]

Organization (1 per org)
├── admin: Pubkey           [32 bytes]
├── org_id: u64             [8 bytes]
├── name: String(32)        [36 bytes]
├── role_count: u8          [1 byte]
├── member_count: u16       [2 bytes]
├── is_active: bool         [1 byte]
└── bump: u8                [1 byte]
    PDA: ["org", org_id.to_le_bytes()]

Role (N per org, max 20)
├── org: Pubkey             [32 bytes]
├── name: String(32)        [36 bytes]
├── permissions: u16        [2 bytes]  ← bitmask
├── member_count: u16       [2 bytes]
└── bump: u8                [1 byte]
    PDA: ["role", org_pubkey, role_name]

MemberRole (1 per user per org)
├── user: Pubkey            [32 bytes]
├── org: Pubkey             [32 bytes]
├── role: Pubkey            [32 bytes]
├── is_active: bool         [1 byte]
├── assigned_at: i64        [8 bytes]
├── assigned_by: Pubkey     [32 bytes]
└── bump: u8                [1 byte]
    PDA: ["member", org_pubkey, user_pubkey]
```

### Permission Bitmask

```
Bit 0 (0x01): READ            — Can read resources
Bit 1 (0x02): WRITE           — Can create/modify resources
Bit 2 (0x04): DELETE          — Can delete resources
Bit 3 (0x08): MANAGE_ROLES    — Can create/modify roles
Bit 4 (0x10): MANAGE_MEMBERS  — Can add/remove members
Bit 5 (0x20): TRANSFER        — Can transfer assets
All  (0xFFFF): ADMIN           — Full permissions
```

---

## Design Rationale

### Why a Permission Bitmask (u16) Instead of Enums or Separate Accounts

A bitmask allows **composable permissions**: a role with `READ | WRITE | DELETE` (0x07) is a single `u16` value, checked with one bitwise AND operation. The alternatives are worse:

- **Enum approach** (`enum Permission { Read, Write, ReadAndWrite, ... }`) creates a combinatorial explosion — 6 permissions yield 64 possible combinations, each needing an enum variant
- **Separate accounts** (one PDA per permission per user) multiplies on-chain storage costs and requires multiple account lookups per authorization check
- **u16** provides 16 bits — 6 defined permissions + 10 reserved for future use, without wasting account space

The `ADMIN = 0xFFFF` value grants all current and future permissions in a single check: `role.permissions & required == required` always passes when all bits are set.

### Why One Role Per User Per Organization

The MemberRole PDA is seeded by `["member", org_pubkey, user_pubkey]`, enforcing **exactly one role per user per organization** at the protocol level.

This is a deliberate constraint, not a limitation. Multi-role systems require complex resolution logic (which role takes priority? how do overlapping permissions combine?). A single-role model keeps on-chain logic minimal and moves composition to the role definition itself — an "editor" role simply combines the permissions that would otherwise require multiple roles.

### Why Role Names in PDA Seeds (Not Sequential IDs)

Role PDAs use `["role", org_pubkey, role_name]` rather than a numeric ID. This means:

- **Client-side lookups are instant**: Given an org and role name, any client can derive the PDA address without querying the chain
- **Human-readable addressing**: "editor" is more meaningful than "role #3"
- **Names are unique per org**: Two orgs can each have an "admin" role — the org pubkey in the seed prevents collisions

The tradeoff is that role names cannot be changed after creation (they're baked into the PDA seed). This is acceptable for RBAC where role names are structural, not cosmetic.

### Solana Constraints That Shape This Design

Several Solana constraints shape this design differently from a traditional database:

| Constraint | Impact on Design |
|-----------|-----------------|
| **No secondary indexes** | Can't query "all users with READ permission" on-chain. The CLI and dashboard use `getProgramAccounts` with memcmp filters — indexing pushed to the client |
| **No JOINs or iteration** | Each permission check is a single PDA lookup, not a multi-table query. The bitmask avoids needing to join role and permission tables |
| **Account rent (~0.002 SOL each)** | Creating 1000 members costs ~2 SOL locked as rent deposits. Unlike a database row (essentially free), each on-chain account has a capital cost. `close` instructions reclaim rent when roles/members are removed |
| **200k compute unit budget** | The `protected_action` instruction uses ~3k compute units — well within budget. Complex hierarchical RBAC checks could exceed this limit |
| **All state is public** | Role names, permission bitmasks, and member addresses are visible on-chain. This is a feature for auditability but limits use cases requiring confidential role data |

### Composability

Because MemberRole and Role are standard Anchor accounts with deterministic PDA addresses, **any other Solana program can verify permissions** by:

1. Deriving the MemberRole PDA from `["member", org, user]`
2. Deserializing the account to get the `role` pubkey
3. Deriving the Role PDA and reading `permissions`

No CPI (cross-program invocation) to StateShift is needed — other programs can read the accounts directly. This enables permissionless composability: a DeFi protocol could gate features based on StateShift roles without any coordination with the RBAC program.

---

## Instructions

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize` | Anyone (once) | Creates global Config, sets super_admin |
| `create_organization` | Super admin | Creates an Organization with a named admin |
| `create_role` | Org admin | Creates a Role with a permission bitmask |
| `assign_role` | Org admin | Assigns a role to a user (creates MemberRole PDA) |
| `revoke_role` | Org admin | Revokes role, closes MemberRole PDA (refunds rent) |
| `update_role_permissions` | Org admin | Updates the permission bitmask on a Role |
| `protected_action` | Any member | Demo: executes only if caller has required permission |
| `transfer_org_admin` | Current admin | Transfers org admin to a new wallet |
| `deactivate_organization` | Super admin | Deactivates an org (prevents new roles/members) |
| `close_role` | Org admin | Closes a Role PDA (only if no members, refunds rent) |

---

## Project Structure

```
stateshift/
├── programs/stateshift/src/           # On-chain Rust program
│   ├── lib.rs                         # Entry point, #[program] block
│   ├── constants.rs                   # Seeds, permissions, limits
│   ├── error.rs                       # Custom error enum
│   ├── instructions/                  # One file per instruction (10 total)
│   │   ├── initialize.rs
│   │   ├── create_organization.rs
│   │   ├── create_role.rs
│   │   ├── assign_role.rs
│   │   ├── revoke_role.rs
│   │   ├── update_role_permissions.rs
│   │   ├── protected_action.rs
│   │   ├── transfer_org_admin.rs
│   │   ├── deactivate_organization.rs
│   │   └── close_role.rs
│   └── state/                         # Account structs
│       ├── config.rs
│       ├── organization.rs
│       ├── role.rs
│       └── member_role.rs
├── tests/stateshift.ts                # 45 integration tests
├── cli/src/index.ts                   # CLI client (Commander.js)
├── app/                               # React dashboard (Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx                    # Root layout + wallet providers
│   │   ├── hooks/                     # Data fetching (useConfig, useRoles, etc.)
│   │   ├── components/                # UI components (20 total)
│   │   └── actions/                   # Transaction builders (10 total)
│   └── package.json
├── Anchor.toml
├── PLAN.md                            # Architecture plan
└── README.md                          # This file
```

---

## Setup & Installation

### Prerequisites

- [Rust](https://rustup.rs/) (1.75+)
- [Solana CLI](https://docs.solanalabs.com/cli/install) (2.0+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (0.31.x)
- [Node.js](https://nodejs.org/) (18+) and yarn

### Build

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# If blake3 version conflict, run:
cargo update blake3 --precise 1.5.5
anchor build
```

### Test (Local Validator)

```bash
# Runs 45 integration tests against a local validator
anchor test
```

### Deploy to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Fund your wallet (visit https://faucet.solana.com if airdrop fails)
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet

# Verify
solana program show <PROGRAM_ID>
```

---

## CLI Usage

```bash
cd cli
npm install
npm run build

# Initialize RBAC system
npx stateshift init --cluster devnet

# Create an organization
npx stateshift create-org "Acme Corp" --cluster devnet

# Create roles with permission names
npx stateshift create-role 0 admin "admin" --cluster devnet
npx stateshift create-role 0 editor "read,write,delete" --cluster devnet
npx stateshift create-role 0 viewer "read" --cluster devnet

# Assign a role to a user
npx stateshift assign-role 0 editor <USER_PUBKEY> --cluster devnet

# Check a user's role and permissions
npx stateshift check-role 0 <USER_PUBKEY> --cluster devnet

# Execute a permission-gated protected action
npx stateshift protected-action 0 read --cluster devnet

# Update a role's permissions
npx stateshift update-role-permissions 0 viewer "read,write" --cluster devnet

# Transfer org admin to a new wallet
npx stateshift transfer-admin 0 <NEW_ADMIN_PUBKEY> --cluster devnet

# Revoke a user's role
npx stateshift revoke-role 0 editor <USER_PUBKEY> --cluster devnet

# Close a role (must have 0 members)
npx stateshift close-role 0 viewer --cluster devnet

# Deactivate an organization (super admin only)
npx stateshift deactivate-org 0 --cluster devnet

# View full system info
npx stateshift info --cluster devnet
```

---

## Web Dashboard

A React-based dashboard for interacting with the RBAC system visually. Connect your wallet and manage organizations, roles, and permissions through the browser.

### Features

- **Real-time data**: Reads Config, Organization, Role, and MemberRole accounts directly from Devnet
- **Wallet integration**: Phantom and Solflare support via `@solana/wallet-adapter`
- **All 9 write operations**: Initialize, create org/role, assign/revoke roles, update permissions, transfer admin, deactivate org, close role
- **Permission tester**: Interactive panel to test if your wallet has a specific permission in an org
- **Transaction log**: Every action logged with clickable Solana Explorer links
- **Account discovery**: Uses `getProgramAccounts` with discriminator + memcmp filters to find all roles and members for a selected org

### Run the Dashboard

```bash
cd app
npm install
npm run dev
# Open http://localhost:5173 in browser
# Connect Phantom or Solflare wallet (set to Devnet)
```

### Build for Production

```bash
cd app
npm run build    # Output in app/dist/
npm run preview  # Preview the production build
```

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│  Navbar: [StateShift]         [Devnet]  [Connect Wallet]  │
├──────────────────────────────────────────────────────────┤
│  System Overview: Super Admin | Org Count | Program ID    │
├────────────────┬──────────────────┬──────────────────────┤
│  Organizations │  Roles + Members │  Actions (9 forms)   │
│  (click to     │  (for selected   │  + Permission Tester │
│   select)      │   org)           │                      │
├────────────────┴──────────────────┴──────────────────────┤
│  Transaction Log: recent txs with Explorer links          │
└──────────────────────────────────────────────────────────┘
```

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Wallet | `@solana/wallet-adapter-react` |
| Anchor | `@coral-xyz/anchor` 0.31.1 |

---

## Testing

The test suite covers 45 test cases across 17 categories:

| Category | Tests | Description |
|----------|-------|-------------|
| Initialize | 2 | Config creation, duplicate prevention |
| Create Organization | 2 | Org creation, unauthorized access |
| Create Role | 4 | Admin/editor/viewer roles, unauthorized |
| Assign Role | 3 | Role assignment, duplicate prevention |
| Protected Action | 5 | Permission grants and denials |
| Update Permissions | 2 | Permission changes, verification |
| Transfer Admin | 3 | Admin transfer, old admin lockout |
| Revoke Role | 2 | Role revocation, post-revoke denial |
| Close Role | 2 | Member check, empty role closure |
| Boundary Conditions | 4 | Max name lengths (32/33 chars) |
| Deactivate Org | 3 | Org deactivation, post-deactivate restrictions |
| Deactivation Cascade | 3 | Revoke/update/transfer blocked on inactive org |
| Multi-Org Isolation | 3 | Cross-org PDA isolation, same role names |
| Admin Permission | 2 | ADMIN (0xFFFF) grants all permission types |
| Permission Errors | 2 | Unauthorized update, zero bitmask rejection |
| Permission Validation | 1 | Zero-permission role creation blocked |
| Max Roles Limit | 2 | 20-role cap enforcement |

```
  45 passing
```

---

## Devnet Deployment

**Program ID:** [`4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb`](https://explorer.solana.com/address/4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb?cluster=devnet)

### Devnet Transaction Links

| Action | Transaction Signature |
|--------|----------------------|
| **Deploy Program** | [`cMVnd9rrtBD4gpfyW1up1s9YyHJj5ecVr8CgkE8LUqmZGGNK6qRQNG4nJJeezf5j7LjVk6AgsMqCHKNS95rjayE`](https://explorer.solana.com/tx/cMVnd9rrtBD4gpfyW1up1s9YyHJj5ecVr8CgkE8LUqmZGGNK6qRQNG4nJJeezf5j7LjVk6AgsMqCHKNS95rjayE?cluster=devnet) |
| **Initialize Config** | [`3BUaaicaFQ9Z9BBTGSiULAoN3FY44LVeCofZ6QaGtpcQuL2vhJrGB6bvX8VqR8HC1xebDiLt1am8aDLMfwwLJx6S`](https://explorer.solana.com/tx/3BUaaicaFQ9Z9BBTGSiULAoN3FY44LVeCofZ6QaGtpcQuL2vhJrGB6bvX8VqR8HC1xebDiLt1am8aDLMfwwLJx6S?cluster=devnet) |
| **Create Organization** | [`4DtgGFfjZJAU1fN9rqYbWomvHsfsWYEdAovaHdLNnDtDe6AQQTu6DQ3oBF9Et79RwNnYiR3HfdMHMFdUjago6hPc`](https://explorer.solana.com/tx/4DtgGFfjZJAU1fN9rqYbWomvHsfsWYEdAovaHdLNnDtDe6AQQTu6DQ3oBF9Et79RwNnYiR3HfdMHMFdUjago6hPc?cluster=devnet) |
| **Create Admin Role** | [`3qCSWauxgmfc9vqDqiQqEP7Hqjbs2T4miZW7HFdc5Bx3eDvoaC4dMLpAEzcQFFCy8BUceM6nvsM4SkPgVH78urpv`](https://explorer.solana.com/tx/3qCSWauxgmfc9vqDqiQqEP7Hqjbs2T4miZW7HFdc5Bx3eDvoaC4dMLpAEzcQFFCy8BUceM6nvsM4SkPgVH78urpv?cluster=devnet) |
| **Create Editor Role** | [`2ZKAbnnjA1AP4sjc2G6swtKXs8gdsdZeB5eaxE1vBJEUw7D1JFqj7r1Z6tGUHCYrxCZmmoBoiZQwCrG3fR12cFaK`](https://explorer.solana.com/tx/2ZKAbnnjA1AP4sjc2G6swtKXs8gdsdZeB5eaxE1vBJEUw7D1JFqj7r1Z6tGUHCYrxCZmmoBoiZQwCrG3fR12cFaK?cluster=devnet) |
| **Assign Role** | [`5mzcJbbnh45cfvQbyEHa8KV31RSRzCWFLq7HtC5DNAguCbmX7AiNKykvYyV3x4sJw1g4gdEMQNFMfVEGJ13wSP4z`](https://explorer.solana.com/tx/5mzcJbbnh45cfvQbyEHa8KV31RSRzCWFLq7HtC5DNAguCbmX7AiNKykvYyV3x4sJw1g4gdEMQNFMfVEGJ13wSP4z?cluster=devnet) |
| **Protected Action** | [`37jQLHpktoELSSzoC8DTirGJdfm4cX5XaeHSAht5AXkz4zsnMfYFp2d3xSDsB1GRxEEvQ29rE8HACWzWWDvtQCJs`](https://explorer.solana.com/tx/37jQLHpktoELSSzoC8DTirGJdfm4cX5XaeHSAht5AXkz4zsnMfYFp2d3xSDsB1GRxEEvQ29rE8HACWzWWDvtQCJs?cluster=devnet) |

### Deploy Yourself

1. Fund your wallet: `solana airdrop 2 --url devnet` (or visit https://faucet.solana.com)
2. Deploy: `anchor deploy --provider.cluster devnet`
3. The program ID will be printed in the output

---

## Quick Demo

Run the full RBAC lifecycle in one command:

```bash
# Against devnet (default)
bash demo.sh

# Against local validator
bash demo.sh --cluster localnet
```

This script initializes the system, creates an organization with roles, assigns permissions, and tests access control — demonstrating the complete Web2-to-Solana paradigm shift.

---

## How to Verify

### Verify the deployed program

```bash
# Check the program exists on devnet
solana program show 4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb --url devnet

# View any transaction in the explorer
# https://explorer.solana.com/address/4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb?cluster=devnet
```

### Verify locally

```bash
# Clone, build, and test
git clone <repo-url> && cd stateshift
yarn install
anchor build
anchor test    # Runs all 45 tests against local validator
```

### Verify the CLI

```bash
cd cli && npm install && npm run build
npx stateshift info --cluster devnet   # View live on-chain state
```

### Verify the Dashboard

```bash
cd app && npm install && npm run dev
# Open http://localhost:5173, connect Phantom wallet on Devnet
# System Overview should show the super admin address and org count
# Click an org to see its roles and members
```

---

## Security Considerations

| Concern | How StateShift Handles It |
|---------|--------------------------|
| **Authentication** | All mutations require `Signer<'info>` — cryptographic signature verification at the runtime level |
| **Authorization** | `has_one` constraints enforce admin ownership; `constraint` checks verify permission bitmasks |
| **PDA spoofing** | Seeds are deterministic and verified by the runtime — cannot be forged |
| **Rent drain** | `close` instructions return rent to the admin; `close_role` requires `member_count == 0` |
| **Overflow** | All counter arithmetic uses `checked_add/sub` with explicit error returns |
| **Re-initialization** | Config PDA uses `init` constraint — second call fails (account already exists) |
| **Deactivation bypass** | `is_active` constraint checked on all role/member mutations |
| **Duplicate assignments** | PDA seeds include `(org, user)` — second assignment fails (PDA already exists) |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart contract | Rust + Anchor 0.31.1 |
| Blockchain | Solana (Devnet) |
| Testing | TypeScript + Mocha + Chai (45 tests) |
| CLI client | TypeScript + Commander.js |
| Web dashboard | React 18 + Vite 6 + Tailwind CSS v4 |
| Wallet adapter | `@solana/wallet-adapter-react` (Phantom, Solflare) |
| State model | Program Derived Addresses (PDAs) |

---
