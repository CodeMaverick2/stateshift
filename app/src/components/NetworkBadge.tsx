export default function NetworkBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-glow" />
      Devnet
    </span>
  );
}
