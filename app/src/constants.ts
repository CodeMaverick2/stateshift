import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "4ECHQUfa66A4U8fL7kbrM9hMfWXwEXi8z75Ds3EW6MUb"
);

export const DEVNET_RPC = "https://api.devnet.solana.com";

export const PERM_READ = 1;
export const PERM_WRITE = 2;
export const PERM_DELETE = 4;
export const PERM_MANAGE_ROLES = 8;
export const PERM_MANAGE_MEMBERS = 16;
export const PERM_TRANSFER = 32;
export const PERM_ADMIN = 0xffff;

export const PERMISSIONS = [
  { name: "READ", value: PERM_READ },
  { name: "WRITE", value: PERM_WRITE },
  { name: "DELETE", value: PERM_DELETE },
  { name: "MANAGE_ROLES", value: PERM_MANAGE_ROLES },
  { name: "MANAGE_MEMBERS", value: PERM_MANAGE_MEMBERS },
  { name: "TRANSFER", value: PERM_TRANSFER },
] as const;
