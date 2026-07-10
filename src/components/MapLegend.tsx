"use client";

import { LocationPinIcon } from "@/components/LocationPinIcon";
import type { EventTier } from "@/data/geoTypes";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

type MapLegendProps = {
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  className?: string;
};

export function MapLegend({
  deployedCarrierCount = 0,
  showAllCarriers = false,
  className = "",
}: MapLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-sky-300/10 bg-[#0a1830]/65 px-5 py-2.5 text-[11px] text-sky-100/85 shadow-lg backdrop-blur-md ${className}`}
    >
      {deployedCarrierCount > 0 ? (
        <div className="flex items-center gap-2 border-r border-sky-300/15 pr-5">
          <span
            className="carrier-legend-deck-swatch shrink-0"
            dangerouslySetInnerHTML={{
              __html: carrierDeckIconSvg("deployed", { width: 30, height: 13 }),
            }}
          />
          <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-100">
            작전중
          </span>
          <span className="text-sky-100/45">
            미 항모 {deployedCarrierCount}척
            {showAllCarriers ? " · 전체 표시" : " · 항상 표시"}
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-r border-sky-300/15 pr-5">
        <span className="rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-[10px] font-medium text-orange-100">
          뉴스 알림
        </span>
        <span className="text-sky-100/45">GDELT 속보 핀</span>
      </div>
      <LegendDotSwatch tier="war" label="전쟁" detail="군사 충돌" glowColor="rgba(239, 68, 68, 0.45)" />
      <LegendDotSwatch
        tier="diplomatic"
        label="외교"
        detail="외교적 긴장"
        glowColor="rgba(251, 146, 60, 0.42)"
      />
      <LegendDotSwatch tier="alliance" label="동맹" detail="동맹국 갈등" />
      <LegendDotSwatch tier="protest" label="시위" detail="집회·시위" glowColor="rgba(148, 163, 184, 0.55)" />
      <LegendDotSwatch
        color="#facc15"
        label="최신"
        detail="속보 테두리"
        glowColor="rgba(250, 204, 21, 0.55)"
        fresh
      />
    </div>
  );
}

function LegendDotSwatch({
  tier,
  color,
  label,
  detail,
  glowColor,
  fresh,
}: {
  tier?: EventTier;
  color?: string;
  label: string;
  detail: string;
  glowColor?: string;
  fresh?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-6 w-5 items-end justify-center">
        {glowColor && (
          <span
            className="absolute bottom-0 h-5 w-5 rounded-full blur-[2px]"
            style={{ backgroundColor: glowColor }}
          />
        )}
        <LocationPinIcon
          tier={tier}
          color={color}
          size={18}
          fresh={fresh}
          glowColor={glowColor}
        />
      </span>
      <span>
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}
