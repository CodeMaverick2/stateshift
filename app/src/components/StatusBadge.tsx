interface Props {
  active: boolean;
}

export default function StatusBadge({ active }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        active
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-red-500/15 text-red-400 border-red-500/30"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-400" : "bg-red-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
