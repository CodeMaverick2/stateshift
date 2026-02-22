import { TransactionEntry } from "../types";
import GlassCard from "./GlassCard";
import { explorerTxUrl } from "../explorer";

interface Props {
  transactions: TransactionEntry[];
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const icon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadLogs(transactions: TransactionEntry[]) {
  const lines = transactions.map(
    (tx) =>
      [
        new Date(tx.timestamp).toISOString(),
        tx.status,
        escapeCsv(tx.description),
        tx.sig || "",
      ].join(",")
  );
  const csv = ["Timestamp,Status,Description,Signature", ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stateshift-txlog-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionLog({ transactions }: Props) {
  return (
    <GlassCard
      title="Transaction Log"
      icon={icon}
      headerRight={
        transactions.length > 0 ? (
          <button
            onClick={() => downloadLogs(transactions)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-purple-400 transition-colors bg-white/[0.04] hover:bg-purple-500/10 border border-white/[0.06] hover:border-purple-500/20 rounded-lg px-2.5 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        ) : undefined
      }
    >
      {transactions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-600 text-sm">
            Transactions will appear here as you interact with the program
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
          {transactions.map((tx) => (
            <div
              key={`${tx.sig}-${tx.timestamp}`}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-sm animate-fade-in hover:bg-white/[0.04] transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  tx.status === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/20"
                    : "bg-red-500/15 border border-red-500/20"
                }`}
              >
                {tx.status === "success" ? (
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              <span className="text-slate-300 flex-1 truncate text-xs" title={tx.description}>
                {tx.description}
              </span>

              {tx.sig && (
                <a
                  href={explorerTxUrl(tx.sig)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-mono flex-shrink-0 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/15 hover:border-purple-500/30 transition-colors"
                >
                  {tx.sig.slice(0, 8)}...
                </a>
              )}

              <span className="text-[11px] text-slate-600 flex-shrink-0 tabular-nums">
                {timeAgo(tx.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
