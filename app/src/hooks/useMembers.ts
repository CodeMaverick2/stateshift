import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { MemberRoleAccount } from "../types";
import { PROGRAM_ID } from "../constants";
import { findConfigPda } from "../pda";
import { getProgram } from "../program";

// MemberRole discriminator from the IDL
const MEMBER_ROLE_DISCRIMINATOR = Buffer.from([
  251, 101, 123, 221, 100, 212, 225, 86,
]);

export interface MemberEntry {
  account: MemberRoleAccount;
  pubkey: PublicKey;
}

export function useMembers(
  orgPubkey: PublicKey | null,
  refreshCounter: number
) {
  const { connection } = useConnection();
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMembers() {
      if (!orgPubkey) {
        setMembers([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
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

        // MemberRole fields: discriminator(8) + user(32) + org(32)
        // org field is at offset 8 + 32 = 40
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: MEMBER_ROLE_DISCRIMINATOR.toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 40, bytes: orgPubkey.toBase58() } },
          ],
        });

        const results: MemberEntry[] = [];
        for (const { pubkey, account: acctInfo } of accounts) {
          try {
            const decoded = program.coder.accounts.decode(
              "memberRole",
              acctInfo.data
            );
            results.push({ account: decoded as MemberRoleAccount, pubkey });
          } catch {
            // skip decode errors
          }
        }

        if (!cancelled) setMembers(results);
      } catch (err: any) {
        if (!cancelled) {
          setMembers([]);
          setError(err.message || "Failed to fetch members");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [connection, orgPubkey?.toBase58(), refreshCounter]);

  return { members, loading, error };
}
