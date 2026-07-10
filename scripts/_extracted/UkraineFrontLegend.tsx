"use client";

type UkraineFrontLegendProps = {
  visible: boolean;
  controlDate: string | null;
  lodLabel?: string | null;
  compact?: boolean;
};

function Swatch({
  label,
  detail,
  color,
}: {
  label: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-3.5 w-6 shrink-0 rounded-sm border border-white/20 shadow-inner"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0">
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}

function AdvanceSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative h-0.5 w-6 shrink-0 overflow-hidden rounded-full">
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 8px)`,
          }}
        />
      </span>
      <span className="text-sky-50/90">{label}</span>
    </div>
  );
}

export function UkraineFrontLegendContent({
  controlDate,
  lodLabel,
  compact = false,
}: Omit<UkraineFrontLegendProps, "visible">) {
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
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
        <Swatch label="RU 주장" detail="분홍 면" color="rgba(244,140,150,0.72)" />
        <Swatch label="UA 주장" detail="청색 전선" color="rgba(56,189,248,0.58)" />
        <Swatch label="경합" detail="주황 형광" color="rgba(255,120,0,0.78)" />
      </div>
      <div className={`flex flex-wrap gap-x-4 gap-y-1.5 ${compact ? "pt-0.5" : "border-t border-sky-300/10 pt-2"}`}>
        <AdvanceSwatch label="UA 진격" color="rgba(255,160,0,0.95)" />
        <AdvanceSwatch label="RU 압박" color="rgba(255,90,40,0.9)" />
        {!compact && (
          <>
            <span className="text-sky-100/45">·</span>
            <span className="text-sky-100/55">요충지·대도시 노랑 · 전선 마을 흰색</span>
          </>
        )}
      </div>
    </div>
  );
}

/** 우크라이나 전선 레이어 ON 시 지도 위에 함께 뜨는 범례 패널 */
export function UkraineFrontLegend({
  visible,
  controlDate,
  lodLabel,
}: UkraineFrontLegendProps) {
  return (
    <div
      className={`pointer-events-none absolute bottom-[4.75rem] left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-300 ease-out ${
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
