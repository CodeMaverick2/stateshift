import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { findConfigPda, findOrgPda } from "../pda";

export async function deactivateOrg(
  program: Program,
  wallet: PublicKey,
  orgId: number
): Promise<string> {
  const [configPda] = findConfigPda();
  const [orgPda] = findOrgPda(orgId);

  return program.methods
    .deactivateOrganization()
    .accountsPartial({
      superAdmin: wallet,
      config: configPda,
      organization: orgPda,
    })
    .rpc();
}
