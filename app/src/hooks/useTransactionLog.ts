import { useState, useCallback } from "react";
import { TransactionEntry } from "../types";

export function useTransactionLog() {
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);

  const addTransaction = useCallback(
    (sig: string, description: string, status: "success" | "error") => {
      setTransactions((prev) => [
        { sig, description, status, timestamp: Date.now() },
        ...prev.slice(0, 19),
      ]);
    },
    []
  );

  return { transactions, addTransaction };
}
