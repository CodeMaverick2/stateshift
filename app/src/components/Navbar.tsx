import NetworkBadge from "./NetworkBadge";
import WalletButton from "./WalletButton";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-2xl bg-[#050a18]/70 border-b border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shield outline */}
                <path d="M12 2L4 6V12C4 17 7.6 21.5 12 22.5C16.4 21.5 20 17 20 12V6L12 2Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(255,255,255,0.1)"/>
                {/* Shift arrows */}
                <path d="M12 8V16M12 8L9 11M12 8L15 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
