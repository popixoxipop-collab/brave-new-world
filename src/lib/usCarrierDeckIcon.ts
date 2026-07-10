import type { UsCarrierStatus } from "@/data/usCarriers";
import { US_CARRIER_STATUS_COLORS } from "@/data/usCarriers";
import {
  CARRIER_ANGLED_RUNWAY_PATH,
  CARRIER_AXIAL_RUNWAY_PATH,
  CARRIER_CENTERLINE_PATH,
  CARRIER_DECK_VIEWBOX,
  CARRIER_HULL_OUTLINE_PATH,
  CARRIER_ISLAND_PATH,
  CARRIER_RADAR_DOMES,
  type CarrierDeckIconSize,
} from "@/data/usCarrierDeckSilhouette";

function glowFilterId(status: UsCarrierStatus, width: number) {
  return `cvn-glow-${status}-${width}`;
}

/**
 * 공중샷 기반 CVN 갑판 실루엣 SVG.
 * 상태색 = 형광 채움, 흰 활주로선, 노란 중앙선.
 */
export function carrierDeckIconSvg(
  status: UsCarrierStatus,
  size: CarrierDeckIconSize = { width: 36, height: 16 },
): string {
  const color = US_CARRIER_STATUS_COLORS[status];
  const { width, height } = size;
  const vb = `${CARRIER_DECK_VIEWBOX.width} ${CARRIER_DECK_VIEWBOX.height}`;
  const glowId = glowFilterId(status, width);

  const domes = CARRIER_RADAR_DOMES.map(
    (d) =>
      `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.35)" stroke-width="0.35"/>`,
  ).join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="${glowId}" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="${CARRIER_HULL_OUTLINE_PATH}"
        fill="${color}"
        stroke="rgba(255,255,255,0.94)"
        stroke-width="0.9"
        stroke-linejoin="round"
        filter="url(#${glowId})"
      />
      <path d="${CARRIER_ISLAND_PATH}" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.5)" stroke-width="0.45"/>
      ${domes}
      <path d="${CARRIER_AXIAL_RUNWAY_PATH}" stroke="rgba(255,255,255,0.62)" stroke-width="0.65" stroke-linecap="round"/>
      <path d="${CARRIER_ANGLED_RUNWAY_PATH}" stroke="rgba(255,255,255,0.55)" stroke-width="0.55" stroke-linecap="round"/>
      <path d="${CARRIER_CENTERLINE_PATH}" stroke="rgba(250,204,21,0.75)" stroke-width="0.45" stroke-linecap="round"/>
    </svg>
  `.trim();
}

export function carrierDeckGlowShadow(status: UsCarrierStatus): string {
  const color = US_CARRIER_STATUS_COLORS[status];
  return `0 0 12px ${color}dd, 0 0 22px ${color}77, 0 2px 8px rgba(0,0,0,0.5)`;
}
