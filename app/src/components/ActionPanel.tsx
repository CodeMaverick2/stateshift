import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "../hooks/useProgram";
import { useToast } from "./Toast";
import GlassCard from "./GlassCard";
import PermissionCheckboxes from "./PermissionCheckboxes";
import LoadingSpinner from "./LoadingSpinner";
import { findOrgPda, findRolePda } from "../pda";
import {
  parsePublicKey,
  validateOrgId,
  validateName,
  validatePermissions,
} from "../validation";

import { initialize } from "../actions/initialize";
import { createOrganization } from "../actions/createOrganization";
import { createRole } from "../actions/createRole";
import { assignRole } from "../actions/assignRole";
import { revokeRole } from "../actions/revokeRole";
import { updateRolePermissions } from "../actions/updateRolePermissions";
import { transferOrgAdmin } from "../actions/transferOrgAdmin";
import { deactivateOrg } from "../actions/deactivateOrg";
import { closeRole } from "../actions/closeRole";

interface Props {
  onSuccess: (sig: string, description: string) => void;
  onError: (description: string) => void;
}

function extractError(err: any): string {
  // Anchor program error
  if (err.error?.errorCode) {
    return err.error.errorMessage || err.error.errorCode.code;
  }
  // Parse logs for Anchor error messages
  if (err.logs) {
    const anchorErr = err.logs.find((l: string) => l.includes("Error Code:"));
    if (anchorErr) {
      const match = anchorErr.match(/Error Message:\s*(.+)/);
      if (match) return match[1].trim().replace(/\.$/, "");
    }
  }
  const msg = err.message || "Transaction failed";
  // Friendly mappings for common errors
  if (msg.includes("Account does not exist")) return "Account not found on-chain";
  if (msg.includes("User rejected")) return "Transaction cancelled by user";
  if (msg.includes("Blockhash not found")) return "Transaction expired — please try again";
  if (msg.includes("Insufficient funds")) return "Insufficient SOL for transaction fees";
  if (msg.includes("Invalid public key")) return "Invalid Solana address provided";
  if (msg.includes("base58")) return "Invalid address format — check the pubkey";
  if (msg.includes("already in use")) return "Account already exists on-chain";
  if (msg.includes("custom program error: 0x0")) return "Config already initialized";
  return msg.length > 140 ? msg.slice(0, 137) + "..." : msg;
}

const ICONS: Record<string, JSX.Element> = {
  init: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  "create-org": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  "create-role": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  "assign-role": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
  "revoke-role": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />,
  "update-perms": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  "transfer-admin": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
  "deactivate-org": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
  "close-role": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
};

export default function ActionPanel({ onSuccess, onError }: Props) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const toast = useToast();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const runningRef = useRef(false);

  const [orgName, setOrgName] = useState("");
  const [orgAdmin, setOrgAdmin] = useState("");
  const [roleOrgId, setRoleOrgId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [rolePerms, setRolePerms] = useState(0);
  const [assignOrgId, setAssignOrgId] = useState("");
  const [assignRoleName, setAssignRoleName] = useState("");
  const [assignUser, setAssignUser] = useState("");
  const [revokeOrgId, setRevokeOrgId] = useState("");
  const [revokeRoleName, setRevokeRoleName] = useState("");
  const [revokeUser, setRevokeUser] = useState("");
  const [updateOrgId, setUpdateOrgId] = useState("");
  const [updateRoleName, setUpdateRoleName] = useState("");
  const [updatePerms, setUpdatePerms] = useState(0);
  const [transferOrgId, setTransferOrgId] = useState("");
  const [transferNewAdmin, setTransferNewAdmin] = useState("");
  const [deactivateOrgId, setDeactivateOrgId] = useState("");
  const [closeOrgId, setCloseOrgId] = useState("");
  const [closeRoleName, setCloseRoleName] = useState("");
  const [fetchingPerms, setFetchingPerms] = useState(false);

  async function fetchCurrentPerms() {
    if (!program || !updateOrgId || !updateRoleName.trim()) {
      toast.error("Enter Org ID and Role name first");
      return;
    }
    try {
      const oid = validateOrgId(updateOrgId);
      const name = validateName(updateRoleName, "Role name");
      setFetchingPerms(true);
      const [orgPda] = findOrgPda(oid);
      const [rolePda] = findRolePda(orgPda, name);
      const roleAccount = await (program.account as any).role.fetch(rolePda);
      setUpdatePerms(roleAccount.permissions as number);
      toast.info(`Loaded current permissions for "${name}"`);
    } catch (e: any) {
      const msg = e.message || "Failed to fetch role";
      if (msg.includes("Account does not exist")) {
        toast.error("Role not found on-chain");
      } else {
        toast.error(msg);
      }
    } finally {
      setFetchingPerms(false);
    }
  }

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  async function run(fn: () => Promise<string>, description: string) {
    if (!program || !publicKey) {
      toast.error("Connect your wallet first");
      return;
    }
    // Double-submit guard
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    try {
      const sig = await fn();
      toast.success(description);
      onSuccess(sig, description);
    } catch (err: any) {
      const msg = extractError(err);
      toast.error(msg);
      onError(`Failed: ${description} — ${msg}`);
    } finally {
      setLoading(false);
      runningRef.current = false;
    }
  }

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all";
  const btnClass =
    "w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-blue-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2";

  const sections = [
    {
      id: "init",
      title: "Initialize Config",
      render: () => (
        <button
          className={btnClass}
          disabled={loading}
          onClick={() => run(() => initialize(program!, publicKey!), "Initialized config")}
        >
          {loading && <LoadingSpinner size="sm" />}
          Initialize
        </button>
      ),
    },
    {
      id: "create-org",
      title: "Create Organization",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Organization name (max 32 chars)" value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={32} />
          <input className={inputClass} placeholder="Admin pubkey (blank = your wallet)" value={orgAdmin} onChange={(e) => setOrgAdmin(e.target.value)} />
          <button className={btnClass} disabled={loading || !orgName.trim()}
            onClick={() => {
              try {
                const name = validateName(orgName, "Organization name");
                const admin = orgAdmin.trim() ? parsePublicKey(orgAdmin) : publicKey!;
                run(() => createOrganization(program!, publicKey!, name, admin), `Created org "${name}"`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Create Organization
          </button>
        </div>
      ),
    },
    {
      id: "create-role",
      title: "Create Role",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={roleOrgId} onChange={(e) => setRoleOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="Role name (max 32 chars)" value={roleName} onChange={(e) => setRoleName(e.target.value)} maxLength={32} />
          <PermissionCheckboxes value={rolePerms} onChange={setRolePerms} />
          <button className={btnClass} disabled={loading || !roleOrgId || !roleName.trim() || !rolePerms}
            onClick={() => {
              try {
                const oid = validateOrgId(roleOrgId);
                const name = validateName(roleName, "Role name");
                const perms = validatePermissions(rolePerms);
                run(() => createRole(program!, publicKey!, oid, name, perms), `Created role "${name}"`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Create Role
          </button>
        </div>
      ),
    },
    {
      id: "assign-role",
      title: "Assign Role",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={assignOrgId} onChange={(e) => setAssignOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="Role name" value={assignRoleName} onChange={(e) => setAssignRoleName(e.target.value)} />
          <input className={inputClass} placeholder="User pubkey" value={assignUser} onChange={(e) => setAssignUser(e.target.value)} />
          <button className={btnClass} disabled={loading || !assignOrgId || !assignRoleName.trim() || !assignUser.trim()}
            onClick={() => {
              try {
                const oid = validateOrgId(assignOrgId);
                const name = validateName(assignRoleName, "Role name");
                const user = parsePublicKey(assignUser);
                run(() => assignRole(program!, publicKey!, oid, name, user), `Assigned role "${name}"`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Assign Role
          </button>
        </div>
      ),
    },
    {
      id: "revoke-role",
      title: "Revoke Role",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={revokeOrgId} onChange={(e) => setRevokeOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="Role name" value={revokeRoleName} onChange={(e) => setRevokeRoleName(e.target.value)} />
          <input className={inputClass} placeholder="User pubkey" value={revokeUser} onChange={(e) => setRevokeUser(e.target.value)} />
          <button className={btnClass} disabled={loading || !revokeOrgId || !revokeRoleName.trim() || !revokeUser.trim()}
            onClick={() => {
              try {
                const oid = validateOrgId(revokeOrgId);
                const name = validateName(revokeRoleName, "Role name");
                const user = parsePublicKey(revokeUser);
                run(() => revokeRole(program!, publicKey!, oid, name, user), `Revoked role "${name}"`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Revoke Role
          </button>
        </div>
      ),
    },
    {
      id: "update-perms",
      title: "Update Permissions",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={updateOrgId} onChange={(e) => setUpdateOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="Role name" value={updateRoleName} onChange={(e) => setUpdateRoleName(e.target.value)} />
          <button
            type="button"
            onClick={fetchCurrentPerms}
            disabled={fetchingPerms || !updateOrgId || !updateRoleName.trim()}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-purple-300 bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {fetchingPerms ? <LoadingSpinner size="sm" /> : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Load current permissions
          </button>
          <PermissionCheckboxes value={updatePerms} onChange={setUpdatePerms} />
          <button className={btnClass} disabled={loading || !updateOrgId || !updateRoleName.trim() || !updatePerms}
            onClick={() => {
              try {
                const oid = validateOrgId(updateOrgId);
                const name = validateName(updateRoleName, "Role name");
                const selectedPerms = validatePermissions(updatePerms);
                run(async () => {
                  // Fetch current on-chain permissions and merge with user selection
                  const [orgPda] = findOrgPda(oid);
                  const [rolePda] = findRolePda(orgPda, name);
                  const roleAccount = await (program!.account as any).role.fetch(rolePda);
                  const currentPerms = roleAccount.permissions as number;
                  const mergedPerms = currentPerms | selectedPerms;
                  return updateRolePermissions(program!, publicKey!, oid, name, mergedPerms);
                }, `Updated "${name}" permissions`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Update Permissions
          </button>
        </div>
      ),
    },
    {
      id: "transfer-admin",
      title: "Transfer Admin",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={transferOrgId} onChange={(e) => setTransferOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="New admin pubkey" value={transferNewAdmin} onChange={(e) => setTransferNewAdmin(e.target.value)} />
          <button className={btnClass} disabled={loading || !transferOrgId || !transferNewAdmin.trim()}
            onClick={() => {
              try {
                const oid = validateOrgId(transferOrgId);
                const admin = parsePublicKey(transferNewAdmin);
                run(() => transferOrgAdmin(program!, publicKey!, oid, admin), `Transferred admin for org ${oid}`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Transfer Admin
          </button>
        </div>
      ),
    },
    {
      id: "deactivate-org",
      title: "Deactivate Org",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={deactivateOrgId} onChange={(e) => setDeactivateOrgId(e.target.value)} type="number" min="0" />
          <button className={btnClass} disabled={loading || !deactivateOrgId}
            onClick={() => {
              try {
                const oid = validateOrgId(deactivateOrgId);
                run(() => deactivateOrg(program!, publicKey!, oid), `Deactivated org ${oid}`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Deactivate
          </button>
        </div>
      ),
    },
    {
      id: "close-role",
      title: "Close Role",
      render: () => (
        <div className="space-y-2.5">
          <input className={inputClass} placeholder="Org ID" value={closeOrgId} onChange={(e) => setCloseOrgId(e.target.value)} type="number" min="0" />
          <input className={inputClass} placeholder="Role name" value={closeRoleName} onChange={(e) => setCloseRoleName(e.target.value)} />
          <button className={btnClass} disabled={loading || !closeOrgId || !closeRoleName.trim()}
            onClick={() => {
              try {
                const oid = validateOrgId(closeOrgId);
                const name = validateName(closeRoleName, "Role name");
                run(() => closeRole(program!, publicKey!, oid, name), `Closed role "${name}"`);
              } catch (e: any) { toast.error(e.message); }
            }}>
            {loading && <LoadingSpinner size="sm" />}Close Role
          </button>
        </div>
      ),
    },
  ];

  const actionIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  return (
    <GlassCard title="Actions" icon={actionIcon}>
      {!publicKey ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-slate-500 text-xs">Connect wallet to perform actions</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {sections.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => toggle(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  openSection === s.id
                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {ICONS[s.id]}
                </svg>
                <span className="flex-1 text-left">{s.title}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-600 ${
                    openSection === s.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openSection === s.id && (
                <div className="px-3 py-3 animate-fade-in">{s.render()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
