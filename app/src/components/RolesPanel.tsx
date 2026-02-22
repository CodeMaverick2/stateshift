import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { RoleEntry } from "../hooks/useRoles";
import GlassCard from "./GlassCard";
import RoleCard from "./RoleCard";
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  orgPubkey: PublicKey | null;
  refreshCounter: number;
  roles: RoleEntry[];
  loading: boolean;
}

const icon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function RolesPanel({ orgPubkey, roles, loading }: Props) {
  const [search, setSearch] = useState("");

  const filtered = roles.filter((r) =>
    r.account.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <GlassCard title="Roles" icon={icon}>
      {!orgPubkey ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-slate-500 text-xs">Click an organization to view roles</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : roles.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No roles in this organization
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
            />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No matching roles</p>
            ) : (
              filtered.map((r) => (
                <RoleCard key={r.pubkey.toBase58()} role={r} />
              ))
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
