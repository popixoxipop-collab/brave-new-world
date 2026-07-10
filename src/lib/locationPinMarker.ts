import type { EventTier, GreatPowerScope } from "@/data/geoTypes";
import { FRESH_RING_COLOR, TIER_COLORS, isFreshEvent, type ScoredEvent } from "@/data/eventTiers";
import { GDELT_NEWS_ALERT_LABEL, wrapNewsAlertMarker } from "@/lib/gdeltNewsAlert";
import { CYBER_WAR_ROOM_THEME } from "@/lib/cyberWarRoomTheme";
import { getZoomOutScale } from "@/lib/zoomScale";

export const TIER_PIN_HEX: Record<EventTier, string> = {
  war: "#ef4444",
  diplomatic: "#fb923c",
  alliance: "#d946ef",
  protest: "#e2e8f0",
};

export const FRESH_PIN_HEX = "#facc15";

export type LocationPinOptions = {
  fill: string;
  size?: number;
  stroke?: string;
  freshRing?: boolean;
  glowColor?: string;
};

export function tierPinFill(tier: EventTier): string {
  return TIER_PIN_HEX[tier];
}

export function eventPinFill(event: Pick<ScoredEvent, "eventTier" | "createdAt" | "eventDate">): string {
  return tierPinFill(event.eventTier);
}

export function locationPinSvg({
  fill,
  size = 22,
  stroke = "rgba(8, 18, 36, 0.55)",
  freshRing = false,
  glowColor,
}: LocationPinOptions): string {
  const height = Math.round(size * (32 / 22));
  const ring = freshRing
    ? `<circle cx="12" cy="11" r="10.5" fill="none" stroke="${FRESH_PIN_HEX}" stroke-width="1.8" opacity="0.9"/>`
    : "";
  const glow = glowColor
    ? `<ellipse cx="12" cy="30" rx="5" ry="1.6" fill="${glowColor}" opacity="0.55"/>`
    : "";

  return `
    <svg width="${size}" height="${height}" viewBox="0 0 24 32" fill="none" aria-hidden="true" style="display:block;overflow:visible">
      ${glow}
      ${ring}
      <path
        d="M12 1.5C7.86 1.5 4.5 4.86 4.5 9c0 6.2 7.5 19.5 7.5 19.5S19.5 15.2 19.5 9C19.5 4.86 16.14 1.5 12 1.5Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.2"
      />
      <circle cx="12" cy="9" r="3.25" fill="rgba(255,255,255,0.88)"/>
    </svg>
  `;
}

export function getEventPinSize(
  scope: GreatPowerScope | null | undefined,
  altitude = 1,
): number {
  const base = scope === "rivalry" ? 28 : scope === "intervention" ? 24 : 22;
  return Math.max(10, Math.round(base * getZoomOutScale(altitude)));
}

type EventPinPoint = ScoredEvent & {
  markerId: string;
  displayKind: "event";
};

export function createEventPinElement(
  point: EventPinPoint,
  altitude: number,
  handlers: {
    onHover: (point: EventPinPoint | null) => void;
    onClick: (point: EventPinPoint) => void;
  },
  options?: { newsAlert?: boolean },
): HTMLElement {
  const fresh = isFreshEvent(point);
  const fill = fresh ? CYBER_WAR_ROOM_THEME.intel.telegramMarker : eventPinFill(point);
  const stroke =
    point.eventTier === "protest" ? "rgba(56, 189, 248, 0.82)" : "rgba(8, 18, 36, 0.55)";
  const size = getEventPinSize(point.greatPowerScope, altitude);
  const glowColor = TIER_COLORS[point.eventTier].dot.replace(/[\d.]+\)$/, "0.42)");

  const newsAlert = options?.newsAlert ?? false;
  const el = document.createElement("div");
  el.className = newsAlert ? "location-pin-marker gdelt-news-pin" : "location-pin-marker";
  el.dataset.tier = point.eventTier;
  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    newsAlert ? `${GDELT_NEWS_ALERT_LABEL} · ${point.eventTier}` : `${point.eventTier} event`,
  );
  el.style.width = `${size}px`;
  el.style.height = `${Math.round(size * (32 / 22))}px`;
  el.style.display = "block";
  if (!newsAlert) {
    el.style.transform = "translate(-50%, -100%)";
    el.style.opacity = "0";
  }
  el.style.pointerEvents = "auto";
  el.style.cursor = "pointer";
  el.style.userSelect = "none";
  el.style.filter = fresh
    ? `drop-shadow(0 0 6px ${FRESH_RING_COLOR}) drop-shadow(0 2px 4px rgba(2,8,20,0.45))`
    : "drop-shadow(0 2px 4px rgba(2,8,20,0.45))";
  el.style.transition =
    "opacity 320ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), filter 280ms ease";
  el.innerHTML = locationPinSvg({
    fill,
    size,
    stroke,
    freshRing: fresh,
    glowColor,
  });

  const mount = newsAlert ? wrapNewsAlertMarker(el, point.eventTier).root : el;
  const hoverTarget = el;

  const setHoverTransform = (scale: number) => {
    if (newsAlert) {
      hoverTarget.style.transform = scale === 1 ? "none" : `scale(${scale})`;
      return;
    }
    hoverTarget.style.transform =
      scale === 1 ? "translate(-50%, -100%) scale(1)" : "translate(-50%, -100%) scale(1.1)";
  };

  const interactionTarget = newsAlert ? hoverTarget : mount;
  interactionTarget.addEventListener("mouseenter", () => {
    setHoverTransform(1.1);
    handlers.onHover(point);
  });
  interactionTarget.addEventListener("mouseleave", () => {
    setHoverTransform(1);
    handlers.onHover(null);
  });
  interactionTarget.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(point);
  });

  return mount;
}
