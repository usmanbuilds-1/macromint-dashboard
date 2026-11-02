import type { NutrientRecord } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

/** Large circular calorie progress — the hero of the Today screen. */
export function CalorieRing({
  consumed,
  target,
  size = 168,
}: {
  consumed: number;
  target: number;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const remaining = Math.round(target - consumed);
  const over = remaining < 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--macro-fat)" : "var(--primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums tracking-tight", over && "text-macro-fat")}>
          {over ? `+${formatNumber(Math.abs(remaining))}` : formatNumber(remaining)}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {over ? "kcal over" : "kcal left"}
        </span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  target,
  colorClass,
}: {
  label: string;
  value: number;
  target: number;
  colorClass: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{formatNumber(value)}</span>
          {" / "}
          {formatNumber(target)} g
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function NutrientLine({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">
        {value == null ? (
          <span className="text-muted-foreground/60">Not available</span>
        ) : (
          `${formatNumber(value, unit === "g" ? 1 : 0)} ${unit}`
        )}
      </span>
    </div>
  );
}

/** kcal from a nutrient record, null-safe. */
export function kcalOf(rec: NutrientRecord): number {
  return typeof rec.kcal === "number" ? rec.kcal : 0;
}
