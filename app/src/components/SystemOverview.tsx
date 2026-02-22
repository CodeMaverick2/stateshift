import { useConfig } from "../hooks/useConfig";
import AddressDisplay from "./AddressDisplay";
import LoadingSpinner from "./LoadingSpinner";
import { PROGRAM_ID } from "../constants";

interface Props {
  refreshCounter: number;
}

export default function SystemOverview({ refreshCounter }: Props) {
  const { config, loading, error } = useConfig(refreshCounter);

  return (
    <div className="glass-card-glow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Overview</h2>
              <p className="text-xs text-slate-500">On-chain RBAC configuration</p>
            </div>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-xs font-medium text-emerald-400">LIVE</span>
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-amber-300 text-sm">
              Config not initialized. Use <span className="font-semibold">Initialize Config</span> in the Actions panel.
            </p>
          </div>
        ) : config ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ "--accent": "#a855f7" } as any}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-medium">
                Super Admin
              </p>
              <AddressDisplay
                address={config.superAdmin.toBase58()}
                className="text-white"
              />
            </div>
            <div className="stat-card p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ "--accent": "#3b82f6" } as any}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-medium">
                Total Organizations
              </p>
              <p className="text-3xl font-bold gradient-text">
                {config.orgCount.toNumber()}
              </p>
            </div>
            <div className="stat-card p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ "--accent": "#06b6d4" } as any}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-medium">
                Program ID
              </p>
              <AddressDisplay
                address={PROGRAM_ID.toBase58()}
                className="text-white"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
