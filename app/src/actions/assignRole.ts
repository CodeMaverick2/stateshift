import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { findOrgPda, findRolePda, findMemberRolePda } from "../pda";

export async function assignRole(
  program: Program,
  wallet: PublicKey,
  orgId: number,
  roleName: string,
  user: PublicKey
): Promise<string> {
  const [orgPda] = findOrgPda(orgId);
  const [rolePda] = findRolePda(orgPda, roleName);
  const [memberRolePda] = findMemberRolePda(orgPda, user);

  return program.methods
    .assignRole()
    .accountsPartial({
      admin: wallet,
      organization: orgPda,
      role: rolePda,
      user: user,
      memberRole: memberRolePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });
}
