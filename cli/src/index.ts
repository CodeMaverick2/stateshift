#!/usr/bin/env node

import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Cluster,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRAM_ID = new PublicKey(
  "4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb"
);

const PERM_READ = 1;
const PERM_WRITE = 2;
const PERM_DELETE = 4;
const PERM_MANAGE_ROLES = 8;
const PERM_MANAGE_MEMBERS = 16;
const PERM_TRANSFER = 32;
const PERM_ADMIN = 0xffff;

const PERMISSION_MAP: Record<string, number> = {
  read: PERM_READ,
  write: PERM_WRITE,
  delete: PERM_DELETE,
  manage_roles: PERM_MANAGE_ROLES,
  manage_members: PERM_MANAGE_MEMBERS,
  transfer: PERM_TRANSFER,
  admin: PERM_ADMIN,
};

// ---------------------------------------------------------------------------
// IDL Loading
// ---------------------------------------------------------------------------

function loadIdl(): any {
  const idlPath = path.resolve(__dirname, "../../target/idl/stateshift.json");
  if (!fs.existsSync(idlPath)) {
    console.error(`IDL file not found at: ${idlPath}`);
    console.error(
      "Make sure you have built the Anchor program (anchor build)."
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(idlPath, "utf-8"));
}

// ---------------------------------------------------------------------------
// Wallet / Provider helpers
// ---------------------------------------------------------------------------

function loadKeypair(keypairPath: string): Keypair {
  const resolved = keypairPath.startsWith("~")
    ? path.join(os.homedir(), keypairPath.slice(1))
    : path.resolve(keypairPath);

  if (!fs.existsSync(resolved)) {
    console.error(`Keypair file not found: ${resolved}`);
    process.exit(1);
  }

  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(resolved, "utf-8"))
  );
  return Keypair.fromSecretKey(secretKey);
}

function getClusterUrl(cluster: string): string {
  if (
    cluster.startsWith("http://") ||
    cluster.startsWith("https://") ||
    cluster.startsWith("ws://")
  ) {
    return cluster;
  }
  const mapping: Record<string, string> = {
    devnet: clusterApiUrl("devnet"),
    testnet: clusterApiUrl("testnet"),
    mainnet: clusterApiUrl("mainnet-beta"),
    "mainnet-beta": clusterApiUrl("mainnet-beta"),
    localnet: "http://127.0.0.1:8899",
    localhost: "http://127.0.0.1:8899",
  };
  const url = mapping[cluster.toLowerCase()];
  if (!url) {
    console.error(
      `Unknown cluster: ${cluster}. Use devnet, testnet, mainnet, localnet, or a URL.`
    );
    process.exit(1);
  }
  return url;
}

function buildProvider(
  cluster: string,
  keypairPath: string
): { provider: anchor.AnchorProvider; wallet: Keypair } {
  const wallet = loadKeypair(keypairPath);
  const connection = new Connection(getClusterUrl(cluster), "confirmed");
  const anchorWallet = new anchor.Wallet(wallet);
  const provider = new anchor.AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return { provider, wallet };
}

function buildProgram(
  provider: anchor.AnchorProvider
): anchor.Program<any> {
  const idl = loadIdl();
  return new anchor.Program(idl as any, provider);
}

// ---------------------------------------------------------------------------
// PDA Derivations
// ---------------------------------------------------------------------------

function findConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

function findOrgPda(orgId: number | anchor.BN): [PublicKey, number] {
  const bn = typeof orgId === "number" ? new anchor.BN(orgId) : orgId;
  return PublicKey.findProgramAddressSync(
    [Buffer.from("org"), bn.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

function findRolePda(
  orgPubkey: PublicKey,
  roleName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("role"), orgPubkey.toBuffer(), Buffer.from(roleName)],
    PROGRAM_ID
  );
}

function findMemberRolePda(
  orgPubkey: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("member"), orgPubkey.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// ---------------------------------------------------------------------------
// Permission parsing
// ---------------------------------------------------------------------------

function parsePermissions(input: string): number {
  // If it's a plain number, use it directly
  const asNum = Number(input);
  if (!isNaN(asNum) && input.trim().length > 0) {
    if (asNum < 0 || asNum > 0xffff) {
      console.error("Permissions must be between 0 and 65535 (0xFFFF).");
      process.exit(1);
    }
    return asNum;
  }

  // Parse comma-separated permission names
  const names = input
    .split(",")
    .map((s) => s.trim().toLowerCase());
  let mask = 0;
  for (const name of names) {
    const val = PERMISSION_MAP[name];
    if (val === undefined) {
      console.error(
        `Unknown permission name: "${name}". Valid names: ${Object.keys(PERMISSION_MAP).join(", ")}`
      );
      process.exit(1);
    }
    mask |= val;
  }
  return mask;
}

function formatPermissions(mask: number): string {
  if (mask === PERM_ADMIN) return "admin (all)";
  const names: string[] = [];
  for (const [name, val] of Object.entries(PERMISSION_MAP)) {
    if (name === "admin") continue;
    if ((mask & val) === val) {
      names.push(name);
    }
  }
  return names.length > 0
    ? `${names.join(", ")} (0x${mask.toString(16).padStart(4, "0")})`
    : `0x${mask.toString(16).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// CLI Definition
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("stateshift")
  .description("CLI client for the StateShift on-chain RBAC system")
  .version("0.1.0")
  .option(
    "-c, --cluster <cluster>",
    "Solana cluster (devnet, testnet, mainnet, localnet, or URL)",
    "devnet"
  )
  .option(
    "-k, --keypair <path>",
    "Path to wallet keypair JSON file",
    "~/.config/solana/id.json"
  );

// ---- init ----------------------------------------------------------------

program
  .command("init")
  .description("Initialize the RBAC config (super admin = wallet signer)")
  .action(async (_opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);
      const [configPda] = findConfigPda();

      console.log("Initializing StateShift RBAC config...");
      console.log(`  Super Admin : ${wallet.publicKey.toBase58()}`);
      console.log(`  Config PDA  : ${configPda.toBase58()}`);

      const tx = await prog.methods
        .initialize()
        .accountsPartial({
          superAdmin: wallet.publicKey,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("\nConfig initialized successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- create-org ----------------------------------------------------------

program
  .command("create-org")
  .argument("<name>", "Organization name (max 32 characters)")
  .argument("[admin-pubkey]", "Admin public key (defaults to signer)")
  .description("Create a new organization")
  .action(async (name: string, adminPubkeyStr: string | undefined, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const adminPubkey = adminPubkeyStr
        ? new PublicKey(adminPubkeyStr)
        : wallet.publicKey;

      const [configPda] = findConfigPda();

      // Fetch current config to determine the next org_id
      const configAccount = await (prog.account as any).config.fetch(configPda);
      const orgId = (configAccount as any).orgCount as anchor.BN;
      const [orgPda] = findOrgPda(orgId);

      console.log("Creating organization...");
      console.log(`  Name        : ${name}`);
      console.log(`  Org ID      : ${orgId.toString()}`);
      console.log(`  Admin       : ${adminPubkey.toBase58()}`);
      console.log(`  Org PDA     : ${orgPda.toBase58()}`);

      const tx = await prog.methods
        .createOrganization(name, adminPubkey)
        .accountsPartial({
          superAdmin: wallet.publicKey,
          config: configPda,
          organization: orgPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("\nOrganization created successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- create-role ---------------------------------------------------------

program
  .command("create-role")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<role-name>", "Role name (max 32 characters)")
  .argument(
    "<permissions>",
    'Permissions: comma-separated names (read,write,delete,manage_roles,manage_members,transfer,admin) or a number'
  )
  .description("Create a new role in an organization")
  .action(async (orgIdStr: string, roleName: string, permStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const permissions = parsePermissions(permStr);
      const [orgPda] = findOrgPda(orgId);
      const [rolePda] = findRolePda(orgPda, roleName);

      console.log("Creating role...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Role Name   : ${roleName}`);
      console.log(`  Permissions : ${formatPermissions(permissions)}`);
      console.log(`  Role PDA    : ${rolePda.toBase58()}`);

      const tx = await prog.methods
        .createRole(roleName, permissions)
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
          role: rolePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("\nRole created successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- assign-role ---------------------------------------------------------

program
  .command("assign-role")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<role-name>", "Role name")
  .argument("<user-pubkey>", "Public key of the user to assign the role to")
  .description("Assign a role to a user")
  .action(async (orgIdStr: string, roleName: string, userPubkeyStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const userPubkey = new PublicKey(userPubkeyStr);
      const [orgPda] = findOrgPda(orgId);
      const [rolePda] = findRolePda(orgPda, roleName);
      const [memberRolePda] = findMemberRolePda(orgPda, userPubkey);

      console.log("Assigning role...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Role        : ${roleName}`);
      console.log(`  User        : ${userPubkey.toBase58()}`);
      console.log(`  MemberRole  : ${memberRolePda.toBase58()}`);

      const tx = await prog.methods
        .assignRole()
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
          role: rolePda,
          user: userPubkey,
          memberRole: memberRolePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("\nRole assigned successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- check-role ----------------------------------------------------------

program
  .command("check-role")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<user-pubkey>", "Public key of the user to check")
  .description("Fetch and display a user's role information")
  .action(async (orgIdStr: string, userPubkeyStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const userPubkey = new PublicKey(userPubkeyStr);
      const [orgPda] = findOrgPda(orgId);
      const [memberRolePda] = findMemberRolePda(orgPda, userPubkey);

      console.log(`Checking role for user ${userPubkey.toBase58()} in org ${orgId}...\n`);

      let memberRoleAccount: any;
      try {
        memberRoleAccount = await (prog.account as any).memberRole.fetch(memberRolePda);
      } catch {
        console.log("No role assignment found for this user in this organization.");
        return;
      }

      // Fetch the role account to get name and permissions
      const rolePubkey = memberRoleAccount.role as PublicKey;
      let roleAccount: any;
      try {
        roleAccount = await (prog.account as any).role.fetch(rolePubkey);
      } catch {
        console.log("MemberRole found but the associated role account could not be fetched.");
        console.log(`  Role PDA    : ${rolePubkey.toBase58()}`);
        return;
      }

      // Fetch org for name
      let orgAccount: any;
      try {
        orgAccount = await (prog.account as any).organization.fetch(orgPda);
      } catch {
        // Org fetch is optional for display
      }

      console.log("=== Member Role Info ===");
      if (orgAccount) {
        console.log(`  Organization: ${orgAccount.name} (ID: ${orgId})`);
      }
      console.log(`  User        : ${(memberRoleAccount.user as PublicKey).toBase58()}`);
      console.log(`  Role        : ${roleAccount.name}`);
      console.log(`  Permissions : ${formatPermissions(roleAccount.permissions)}`);
      console.log(`  Active      : ${memberRoleAccount.isActive}`);
      console.log(
        `  Assigned At : ${new Date((memberRoleAccount.assignedAt as anchor.BN).toNumber() * 1000).toISOString()}`
      );
      console.log(`  Assigned By : ${(memberRoleAccount.assignedBy as PublicKey).toBase58()}`);
      console.log(`  MemberRole  : ${memberRolePda.toBase58()}`);
      console.log(`  Role PDA    : ${rolePubkey.toBase58()}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- revoke-role ---------------------------------------------------------

program
  .command("revoke-role")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<role-name>", "Role name")
  .argument("<user-pubkey>", "Public key of the user whose role to revoke")
  .description("Revoke a user's role")
  .action(async (orgIdStr: string, roleName: string, userPubkeyStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const userPubkey = new PublicKey(userPubkeyStr);
      const [orgPda] = findOrgPda(orgId);
      const [rolePda] = findRolePda(orgPda, roleName);
      const [memberRolePda] = findMemberRolePda(orgPda, userPubkey);

      console.log("Revoking role...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Role        : ${roleName}`);
      console.log(`  User        : ${userPubkey.toBase58()}`);

      const tx = await prog.methods
        .revokeRole()
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
          role: rolePda,
          user: userPubkey,
          memberRole: memberRolePda,
        })
        .rpc();

      console.log("\nRole revoked successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- protected-action ----------------------------------------------------

program
  .command("protected-action")
  .argument("<org-id>", "Organization ID (number)")
  .argument(
    "<permission>",
    'Required permission: name (read, write, etc.) or a number'
  )
  .description("Execute a demo protected action requiring a specific permission")
  .action(async (orgIdStr: string, permStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const requiredPermission = parsePermissions(permStr);
      const [orgPda] = findOrgPda(orgId);
      const [memberRolePda] = findMemberRolePda(orgPda, wallet.publicKey);

      // Fetch member role to get the role PDA for the account
      let memberRoleAccount: any;
      try {
        memberRoleAccount = await (prog.account as any).memberRole.fetch(memberRolePda);
      } catch {
        console.error(
          "No role assignment found for your wallet in this organization. Assign a role first."
        );
        process.exit(1);
      }
      const rolePubkey = memberRoleAccount.role as PublicKey;

      console.log("Executing protected action...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Permission  : ${formatPermissions(requiredPermission)}`);
      console.log(`  Caller      : ${wallet.publicKey.toBase58()}`);

      const tx = await prog.methods
        .protectedAction(requiredPermission)
        .accountsPartial({
          caller: wallet.publicKey,
          organization: orgPda,
          memberRole: memberRolePda,
          role: rolePubkey,
        })
        .rpc();

      console.log("\nProtected action executed successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- update-role-permissions ----------------------------------------------

program
  .command("update-role-permissions")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<role-name>", "Role name")
  .argument(
    "<permissions>",
    'New permissions: comma-separated names or a number'
  )
  .description("Update permissions on an existing role")
  .action(async (orgIdStr: string, roleName: string, permStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const newPermissions = parsePermissions(permStr);
      const [orgPda] = findOrgPda(orgId);
      const [rolePda] = findRolePda(orgPda, roleName);

      console.log("Updating role permissions...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Role        : ${roleName}`);
      console.log(`  Permissions : ${formatPermissions(newPermissions)}`);

      const tx = await prog.methods
        .updateRolePermissions(newPermissions)
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
          role: rolePda,
        })
        .rpc();

      console.log("\nRole permissions updated successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- transfer-admin -------------------------------------------------------

program
  .command("transfer-admin")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<new-admin>", "Public key of the new admin")
  .description("Transfer organization admin to a new wallet")
  .action(async (orgIdStr: string, newAdminStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const newAdmin = new PublicKey(newAdminStr);
      const [orgPda] = findOrgPda(orgId);

      console.log("Transferring org admin...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  New Admin   : ${newAdmin.toBase58()}`);

      const tx = await prog.methods
        .transferOrgAdmin(newAdmin)
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
        })
        .rpc();

      console.log("\nOrg admin transferred successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- deactivate-org -------------------------------------------------------

program
  .command("deactivate-org")
  .argument("<org-id>", "Organization ID (number)")
  .description("Deactivate an organization (super admin only)")
  .action(async (orgIdStr: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const [configPda] = findConfigPda();
      const [orgPda] = findOrgPda(orgId);

      console.log("Deactivating organization...");
      console.log(`  Org ID      : ${orgId}`);

      const tx = await prog.methods
        .deactivateOrganization()
        .accountsPartial({
          superAdmin: wallet.publicKey,
          config: configPda,
          organization: orgPda,
        })
        .rpc();

      console.log("\nOrganization deactivated successfully!");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- close-role -----------------------------------------------------------

program
  .command("close-role")
  .argument("<org-id>", "Organization ID (number)")
  .argument("<role-name>", "Role name to close (must have no members)")
  .description("Close a role and reclaim rent (role must have 0 members)")
  .action(async (orgIdStr: string, roleName: string, _opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);

      const orgId = parseInt(orgIdStr, 10);
      if (isNaN(orgId)) {
        console.error("org-id must be a number.");
        process.exit(1);
      }

      const [orgPda] = findOrgPda(orgId);
      const [rolePda] = findRolePda(orgPda, roleName);

      console.log("Closing role...");
      console.log(`  Org ID      : ${orgId}`);
      console.log(`  Role        : ${roleName}`);

      const tx = await prog.methods
        .closeRole()
        .accountsPartial({
          admin: wallet.publicKey,
          organization: orgPda,
          role: rolePda,
        })
        .rpc();

      console.log("\nRole closed successfully! Rent reclaimed.");
      console.log(`  Transaction : ${tx}`);
    } catch (err: any) {
      handleError(err);
    }
  });

// ---- info ----------------------------------------------------------------

program
  .command("info")
  .description("Show RBAC config and organization info")
  .action(async (_opts, cmd) => {
    const parent = cmd.parent!.opts();
    try {
      const { provider, wallet } = buildProvider(parent.cluster, parent.keypair);
      const prog = buildProgram(provider);
      const [configPda] = findConfigPda();

      console.log(`Cluster       : ${parent.cluster}`);
      console.log(`Wallet        : ${wallet.publicKey.toBase58()}`);
      console.log(`Program ID    : ${PROGRAM_ID.toBase58()}`);
      console.log(`Config PDA    : ${configPda.toBase58()}`);
      console.log("");

      // Fetch config
      let configAccount: any;
      try {
        configAccount = await (prog.account as any).config.fetch(configPda);
      } catch {
        console.log(
          "Config account not found. Run `stateshift init` to initialize."
        );
        return;
      }

      const orgCount = (configAccount.orgCount as anchor.BN).toNumber();

      console.log("=== Config ===");
      console.log(`  Super Admin : ${(configAccount.superAdmin as PublicKey).toBase58()}`);
      console.log(`  Org Count   : ${orgCount}`);
      console.log(`  Bump        : ${configAccount.bump}`);

      // Fetch all organizations
      if (orgCount > 0) {
        console.log("");
        console.log("=== Organizations ===");
        for (let i = 0; i < orgCount; i++) {
          const [orgPda] = findOrgPda(i);
          try {
            const org = await (prog.account as any).organization.fetch(orgPda) as any;
            console.log("");
            console.log(`  --- Org ${i} ---`);
            console.log(`  Name        : ${org.name}`);
            console.log(`  Admin       : ${(org.admin as PublicKey).toBase58()}`);
            console.log(`  Roles       : ${org.roleCount}`);
            console.log(`  Members     : ${org.memberCount}`);
            console.log(`  Active      : ${org.isActive}`);
            console.log(`  PDA         : ${orgPda.toBase58()}`);
          } catch {
            console.log(`  --- Org ${i}: (could not fetch) ---`);
          }
        }
      }
    } catch (err: any) {
      handleError(err);
    }
  });

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function handleError(err: any): void {
  // Anchor program errors
  if (err.error && err.error.errorCode) {
    console.error(`\nProgram Error: ${err.error.errorCode.code}`);
    console.error(`  Message: ${err.error.errorMessage}`);
    if (err.logs) {
      console.error("\nProgram Logs:");
      for (const log of err.logs) {
        console.error(`  ${log}`);
      }
    }
    process.exit(1);
  }

  // Anchor-style error with errorCode on err directly
  if (err.errorCode) {
    console.error(`\nProgram Error: ${err.errorCode.code}`);
    console.error(`  Message: ${err.errorMessage || err.message}`);
    process.exit(1);
  }

  // Transaction simulation errors
  if (err.simulationResponse) {
    console.error("\nTransaction Simulation Failed:");
    if (err.simulationResponse.logs) {
      for (const log of err.simulationResponse.logs) {
        console.error(`  ${log}`);
      }
    }
    process.exit(1);
  }

  // SendTransactionError
  if (err.logs) {
    console.error(`\nTransaction Error: ${err.message}`);
    console.error("\nProgram Logs:");
    for (const log of err.logs) {
      console.error(`  ${log}`);
    }
    process.exit(1);
  }

  // Generic error
  console.error(`\nError: ${err.message || err}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

program.parse(process.argv);
