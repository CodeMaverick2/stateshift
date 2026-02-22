import { ReactNode } from "react";

interface Props {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function GlassCard({
  title,
  icon,
  children,
  className = "",
  glow = false,
}: Props) {
  return (
    <div className={`${glow ? "glass-card-glow" : "glass-card"} ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
          {icon && (
            <span className="text-purple-400/80">{icon}</span>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
