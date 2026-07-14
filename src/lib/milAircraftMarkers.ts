import type { MilitaryAircraft } from "@/data/geoTypes";
import { MIL_AIRCRAFT_MARKER_ICON_SIZE } from "@/data/milAircraftSilhouettes";
import {
  classifyMilAircraft,
  milAircraftRoleLabel,
  type MilAircraftKindInfo,
} from "@/lib/milAircraftKind";
import { milAircraftGlowShadow, milAircraftIconSvg } from "@/lib/milAircraftIcon";

export const MIL_AIRCRAFT_MARKER_ROOT_CLASS = "mil-aircraft-marker-root";

let stylesReady = false;

function ensureMilMarkerStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-mil-aircraft-markers", "1");
  style.textContent = `
    @keyframes mil-aircraft-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} .mil-aircraft-icon-wrap {
      animation: mil-aircraft-bob 2.6s ease-in-out infinite;
      will-change: transform;
      line-height: 0;
    }
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} .mil-aircraft-icon {
      display: block;
      transform-origin: 50% 50%;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.75));
    }
    .${MIL_AIRCRAFT_MARKER_ROOT_CLASS} button:hover .mil-aircraft-icon-wrap {
      animation-duration: 1.5s;
    }
  `;
  document.head.appendChild(style);
}

function headingDeg(aircraft: MilitaryAircraft): number | null {
  const raw = aircraft.track ?? aircraft.trueHeading ?? aircraft.magHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  return ((raw % 360) + 360) % 360;
}

/** 실루엣 코가 viewBox 위쪽 → track(진북 기준)으로 회전 */
function iconRotationDeg(track: number | null): number {
  if (track == null) return -25;
  return track;
}

export function createMilAircraftBadge(
  aircraft: MilitaryAircraft,
  handlers: {
    onHover: (aircraft: MilitaryAircraft | null) => void;
    onClick: (aircraft: MilitaryAircraft) => void;
  },
  options?: {
    lang?: "ko" | "en";
    kind?: MilAircraftKindInfo;
    /** military=지정학 군용, civil=지경학 민간 운항 */
    palette?: "military" | "civil";
  },
): HTMLElement {
  ensureMilMarkerStyles();
  const lang = options?.lang ?? "ko";
  const palette = options?.palette ?? "military";
  // 민간 운항은 여객기(수송기) 실루엣으로 통일
  const kind =
    options?.kind ??
    (palette === "civil"
      ? {
          role: "transport" as const,
          labelKo: "여객기",
          labelEn: "Airliner",
        }
      : classifyMilAircraft(aircraft));
  const roleLabel =
    palette === "civil"
      ? lang === "en"
        ? "Airliner"
        : "여객기"
      : milAircraftRoleLabel(kind, lang);
  const track = headingDeg(aircraft);
  // B-52 / Tu-95 급은 전투기보다 확실히 크게 (장폭 전략폭격기)
  const iconSize =
    kind.role === "bomber"
      ? { width: 46, height: 46 }
      : kind.role === "transport" || kind.role === "tanker" || kind.role === "awacs"
        ? { width: 34, height: 34 }
        : kind.role === "helicopter" || kind.role === "gunship"
          ? { width: 30, height: 30 }
          : MIL_AIRCRAFT_MARKER_ICON_SIZE;

  const titleBits = [
    aircraft.callsign || aircraft.hex.toUpperCase(),
    roleLabel,
    aircraft.type,
    aircraft.altitude != null ? `${aircraft.altitude} ft` : null,
    aircraft.groundSpeed != null ? `${aircraft.groundSpeed} kn` : null,
  ].filter(Boolean);

  const outer = document.createElement("div");
  outer.className = MIL_AIRCRAFT_MARKER_ROOT_CLASS;
  outer.dataset.milRole = kind.role;
  outer.dataset.milHex = aircraft.hex;

  const inner = document.createElement("button");
  inner.type = "button";
  inner.className = "mil-aircraft-marker";
  inner.setAttribute("role", "img");
  inner.setAttribute(
    "aria-label",
    `${roleLabel} ${aircraft.callsign || aircraft.hex}`,
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
  inner.style.transition = "transform 0.15s ease";

  const iconWrap = document.createElement("span");
  iconWrap.className = "mil-aircraft-icon-wrap";
  iconWrap.style.display = "block";
  iconWrap.style.width = `${iconSize.width}px`;
  iconWrap.style.height = `${iconSize.height}px`;
  const phase = Number.parseInt(aircraft.hex.slice(0, 2), 16);
  if (Number.isFinite(phase)) {
    iconWrap.style.animationDelay = `${(phase % 12) * 0.18}s`;
  }

  const icon = document.createElement("span");
  icon.className = "mil-aircraft-icon";
  icon.style.display = "block";
  icon.style.width = `${iconSize.width}px`;
  icon.style.height = `${iconSize.height}px`;
  icon.style.transform = `rotate(${iconRotationDeg(track)}deg)`;
  icon.style.boxShadow = milAircraftGlowShadow(kind.role, palette);
  icon.innerHTML = milAircraftIconSvg(kind.role, iconSize, { palette });
  iconWrap.appendChild(icon);

  const badge = document.createElement("span");
  badge.textContent = roleLabel;
  badge.style.display = "block";
  badge.style.marginTop = "1px";
  badge.style.padding = "1px 5px";
  badge.style.borderRadius = "9999px";
  badge.style.border =
    palette === "civil"
      ? "1px solid rgba(56, 189, 248, 0.55)"
      : "1px solid rgba(248, 113, 113, 0.55)";
  badge.style.background =
    palette === "civil" ? "rgba(12, 74, 110, 0.55)" : "rgba(127, 29, 29, 0.55)";
  badge.style.fontSize = "8px";
  badge.style.fontWeight = "700";
  badge.style.lineHeight = "1.2";
  badge.style.letterSpacing = "0.04em";
  badge.style.color = "rgba(254, 242, 242, 0.98)";
  badge.style.textShadow = "0 1px 2px rgba(0,0,0,0.85)";
  badge.style.pointerEvents = "none";
  badge.style.whiteSpace = "nowrap";

  const label = document.createElement("span");
  label.textContent = aircraft.callsign?.trim() || aircraft.hex.toUpperCase();
  label.style.display = "block";
  label.style.maxWidth = "68px";
  label.style.fontSize = "8px";
  label.style.fontWeight = "600";
  label.style.lineHeight = "1.15";
  label.style.textAlign = "center";
  label.style.color = "rgba(248, 250, 252, 0.95)";
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.textShadow = "0 0 6px rgba(248,113,113,0.55), 0 1px 3px rgba(0,0,0,0.92)";
  label.style.pointerEvents = "none";

  inner.append(iconWrap, badge, label);
  outer.append(inner);

  inner.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.1)";
    handlers.onHover(aircraft);
  });
  inner.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    handlers.onHover(null);
  });
  inner.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick(aircraft);
  });

  return outer;
}
