import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { RoleAccount } from "../types";
import { PROGRAM_ID } from "../constants";
import { findConfigPda } from "../pda";
import { getProgram } from "../program";

// Role discriminator from the IDL
const ROLE_DISCRIMINATOR = Buffer.from([46, 219, 197, 24, 233, 249, 253, 154]);

export interface RoleEntry {
  account: RoleAccount;
  pubkey: PublicKey;
}

export function useRoles(
  orgPubkey: PublicKey | null,
  refreshCounter: number
) {
  const { connection } = useConnection();
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoles() {
      if (!orgPubkey) {
        setRoles([]);
        return;
      }

      setLoading(true);
      try {
        const dummyWallet = {
          publicKey: findConfigPda()[0],
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any) => txs,
        };
        const provider = new AnchorProvider(connection, dummyWallet as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: ROLE_DISCRIMINATOR.toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 8, bytes: orgPubkey.toBase58() } },
          ],
        });

        const results: RoleEntry[] = [];
        for (const { pubkey, account: acctInfo } of accounts) {
          try {
            const decoded = program.coder.accounts.decode(
              "role",
              acctInfo.data
            );
            results.push({ account: decoded as RoleAccount, pubkey });
          } catch {
            // skip decode errors
          }
        }

        if (!cancelled) setRoles(results);
      } catch {
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [connection, orgPubkey?.toBase58(), refreshCounter]);

  return { roles, loading };
}
