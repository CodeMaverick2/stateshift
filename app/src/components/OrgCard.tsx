import { OrgEntry } from "../hooks/useOrganizations";
import AddressDisplay from "./AddressDisplay";
import StatusBadge from "./StatusBadge";

interface Props {
  org: OrgEntry;
  selected: boolean;
  onClick: () => void;
}

export default function OrgCard({ org, selected, onClick }: Props) {
  const { account, orgId } = org;

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
        selected
          ? "bg-gradient-to-br from-purple-500/15 to-blue-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      {/* Glow effect on selected */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                selected
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-white/[0.06] text-slate-400 border border-white/[0.08] group-hover:bg-white/[0.1]"
              }`}
            >
              {orgId}
            </div>
            <h4 className="font-semibold text-white truncate text-sm">
              {account.name}
            </h4>
          </div>
          <StatusBadge active={account.isActive} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {account.roleCount} roles
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {account.memberCount} members
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
          <span>Admin:</span>
          <AddressDisplay
            address={account.admin.toBase58()}
            className="!text-xs text-slate-500"
          />
        </div>
      </div>
    </button>
  );
}
