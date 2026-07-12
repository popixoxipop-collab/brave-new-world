"use client";

import { MapOverlayLegendPanel } from "@/components/MapOverlayLegendPanel";
import { TENSION_GRADE_STYLES, type TensionGrade } from "@/lib/disputeHatch";

type DisputeZoneLegendProps = {
  open: boolean;
  onClose: () => void;
};

function hatchBackground(style: "slash" | "backslash" | "horizontal" | "cross", color: string) {
  const line = `linear-gradient(90deg, ${color} 0 1.5px, transparent 1.5px 5px)`;
  if (style === "horizontal") {
    return `repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px 5px)`;
  }
  if (style === "slash") {
    return `repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 5px)`;
  }
  if (style === "backslash") {
    return `repeating-linear-gradient(45deg, ${color} 0 1px, transparent 1px 5px)`;
  }
  return `${line}, repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 5px), repeating-linear-gradient(45deg, ${color} 0 1px, transparent 1px 5px)`;
}

function HatchSwatch({
  label,
  detail,
  color,
  style,
}: {
  label: string;
  detail: string;
  color: string;
  style: "slash" | "backslash" | "horizontal" | "cross";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="relative h-5 w-7 shrink-0 overflow-hidden rounded border"
        style={{
          borderColor: color.replace(/[\d.]+\)$/, "0.95)"),
          backgroundImage: hatchBackground(style, color),
          backgroundColor: "rgba(10, 24, 48, 0.6)",
        }}
      />
      <span className="min-w-0">
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}

/** 레이어 분리 후 표시 등급 — 전쟁(combat) · 외교(high) */
const LEGEND_GRADES: TensionGrade[] = ["combat", "high"];

export function DisputeZoneLegendContent() {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] leading-relaxed text-sky-100/50">
        전쟁구역(빨강)과 외교적 긴장구역(주황)을 각각 켤 수 있습니다. 사각 틀 안에만 빗금이
        그려지며, 근접 줌에서는 세부 구역 세그먼트가 우선 표시됩니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LEGEND_GRADES.map((grade) => {
          const spec = TENSION_GRADE_STYLES[grade];
          return (
            <HatchSwatch
              key={grade}
              label={grade === "combat" ? "전쟁구역" : "외교적 긴장구역"}
              detail={spec.pattern === "slash" ? "/" : "\\"}
              color={spec.hatch}
              style={spec.pattern}
            />
          );
        })}
      </div>
    </div>
  );
}

export function DisputeZoneLegend({ open, onClose }: DisputeZoneLegendProps) {
  return (
    <MapOverlayLegendPanel
      open={open}
      onClose={onClose}
      title="전쟁·외교 긴장 구역"
      subtitle="마우스 올리기 · 클릭 → 상세"
      accent="orange"
    >
      <DisputeZoneLegendContent />
    </MapOverlayLegendPanel>
  );
}
