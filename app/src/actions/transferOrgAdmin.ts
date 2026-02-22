import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { findOrgPda } from "../pda";

export async function transferOrgAdmin(
  program: Program,
  wallet: PublicKey,
  orgId: number,
  newAdmin: PublicKey
): Promise<string> {
  const [orgPda] = findOrgPda(orgId);

  return program.methods
    .transferOrgAdmin(newAdmin)
    .accountsPartial({
      admin: wallet,
      organization: orgPda,
    })
    .rpc({ commitment: "confirmed" });
}
