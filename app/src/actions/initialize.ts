import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { findConfigPda } from "../pda";

export async function initialize(
  program: Program,
  wallet: PublicKey
): Promise<string> {
  const [configPda] = findConfigPda();
  return program.methods
    .initialize()
    .accountsPartial({
      superAdmin: wallet,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });
}
