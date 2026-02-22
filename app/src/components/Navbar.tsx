import NetworkBadge from "./NetworkBadge";
import WalletButton from "./WalletButton";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-2xl bg-[#050a18]/70 border-b border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
              S
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 blur-md opacity-30" />
          </div>
          <span className="text-xl font-bold gradient-text tracking-tight">
            StateShift
          </span>
          <span className="hidden sm:inline text-xs text-slate-600 font-medium ml-1 mt-0.5">
            RBAC Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <NetworkBadge />
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
