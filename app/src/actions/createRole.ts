import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { findOrgPda, findRolePda } from "../pda";

export async function createRole(
  program: Program,
  wallet: PublicKey,
  orgId: number,
  roleName: string,
  permissions: number
): Promise<string> {
  const [orgPda] = findOrgPda(orgId);
  const [rolePda] = findRolePda(orgPda, roleName);

  return program.methods
    .createRole(roleName, permissions)
    .accountsPartial({
      admin: wallet,
      organization: orgPda,
      role: rolePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });
}
