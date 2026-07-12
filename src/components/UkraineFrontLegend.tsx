"use client";

type UkraineFrontLegendProps = {
  visible: boolean;
  controlDate: string | null;
  lodLabel?: string | null;
  compact?: boolean;
  dockLow?: boolean;
};

function LineSwatch({
  label,
  detail,
  color,
  thick = false,
}: {
  label: string;
  detail: string;
  color: string;
  thick?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`shrink-0 rounded-full ${thick ? "h-1 w-6" : "h-0.5 w-6"}`}
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0">
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}

export function UkraineFrontLegendContent({
  controlDate,
  lodLabel,
  compact = false,
}: Omit<UkraineFrontLegendProps, "visible" | "dockLow">) {
  const dateLabel =
    controlDate && /^\d{8}$/.test(controlDate)
      ? `${controlDate.slice(0, 4)}-${controlDate.slice(4, 6)}-${controlDate.slice(6, 8)}`
      : controlDate;

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-300/15 pb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sky-200/75">우크라이나 전선</p>
          <p className="text-[10px] text-sky-100/50">
            VIINA{dateLabel ? ` · ${dateLabel}` : ""}
            {lodLabel ? ` · ${lodLabel}` : ""}
          </p>
        </div>
      )}
      <LineSwatch label="점령 경계 전선" detail="지표면 · 진한 빨강" color="rgba(220,38,38,1)" thick />
      <div className="mt-1.5">
        <LineSwatch label="UA 경계 전선" detail="지표면 · 파랑" color="rgba(37,99,235,0.95)" />
      </div>
    </div>
  );
}

export function UkraineFrontLegend({
  visible,
  controlDate,
  lodLabel,
  dockLow = false,
}: UkraineFrontLegendProps) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-300 ease-out ${
        dockLow ? "bottom-4" : "bottom-[var(--bottom-intel-stack-clearance)]"
      } ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="rounded-2xl border border-sky-300/20 bg-[#0a1830]/78 px-4 py-3 text-[11px] text-sky-100/85 shadow-xl backdrop-blur-md">
        <UkraineFrontLegendContent controlDate={controlDate} lodLabel={lodLabel} />
      </div>
    </div>
  );
}
