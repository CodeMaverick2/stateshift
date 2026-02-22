import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { findConfigPda, findOrgPda } from "../pda";

export async function createOrganization(
  program: Program,
  wallet: PublicKey,
  name: string,
  admin: PublicKey
): Promise<string> {
  const [configPda] = findConfigPda();
  const configAccount = await (program.account as any).config.fetch(configPda);
  const orgId = configAccount.orgCount;
  const [orgPda] = findOrgPda(orgId);

  return program.methods
    .createOrganization(name, admin)
    .accountsPartial({
      superAdmin: wallet,
      config: configPda,
      organization: orgPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });
}
