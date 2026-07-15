import type { AisVessel } from "@/data/geoTypes";
import { aisCommercialPointColor } from "@/lib/aisVesselClass";

export const AIS_VESSEL_MARKER_ROOT_CLASS = "ais-vessel-marker-root";

let stylesReady = false;

function ensureAisMarkerStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-ais-vessel-markers", "1");
  style.textContent = `
    .${AIS_VESSEL_MARKER_ROOT_CLASS} .ais-vessel-icon {
      display: block;
      transform-origin: 50% 50%;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.75));
    }
    .${AIS_VESSEL_MARKER_ROOT_CLASS} button:hover .ais-vessel-icon {
      filter: drop-shadow(0 0 8px rgba(125,211,252,0.65)) drop-shadow(0 1px 3px rgba(0,0,0,0.75));
    }
  `;
  document.head.appendChild(style);
}

/** COG 우선, 없으면 true heading. 정박(거의 0kn)은 null. */
export function aisVesselHeadingDeg(vessel: AisVessel): number | null {
  const sog = vessel.speedOverGround;
  if (sog != null && Number.isFinite(sog) && sog < 0.4) return null;
  const raw = vessel.courseOverGround ?? vessel.trueHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  // AIS heading 511 = not available
  if (raw >= 360) return null;
  return ((raw % 360) + 360) % 360;
}

function shipColor(vessel: AisVessel): string {
  if (vessel.category === "military") return "rgba(52, 211, 153, 0.98)";
  const c = aisCommercialPointColor(vessel.shipType);
  return c.replace(/[\d.]+\)$/, "0.98)") || c;
}

/**
 * 선수(코)가 viewBox 위쪽을 향하는 선박 화살 실루엣.
 * MapLibre Marker rotationAlignment="map" + rotation=heading 과 함께 씀.
 */
function aisShipIconSvg(color: string, size: number, military: boolean): string {
  const w = size;
  const h = size;
  // 위쪽 = 진행 방향
  const body = military
    ? "M16 2 L22 12 L20 12 L20 26 L12 26 L12 12 L10 12 Z"
    : "M16 1.5 L24 14 L19 14 L19 28 L13 28 L13 14 L8 14 Z";
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="${body}" fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="16" cy="11" r="1.4" fill="rgba(255,255,255,0.55)"/>
    </svg>
  `.trim();
}

export function createAisVesselBadge(
  vessel: AisVessel,
  handlers: {
    onHover: (vessel: AisVessel | null) => void;
    onClick: (vessel: AisVessel) => void;
  },
  options?: { lang?: "ko" | "en" },
): HTMLElement {
  ensureAisMarkerStyles();
  const lang = options?.lang ?? "ko";
  const heading = aisVesselHeadingDeg(vessel);
  const military = vessel.category === "military";
  const color = shipColor(vessel);
  const size = military ? 28 : 22;

  const titleBits = [
    vessel.shipName || `MMSI ${vessel.mmsi}`,
    vessel.shipTypeLabel,
    vessel.speedOverGround != null ? `${vessel.speedOverGround.toFixed(1)} kn` : null,
    heading != null ? `${Math.round(heading)}°` : lang === "en" ? "no course" : "침로 없음",
  ].filter(Boolean);

  const outer = document.createElement("div");
  outer.className = AIS_VESSEL_MARKER_ROOT_CLASS;
  outer.dataset.aisMmsi = vessel.mmsi;
  if (heading != null) outer.dataset.aisHeading = String(Math.round(heading));

  const inner = document.createElement("button");
  inner.type = "button";
  inner.className = "ais-vessel-marker";
  inner.setAttribute("role", "img");
  inner.setAttribute(
    "aria-label",
    `${military ? (lang === "en" ? "Warship" : "군함") : lang === "en" ? "Vessel" : "선박"} ${vessel.shipName || vessel.mmsi}`,
  );
  inner.title = titleBits.join(" · ");
  inner.style.display = "flex";
  inner.style.flexDirection = "column";
  inner.style.alignItems = "center";
  inner.style.gap = "1px";
  inner.style.margin = "0";
  inner.style.padding = "0";
  inner.style.background = "transparent";
  inner.style.border = "none";
  inner.style.cursor = "pointer";
  inner.style.pointerEvents = "auto";

  const icon = document.createElement("span");
  icon.className = "ais-vessel-icon";
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;
  // 정박/침로 없음: 살짝 기울여 정지로 보이게
  if (heading == null) {
    icon.style.transform = "rotate(-20deg)";
    icon.style.opacity = "0.72";
  }
  icon.innerHTML = aisShipIconSvg(color, size, military);

  const label = document.createElement("span");
  label.textContent = vessel.shipName?.trim() || vessel.mmsi;
  label.style.display = "block";
  label.style.maxWidth = "72px";
  label.style.fontSize = "8px";
  label.style.fontWeight = "600";
  label.style.lineHeight = "1.1";
  label.style.textAlign = "center";
  label.style.color = "rgba(248,250,252,0.95)";
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
  label.style.pointerEvents = "none";
  if (heading != null) {
    label.style.transform = `rotate(${-heading}deg)`;
    label.style.transformOrigin = "50% 0%";
  }

  inner.append(icon, label);
  outer.append(inner);

  inner.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.08)";
    handlers.onHover(vessel);
  });
  inner.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    handlers.onHover(null);
  });
  inner.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(vessel);
  });

  return outer;
}
