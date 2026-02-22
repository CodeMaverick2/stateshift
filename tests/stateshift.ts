import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Stateshift } from "../target/types/stateshift";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";

// Permission constants (must match constants.rs)
const PERM_READ = 1 << 0;
const PERM_WRITE = 1 << 1;
const PERM_DELETE = 1 << 2;
const PERM_MANAGE_ROLES = 1 << 3;
const PERM_MANAGE_MEMBERS = 1 << 4;
const PERM_TRANSFER = 1 << 5;
const PERM_ADMIN = 0xffff;

// PDA seed constants
const CONFIG_SEED = Buffer.from("config");
const ORG_SEED = Buffer.from("org");
const ROLE_SEED = Buffer.from("role");
const MEMBER_SEED = Buffer.from("member");

describe("stateshift", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Stateshift as Program<Stateshift>;
  const superAdmin = provider.wallet;

  // Test keypairs
  const orgAdmin = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const unauthorizedUser = Keypair.generate();

  // PDA addresses (computed later)
  let configPda: PublicKey;
  let configBump: number;
  let orgPda: PublicKey;
  let orgBump: number;
  let adminRolePda: PublicKey;
  let editorRolePda: PublicKey;
  let viewerRolePda: PublicKey;
  let user1MemberPda: PublicKey;
  let user2MemberPda: PublicKey;

  before(async () => {
    // Derive PDAs
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    // Org PDA with org_id = 0 (first org)
    [orgPda, orgBump] = PublicKey.findProgramAddressSync(
      [ORG_SEED, new BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Role PDAs
    [adminRolePda] = PublicKey.findProgramAddressSync(
      [ROLE_SEED, orgPda.toBuffer(), Buffer.from("admin")],
      program.programId
    );
    [editorRolePda] = PublicKey.findProgramAddressSync(
      [ROLE_SEED, orgPda.toBuffer(), Buffer.from("editor")],
      program.programId
    );
    [viewerRolePda] = PublicKey.findProgramAddressSync(
      [ROLE_SEED, orgPda.toBuffer(), Buffer.from("viewer")],
      program.programId
    );

    // Member PDAs
    [user1MemberPda] = PublicKey.findProgramAddressSync(
      [MEMBER_SEED, orgPda.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );
    [user2MemberPda] = PublicKey.findProgramAddressSync(
      [MEMBER_SEED, orgPda.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to test accounts
    const airdropAmount = 2 * anchor.web3.LAMPORTS_PER_SOL;
    for (const kp of [orgAdmin, unauthorizedUser]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        airdropAmount
      );
      await provider.connection.confirmTransaction(sig);
    }
  });

  // =========================================
  // 1. Initialize
  // =========================================
  describe("initialize", () => {
    it("initializes the global config", async () => {
      const tx = await program.methods
        .initialize()
        .accounts({
          superAdmin: superAdmin.publicKey,
        })
        .rpc();

      const config = await program.account.config.fetch(configPda);
      expect(config.superAdmin.toString()).to.equal(
        superAdmin.publicKey.toString()
      );
      expect(config.orgCount.toNumber()).to.equal(0);
      console.log("  Config initialized. TX:", tx);
    });

    it("fails to initialize twice", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({
            superAdmin: superAdmin.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        // Expected - account already initialized
        expect(err).to.exist;
      }
    });
  });

  // =========================================
  // 2. Create Organization
  // =========================================
  describe("create_organization", () => {
    it("creates an organization", async () => {
      const tx = await program.methods
        .createOrganization("Acme Corp", orgAdmin.publicKey)
        .accounts({
          superAdmin: superAdmin.publicKey,
        })
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.name).to.equal("Acme Corp");
      expect(org.admin.toString()).to.equal(orgAdmin.publicKey.toString());
      expect(org.orgId.toNumber()).to.equal(0);
      expect(org.roleCount).to.equal(0);
      expect(org.memberCount).to.equal(0);
      expect(org.isActive).to.be.true;

      const config = await program.account.config.fetch(configPda);
      expect(config.orgCount.toNumber()).to.equal(1);
      console.log("  Org created. TX:", tx);
    });

    it("fails when non-super-admin tries to create org", async () => {
      try {
        await program.methods
          .createOrganization("Evil Corp", unauthorizedUser.publicKey)
          .accounts({
            superAdmin: unauthorizedUser.publicKey,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });
  });

  // =========================================
  // 3. Create Roles
  // =========================================
  describe("create_role", () => {
    it("creates admin role with full permissions", async () => {
      const tx = await program.methods
        .createRole("admin", PERM_ADMIN)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
        })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(adminRolePda);
      expect(role.name).to.equal("admin");
      expect(role.permissions).to.equal(PERM_ADMIN);
      expect(role.memberCount).to.equal(0);
      console.log("  Admin role created. TX:", tx);
    });

    it("creates editor role with read+write+delete", async () => {
      const permissions = PERM_READ | PERM_WRITE | PERM_DELETE;
      const tx = await program.methods
        .createRole("editor", permissions)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
        })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(editorRolePda);
      expect(role.name).to.equal("editor");
      expect(role.permissions).to.equal(permissions);
      console.log("  Editor role created. TX:", tx);
    });

    it("creates viewer role with read-only", async () => {
      const tx = await program.methods
        .createRole("viewer", PERM_READ)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
        })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(viewerRolePda);
      expect(role.name).to.equal("viewer");
      expect(role.permissions).to.equal(PERM_READ);

      const org = await program.account.organization.fetch(orgPda);
      expect(org.roleCount).to.equal(3);
      console.log("  Viewer role created. TX:", tx);
    });

    it("fails when non-admin creates role", async () => {
      try {
        await program.methods
          .createRole("hacker", PERM_ADMIN)
          .accounts({
            admin: unauthorizedUser.publicKey,
            organization: orgPda,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });
  });

  // =========================================
  // 4. Assign Roles
  // =========================================
  describe("assign_role", () => {
    it("assigns editor role to user1", async () => {
      const tx = await program.methods
        .assignRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
          role: editorRolePda,
          user: user1.publicKey,
        })
        .signers([orgAdmin])
        .rpc();

      const member = await program.account.memberRole.fetch(user1MemberPda);
      expect(member.user.toString()).to.equal(user1.publicKey.toString());
      expect(member.role.toString()).to.equal(editorRolePda.toString());
      expect(member.isActive).to.be.true;
      expect(member.assignedBy.toString()).to.equal(
        orgAdmin.publicKey.toString()
      );

      const role = await program.account.role.fetch(editorRolePda);
      expect(role.memberCount).to.equal(1);

      const org = await program.account.organization.fetch(orgPda);
      expect(org.memberCount).to.equal(1);
      console.log("  User1 assigned editor role. TX:", tx);
    });

    it("assigns viewer role to user2", async () => {
      const tx = await program.methods
        .assignRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
          role: viewerRolePda,
          user: user2.publicKey,
        })
        .signers([orgAdmin])
        .rpc();

      const member = await program.account.memberRole.fetch(user2MemberPda);
      expect(member.user.toString()).to.equal(user2.publicKey.toString());
      expect(member.role.toString()).to.equal(viewerRolePda.toString());
      console.log("  User2 assigned viewer role. TX:", tx);
    });

    it("fails to assign role twice to same user", async () => {
      try {
        await program.methods
          .assignRole()
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
            role: adminRolePda,
            user: user1.publicKey,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        // Expected - PDA already exists
        expect(err).to.exist;
      }
    });
  });

  // =========================================
  // 5. Protected Actions (Permission Checks)
  // =========================================
  describe("protected_action", () => {
    it("allows editor (user1) to perform WRITE action", async () => {
      const tx = await program.methods
        .protectedAction(PERM_WRITE)
        .accounts({
          caller: user1.publicKey,
          organization: orgPda,
          memberRole: user1MemberPda,
          role: editorRolePda,
        })
        .signers([user1])
        .rpc();
      console.log("  User1 (editor) WRITE action succeeded. TX:", tx);
    });

    it("allows editor (user1) to perform READ action", async () => {
      const tx = await program.methods
        .protectedAction(PERM_READ)
        .accounts({
          caller: user1.publicKey,
          organization: orgPda,
          memberRole: user1MemberPda,
          role: editorRolePda,
        })
        .signers([user1])
        .rpc();
      console.log("  User1 (editor) READ action succeeded. TX:", tx);
    });

    it("denies editor (user1) MANAGE_MEMBERS action", async () => {
      try {
        await program.methods
          .protectedAction(PERM_MANAGE_MEMBERS)
          .accounts({
            caller: user1.publicKey,
            organization: orgPda,
            memberRole: user1MemberPda,
            role: editorRolePda,
          })
          .signers([user1])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });

    it("allows viewer (user2) to perform READ action", async () => {
      const tx = await program.methods
        .protectedAction(PERM_READ)
        .accounts({
          caller: user2.publicKey,
          organization: orgPda,
          memberRole: user2MemberPda,
          role: viewerRolePda,
        })
        .signers([user2])
        .rpc();
      console.log("  User2 (viewer) READ action succeeded. TX:", tx);
    });

    it("denies viewer (user2) WRITE action", async () => {
      try {
        await program.methods
          .protectedAction(PERM_WRITE)
          .accounts({
            caller: user2.publicKey,
            organization: orgPda,
            memberRole: user2MemberPda,
            role: viewerRolePda,
          })
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });
  });

  // =========================================
  // 6. Update Role Permissions
  // =========================================
  describe("update_role_permissions", () => {
    it("updates viewer role to include WRITE permission", async () => {
      const newPerms = PERM_READ | PERM_WRITE;
      const tx = await program.methods
        .updateRolePermissions(newPerms)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
          role: viewerRolePda,
        })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(viewerRolePda);
      expect(role.permissions).to.equal(newPerms);
      console.log("  Viewer permissions updated. TX:", tx);
    });

    it("viewer (user2) can now perform WRITE action", async () => {
      const tx = await program.methods
        .protectedAction(PERM_WRITE)
        .accounts({
          caller: user2.publicKey,
          organization: orgPda,
          memberRole: user2MemberPda,
          role: viewerRolePda,
        })
        .signers([user2])
        .rpc();
      console.log("  User2 (updated viewer) WRITE action succeeded. TX:", tx);
    });
  });

  // =========================================
  // 7. Transfer Org Admin
  // =========================================
  describe("transfer_org_admin", () => {
    it("transfers org admin to super_admin wallet", async () => {
      const tx = await program.methods
        .transferOrgAdmin(superAdmin.publicKey)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
        })
        .signers([orgAdmin])
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.admin.toString()).to.equal(superAdmin.publicKey.toString());
      console.log("  Org admin transferred. TX:", tx);
    });

    it("old admin can no longer manage org", async () => {
      try {
        await program.methods
          .createRole("test", PERM_READ)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });

    // Transfer back for subsequent tests
    it("new admin transfers back to orgAdmin", async () => {
      await program.methods
        .transferOrgAdmin(orgAdmin.publicKey)
        .accounts({
          admin: superAdmin.publicKey,
          organization: orgPda,
        })
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.admin.toString()).to.equal(orgAdmin.publicKey.toString());
    });
  });

  // =========================================
  // 8. Revoke Role
  // =========================================
  describe("revoke_role", () => {
    it("revokes viewer role from user2", async () => {
      const tx = await program.methods
        .revokeRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
          role: viewerRolePda,
          user: user2.publicKey,
        })
        .signers([orgAdmin])
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.memberCount).to.equal(1); // only user1 remains

      const role = await program.account.role.fetch(viewerRolePda);
      expect(role.memberCount).to.equal(0);

      // Verify account is closed
      const memberInfo = await provider.connection.getAccountInfo(
        user2MemberPda
      );
      expect(memberInfo).to.be.null;
      console.log("  User2 role revoked. TX:", tx);
    });

    it("user2 can no longer perform protected actions", async () => {
      try {
        await program.methods
          .protectedAction(PERM_READ)
          .accounts({
            caller: user2.publicKey,
            organization: orgPda,
            memberRole: user2MemberPda,
            role: viewerRolePda,
          })
          .signers([user2])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        // Expected - member role account no longer exists
        expect(err).to.exist;
      }
    });
  });

  // =========================================
  // 9. Close Role
  // =========================================
  describe("close_role", () => {
    it("fails to close role with active members", async () => {
      try {
        await program.methods
          .closeRole()
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
            role: editorRolePda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("RoleHasMembers");
      }
    });

    it("closes viewer role (no members)", async () => {
      const tx = await program.methods
        .closeRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: orgPda,
          role: viewerRolePda,
        })
        .signers([orgAdmin])
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.roleCount).to.equal(2); // admin and editor remain

      const roleInfo = await provider.connection.getAccountInfo(viewerRolePda);
      expect(roleInfo).to.be.null;
      console.log("  Viewer role closed. TX:", tx);
    });
  });

  // =========================================
  // 10. Boundary Conditions
  // =========================================
  describe("boundary_conditions", () => {
    it("fails to create org with name exceeding 32 characters", async () => {
      try {
        const longName = "A".repeat(33); // 33 chars, max is 32
        // Need a new org PDA since org_count is now 1
        await program.methods
          .createOrganization(longName, orgAdmin.publicKey)
          .accounts({
            superAdmin: superAdmin.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNameTooLong");
      }
    });

    it("fails to create role with name exceeding 32 characters", async () => {
      try {
        const longRoleName = "R".repeat(33); // 33 chars, max is 32
        await program.methods
          .createRole(longRoleName, PERM_READ)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        // 33-char name exceeds PDA seed 32-byte component limit, so Solana
        // runtime rejects it before the program's RoleNameTooLong check runs.
        // Either error correctly prevents oversized role names.
        const msg = err.toString();
        const rejected =
          msg.includes("RoleNameTooLong") ||
          msg.includes("Max seed length exceeded") ||
          msg.includes("Reached maximum depth");
        expect(rejected, `Unexpected error: ${msg}`).to.be.true;
      }
    });

    it("allows org name at exactly 32 characters", async () => {
      const exactName = "B".repeat(32); // exactly 32 chars
      const [org2Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const tx = await program.methods
        .createOrganization(exactName, orgAdmin.publicKey)
        .accounts({
          superAdmin: superAdmin.publicKey,
        })
        .rpc();

      const org = await program.account.organization.fetch(org2Pda);
      expect(org.name).to.equal(exactName);
      expect(org.name.length).to.equal(32);
      console.log("  32-char org name accepted. TX:", tx);
    });

    it("allows role name at exactly 32 characters", async () => {
      const exactRoleName = "X".repeat(32); // exactly 32 chars
      const [org2Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(1).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [rolePda] = PublicKey.findProgramAddressSync(
        [ROLE_SEED, org2Pda.toBuffer(), Buffer.from(exactRoleName)],
        program.programId
      );

      const tx = await program.methods
        .createRole(exactRoleName, PERM_READ)
        .accounts({
          admin: orgAdmin.publicKey,
          organization: org2Pda,
        })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(rolePda);
      expect(role.name).to.equal(exactRoleName);
      expect(role.name.length).to.equal(32);
      console.log("  32-char role name accepted. TX:", tx);
    });
  });

  // =========================================
  // 11. Deactivate Organization
  // =========================================
  describe("deactivate_organization", () => {
    it("super admin deactivates the org", async () => {
      const tx = await program.methods
        .deactivateOrganization()
        .accounts({
          superAdmin: superAdmin.publicKey,
          organization: orgPda,
        })
        .rpc();

      const org = await program.account.organization.fetch(orgPda);
      expect(org.isActive).to.be.false;
      console.log("  Org deactivated. TX:", tx);
    });

    it("cannot create roles in deactivated org", async () => {
      try {
        await program.methods
          .createRole("new_role", PERM_READ)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNotActive");
      }
    });

    it("cannot assign roles in deactivated org", async () => {
      try {
        await program.methods
          .assignRole()
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
            role: adminRolePda,
            user: user2.publicKey,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNotActive");
      }
    });
  });

  // =========================================
  // 12. Deactivation Cascade
  // =========================================
  describe("deactivation_cascade", () => {
    it("cannot revoke role in deactivated org", async () => {
      try {
        await program.methods
          .revokeRole()
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
            role: editorRolePda,
            user: user1.publicKey,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNotActive");
      }
    });

    it("cannot update permissions in deactivated org", async () => {
      try {
        await program.methods
          .updateRolePermissions(PERM_ADMIN)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
            role: editorRolePda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNotActive");
      }
    });

    it("cannot transfer admin of deactivated org", async () => {
      try {
        await program.methods
          .transferOrgAdmin(superAdmin.publicKey)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: orgPda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("OrgNotActive");
      }
    });
  });

  // =========================================
  // 13. Multi-Organization Isolation
  // =========================================
  describe("multi_organization_isolation", () => {
    let org3Pda: PublicKey;
    let org3EditorPda: PublicKey;
    let user1MemberOrg3Pda: PublicKey;

    before(async () => {
      [org3Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(2).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      [org3EditorPda] = PublicKey.findProgramAddressSync(
        [ROLE_SEED, org3Pda.toBuffer(), Buffer.from("editor")],
        program.programId
      );
      [user1MemberOrg3Pda] = PublicKey.findProgramAddressSync(
        [MEMBER_SEED, org3Pda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );
    });

    it("creates a third organization", async () => {
      await program.methods
        .createOrganization("Beta Corp", orgAdmin.publicKey)
        .accounts({ superAdmin: superAdmin.publicKey })
        .rpc();

      const org = await program.account.organization.fetch(org3Pda);
      expect(org.name).to.equal("Beta Corp");
      expect(org.orgId.toNumber()).to.equal(2);
    });

    it("creates editor role in org3 (same name as org0, different PDA)", async () => {
      await program.methods
        .createRole("editor", PERM_READ | PERM_WRITE)
        .accounts({ admin: orgAdmin.publicKey, organization: org3Pda })
        .signers([orgAdmin])
        .rpc();

      const role = await program.account.role.fetch(org3EditorPda);
      expect(role.name).to.equal("editor");
      // PDA must differ from org0's editor role (org pubkey in seed)
      expect(org3EditorPda.toString()).to.not.equal(editorRolePda.toString());
    });

    it("assigns user1 to editor in org3 (separate from org0 membership)", async () => {
      await program.methods
        .assignRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: org3Pda,
          role: org3EditorPda,
          user: user1.publicKey,
        })
        .signers([orgAdmin])
        .rpc();

      const member = await program.account.memberRole.fetch(user1MemberOrg3Pda);
      expect(member.org.toString()).to.equal(org3Pda.toString());
      // Member PDA must differ from org0's member PDA
      expect(user1MemberOrg3Pda.toString()).to.not.equal(
        user1MemberPda.toString()
      );
    });
  });

  // =========================================
  // 14. Admin Permission (0xFFFF) Grants All
  // =========================================
  describe("admin_permission_grants_all", () => {
    let org3Pda: PublicKey;
    let org3AdminRolePda: PublicKey;
    let user2MemberOrg3Pda: PublicKey;

    before(async () => {
      [org3Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(2).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      [org3AdminRolePda] = PublicKey.findProgramAddressSync(
        [ROLE_SEED, org3Pda.toBuffer(), Buffer.from("admin")],
        program.programId
      );
      [user2MemberOrg3Pda] = PublicKey.findProgramAddressSync(
        [MEMBER_SEED, org3Pda.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      );
    });

    it("creates admin role and assigns to user2 in org3", async () => {
      await program.methods
        .createRole("admin", PERM_ADMIN)
        .accounts({ admin: orgAdmin.publicKey, organization: org3Pda })
        .signers([orgAdmin])
        .rpc();

      await program.methods
        .assignRole()
        .accounts({
          admin: orgAdmin.publicKey,
          organization: org3Pda,
          role: org3AdminRolePda,
          user: user2.publicKey,
        })
        .signers([orgAdmin])
        .rpc();
    });

    it("admin role (0xFFFF) passes all 6 individual permission checks", async () => {
      const allPerms = [
        PERM_READ,
        PERM_WRITE,
        PERM_DELETE,
        PERM_MANAGE_ROLES,
        PERM_MANAGE_MEMBERS,
        PERM_TRANSFER,
      ];

      for (const perm of allPerms) {
        await program.methods
          .protectedAction(perm)
          .accounts({
            caller: user2.publicKey,
            organization: org3Pda,
            memberRole: user2MemberOrg3Pda,
            role: org3AdminRolePda,
          })
          .signers([user2])
          .rpc();
      }
      console.log("  Admin role (0xFFFF) passed all 6 permission checks");
    });
  });

  // =========================================
  // 15. Update Permissions — Error Paths
  // =========================================
  describe("update_role_permissions_errors", () => {
    let org3Pda: PublicKey;
    let org3EditorPda: PublicKey;

    before(async () => {
      [org3Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(2).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      [org3EditorPda] = PublicKey.findProgramAddressSync(
        [ROLE_SEED, org3Pda.toBuffer(), Buffer.from("editor")],
        program.programId
      );
    });

    it("non-admin cannot update role permissions", async () => {
      try {
        await program.methods
          .updateRolePermissions(PERM_ADMIN)
          .accounts({
            admin: unauthorizedUser.publicKey,
            organization: org3Pda,
            role: org3EditorPda,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });

    it("rejects zero permissions bitmask", async () => {
      try {
        await program.methods
          .updateRolePermissions(0)
          .accounts({
            admin: orgAdmin.publicKey,
            organization: org3Pda,
            role: org3EditorPda,
          })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("InvalidPermissions");
      }
    });
  });

  // =========================================
  // 16. Permission Validation
  // =========================================
  describe("permission_validation", () => {
    let org3Pda: PublicKey;

    before(async () => {
      [org3Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(2).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
    });

    it("rejects role creation with zero permissions", async () => {
      try {
        await program.methods
          .createRole("empty_role", 0)
          .accounts({ admin: orgAdmin.publicKey, organization: org3Pda })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("InvalidPermissions");
      }
    });
  });

  // =========================================
  // 17. Max Roles Limit
  // =========================================
  describe("max_roles_limit", () => {
    let org4Pda: PublicKey;

    before(async () => {
      [org4Pda] = PublicKey.findProgramAddressSync(
        [ORG_SEED, new BN(3).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Create org4 for this test
      await program.methods
        .createOrganization("MaxTest Org", orgAdmin.publicKey)
        .accounts({ superAdmin: superAdmin.publicKey })
        .rpc();
    });

    it("allows creating up to 20 roles (MAX_ROLES_PER_ORG)", async () => {
      for (let i = 0; i < 20; i++) {
        await program.methods
          .createRole(`role_${i}`, PERM_READ)
          .accounts({ admin: orgAdmin.publicKey, organization: org4Pda })
          .signers([orgAdmin])
          .rpc();
      }

      const org = await program.account.organization.fetch(org4Pda);
      expect(org.roleCount).to.equal(20);
      console.log("  20 roles created successfully (hit MAX_ROLES_PER_ORG)");
    });

    it("rejects 21st role with MaxRolesReached", async () => {
      try {
        await program.methods
          .createRole("role_overflow", PERM_READ)
          .accounts({ admin: orgAdmin.publicKey, organization: org4Pda })
          .signers([orgAdmin])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.toString()).to.include("MaxRolesReached");
      }
    });
  });
});
