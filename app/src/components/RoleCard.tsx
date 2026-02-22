import { RoleEntry } from "../hooks/useRoles";
import PermissionBadge from "./PermissionBadge";
import { decomposePermissions } from "../permissions";

interface Props {
  role: RoleEntry;
}

export default function RoleCard({ role }: Props) {
  const { account } = role;
  const perms = decomposePermissions(account.permissions);

  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all animate-fade-in">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-semibold text-white text-sm">{account.name}</h4>
        </div>
        <span className="text-[10px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
          {account.memberCount} member{account.memberCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {perms.map((p) => (
          <PermissionBadge key={p} name={p} />
        ))}
      </div>
    </div>
  );
}
