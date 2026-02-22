import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { ConfigAccount } from "../types";
import { findConfigPda } from "../pda";
import { getProgram } from "../program";

export function useConfig(refreshCounter: number) {
  const { connection } = useConnection();
  const [config, setConfig] = useState<ConfigAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      setLoading(true);
      setError(null);
      try {
        // Use a read-only provider (no wallet needed for reads)
        const dummyWallet = {
          publicKey: findConfigPda()[0],
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any) => txs,
        };
        const provider = new AnchorProvider(connection, dummyWallet as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);
        const [configPda] = findConfigPda();
        const data = await (program.account as any).config.fetch(configPda);
        if (!cancelled) setConfig(data as ConfigAccount);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to fetch config");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => {
      cancelled = true;
    };
  }, [connection, refreshCounter]);

  return { config, loading, error };
}
