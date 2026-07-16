import type { FeatureCollection, LineString, Point, Polygon } from "geojson";

type Accessor<T, R> = (item: T) => R;

function asFn<T, R>(value: unknown, fallback: Accessor<T, R>): Accessor<T, R> {
  return typeof value === "function" ? (value as Accessor<T, R>) : fallback;
}

/**
 * 두 함수 다 2^zoom 항이라 상한이 없었음 — 화면을 세게 줌인하면(이동 중이 아니라
 * "실제로 도달한" 높은 zoom 값 자체로도) 값이 수백 px까지 커져서 점·선이 화면을
 * 뒤덮는 문제가 있었다. 의도된 "확대하면 좀 더 굵게" 느낌은 유지하되 화면을
 * 뒤덮는 사고는 나지 않도록 안전 상한을 둔다.
 */
const MAX_ANGULAR_POINT_RADIUS_PX = 48;
const MAX_ANGULAR_LINE_WIDTH_PX = 26;

function angularToPixelRadius(angular: number, zoom: number): number {
  return Math.min(MAX_ANGULAR_POINT_RADIUS_PX, Math.max(2, angular * Math.pow(2, zoom - 0.5) * 14));
}

function angularToLineWidth(angular: number, zoom: number): number {
  return Math.min(MAX_ANGULAR_LINE_WIDTH_PX, Math.max(0.35, angular * Math.pow(2, zoom - 2) * 5.5));
}

export function buildPointsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    radius: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        color: accessors.color(item),
        radius: angularToPixelRadius(accessors.radius(item), zoom),
      },
    })),
  };
}

export function buildPathsGeoJson<T>(
  items: T[],
  accessors: {
    points: Accessor<T, { lat: number; lng: number; alt?: number }[]>;
    color: Accessor<T, string>;
    stroke: Accessor<T, number>;
    dashLength: Accessor<T, number>;
    dashGap: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const pts = accessors.points(item);
      if (!pts || pts.length < 2) return [];
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: pts.map((p) => [p.lng, p.lat]),
          },
          properties: {
            index,
            color: accessors.color(item),
            width: angularToLineWidth(accessors.stroke(item), zoom),
            dashLength: accessors.dashLength(item),
            dashGap: accessors.dashGap(item),
          },
        },
      ];
    }),
  };
}

export function buildPolygonsGeoJson<T extends { geometry: unknown }>(
  items: T[],
  accessors: {
    geometry: Accessor<T, GeoJSON.Geometry>;
    fillColor: Accessor<T, string>;
    strokeColor: Accessor<T, string>;
    fillOpacity?: Accessor<T, number>;
  },
): FeatureCollection<Polygon | GeoJSON.MultiPolygon> {
  const fillOpacity = accessors.fillOpacity ?? (() => 0.72);
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const geometry = accessors.geometry(item);
      if (!geometry) return [];
      const type = (geometry as { type?: string }).type;
      if (type !== "Polygon" && type !== "MultiPolygon") return [];
      return [
        {
          type: "Feature" as const,
          geometry: geometry as Polygon | GeoJSON.MultiPolygon,
          properties: {
            index,
            fill: accessors.fillColor(item),
            stroke: accessors.strokeColor(item),
            fillOpacity: fillOpacity(item),
          },
        },
      ];
    }),
  };
}

export function buildRingsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    maxRadius: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        color: accessors.color(item),
        radius: angularToPixelRadius(accessors.maxRadius(item) * 0.35, zoom),
      },
    })),
  };
}

export function buildLabelsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    text: Accessor<T, string>;
    size: Accessor<T, number>;
    color: Accessor<T, string>;
    dotRadius: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        label: accessors.text(item),
        size: Math.max(9, accessors.size(item) * Math.pow(2, (zoom - 2) * 0.12)),
        color: accessors.color(item),
        dotRadius: Math.max(1.5, accessors.dotRadius(item) * Math.pow(2, (zoom - 2) * 0.1)),
      },
    })),
  };
}

export function buildHeatmapGeoJson(
  layers: { points: { lat: number; lng: number; weight: number }[]; tier: string }[],
): FeatureCollection<Point>[] {
  return layers.map((layer) => ({
    type: "FeatureCollection",
    features: layer.points.map((point, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
      properties: {
        index,
        weight: point.weight,
        tier: layer.tier,
      },
    })),
  }));
}

export { asFn };

export type GlobeLayerProps = Record<string, unknown>;

export function extractLayerAccessors<T>(props: GlobeLayerProps, prefix: string) {
  return {
    lat: asFn<T, number>(props[`${prefix}Lat`], () => 0),
    lng: asFn<T, number>(props[`${prefix}Lng`], () => 0),
    color: asFn<T, string>(props[`${prefix}Color`], () => "rgba(148,163,184,0.8)"),
    radius: asFn<T, number>(props[`${prefix}Radius`], () => 0.15),
    text: asFn<T, string>(props[`${prefix}Text`], () => ""),
    size: asFn<T, number>(props[`${prefix}Size`], () => 0.5),
    dotRadius: asFn<T, number>(props[`${prefix}DotRadius`], () => 0.08),
    points: asFn<T, { lat: number; lng: number; alt?: number }[]>(props[`${prefix}Points`], () => []),
    stroke: asFn<T, number>(props[`${prefix}Stroke`], () => 0.5),
    dashLength: asFn<T, number>(props[`${prefix}DashLength`], () => 0),
    dashGap: asFn<T, number>(props[`${prefix}DashGap`], () => 0),
    maxRadius: asFn<T, number>(props[`${prefix}MaxRadius`], () => 1),
    geometry: asFn<T, GeoJSON.Geometry>(props[`${prefix}GeoJsonGeometry`], () => ({
      type: "Polygon",
      coordinates: [],
    })),
    fillColor: asFn<T, string>(props[`${prefix}CapColor`], () => "rgba(0,0,0,0)"),
    strokeColor: asFn<T, string>(props[`${prefix}StrokeColor`], () => "rgba(0,0,0,0)"),
  };
}
