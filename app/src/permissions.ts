import { PERMISSIONS, PERM_ADMIN } from "./constants";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> =
  {
    READ: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    WRITE: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    DELETE: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
    },
    MANAGE_ROLES: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      border: "border-purple-500/30",
    },
    MANAGE_MEMBERS: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
    },
    TRANSFER: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
    },
    ADMIN: {
      bg: "bg-gradient-to-r from-purple-500/20 to-blue-500/20",
      text: "text-white",
      border: "border-purple-500/30",
    },
  };

export function decomposePermissions(mask: number): string[] {
  if (mask === PERM_ADMIN) return ["ADMIN"];
  return PERMISSIONS.filter((p) => (mask & p.value) === p.value).map(
    (p) => p.name
  );
}

export function getPermissionColor(name: string) {
  return COLOR_MAP[name] || COLOR_MAP.READ;
}

export function formatPermissionMask(mask: number): string {
  if (mask === PERM_ADMIN) return "ADMIN (all)";
  const names = decomposePermissions(mask);
  return names.length > 0
    ? `${names.join(", ")} (0x${mask.toString(16).padStart(4, "0")})`
    : `0x${mask.toString(16).padStart(4, "0")}`;
}
