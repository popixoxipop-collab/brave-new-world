import type { EventTier } from "@/data/geoTypes";

export const GDELT_NEWS_ALERT_LABEL = "뉴스 알림";

const TIER_BADGE_BORDER: Record<EventTier, string> = {
  war: "rgba(239, 68, 68, 0.6)",
  diplomatic: "rgba(251, 146, 60, 0.6)",
  alliance: "rgba(217, 70, 239, 0.55)",
  protest: "rgba(148, 163, 184, 0.5)",
};

/** 지도 마커 하단 「뉴스」 뱃지 */
export function createNewsAlertBadgeElement(tier: EventTier): HTMLElement {
  const badge = document.createElement("span");
  badge.textContent = "뉴스";
  badge.setAttribute("aria-hidden", "true");
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.marginTop = "-1px";
  badge.style.padding = "1px 5px";
  badge.style.borderRadius = "9999px";
  badge.style.border = `1px solid ${TIER_BADGE_BORDER[tier]}`;
  badge.style.background = "rgba(8, 18, 36, 0.9)";
  badge.style.color = "rgba(255, 237, 213, 0.96)";
  badge.style.fontSize = "8px";
  badge.style.fontWeight = "600";
  badge.style.lineHeight = "1.25";
  badge.style.letterSpacing = "-0.02em";
  badge.style.whiteSpace = "nowrap";
  badge.style.pointerEvents = "none";
  badge.style.boxShadow = "0 1px 3px rgba(2, 8, 20, 0.45)";
  return badge;
}

/** 위치 핀 + 뉴스 뱃지를 하나의 마커 루트로 묶음 */
export function wrapNewsAlertMarker(
  pinEl: HTMLElement,
  tier: EventTier,
): { root: HTMLElement; pin: HTMLElement } {
  const root = document.createElement("div");
  root.className = "gdelt-news-alert-marker";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.transform = "translate(-50%, -100%)";
  root.style.pointerEvents = "none";

  pinEl.style.transform = "none";
  pinEl.style.pointerEvents = "auto";

  root.appendChild(pinEl);
  root.appendChild(createNewsAlertBadgeElement(tier));
  return { root, pin: pinEl };
}
