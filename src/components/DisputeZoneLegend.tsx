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

const LEGEND_GRADES: TensionGrade[] = ["combat", "gray", "high", "medium", "low"];

export function DisputeZoneLegendContent() {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] leading-relaxed text-sky-100/50">
        각 분쟁·긴장 구역의 사각 틀 안에만 등급별 빗금이 표시됩니다. 색상은 하단 뉴스 범례와
        맞춥니다 — 빨강(전투) · 주황(외교) · 노랑(위기) · 청록(저긴장). 보라는 동맹 뉴스 핀 전용입니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LEGEND_GRADES.map((grade) => {
          const spec = TENSION_GRADE_STYLES[grade];
          return (
            <HatchSwatch
              key={grade}
              label={spec.label}
              detail={spec.pattern === "cross" ? "X" : spec.pattern === "slash" ? "/" : spec.pattern === "backslash" ? "\\" : "—"}
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
      title="영토 분쟁·긴장 지역"
      subtitle="마우스 올리기 · 클릭 → 상세"
      accent="orange"
    >
      <DisputeZoneLegendContent />
    </MapOverlayLegendPanel>
  );
}
