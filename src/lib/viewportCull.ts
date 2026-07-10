import type { GlobeLodTier } from "@/lib/globeLod";

export type ViewPoint = { lat: number; lng: number };

export type Bbox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function longitudeDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

export function centerDistanceDeg(center: ViewPoint, view: ViewPoint): number {
  const latDist = Math.abs(view.lat - center.lat);
  const lngDist = longitudeDistance(view.lng, center.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

export function isCenterInView(center: ViewPoint, view: ViewPoint, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  return centerDistanceDeg(center, view) <= radiusDeg;
}

export function bboxNearView(bbox: Bbox, view: ViewPoint, radiusDeg: number): boolean {
  if (radiusDeg <= 0) return true;
  const latDistance =
    view.lat < bbox.minLat
      ? bbox.minLat - view.lat
      : view.lat > bbox.maxLat
        ? view.lat - bbox.maxLat
        : 0;
  const lngCenter = (bbox.minLng + bbox.maxLng) / 2;
  const lngHalfWidth = Math.max(0.5, Math.abs(bbox.maxLng - bbox.minLng) / 2);
  const lngDistance = Math.max(0, Math.abs(view.lng - lngCenter) - lngHalfWidth);
  return Math.sqrt(latDistance ** 2 + lngDistance ** 2) <= radiusDeg;
}

export function filterByViewportCenter<T extends { center: ViewPoint }>(
  items: T[],
  view: ViewPoint,
  radiusDeg: number,
  maxCount: number,
  sortFn?: (a: T, b: T) => number,
): T[] {
  if (maxCount <= 0) return [];
  let candidates =
    radiusDeg > 0 ? items.filter((item) => isCenterInView(item.center, view, radiusDeg)) : items;
  if (sortFn) candidates = candidates.slice().sort(sortFn);
  return candidates.slice(0, maxCount);
}

/** 스케일(LOD)별 화면 반경 — global은 전세계 밀도 제한용 */
export const VIEWPORT_RADIUS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 55,
  continent: 28,
  regional: 16,
  near: 8,
  village: 2.2,
};

/** 국가 폴리곤 — 스케일별 상한 */
export const COUNTRY_POLYGON_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 28,
  continent: 48,
  regional: 72,
  near: 100,
  village: 140,
};

/** 분쟁지역 — 스케일별 상한 */
export const DISPUTE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 12,
  continent: 24,
  regional: 48,
  near: 72,
  village: 100,
};

export function viewToBbox(
  view: ViewPoint,
  radiusDeg: number,
): { west: number; south: number; east: number; north: number } {
  const pad = radiusDeg > 0 ? radiusDeg : 40;
  return {
    west: view.lng - pad,
    south: Math.max(-90, view.lat - pad),
    east: view.lng + pad,
    north: Math.min(90, view.lat + pad),
  };
}

/** 화재 탐지 — 스케일별 상한 */
export const FIRMS_FIRE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 60,
  continent: 120,
  regional: 240,
  near: 480,
  village: 900,
};

