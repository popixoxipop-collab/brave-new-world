import type { ConflictZoneFeature, DisputeArea, GeoJsonGeometry, TransportPath } from "@/data/geoTypes";

export type DisputeHatchStyle = "slash" | "backslash" | "horizontal" | "cross";

/** 긴장·분쟁 등급 — 등급마다 고유 색·패턴 */
export type TensionGrade = "combat" | "gray" | "high" | "medium" | "low";

/** 하단 MapLegend(전쟁·외교·동맹) 색상과 맞춤 — 보라는 동맹 핀 전용 */
export const TENSION_GRADE_STYLES: Record<
  TensionGrade,
  { outline: string; hatch: string; pattern: DisputeHatchStyle; label: string }
> = {
  combat: {
    outline: "rgba(239, 68, 68, 0.96)",
    hatch: "rgba(239, 68, 68, 0.86)",
    pattern: "slash",
    label: "실전투·폭격",
  },
  gray: {
    outline: "rgba(250, 204, 21, 0.94)",
    hatch: "rgba(250, 204, 21, 0.78)",
    pattern: "cross",
    label: "회색지대·위기",
  },
  high: {
    outline: "rgba(251, 146, 60, 0.95)",
    hatch: "rgba(251, 146, 60, 0.82)",
    pattern: "slash",
    label: "외교적 긴장",
  },
  medium: {
    outline: "rgba(255, 183, 3, 0.92)",
    hatch: "rgba(255, 183, 3, 0.76)",
    pattern: "backslash",
    label: "중긴장·영토",
  },
  low: {
    outline: "rgba(69, 243, 255, 0.78)",
    hatch: "rgba(69, 243, 255, 0.58)",
    pattern: "horizontal",
    label: "저긴장",
  },
};

function ringBbox(ring: number[][]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const pt of ring) {
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  if (!Number.isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

function geometryOuterRings(geometry: GeoJsonGeometry): number[][][] {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates;
    if (Array.isArray(coords) && Array.isArray(coords[0])) {
      const outer = coords[0] as number[][];
      return outer.length >= 2 ? [outer] : [];
    }
    return [];
  }
  if (geometry.type === "MultiPolygon") {
    const rings: number[][][] = [];
    const polygons = geometry.coordinates;
    if (Array.isArray(polygons)) {
      for (const polygon of polygons) {
        if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) continue;
        const outer = polygon[0] as number[][];
        if (outer.length >= 2) rings.push(outer);
      }
    }
    return rings;
  }
  return [];
}

export function disputeGeometryBbox(geometry: GeoJsonGeometry) {
  const rings = geometryOuterRings(geometry);
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const ring of rings) {
    const box = ringBbox(ring);
    if (!box) continue;
    minLat = Math.min(minLat, box.minLat);
    maxLat = Math.max(maxLat, box.maxLat);
    minLng = Math.min(minLng, box.minLng);
    maxLng = Math.max(maxLng, box.maxLng);
  }
  if (!Number.isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * 실제 교전·폭격·피해가중 → 무조건 빨강.
 * 회색지대·일반 긴장은 주황/노랑.
 */
export function isCombatHazard(dispute: Pick<DisputeArea, "hazardClass" | "type" | "note" | "name" | "nameLong" | "id">): boolean {
  if (dispute.hazardClass === "combat" || dispute.hazardClass === "bombardment") return true;
  const blob = `${dispute.id || ""} ${dispute.type || ""} ${dispute.note || ""} ${dispute.name || ""} ${dispute.nameLong || ""}`.toLowerCase();
  return /active combat|bombardment|폭격|교전|지상전|포격|strike zone|fire exchanges|피해 가중|naval strike|타격권/.test(blob);
}

/**
 * 분쟁 성격 → 빗금 패턴
 * - 실전투/폭격(빨강): 사선 /
 * - 회색지대/고긴장: 교차 X 또는 사선
 * - 중긴장·영토: 역사선 \
 * - 저긴장·경계선형: 가로 —
 */
export function getDisputeHatchStyle(dispute: DisputeArea): DisputeHatchStyle {
  const id = String(dispute.id || "");
  const type = `${dispute.type || ""} ${dispute.note || ""} ${dispute.nameLong || ""}`.toLowerCase();
  const cats = dispute.categories || [];

  if (isCombatHazard(dispute)) return "slash";

  if (
    /missile|wmd|crisis|gray zone|회색|adiz|nll|flashpoint|chokepoint|blockade|봉쇄|maritime/.test(type) ||
    id.includes("missile") ||
    id.includes("hormuz") ||
    id.includes("blockade") ||
    cats.includes("③")
  ) {
    return "cross";
  }
  if (dispute.tension === "high" || id.startsWith("tension-") || id.startsWith("combat-") || cats.includes("①")) {
    return "slash";
  }
  if (dispute.tension === "medium" || cats.includes("②")) {
    return "backslash";
  }
  return "horizontal";
}

export function getDisputeGrade(dispute: DisputeArea): TensionGrade {
  if (isCombatHazard(dispute)) return "combat";
  if (getDisputeHatchStyle(dispute) === "cross") return "gray";
  if (dispute.tension === "high") return "high";
  if (dispute.tension === "medium") return "medium";
  return "low";
}

export function getDisputeOutlineColor(dispute: DisputeArea): string {
  return TENSION_GRADE_STYLES[getDisputeGrade(dispute)].outline;
}

export function getDisputeHatchColor(dispute: DisputeArea): string {
  return TENSION_GRADE_STYLES[getDisputeGrade(dispute)].hatch;
}

export function getConflictZoneGrade(zone: Pick<ConflictZoneFeature, "tension">): TensionGrade {
  if (zone.tension === "high") return "high";
  if (zone.tension === "medium") return "medium";
  return "low";
}

export function getConflictZoneOutlineColor(zone: Pick<ConflictZoneFeature, "tension">): string {
  return TENSION_GRADE_STYLES[getConflictZoneGrade(zone)].outline;
}

export function getConflictZoneHatchColor(zone: Pick<ConflictZoneFeature, "tension">): string {
  return TENSION_GRADE_STYLES[getConflictZoneGrade(zone)].hatch;
}

export function parseConflictHatchGrade(pathId: string): TensionGrade | null {
  const match = pathId.match(/^conflict-hatch-(combat|gray|high|medium|low)-/);
  return match ? (match[1] as TensionGrade) : null;
}

function makePath(
  id: string,
  name: string | null,
  points: { lat: number; lng: number }[],
  kind: TransportPath["kind"],
): TransportPath | null {
  if (points.length < 2) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id,
    kind,
    name,
    scalerank: 1,
    lengthKm: null,
    bbox: {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

function hatchLines(
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  style: DisputeHatchStyle,
): { lat: number; lng: number }[][] {
  const height = Math.max(0.05, box.maxLat - box.minLat);
  const width = Math.max(0.05, box.maxLng - box.minLng);
  // 영역 크기에 비례한 간격 — 너무 촘촘하지 않게
  const step = Math.max(0.18, Math.min(0.55, Math.max(height, width) / 7));
  const lines: { lat: number; lng: number }[][] = [];
  const pad = step * 0.15;

  const addSlash = () => {
    // / 대각: lng + lat = c
    const minC = box.minLng + box.minLat - pad;
    const maxC = box.maxLng + box.maxLat + pad;
    for (let c = minC; c <= maxC; c += step) {
      // 선분 clipped to bbox (approx endpoints on edges)
      const candidates: { lat: number; lng: number }[] = [];
      // left
      {
        const lng = box.minLng;
        const lat = c - lng;
        if (lat >= box.minLat && lat <= box.maxLat) candidates.push({ lat, lng });
      }
      // right
      {
        const lng = box.maxLng;
        const lat = c - lng;
        if (lat >= box.minLat && lat <= box.maxLat) candidates.push({ lat, lng });
      }
      // bottom
      {
        const lat = box.minLat;
        const lng = c - lat;
        if (lng >= box.minLng && lng <= box.maxLng) candidates.push({ lat, lng });
      }
      // top
      {
        const lat = box.maxLat;
        const lng = c - lat;
        if (lng >= box.minLng && lng <= box.maxLng) candidates.push({ lat, lng });
      }
      if (candidates.length >= 2) {
        lines.push([candidates[0], candidates[candidates.length - 1]]);
      }
    }
  };

  const addBackslash = () => {
    // \ 대각: lng - lat = c
    const minC = box.minLng - box.maxLat - pad;
    const maxC = box.maxLng - box.minLat + pad;
    for (let c = minC; c <= maxC; c += step) {
      const candidates: { lat: number; lng: number }[] = [];
      {
        const lng = box.minLng;
        const lat = lng - c;
        if (lat >= box.minLat && lat <= box.maxLat) candidates.push({ lat, lng });
      }
      {
        const lng = box.maxLng;
        const lat = lng - c;
        if (lat >= box.minLat && lat <= box.maxLat) candidates.push({ lat, lng });
      }
      {
        const lat = box.minLat;
        const lng = c + lat;
        if (lng >= box.minLng && lng <= box.maxLng) candidates.push({ lat, lng });
      }
      {
        const lat = box.maxLat;
        const lng = c + lat;
        if (lng >= box.minLng && lng <= box.maxLng) candidates.push({ lat, lng });
      }
      if (candidates.length >= 2) {
        lines.push([candidates[0], candidates[candidates.length - 1]]);
      }
    }
  };

  const addHorizontal = () => {
    for (let lat = box.minLat + step * 0.5; lat < box.maxLat; lat += step) {
      lines.push([
        { lat, lng: box.minLng },
        { lat, lng: box.maxLng },
      ]);
    }
  };

  if (style === "slash") addSlash();
  else if (style === "backslash") addBackslash();
  else if (style === "horizontal") addHorizontal();
  else {
    addSlash();
    addBackslash();
  }

  return lines;
}

function ringApproxArea(ring: number[][]) {
  const box = ringBbox(ring);
  if (!box) return 0;
  return Math.max(0.001, box.maxLat - box.minLat) * Math.max(0.001, box.maxLng - box.minLng);
}

/** 분쟁·긴장 구역 geometry bbox 안 — 사각 틀 + 등급별 빗금 */
function regionToOutlineAndHatchPaths(
  regionId: string,
  name: string | null,
  geometry: GeoJsonGeometry,
  grade: TensionGrade,
  kinds: { outline: TransportPath["kind"]; hatch: TransportPath["kind"] },
  hatchIdPrefix: string,
  preferDetailSegments = true,
): TransportPath[] {
  const out: TransportPath[] = [];
  let rings = geometryOuterRings(geometry);
  // 줌 아웃: 가장 큰 외곽만 · 근접 줌: MultiPolygon 세부 세그먼트 전부
  if (!preferDetailSegments && rings.length > 1) {
    rings = [rings.slice().sort((a, b) => ringApproxArea(b) - ringApproxArea(a))[0]];
  }
  const style = TENSION_GRADE_STYLES[grade].pattern;

  for (const [index, ring] of rings.entries()) {
    const points = ring
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length < 2) continue;
    const stride = points.length > 96 ? Math.ceil(points.length / 80) : 1;
    const simplified =
      stride <= 1
        ? points
        : points.filter((_, i) => i % stride === 0 || i === points.length - 1);
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) simplified.push({ ...first });
    const border = makePath(
      `${kinds.outline}-${regionId}-${index}`,
      name,
      simplified,
      kinds.outline,
    );
    if (border) out.push(border);
  }

  const box = preferDetailSegments
    ? disputeGeometryBbox(geometry)
    : rings.length > 0
      ? ringBbox(rings[0])
      : null;
  if (!box) return out;
  out.push(...geometryHatchPathsOnly(hatchIdPrefix, name, box, style, kinds.hatch));
  return out;
}

/** 고정 외곽 테두리 + 성격별 빗금 path */
export function disputeToOutlineAndHatchPaths(
  dispute: DisputeArea,
  options?: { preferDetailSegments?: boolean },
): TransportPath[] {
  if (!dispute.geometry) return [];
  return regionToOutlineAndHatchPaths(
    dispute.id,
    dispute.name,
    dispute.geometry,
    getDisputeGrade(dispute),
    { outline: "dispute-zone", hatch: "dispute-hatch" },
    `dispute-hatch-${dispute.id}`,
    options?.preferDetailSegments ?? true,
  );
}

/** 레이어 체크박스 — 전쟁(combat) / 외교 긴장(high)만 표시 */
export function disputeMatchesWarDiplomaticLayers(
  dispute: DisputeArea,
  showWarZones: boolean,
  showDiplomaticTension: boolean,
): boolean {
  const grade = getDisputeGrade(dispute);
  if (grade === "combat") return showWarZones;
  if (grade === "high") return showDiplomaticTension;
  return false;
}

/** GDELT 분쟁 클러스터 구역 — 사각 틀 + 긴장도별 빗금 */
export function conflictZoneToOutlineAndHatchPaths(zone: ConflictZoneFeature): TransportPath[] {
  if (!zone.geometry) return [];
  const grade = getConflictZoneGrade(zone);
  return regionToOutlineAndHatchPaths(
    zone.id,
    zone.name,
    zone.geometry,
    grade,
    { outline: "dispute-zone", hatch: "conflict-hatch" },
    `conflict-hatch-${grade}-${zone.id}`,
  );
}

/** bbox 내부 빗금 선분만 생성 (국가·분쟁구역 오버레이용) */
export function geometryHatchPathsOnly(
  idPrefix: string,
  name: string | null,
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  style: DisputeHatchStyle,
  kind: TransportPath["kind"],
  accentColor?: string,
): TransportPath[] {
  const hatches = hatchLines(box, style);
  const out: TransportPath[] = [];
  for (const [index, segment] of hatches.entries()) {
    const hatch = makePath(`${idPrefix}-${index}`, name, segment, kind);
    if (hatch) {
      if (accentColor) hatch.accentColor = accentColor;
      out.push(hatch);
    }
  }
  return out;
}

/**
 * 커스텀 색 외곽+빗금 — 우크라 점령/주장 등.
 * dashed는 렌더러(kind)에서 처리.
 */
export function geometryToAccentOutlineAndHatch(
  regionId: string,
  name: string | null,
  geometry: GeoJsonGeometry,
  options: {
    outlineKind: TransportPath["kind"];
    hatchKind: TransportPath["kind"];
    outlineColor: string;
    hatchColor: string;
    pattern: DisputeHatchStyle;
    preferDetailSegments?: boolean;
  },
): TransportPath[] {
  const out: TransportPath[] = [];
  let rings = geometryOuterRings(geometry);
  const preferDetail = options.preferDetailSegments ?? true;
  if (!preferDetail && rings.length > 1) {
    rings = [rings.slice().sort((a, b) => ringApproxArea(b) - ringApproxArea(a))[0]!];
  }

  for (const [index, ring] of rings.entries()) {
    const points = ring
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length < 2) continue;
    const stride = points.length > 96 ? Math.ceil(points.length / 80) : 1;
    const simplified =
      stride <= 1
        ? points
        : points.filter((_, i) => i % stride === 0 || i === points.length - 1);
    const first = simplified[0]!;
    const last = simplified[simplified.length - 1]!;
    if (first.lat !== last.lat || first.lng !== last.lng) simplified.push({ ...first });
    const border = makePath(
      `${options.outlineKind}-${regionId}-${index}`,
      name,
      simplified,
      options.outlineKind,
    );
    if (border) {
      border.accentColor = options.outlineColor;
      out.push(border);
    }
  }

  const box = preferDetail
    ? disputeGeometryBbox(geometry)
    : rings.length > 0
      ? ringBbox(rings[0]!)
      : null;
  if (!box) return out;
  out.push(
    ...geometryHatchPathsOnly(
      `${options.hatchKind}-${regionId}`,
      name,
      box,
      options.pattern,
      options.hatchKind,
      options.hatchColor,
    ),
  );
  return out;
}

export function geometryToHatchPaths(
  idPrefix: string,
  name: string | null,
  geometry: GeoJsonGeometry,
  grade: TensionGrade,
  kind: TransportPath["kind"] = "conflict-hatch",
): TransportPath[] {
  const box = disputeGeometryBbox(geometry);
  if (!box) return [];
  return geometryHatchPathsOnly(
    `conflict-hatch-${grade}-${idPrefix}`,
    name,
    box,
    TENSION_GRADE_STYLES[grade].pattern,
    kind,
  );
}

export function rankDisputesForDisplay(disputes: DisputeArea[]): DisputeArea[] {
  return disputes.slice().sort((a, b) => {
    const score = (d: DisputeArea) =>
      (isCombatHazard(d) ? 50 : 0) +
      (d.tension === "high" ? 30 : d.tension === "medium" ? 20 : 5) +
      (String(d.id).startsWith("tension-") || String(d.id).startsWith("combat-") ? 15 : 0) -
      (d.scalerank ?? 10);
    return score(b) - score(a);
  });
}
