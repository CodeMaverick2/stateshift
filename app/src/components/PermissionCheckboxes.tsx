import { PERMISSIONS, PERM_ADMIN } from "../constants";
import { getPermissionColor } from "../permissions";

interface Props {
  value: number;
  onChange: (mask: number) => void;
}

export default function PermissionCheckboxes({ value, onChange }: Props) {
  const isAdmin = value === PERM_ADMIN;

  function toggle(permValue: number) {
    if (isAdmin) {
      onChange(value & ~permValue);
    } else {
      onChange(value ^ permValue);
    }
  }

  function toggleAdmin() {
    onChange(isAdmin ? 0 : PERM_ADMIN);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {PERMISSIONS.map((p) => {
          const checked = isAdmin || (value & p.value) === p.value;
          const colors = getPermissionColor(p.name);
          return (
            <label
              key={p.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${
                checked
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.04]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.value)}
                className="sr-only"
              />
              <span
                className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
                  checked ? `${colors.border} ${colors.bg}` : "border-slate-600"
                }`}
              >
                {checked && (
                  <svg
                    className="w-2 h-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              {p.name}
            </label>
          );
        })}
      </div>
      <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all text-xs bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 text-purple-300">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={toggleAdmin}
          className="sr-only"
        />
        <span
          className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
            isAdmin ? "border-purple-400 bg-purple-500/30" : "border-slate-600"
          }`}
        >
          {isAdmin && (
            <svg
              className="w-2 h-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
        ADMIN (all permissions)
      </label>
      <p className="text-xs text-slate-600">
        Bitmask: 0x{value.toString(16).padStart(4, "0")}
      </p>
    </div>
  );
}
