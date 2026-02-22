import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface ConfigAccount {
  superAdmin: PublicKey;
  orgCount: BN;
  bump: number;
}

export interface OrganizationAccount {
  admin: PublicKey;
  orgId: BN;
  name: string;
  roleCount: number;
  memberCount: number;
  isActive: boolean;
  bump: number;
}

export interface RoleAccount {
  org: PublicKey;
  name: string;
  permissions: number;
  memberCount: number;
  bump: number;
}

export interface MemberRoleAccount {
  user: PublicKey;
  org: PublicKey;
  role: PublicKey;
  isActive: boolean;
  assignedAt: BN;
  assignedBy: PublicKey;
  bump: number;
}

export interface TransactionEntry {
  sig: string;
  description: string;
  status: "success" | "error";
  timestamp: number;
}
