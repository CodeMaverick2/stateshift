import { useState } from "react";
import { explorerAddressUrl } from "../explorer";

interface Props {
  address: string;
  truncate?: boolean;
  className?: string;
}

export default function AddressDisplay({
  address,
  truncate = true,
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  const displayed = truncate
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : address;

  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`}>
      <a
        href={explorerAddressUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-purple-400 transition-colors"
      >
        {displayed}
      </a>
      <button
        onClick={copy}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        title="Copy address"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </span>
  );
}
