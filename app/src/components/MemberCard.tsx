import { MemberEntry } from "../hooks/useMembers";
import { RoleEntry } from "../hooks/useRoles";
import AddressDisplay from "./AddressDisplay";
import StatusBadge from "./StatusBadge";
import PermissionBadge from "./PermissionBadge";
import { decomposePermissions } from "../permissions";

interface Props {
  member: MemberEntry;
  roles: RoleEntry[];
}

export default function MemberCard({ member, roles }: Props) {
  const { account } = member;
  const role = roles.find(
    (r) => r.pubkey.toBase58() === account.role.toBase58()
  );

  const assignedDate = new Date(
    account.assignedAt.toNumber() * 1000
  ).toLocaleDateString();

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <AddressDisplay
          address={account.user.toBase58()}
          className="text-white"
        />
        <StatusBadge active={account.isActive} />
      </div>

      {role && (
        <div className="mb-2">
          <span className="text-xs text-slate-500 mr-1">Role:</span>
          <span className="text-xs text-white font-medium">
            {role.account.name}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {decomposePermissions(role.account.permissions).map((p) => (
              <PermissionBadge key={p} name={p} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Assigned {assignedDate}</span>
        <span>by</span>
        <AddressDisplay
          address={account.assignedBy.toBase58()}
          className="!text-xs text-slate-500"
        />
      </div>
    </div>
  );
}
