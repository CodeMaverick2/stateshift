import { useState, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

import { DEVNET_RPC, PROGRAM_ID } from "./constants";
import { useRefresh } from "./hooks/useRefresh";
import { useTransactionLog } from "./hooks/useTransactionLog";
import { useConfig } from "./hooks/useConfig";
import { useOrganizations } from "./hooks/useOrganizations";
import { useRoles } from "./hooks/useRoles";
import { useMembers } from "./hooks/useMembers";
import { MemberEntry } from "./hooks/useMembers";
import { RoleEntry } from "./hooks/useRoles";
import { findOrgPda } from "./pda";
import { decomposePermissions } from "./permissions";
import { ToastProvider } from "./components/Toast";
import PermissionBadge from "./components/PermissionBadge";

import Navbar from "./components/Navbar";
import SystemOverview from "./components/SystemOverview";
import OrganizationsPanel from "./components/OrganizationsPanel";
import RolesPanel from "./components/RolesPanel";
import MembersPanel from "./components/MembersPanel";
import ActionPanel from "./components/ActionPanel";
import PermissionTestPanel from "./components/PermissionTestPanel";
import TransactionLog from "./components/TransactionLog";

function YourRoleBanner({
  members,
  roles,
}: {
  members: MemberEntry[];
  roles: RoleEntry[];
}) {
  const { publicKey } = useWallet();
  if (!publicKey || members.length === 0) return null;

  const myMembership = members.find(
    (m) => m.account.user.toBase58() === publicKey.toBase58() && m.account.isActive
  );
  if (!myMembership) return null;

  const role = roles.find(
    (r) => r.pubkey.toBase58() === myMembership.account.role.toBase58()
  );
  if (!role) return null;

  const permNames = decomposePermissions(role.account.permissions);

  return (
    <div className="mb-6 animate-fade-in">
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">Your Role</p>
          <p className="text-sm font-semibold text-white truncate">{role.account.name}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {permNames.map((name) => (
            <PermissionBadge key={name} name={name} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { refreshCounter, triggerRefresh } = useRefresh();
  const { transactions, addTransaction } = useTransactionLog();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const { config } = useConfig(refreshCounter);
  const orgCount = config?.orgCount.toNumber() ?? 0;
  const { orgs, loading: orgsLoading } = useOrganizations(
    orgCount,
    refreshCounter
  );

  const selectedOrgPubkey = useMemo(() => {
    if (selectedOrgId === null) return null;
    return findOrgPda(selectedOrgId)[0];
  }, [selectedOrgId]);

  const { roles, loading: rolesLoading } = useRoles(
    selectedOrgPubkey,
    refreshCounter
  );
  const { members, loading: membersLoading } = useMembers(
    selectedOrgPubkey,
    refreshCounter
  );

  return (
    <>
      {/* Animated background */}
      <div className="bg-scene">
        <div className="bg-orb-3" />
      </div>
      <div className="bg-grid" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="max-w-[1400px] mx-auto px-6 py-8 flex-1 w-full">
          {/* Dashboard heading + refresh */}
          <div className="flex items-center gap-3 mb-6 animate-slide-up">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <button
              onClick={triggerRefresh}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30 transition-all group"
              title="Refresh data"
            >
              <svg className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* System Overview */}
          <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
            <SystemOverview refreshCounter={refreshCounter} />
          </div>

          {/* Your Role Banner */}
          {selectedOrgId !== null && (
            <YourRoleBanner members={members} roles={roles} />
          )}

          {/* Main 3-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Organizations */}
            <div className="lg:col-span-4 animate-slide-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
              <OrganizationsPanel
                orgCount={orgCount}
                selectedOrgId={selectedOrgId}
                onSelect={setSelectedOrgId}
                refreshCounter={refreshCounter}
                orgs={orgs}
                loading={orgsLoading}
              />
            </div>

            {/* Roles + Members */}
            <div className="lg:col-span-4 space-y-6 animate-slide-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
              <RolesPanel
                orgPubkey={selectedOrgPubkey}
                refreshCounter={refreshCounter}
                roles={roles}
                loading={rolesLoading}
              />
              <MembersPanel
                orgPubkey={selectedOrgPubkey}
                refreshCounter={refreshCounter}
                members={members}
                roles={roles}
                loading={membersLoading}
              />
            </div>

            {/* Actions + Permission Tester */}
            <div className="lg:col-span-4 space-y-6 animate-slide-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
              <ActionPanel
                onSuccess={(sig, desc) => {
                  addTransaction(sig, desc, "success");
                  triggerRefresh();
                }}
                onError={(desc) => addTransaction("", desc, "error")}
              />
              <PermissionTestPanel
                onResult={(sig, desc, status) =>
                  addTransaction(sig, desc, status)
                }
              />
            </div>
          </div>

          {/* Transaction Log */}
          <div className="animate-slide-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
            <TransactionLog transactions={transactions} />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06] mt-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">Program</span>
              <a
                href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-slate-500 hover:text-purple-400 transition-colors"
              >
                {PROGRAM_ID.toBase58().slice(0, 16)}...
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Built on</span>
              <span className="font-semibold gradient-text">Solana</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/CodeMaverick2/stateshift"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-purple-400 transition-colors"
                title="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.806 1.304 3.49.997.108-.775.42-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.838 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.604-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://x.com/TejasGhatule"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-purple-400 transition-colors"
                title="Twitter / X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function App() {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ToastProvider>
            <Dashboard />
          </ToastProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
