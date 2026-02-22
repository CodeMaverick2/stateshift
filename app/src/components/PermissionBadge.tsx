import { getPermissionColor } from "../permissions";

interface Props {
  name: string;
}

export default function PermissionBadge({ name }: Props) {
  const colors = getPermissionColor(name);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {name}
    </span>
  );
}
