import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { findOrgPda, findMemberRolePda } from "../pda";

export async function protectedAction(
  program: Program,
  wallet: PublicKey,
  orgId: number,
  requiredPermission: number
): Promise<string> {
  const [orgPda] = findOrgPda(orgId);
  const [memberRolePda] = findMemberRolePda(orgPda, wallet);

  // Fetch member role to get the role PDA
  const memberRoleAccount = await (program.account as any).memberRole.fetch(
    memberRolePda
  );
  const rolePubkey = memberRoleAccount.role as PublicKey;

  return program.methods
    .protectedAction(requiredPermission)
    .accountsPartial({
      caller: wallet,
      organization: orgPda,
      memberRole: memberRolePda,
      role: rolePubkey,
    })
    .rpc();
}
