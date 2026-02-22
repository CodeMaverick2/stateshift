interface Props {
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };

export default function LoadingSpinner({ size = "md" }: Props) {
  return (
    <div className={`${sizes[size]} animate-spin-slow`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="url(#spinner-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="50 50"
        />
        <defs>
          <linearGradient id="spinner-grad" x1="0" y1="0" x2="24" y2="24">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
