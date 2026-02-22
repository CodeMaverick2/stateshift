export function explorerTxUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddressUrl(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}
