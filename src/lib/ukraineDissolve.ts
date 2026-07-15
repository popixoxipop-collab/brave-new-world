/**
 * VIINA Voronoi 셀 → status별 실제 geometry union (polygon-clipping).
 *
 * 한계: union해도 Voronoi/행정 인접 경계를 따라가므로 ISW식 "군사 전선"과는 다름.
 * 장점: 조각 모자이크 대신 동일 status의 연속 MultiPolygon.
 *
 * 좌표는 항상 [lng, lat].
 */

import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Polygon, Position } from "geojson";
import type { GeoJsonGeometry, UkraineControlZone } from "@/data/geoTypes";

// ESM 빌드가 named export 없이 default만 제공 → webpack "union is not exported" 방지
const clipUnion = polygonClipping.union;

export const UA_DISSOLVE_THEATER = {
  minLng: 22,
  maxLng: 42,
  minLat: 44,
  maxLat: 53,
} as const;

type LngLat = [number, number];
/** polygon-clipping Polygon = ring[] ; MultiPolygon = Polygon[] */
type ClipPolygon = LngLat[][];
type ClipMultiPolygon = ClipPolygon[];

function inTheater(lng: number, lat: number): boolean {
  return (
    lng >= UA_DISSOLVE_THEATER.minLng &&
    lng <= UA_DISSOLVE_THEATER.maxLng &&
    lat >= UA_DISSOLVE_THEATER.minLat &&
    lat <= UA_DISSOLVE_THEATER.maxLat
  );
}

function asLngLat(pair: unknown): LngLat | null {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const a = Number(pair[0]);
  const b = Number(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // [lat,lng] 스왑 교정 (우크라 박스 기준)
  if (a >= 44 && a <= 53 && b >= 22 && b <= 42 && !(a >= 22 && a <= 42)) {
    return inTheater(b, a) ? [b, a] : null;
  }
  if (!inTheater(a, b)) return null;
  return [a, b];
}

function closeRing(ring: LngLat[]): LngLat[] | null {
  if (ring.length < 3) return null;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
}

/** 링 단순화 — union 전 정점 수 상한 (메인 스레드 보호) */
function simplifyRing(ring: LngLat[], maxPoints: number): LngLat[] {
  if (ring.length <= maxPoints) return ring;
  const closed =
    ring[0]![0] === ring[ring.length - 1]![0] && ring[0]![1] === ring[ring.length - 1]![1];
  const body = closed ? ring.slice(0, -1) : ring;
  if (body.length <= 2) return ring;
  const step = Math.max(1, Math.ceil(body.length / Math.max(3, maxPoints - 1)));
  const out: LngLat[] = [];
  for (let i = 0; i < body.length; i += step) {
    out.push(body[i]!);
  }
  const last = body[body.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return closeRing(out) ?? ring;
}

function sanitizeClipPolygon(geometry: GeoJsonGeometry, maxRingPoints: number): ClipPolygon | null {
  if (geometry.type === "Polygon") {
    const rings: LngLat[][] = [];
    for (const raw of geometry.coordinates ?? []) {
      const pts: LngLat[] = [];
      for (const pair of raw) {
        const ll = asLngLat(pair);
        if (ll) pts.push(ll);
      }
      const closed = closeRing(simplifyRing(pts, maxRingPoints));
      if (closed && closed.length >= 4) rings.push(closed);
    }
    return rings.length ? rings : null;
  }
  if (geometry.type === "MultiPolygon") {
    // MultiPolygon → 첫 유효 Polygon만 (union 입력은 단건으로 쪼개서 넣음)
    for (const poly of geometry.coordinates ?? []) {
      const rings: LngLat[][] = [];
      for (const raw of poly) {
        const pts: LngLat[] = [];
        for (const pair of raw) {
          const ll = asLngLat(pair);
          if (ll) pts.push(ll);
        }
        const closed = closeRing(simplifyRing(pts, maxRingPoints));
        if (closed && closed.length >= 4) rings.push(closed);
      }
      if (rings.length) return rings;
    }
  }
  return null;
}

function geometryToClipPolygons(
  geometry: GeoJsonGeometry,
  maxRingPoints: number,
): ClipPolygon[] {
  if (geometry.type === "Polygon") {
    const one = sanitizeClipPolygon(geometry, maxRingPoints);
    return one ? [one] : [];
  }
  if (geometry.type === "MultiPolygon") {
    const out: ClipPolygon[] = [];
    for (const poly of geometry.coordinates ?? []) {
      const rings: LngLat[][] = [];
      for (const raw of poly) {
        const pts: LngLat[] = [];
        for (const pair of raw) {
          const ll = asLngLat(pair);
          if (ll) pts.push(ll);
        }
        const closed = closeRing(simplifyRing(pts, maxRingPoints));
        if (closed && closed.length >= 4) rings.push(closed);
      }
      if (rings.length) out.push(rings);
    }
    return out;
  }
  return [];
}

function clipToGeoJson(multi: ClipMultiPolygon): MultiPolygon | Polygon | null {
  if (!multi?.length) return null;
  const coordinates: Position[][][] = [];
  for (const poly of multi) {
    const rings: Position[][] = [];
    for (const ring of poly) {
      const pts: LngLat[] = [];
      for (const pair of ring) {
        const ll = asLngLat(pair);
        if (ll) pts.push(ll);
      }
      const closed = closeRing(pts);
      if (closed && closed.length >= 4) rings.push(closed);
    }
    if (rings.length) coordinates.push(rings);
  }
  if (!coordinates.length) return null;
  if (coordinates.length === 1) {
    return { type: "Polygon", coordinates: coordinates[0]! };
  }
  return { type: "MultiPolygon", coordinates };
}

/**
 * polygon-clipping.union 으로 여러 Polygon을 합친다.
 * 입력이 많으면 청크 단위로 합쳐 스택·시간 폭발 완화.
 */
export function unionClipPolygons(
  polygons: ClipPolygon[],
  options?: { chunkSize?: number },
): MultiPolygon | Polygon | null {
  if (!polygons.length) return null;
  const chunkSize = options?.chunkSize ?? 48;

  const unionChunk = (chunk: ClipPolygon[]): ClipMultiPolygon | null => {
    if (!chunk.length) return null;
    try {
      // polygon-clipping: union(geom, ...geoms) → MultiPolygon
      const [head, ...rest] = chunk;
      const result = clipUnion(head!, ...rest) as ClipMultiPolygon;
      return result?.length ? result : null;
    } catch {
      // 한 덩어리가 깨지면 반으로
      if (chunk.length === 1) return [chunk[0]!];
      const mid = Math.floor(chunk.length / 2);
      const a = unionChunk(chunk.slice(0, mid));
      const b = unionChunk(chunk.slice(mid));
      if (a && b) {
        try {
          return clipUnion(a, b) as ClipMultiPolygon;
        } catch {
          return [...a, ...b];
        }
      }
      return a ?? b;
    }
  };

  const chunks: ClipMultiPolygon[] = [];
  for (let i = 0; i < polygons.length; i += chunkSize) {
    const part = unionChunk(polygons.slice(i, i + chunkSize));
    if (part) chunks.push(part);
  }
  if (!chunks.length) return null;

  let acc: ClipMultiPolygon = chunks[0]!;
  for (let i = 1; i < chunks.length; i++) {
    try {
      acc = clipUnion(acc, chunks[i]!) as ClipMultiPolygon;
    } catch {
      acc = [...acc, ...chunks[i]!];
    }
  }
  return clipToGeoJson(acc);
}

export type DissolveByStatusResult = {
  RU: MultiPolygon | Polygon | null;
  CONTESTED: MultiPolygon | Polygon | null;
  UA: MultiPolygon | Polygon | null;
  inputCounts: { RU: number; CONTESTED: number; UA: number };
  unionCounts: { RU: number; CONTESTED: number; UA: number };
};

export type DissolveOptions = {
  /** 존당 외곽 링 최대 정점 (기본 24 macro / 48 micro) */
  maxRingPoints?: number;
  /** status당 최대 입력 폴리곤 (초과 시 center 거리 우선 — 호출측에서 slice 권장) */
  maxPolygonsPerStatus?: number;
  chunkSize?: number;
};

function countParts(geom: MultiPolygon | Polygon | null): number {
  if (!geom) return 0;
  if (geom.type === "Polygon") return 1;
  return geom.coordinates.length;
}

/**
 * UkraineControlZone[] 를 controlStatus별로 geometry union.
 */
export function dissolveZonesByStatus(
  zones: UkraineControlZone[],
  options: DissolveOptions = {},
): DissolveByStatusResult {
  const maxRingPoints = options.maxRingPoints ?? 28;
  const maxPer = options.maxPolygonsPerStatus ?? 1200;
  const chunkSize = options.chunkSize ?? 40;

  const buckets: Record<"RU" | "CONTESTED" | "UA", ClipPolygon[]> = {
    RU: [],
    CONTESTED: [],
    UA: [],
  };

  for (const zone of zones) {
    const status = zone.controlStatus;
    if (status !== "RU" && status !== "CONTESTED" && status !== "UA") continue;
    if (!inTheater(zone.center.lng, zone.center.lat)) continue;
    const polys = geometryToClipPolygons(zone.geometry, maxRingPoints);
    for (const p of polys) {
      if (buckets[status].length < maxPer) buckets[status].push(p);
    }
  }

  const RU = unionClipPolygons(buckets.RU, { chunkSize });
  const CONTESTED = unionClipPolygons(buckets.CONTESTED, { chunkSize });
  const UA = unionClipPolygons(buckets.UA, { chunkSize });

  return {
    RU,
    CONTESTED,
    UA,
    inputCounts: {
      RU: buckets.RU.length,
      CONTESTED: buckets.CONTESTED.length,
      UA: buckets.UA.length,
    },
    unionCounts: {
      RU: countParts(RU),
      CONTESTED: countParts(CONTESTED),
      UA: countParts(UA),
    },
  };
}

/** MultiPolygon/Polygon → 개별 Polygon[] (MapLibre feature 분할·빗금용) */
export function explodeToPolygons(geom: MultiPolygon | Polygon | null): Polygon[] {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom];
  return geom.coordinates.map((coordinates) => ({
    type: "Polygon" as const,
    coordinates,
  }));
}
