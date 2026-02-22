import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";
import { PROGRAM_ID } from "./constants";

export function findConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

export function findOrgPda(orgId: number | BN): [PublicKey, number] {
  const bn = typeof orgId === "number" ? new BN(orgId) : orgId;
  return PublicKey.findProgramAddressSync(
    [Buffer.from("org"), bn.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export function findRolePda(
  orgPubkey: PublicKey,
  roleName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("role"), orgPubkey.toBuffer(), Buffer.from(roleName)],
    PROGRAM_ID
  );
}

export function findMemberRolePda(
  orgPubkey: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("member"), orgPubkey.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}
