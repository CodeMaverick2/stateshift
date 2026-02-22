import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { OrganizationAccount } from "../types";
import { findConfigPda, findOrgPda } from "../pda";
import { getProgram } from "../program";

export interface OrgEntry {
  account: OrganizationAccount;
  pubkey: PublicKey;
  orgId: number;
}

export function useOrganizations(orgCount: number, refreshCounter: number) {
  const { connection } = useConnection();
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrgs() {
      if (orgCount === 0) {
        setOrgs([]);
        setLoading(false);
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

        const results: OrgEntry[] = [];
        for (let i = 0; i < orgCount; i++) {
          try {
            const [orgPda] = findOrgPda(i);
            const data = await (program.account as any).organization.fetch(
              orgPda
            );
            results.push({
              account: data as OrganizationAccount,
              pubkey: orgPda,
              orgId: i,
            });
          } catch {
            // skip orgs that can't be fetched
          }
        }

        if (!cancelled) setOrgs(results);
      } catch {
        if (!cancelled) setOrgs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrgs();
    return () => {
      cancelled = true;
    };
  }, [connection, orgCount, refreshCounter]);

  return { orgs, loading };
}
