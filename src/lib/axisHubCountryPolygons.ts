import type { AxisHubId } from "@/data/axisNetwork";
import type { CountryFeature } from "@/data/geoTypes";
import type { FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";

/** 축 관계망 4허브 — 중국·러시아·북한·이란 */
export const AXIS_HUB_ISOS: readonly AxisHubId[] = ["CHN", "RUS", "PRK", "IRN"];

export const AXIS_HUB_FILL = "#dc2626";
export const AXIS_HUB_FILL_OPACITY = 0.28;
export const AXIS_HUB_ACTIVE_FILL_OPACITY = 0.38;
export const AXIS_HUB_STROKE = "rgba(248, 113, 113, 0.75)";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

function ringLngSpan(ring: Position[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const [lng] of ring) {
    if (lng < min) min = lng;
    if (lng > max) max = lng;
  }
  return max - min;
}

/** 날짜변경선(±180°)을 가로지르는 링은 MapLibre fill에서 지도 전체로 번짐 */
function ringCrossesAntimeridian(ring: Position[]): boolean {
  return ringLngSpan(ring) > 180;
}

function sanitizePolygon(geometry: Polygon): Polygon | null {
  const outer = geometry.coordinates[0];
  if (!outer?.length || ringCrossesAntimeridian(outer)) return null;
  const holes = geometry.coordinates.slice(1).filter((ring) => !ringCrossesAntimeridian(ring));
  return { type: "Polygon", coordinates: [outer, ...holes] };
}

function sanitizeMultiPolygon(geometry: MultiPolygon): MultiPolygon | null {
  const parts = geometry.coordinates
    .map((poly) => {
      const outer = poly[0];
      if (!outer?.length || ringCrossesAntimeridian(outer)) return null;
      const holes = poly.slice(1).filter((ring) => !ringCrossesAntimeridian(ring));
      return [outer, ...holes] as Polygon["coordinates"];
    })
    .filter((part): part is Polygon["coordinates"] => Boolean(part));
  if (parts.length === 0) return null;
  return { type: "MultiPolygon", coordinates: parts };
}

function sanitizeGeometry(geometry: CountryFeature["geometry"]) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return sanitizePolygon(geometry as Polygon);
  if (geometry.type === "MultiPolygon") return sanitizeMultiPolygon(geometry as MultiPolygon);
  return null;
}

export function buildAxisHubCountriesGeoJson(
  countries: CountryFeature[] | undefined,
  options?: { activeIso?: AxisHubId | null },
): FeatureCollection {
  if (!countries?.length) return EMPTY_FC;

  const isoSet = new Set<string>(AXIS_HUB_ISOS);
  const features = countries
    .filter((country) => country.isoA3 && isoSet.has(country.isoA3))
    .flatMap((country) => {
      const geometry = sanitizeGeometry(country.geometry);
      if (!geometry) return [];

      const iso = country.isoA3 as AxisHubId;
      const isActive = options?.activeIso === iso;

      return [
        {
          type: "Feature" as const,
          id: iso,
          geometry,
          properties: {
            iso,
            name: country.name,
            fill: AXIS_HUB_FILL,
            fillOpacity: isActive ? AXIS_HUB_ACTIVE_FILL_OPACITY : AXIS_HUB_FILL_OPACITY,
            stroke: AXIS_HUB_STROKE,
          },
        },
      ];
    });

  return { type: "FeatureCollection", features };
}
