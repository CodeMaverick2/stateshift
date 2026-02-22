import { useState, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

import { DEVNET_RPC } from "./constants";
import { useRefresh } from "./hooks/useRefresh";
import { useTransactionLog } from "./hooks/useTransactionLog";
import { useConfig } from "./hooks/useConfig";
import { useOrganizations } from "./hooks/useOrganizations";
import { useRoles } from "./hooks/useRoles";
import { useMembers } from "./hooks/useMembers";
import { findOrgPda } from "./pda";
import { ToastProvider } from "./components/Toast";

import Navbar from "./components/Navbar";
import SystemOverview from "./components/SystemOverview";
import OrganizationsPanel from "./components/OrganizationsPanel";
import RolesPanel from "./components/RolesPanel";
import MembersPanel from "./components/MembersPanel";
import ActionPanel from "./components/ActionPanel";
import PermissionTestPanel from "./components/PermissionTestPanel";
import TransactionLog from "./components/TransactionLog";

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

      <div className="relative z-10 min-h-screen">
        <Navbar />

        <main className="max-w-[1400px] mx-auto px-6 py-8">
          {/* System Overview */}
          <div className="mb-8 animate-slide-up">
            <SystemOverview refreshCounter={refreshCounter} />
          </div>

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
