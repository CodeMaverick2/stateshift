import { PublicKey } from "@solana/web3.js";

export function isValidPublicKey(addr: string): boolean {
  if (!addr || !addr.trim()) return false;
  try {
    new PublicKey(addr.trim());
    return true;
  } catch {
    return false;
  }
}

export function parsePublicKey(addr: string): PublicKey {
  const trimmed = addr.trim();
  if (!trimmed) throw new Error("Address cannot be empty");
  try {
    return new PublicKey(trimmed);
  } catch {
    throw new Error("Invalid Solana address — check the format and try again");
  }
}

export function validateOrgId(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Org ID is required");
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error("Org ID must be a non-negative integer");
  }
  if (num > 1_000_000) {
    throw new Error("Org ID is out of range");
  }
  return num;
}

export function validateName(name: string, label: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(`${label} cannot be empty`);
  if (trimmed.length > 32) {
    throw new Error(`${label} must be 32 characters or fewer`);
  }
  return trimmed;
}

export function validatePermissions(perms: number): number {
  if (!Number.isInteger(perms) || perms <= 0 || perms > 0xffff) {
    throw new Error("Select at least one permission");
  }
  return perms;
}
