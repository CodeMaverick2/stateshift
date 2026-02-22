import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { MemberEntry } from "../hooks/useMembers";
import { RoleEntry } from "../hooks/useRoles";
import GlassCard from "./GlassCard";
import MemberCard from "./MemberCard";
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  orgPubkey: PublicKey | null;
  refreshCounter: number;
  members: MemberEntry[];
  roles: RoleEntry[];
  loading: boolean;
}

const icon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export default function MembersPanel({ orgPubkey, members, roles, loading }: Props) {
  const [search, setSearch] = useState("");

  const filtered = members.filter(
    (m) =>
      m.account.user.toBase58().toLowerCase().includes(search.toLowerCase()) ||
      m.pubkey.toBase58().toLowerCase().includes(search.toLowerCase())
  );

  return (
    <GlassCard title="Members" icon={icon}>
      {!orgPubkey ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-slate-500 text-xs">Click an organization to view members</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : members.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No members in this organization
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
            />
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No matching members</p>
            ) : (
              filtered.map((m) => (
                <MemberCard
                  key={m.pubkey.toBase58()}
                  member={m}
                  roles={roles}
                />
              ))
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
