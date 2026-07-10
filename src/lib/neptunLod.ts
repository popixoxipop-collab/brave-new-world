import type { NeptunArchivedThreat, NeptunLiveThreat } from "@/lib/neptun";
import type { GlobeLodTier } from "@/lib/globeLod";
import { getGlobeLod } from "@/lib/globeLod";
import { isInUkraineTheater } from "@/lib/ukraineSettlementLabels";
import { centerDistanceDeg, type ViewPoint } from "@/lib/viewportCull";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";

export type NeptunRenderMode = "hidden" | "flat" | "low" | "elevated";

const UKRAINE_THEATER_CENTER: ViewPoint = { lat: 48.5, lng: 31.5 };

export const NEPTUN_THREAT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 8,
  continent: 12,
  regional: 16,
  near: 24,
  village: 32,
};

export const NEPTUN_ARCHIVED_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 3,
  regional: 6,
  near: 10,
  village: 16,
};

const FETCH_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 55,
  continent: 42,
  regional: 30,
  near: 20,
  village: 14,
};

const VIEW_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 26,
  regional: 18,
  near: 12,
  village: 8,
};

export function isNeptunTheaterInView(view: ViewPoint, tier: GlobeLodTier): boolean {
  if (isInUkraineTheater(view.lat, view.lng)) return true;
  const radius = FETCH_RADIUS_BY_TIER[tier];
  return centerDistanceDeg(UKRAINE_THEATER_CENTER, view) <= radius;
}

export function shouldFetchNeptunData(
  layerEnabled: boolean,
  view: ViewPoint,
  tier: GlobeLodTier,
  ukraineFrontOn = false,
): boolean {
  if (!layerEnabled) return false;
  if (ukraineFrontOn) return true;
  return isNeptunTheaterInView(view, tier);
}

/** 실제 카메라 고도 기준 — layerAltitude 지연과 무관하게 곡선 전환 */
export function getNeptunRenderMode(
  cameraAltitude: number,
  inTheater: boolean,
  layerOn: boolean,
  arcTrailsOn: boolean,
): NeptunRenderMode {
  if (!layerOn || !inTheater) return "hidden";

  if (arcTrailsOn) {
    if (cameraAltitude <= 0.9) return "elevated";
    if (cameraAltitude <= 1.35) return "low";
    return "low";
  }

  const tier = getGlobeLod(cameraAltitude).tier;
  if (tier === "global" || tier === "continent") return "flat";
  if (tier === "regional") return "low";
  return "elevated";
}

export function neptunElevationForMode(mode: NeptunRenderMode): NeptunPathElevationMode {
  if (mode === "elevated") return "elevated";
  if (mode === "low") return "low";
  return "flat";
}

export function neptunMaxPathPoints(mode: NeptunRenderMode): number {
  switch (mode) {
    case "elevated":
      return 14;
    case "low":
      return 10;
    case "flat":
      return 6;
    default:
      return 0;
  }
}

function threatCenter(threat: NeptunLiveThreat | NeptunArchivedThreat): ViewPoint {
  if ("predictedLat" in threat && Number.isFinite(threat.predictedLat)) {
    return { lat: threat.predictedLat, lng: threat.predictedLon };
  }
  return { lat: threat.lat, lng: threat.lon };
}

export function filterNeptunThreatsForViewport<T extends NeptunLiveThreat | NeptunArchivedThreat>(
  threats: T[],
  view: ViewPoint,
  tier: GlobeLodTier,
  maxCount: number,
): T[] {
  if (maxCount <= 0) return [];
  const radius = VIEW_RADIUS_BY_TIER[tier];
  if (radius <= 0) return [];

  const filtered = threats.filter((threat) => {
    const center = threatCenter(threat);
    if (isInUkraineTheater(center.lat, center.lng)) {
      return centerDistanceDeg(center, view) <= radius + 10;
    }
    return centerDistanceDeg(center, view) <= radius;
  });

  return filtered.slice(0, maxCount);
}

export function neptunShowsProjection(mode: NeptunRenderMode, arcTrailsOn: boolean): boolean {
  if (!arcTrailsOn) return mode === "elevated";
  return mode === "elevated" || mode === "low";
}

export function neptunShowsPaths(mode: NeptunRenderMode): boolean {
  return mode === "flat" || mode === "low" || mode === "elevated";
}

export function neptunShowsMarkers(mode: NeptunRenderMode): boolean {
  return mode !== "hidden";
}
