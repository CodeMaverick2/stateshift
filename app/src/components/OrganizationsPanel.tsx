import { useState } from "react";
import { OrgEntry } from "../hooks/useOrganizations";
import GlassCard from "./GlassCard";
import OrgCard from "./OrgCard";
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  orgCount: number;
  selectedOrgId: number | null;
  onSelect: (orgId: number) => void;
  refreshCounter: number;
  orgs: OrgEntry[];
  loading: boolean;
}

const icon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function OrganizationsPanel({
  orgCount,
  selectedOrgId,
  onSelect,
  refreshCounter,
  orgs,
  loading,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = orgs.filter(
    (o) =>
      o.account.name.toLowerCase().includes(search.toLowerCase()) ||
      o.account.admin.toBase58().toLowerCase().includes(search.toLowerCase())
  );

  return (
    <GlassCard title="Organizations" icon={icon}>
      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No organizations yet</p>
          <p className="text-slate-600 text-xs mt-1">Create one using Actions</p>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search orgs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
            />
          </div>
          <div className="space-y-2 max-h-[470px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No matching organizations</p>
            ) : (
              filtered.map((org) => (
                <OrgCard
                  key={org.orgId}
                  org={org}
                  selected={selectedOrgId === org.orgId}
                  onClick={() => onSelect(org.orgId)}
                />
              ))
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
