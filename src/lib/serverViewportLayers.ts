import fs from "fs";
import path from "path";
import type { CountryFeature, TransportPath } from "@/data/geoTypes";
import { expandTransportPaths } from "@/lib/compactData";
import type { GlobeLodTier } from "@/lib/globeLod";
import { getServerDataProfile } from "@/lib/serverEnv";
import {
  GAS_PIPELINE_MAX_BY_TIER,
  OIL_PIPELINE_MAX_BY_TIER,
  SHIPPING_LANE_MAX_BY_TIER,
  SUBMARINE_CABLE_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { COUNTRY_POLYGON_MAX_BY_TIER, bboxNearView, isCenterInView } from "@/lib/viewportCull";
import {
  isViewportPathLayer,
  type ViewportPathLayer,
} from "@/lib/viewportPathTypes";

export type { ViewportPathLayer };
export { isViewportPathLayer };
const FILE_BY_LAYER: Record<ViewportPathLayer, string> = {
  railroads: "railroads.json",
  "shipping-lanes": "shipping-lanes.json",
  "submarine-cables": "submarine-cables.json",
  "oil-pipelines": "oil-pipelines.json",
  "gas-pipelines": "gas-pipelines.json",
  "dispute-boundaries": "dispute-boundaries.json",
};

const DEFAULT_MAX: Record<ViewportPathLayer, Record<GlobeLodTier, number>> = {
  railroads: {
    global: 480,
    continent: 900,
    regional: 1000,
    near: 2200,
    village: 3500,
  },
  "shipping-lanes": SHIPPING_LANE_MAX_BY_TIER,
  "submarine-cables": SUBMARINE_CABLE_MAX_BY_TIER,
  "oil-pipelines": OIL_PIPELINE_MAX_BY_TIER,
  "gas-pipelines": GAS_PIPELINE_MAX_BY_TIER,
  "dispute-boundaries": {
    global: 40,
    continent: 80,
    regional: 140,
    near: 220,
    village: 320,
  },
};

const pathCache = new Map<string, TransportPath[]>();
const countryCache = new Map<string, CountryFeature[]>();

function profileDir(profile = getServerDataProfile()) {
  return path.join(process.cwd(), "public", "data", profile);
}

function readJsonFile<T>(fileName: string): T | null {
  const profile = getServerDataProfile();
  const primary = path.join(profileDir(profile), fileName);
  const fallback = path.join(process.cwd(), "public", "data", fileName);
  for (const filePath of [primary, fallback]) {
    if (!fs.existsSync(filePath)) continue;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch {
      // next
    }
  }
  return null;
}

export function loadAllTransportPaths(layer: ViewportPathLayer): TransportPath[] {
  const profile = getServerDataProfile();
  const key = `${profile}:${layer}`;
  const hit = pathCache.get(key);
  if (hit) return hit;

  const raw = readJsonFile<unknown[]>(FILE_BY_LAYER[layer]);
  if (!Array.isArray(raw) || raw.length === 0) {
    pathCache.set(key, []);
    return [];
  }
  const paths = expandTransportPaths(
    raw as Parameters<typeof expandTransportPaths>[0],
  );
  pathCache.set(key, paths);
  return paths;
}

export function loadAllCountries(): CountryFeature[] {
  const profile = getServerDataProfile();
  const key = `${profile}:countries`;
  const hit = countryCache.get(key);
  if (hit) return hit;

  const chunk = readJsonFile<CountryFeature[]>("countries.json");
  let countries: CountryFeature[] = [];
  if (Array.isArray(chunk) && chunk.length > 0) {
    countries = chunk;
  } else {
    const app = readJsonFile<{ countries?: CountryFeature[] }>("app-data.json");
    if (Array.isArray(app?.countries)) countries = app.countries;
  }
  countryCache.set(key, countries);
  return countries;
}

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function filterTransportPathsForViewport(
  paths: TransportPath[],
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    maxCount: number;
    maxScalerank?: number;
    arterialMaxRank?: number;
  },
): TransportPath[] {
  const {
    lat,
    lng,
    radiusDeg,
    maxCount,
    maxScalerank = 99,
    arterialMaxRank = 99,
  } = options;
  if (maxCount <= 0) return [];

  const view = { lat, lng, altitude: 1 };
  const visible: TransportPath[] = [];

  for (const path of paths) {
    if (path.scalerank > maxScalerank) continue;
    const isArterial = path.scalerank <= arterialMaxRank;
    if (!isArterial && radiusDeg > 0 && !bboxNearView(path.bbox, view, radiusDeg)) {
      continue;
    }
    visible.push(path);
    if (visible.length >= maxCount) break;
  }

  return visible;
}

export function queryViewportPaths(
  layer: ViewportPathLayer,
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    tier: GlobeLodTier;
    max?: number;
    maxScalerank?: number;
    arterialMaxRank?: number;
  },
) {
  const all = loadAllTransportPaths(layer);
  const defaultMax = DEFAULT_MAX[layer][options.tier] ?? 200;
  const maxCount = Math.min(options.max ?? defaultMax, defaultMax || options.max || 0);
  if (maxCount <= 0) {
    return { paths: [] as TransportPath[], total: all.length, returned: 0 };
  }

  const paths = filterTransportPathsForViewport(all, {
    lat: options.lat,
    lng: options.lng,
    radiusDeg: options.radiusDeg,
    maxCount,
    maxScalerank: options.maxScalerank,
    arterialMaxRank: options.arterialMaxRank,
  });

  return { paths, total: all.length, returned: paths.length };
}

export function queryViewportCountries(options: {
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
}) {
  const all = loadAllCountries().filter((c) => Boolean(c.geometry));
  const defaultMax = COUNTRY_POLYGON_MAX_BY_TIER[options.tier];
  const maxCount = Math.min(options.max ?? defaultMax, defaultMax);
  const view = { lat: options.lat, lng: options.lng };

  const ranked = all
    .map((country) => {
      const dist = Math.sqrt(
        (country.center.lat - view.lat) ** 2 +
          longitudeDistance(country.center.lng, view.lng) ** 2,
      );
      return { country, dist };
    })
    .filter((item) =>
      options.radiusDeg <= 0
        ? true
        : isCenterInView(item.country.center, view, options.radiusDeg),
    )
    .sort(
      (a, b) =>
        (b.country.population ?? 0) - (a.country.population ?? 0) || a.dist - b.dist,
    )
    .slice(0, maxCount)
    .map((item) => item.country);

  return { countries: ranked, total: all.length, returned: ranked.length };
}
