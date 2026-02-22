import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "../hooks/useProgram";
import { useToast } from "./Toast";
import { PERMISSIONS } from "../constants";
import { protectedAction } from "../actions/protectedAction";
import { validateOrgId } from "../validation";
import GlassCard from "./GlassCard";
import LoadingSpinner from "./LoadingSpinner";
import { explorerTxUrl } from "../explorer";

interface Props {
  onResult: (
    sig: string,
    description: string,
    status: "success" | "error"
  ) => void;
}

const icon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function PermissionTestPanel({ onResult }: Props) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const toast = useToast();

  const [orgId, setOrgId] = useState("");
  const [selectedPerm, setSelectedPerm] = useState<number>(
    PERMISSIONS[0].value
  );
  const [loading, setLoading] = useState(false);
  const runningRef = useRef(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    sig?: string;
  } | null>(null);

  async function testPermission() {
    if (!program || !publicKey || !orgId) return;
    if (runningRef.current) return;

    let oid: number;
    try {
      oid = validateOrgId(orgId);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    runningRef.current = true;
    setLoading(true);
    setResult(null);
    const permName =
      PERMISSIONS.find((p) => p.value === selectedPerm)?.name || "UNKNOWN";

    try {
      const sig = await protectedAction(
        program,
        publicKey,
        oid,
        selectedPerm
      );
      setResult({
        success: true,
        message: `Access Granted - ${permName} permission verified`,
        sig,
      });
      onResult(sig, `Permission test: ${permName} - GRANTED`, "success");
      toast.success(`${permName} permission verified!`);
    } catch (err: any) {
      let msg =
        err.error?.errorMessage || err.message || "Permission check failed";
      if (msg.includes("Account does not exist")) {
        msg = "No membership found for this wallet in the selected org";
      } else if (msg.includes("Unauthorized")) {
        msg = `Wallet lacks ${permName} permission in this org`;
      }
      setResult({
        success: false,
        message: `Access Denied - ${msg}`,
      });
      onResult("", `Permission test: ${permName} - DENIED`, "error");
    } finally {
      setLoading(false);
      runningRef.current = false;
    }
  }

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all";

  return (
    <GlassCard title="Permission Tester" icon={icon}>
      {!publicKey ? (
        <div className="text-center py-6">
          <p className="text-slate-500 text-xs">
            Connect wallet to test permissions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            className={inputClass}
            placeholder="Org ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            type="number"
            min="0"
          />

          <select
            className={inputClass}
            value={selectedPerm}
            onChange={(e) => setSelectedPerm(Number(e.target.value))}
          >
            {PERMISSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={testPermission}
            disabled={loading || !orgId}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            )}
            Test Permission
          </button>

          {result && (
            <div
              className={`p-4 rounded-xl border animate-fade-in ${
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/25"
                  : "bg-red-500/10 border-red-500/25"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {result.success ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <span
                  className={`text-sm font-medium break-words min-w-0 ${
                    result.success ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {result.message}
                </span>
              </div>
              {result.sig && (
                <a
                  href={explorerTxUrl(result.sig)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block"
                >
                  View on Explorer
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
