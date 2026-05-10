import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue }: KPICardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[var(--navy)]">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          {trendValue && (
            <span
              className={`mt-2 inline-block text-xs font-medium ${
                trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-gray-500"
              }`}
            >
              {trendValue}
            </span>
          )}
        </div>
        <div className="rounded-lg bg-[var(--accent)]/10 p-2.5">
          <Icon className="h-5 w-5 text-[var(--accent-dark)]" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
