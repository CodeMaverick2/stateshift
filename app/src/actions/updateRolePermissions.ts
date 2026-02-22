import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { findOrgPda, findRolePda } from "../pda";

export async function updateRolePermissions(
  program: Program,
  wallet: PublicKey,
  orgId: number,
  roleName: string,
  newPermissions: number
): Promise<string> {
  const [orgPda] = findOrgPda(orgId);
  const [rolePda] = findRolePda(orgPda, roleName);

  return program.methods
    .updateRolePermissions(newPermissions)
    .accountsPartial({
      admin: wallet,
      organization: orgPda,
      role: rolePda,
    })
    .rpc();
}
