"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ArmsEmbargoZone,
  ConflictZoneFeature,
  DisputeOverview,
  MilitaryBaseArea,
  StaticPoint,
  TransportPath,
} from "@/data/geoTypes";
import { dataPath, getDataProfile } from "@/lib/dataProfile";
import { expandStaticPoints, expandTransportPaths } from "@/lib/compactData";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  bboxNearView as isBboxNearView,
  isCenterInView,
} from "@/lib/viewportCull";
import {
  GAS_PIPELINE_MAX_BY_TIER,
  MILITARY_BASE_AREA_MAX_BY_TIER,
  OIL_PIPELINE_MAX_BY_TIER,
  SHIPPING_LANE_MAX_BY_TIER,
  SUBMARINE_CABLE_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { filterStaticPointsForView } from "@/lib/staticGlobe";

type ViewState = { lat: number; lng: number; altitude: number };

type ApiPointsPayload = {
  enabled?: boolean;
  points?: unknown[];
  zones?: unknown[];
};

function pathNearView(path: TransportPath, view: ViewState, radiusDeg: number) {
  if (radiusDeg <= 0) return false;
  return isBboxNearView(path.bbox, view, radiusDeg);
}

function centerNearView(
  center: { lat: number; lng: number },
  view: ViewState,
  radiusDeg: number,
) {
  return isCenterInView(center, view, radiusDeg);
}

function filterPaths(
  paths: TransportPath[],
  view: ViewState,
  radiusDeg: number,
  maxCount: number,
) {
  if (maxCount <= 0) return [];
  const visible: TransportPath[] = [];
  for (const path of paths) {
    if (radiusDeg > 0 && !pathNearView(path, view, radiusDeg)) continue;
    visible.push(path);
    if (visible.length >= maxCount) break;
  }
  return visible;
}

function filterMilitaryBaseAreas(
  areas: MilitaryBaseArea[],
  view: ViewState,
  tier: GlobeLodTier,
  radiusDeg: number,
) {
  const maxCount = MILITARY_BASE_AREA_MAX_BY_TIER[tier];
  if (maxCount <= 0) return [];
  // 전역/대륙: 미국 본토·괌이 한 화면에 들어오도록 반경을 넓게
  const effectiveRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 55) : radiusDeg;
  const visible: MilitaryBaseArea[] = [];
  for (const area of areas) {
    if (effectiveRadius > 0 && !centerNearView(area.center, view, effectiveRadius)) continue;
    visible.push(area);
    if (visible.length >= maxCount) break;
  }
  return visible;
}

async function fetchJsonArray(relativePath: string) {
  const response = await fetch(dataPath(relativePath), { cache: "no-store" });
  if (!response.ok) throw new Error(`${relativePath}: ${response.status}`);
  return response.json();
}

async function fetchJsonArrayFromCandidates(paths: string[]) {
  for (const path of paths) {
    const response = await fetch(path, { cache: "no-store" });
    if (response.ok) return response.json();
  }
  throw new Error(`No static layer found: ${paths.join(", ")}`);
}

async function fetchApiJson(apiPath: string): Promise<ApiPointsPayload> {
  const response = await fetch(apiPath, { cache: "no-store" });
  if (!response.ok) throw new Error(`${apiPath}: ${response.status}`);
  return response.json();
}

function expandPathsFromJson(raw: unknown[]) {
  return expandTransportPaths(raw as Parameters<typeof expandTransportPaths>[0]);
}

function expandPointsFromJson(raw: unknown[]) {
  return expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
}

function expandMilitaryAreasFromJson(raw: unknown[]) {
  return (raw as MilitaryBaseArea[]).filter(
    (item) => item && item.geometry && item.center && typeof item.name === "string",
  );
}

function expandZonesFromJson<T extends { id: string; center: { lat: number; lng: number } }>(
  raw: unknown[],
): T[] {
  return (raw as T[]).filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      item.center &&
      Number.isFinite(item.center.lat) &&
      Number.isFinite(item.center.lng),
  );
}

export function useGlobeStaticLayers(options: {
  viewState: ViewState;
  globeTier: GlobeLodTier;
  radiusDeg: number;
  showDisputeBoundaries: boolean;
  showShippingLanes: boolean;
  showSubmarineCables: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  showAirports: boolean;
  showPorts: boolean;
  showMilitaryBases: boolean;
  showResources: boolean;
  showCableLandings: boolean;
  showNuclearSites?: boolean;
  showInternetExchanges?: boolean;
  showRefugeeCamps?: boolean;
  showUcdpEvents?: boolean;
  showAiDataCenters?: boolean;
  showEconomicCenters?: boolean;
  showSanctionsEntities?: boolean;
  showSpaceLaunches?: boolean;
  showIntelHotspots?: boolean;
  showConflictZones?: boolean;
  showArmsEmbargo?: boolean;
  coastlineMaxByTier: Record<GlobeLodTier, number>;
  countryBorderMaxByTier: Record<GlobeLodTier, number>;
  uncappedTiers: Set<GlobeLodTier>;
  /** 벡터 베이스맵: 해안·국경 전체를 뷰포트 컷 없이 한 번에 표시 */
  vectorBaseMap?: boolean;
  /** Bump after live sync so cached layers re-fetch from disk/API. */
  reloadToken?: number;
}) {
  const [coastlinePaths, setCoastlinePaths] = useState<TransportPath[]>([]);
  const [countryBorderPaths, setCountryBorderPaths] = useState<TransportPath[]>([]);
  const [disputeBoundaryPaths, setDisputeBoundaryPaths] = useState<TransportPath[]>([]);
  const [shippingPaths, setShippingPaths] = useState<TransportPath[]>([]);
  const [cablePaths, setCablePaths] = useState<TransportPath[]>([]);
  const [oilPipelinePaths, setOilPipelinePaths] = useState<TransportPath[]>([]);
  const [gasPipelinePaths, setGasPipelinePaths] = useState<TransportPath[]>([]);
  const [lngTerminals, setLngTerminals] = useState<StaticPoint[]>([]);
  const [airports, setAirports] = useState<StaticPoint[]>([]);
  const [ports, setPorts] = useState<StaticPoint[]>([]);
  const [militaryBases, setMilitaryBases] = useState<StaticPoint[]>([]);
  const [militaryBaseAreas, setMilitaryBaseAreas] = useState<MilitaryBaseArea[]>([]);
  const [resources, setResources] = useState<StaticPoint[]>([]);
  const [cableLandings, setCableLandings] = useState<StaticPoint[]>([]);
  const [nuclearSites, setNuclearSites] = useState<StaticPoint[]>([]);
  const [internetExchanges, setInternetExchanges] = useState<StaticPoint[]>([]);
  const [refugeeCamps, setRefugeeCamps] = useState<StaticPoint[]>([]);
  const [ucdpEvents, setUcdpEvents] = useState<StaticPoint[]>([]);
  const [aiDataCenters, setAiDataCenters] = useState<StaticPoint[]>([]);
  const [economicCenters, setEconomicCenters] = useState<StaticPoint[]>([]);
  const [sanctionsEntities, setSanctionsEntities] = useState<StaticPoint[]>([]);
  const [spaceLaunches, setSpaceLaunches] = useState<StaticPoint[]>([]);
  const [intelHotspots, setIntelHotspots] = useState<StaticPoint[]>([]);
  const [conflictZones, setConflictZones] = useState<ConflictZoneFeature[]>([]);
  const [armsEmbargoZones, setArmsEmbargoZones] = useState<ArmsEmbargoZone[]>([]);
  const [disputeOverviews, setDisputeOverviews] = useState<Map<string, DisputeOverview>>(new Map());

  const loadedRef = useRef<Record<string, boolean>>({});
  const reloadToken = options.reloadToken ?? 0;

  useEffect(() => {
    if (reloadToken <= 0) return;
    loadedRef.current = {};
  }, [reloadToken]);

  const loadOnce = useCallback(
    async <T>(
      key: string,
      relativePath: string,
      setter: (value: T) => void,
      expand: (raw: unknown[]) => T,
    ) => {
      if (loadedRef.current[key]) return;
      try {
        const raw = await fetchJsonArray(relativePath);
        setter(expand(raw));
        loadedRef.current[key] = true;
      } catch {
        // optional layer
      }
    },
    [],
  );

  const loadOnceApiPoints = useCallback(
    async (
      key: string,
      apiPath: string,
      setter: (value: StaticPoint[]) => void,
      options?: { requireEnabled?: boolean },
    ) => {
      if (loadedRef.current[key]) return;
      try {
        const payload = await fetchApiJson(apiPath);
        if (options?.requireEnabled && payload.enabled === false) {
          setter([]);
          loadedRef.current[key] = true;
          return;
        }
        const raw = Array.isArray(payload.points) ? payload.points : [];
        if (options?.requireEnabled && raw.length === 0) {
          setter([]);
          loadedRef.current[key] = true;
          return;
        }
        setter(expandPointsFromJson(raw));
        loadedRef.current[key] = true;
      } catch {
        // optional layer
      }
    },
    [],
  );

  const loadOnceApiZones = useCallback(
    async <T extends { id: string; center: { lat: number; lng: number } }>(
      key: string,
      apiPath: string,
      setter: (value: T[]) => void,
    ) => {
      if (loadedRef.current[key]) return;
      try {
        const payload = await fetchApiJson(apiPath);
        const raw = Array.isArray(payload.zones) ? payload.zones : [];
        setter(expandZonesFromJson<T>(raw));
        loadedRef.current[key] = true;
      } catch {
        // optional layer
      }
    },
    [],
  );

  useEffect(() => {
    if (!options.vectorBaseMap) return;
    if (loadedRef.current.coastlines) return;
    const profile = getDataProfile();
    const candidates =
      profile === "lite"
        ? ["/data/full/coastlines.json", dataPath("coastlines.json")]
        : [dataPath("coastlines.json"), "/data/full/coastlines.json"];

    fetchJsonArrayFromCandidates(candidates)
      .then((raw) => {
        setCoastlinePaths(expandPathsFromJson(raw as unknown[]));
        loadedRef.current.coastlines = true;
      })
      .catch(() => {
        // optional layer
      });
  }, [options.vectorBaseMap, reloadToken]);

  useEffect(() => {
    if (loadedRef.current.borders) return;
    const candidates = [
      "/data/lite/country-borders.json",
      dataPath("country-borders.json"),
      "/data/full/country-borders.json",
    ];
    fetchJsonArrayFromCandidates(candidates)
      .then((raw) => {
        setCountryBorderPaths(expandPathsFromJson(raw as unknown[]));
        loadedRef.current.borders = true;
      })
      .catch(() => {
        // optional layer
      });
  }, [reloadToken]);

  useEffect(() => {
    if (options.showDisputeBoundaries) {
      loadOnce("disputeBoundaries", "dispute-boundaries.json", setDisputeBoundaryPaths, expandPathsFromJson);
    }
  }, [loadOnce, options.showDisputeBoundaries, reloadToken]);

  useEffect(() => {
    if (options.showShippingLanes) {
      loadOnce("shipping", "shipping-lanes.json", setShippingPaths, expandPathsFromJson);
    }
  }, [loadOnce, options.showShippingLanes, reloadToken]);

  useEffect(() => {
    if (options.showSubmarineCables) {
      loadOnce("cables", "submarine-cables.json", setCablePaths, expandPathsFromJson);
    }
  }, [loadOnce, options.showSubmarineCables, reloadToken]);

  useEffect(() => {
    if (options.showOilPipelines) {
      loadOnce("oilPipelines", "oil-pipelines.json", setOilPipelinePaths, expandPathsFromJson);
    }
  }, [loadOnce, options.showOilPipelines, reloadToken]);

  useEffect(() => {
    if (options.showGasPipelines) {
      loadOnce("gasPipelines", "gas-pipelines.json", setGasPipelinePaths, expandPathsFromJson);
    }
  }, [loadOnce, options.showGasPipelines, reloadToken]);

  useEffect(() => {
    if (options.showLngTerminals) {
      loadOnce("lngTerminals", "lng-terminals.json", setLngTerminals, expandPointsFromJson);
    }
  }, [loadOnce, options.showLngTerminals, reloadToken]);

  useEffect(() => {
    if (options.showAirports) {
      loadOnce("airports", "airports.json", setAirports, expandPointsFromJson);
    }
  }, [loadOnce, options.showAirports, reloadToken]);

  useEffect(() => {
    if (options.showPorts) {
      loadOnce("ports", "ports.json", setPorts, expandPointsFromJson);
    }
  }, [loadOnce, options.showPorts, reloadToken]);

  useEffect(() => {
    if (options.showMilitaryBases) {
      loadOnce("bases", "military-bases.json", setMilitaryBases, expandPointsFromJson);
      loadOnce(
        "baseAreas",
        "military-base-areas.json",
        setMilitaryBaseAreas,
        expandMilitaryAreasFromJson,
      );
    }
  }, [loadOnce, options.showMilitaryBases, reloadToken]);

  useEffect(() => {
    if (options.showResources) {
      loadOnce("resources", "resources.json", setResources, expandPointsFromJson);
    }
  }, [loadOnce, options.showResources, reloadToken]);

  useEffect(() => {
    if (options.showCableLandings) {
      loadOnce("cableLandings", "cable-landings.json", setCableLandings, expandPointsFromJson);
    }
  }, [loadOnce, options.showCableLandings, reloadToken]);

  useEffect(() => {
    if (options.showNuclearSites) {
      loadOnce("nuclearSites", "nuclear-sites.json", setNuclearSites, expandPointsFromJson);
    }
  }, [loadOnce, options.showNuclearSites, reloadToken]);

  useEffect(() => {
    if (options.showInternetExchanges) {
      loadOnce(
        "internetExchanges",
        "internet-exchanges.json",
        setInternetExchanges,
        expandPointsFromJson,
      );
    }
  }, [loadOnce, options.showInternetExchanges, reloadToken]);

  useEffect(() => {
    if (options.showRefugeeCamps) {
      loadOnce("refugeeCamps", "refugee-camps.json", setRefugeeCamps, expandPointsFromJson);
    }
  }, [loadOnce, options.showRefugeeCamps, reloadToken]);

  useEffect(() => {
    if (options.showUcdpEvents) {
      loadOnce("ucdpEvents", "ucdp-events.json", setUcdpEvents, expandPointsFromJson);
    }
  }, [loadOnce, options.showUcdpEvents, reloadToken]);

  useEffect(() => {
    if (options.showAiDataCenters) {
      loadOnceApiPoints("aiDataCenters", "/api/layers/ai-data-centers", setAiDataCenters);
    }
  }, [loadOnceApiPoints, options.showAiDataCenters, reloadToken]);

  useEffect(() => {
    if (options.showEconomicCenters) {
      loadOnceApiPoints("economicCenters", "/api/layers/economic-centers", setEconomicCenters);
    }
  }, [loadOnceApiPoints, options.showEconomicCenters, reloadToken]);

  useEffect(() => {
    if (options.showSanctionsEntities) {
      loadOnceApiPoints("sanctionsEntities", "/api/layers/sanctions-entities", setSanctionsEntities);
    }
  }, [loadOnceApiPoints, options.showSanctionsEntities, reloadToken]);

  useEffect(() => {
    if (options.showSpaceLaunches) {
      loadOnceApiPoints("spaceLaunches", "/api/space-launches", setSpaceLaunches);
    }
  }, [loadOnceApiPoints, options.showSpaceLaunches, reloadToken]);

  useEffect(() => {
    if (options.showIntelHotspots) {
      loadOnceApiPoints("intelHotspots", "/api/intel-hotspots", setIntelHotspots, {
        requireEnabled: true,
      });
    }
  }, [loadOnceApiPoints, options.showIntelHotspots, reloadToken]);

  useEffect(() => {
    if (options.showConflictZones) {
      loadOnceApiZones<ConflictZoneFeature>(
        "conflictZones",
        "/api/layers/conflict-zones",
        setConflictZones,
      );
    }
  }, [loadOnceApiZones, options.showConflictZones, reloadToken]);

  useEffect(() => {
    if (options.showArmsEmbargo) {
      loadOnceApiZones<ArmsEmbargoZone>(
        "armsEmbargoZones",
        "/api/layers/arms-embargo-zones",
        setArmsEmbargoZones,
      );
    }
  }, [loadOnceApiZones, options.showArmsEmbargo, reloadToken]);

  useEffect(() => {
    if (!options.showDisputeBoundaries) return;
    let mounted = true;
    fetch(dataPath("dispute-overviews.json"))
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload: { items?: DisputeOverview[] } | null) => {
        if (!mounted || !payload?.items) return;
        setDisputeOverviews(new Map(payload.items.map((item) => [item.id, item])));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [options.showDisputeBoundaries, reloadToken]);

  const visibleCoastlines = useMemo(() => {
    if (options.vectorBaseMap) return coastlinePaths;
    const maxCount = options.uncappedTiers.has(options.globeTier)
      ? coastlinePaths.length
      : options.coastlineMaxByTier[options.globeTier];
    return filterPaths(coastlinePaths, options.viewState, options.radiusDeg, maxCount);
  }, [coastlinePaths, options]);

  const visibleCountryBorders = useMemo(() => {
    if (options.vectorBaseMap) return countryBorderPaths;
    const maxCount = options.countryBorderMaxByTier[options.globeTier];
    return filterPaths(
      countryBorderPaths,
      options.viewState,
      options.radiusDeg,
      maxCount,
    );
  }, [countryBorderPaths, options]);

  const visibleDisputeBoundariesFiltered = useMemo(() => {
    if (!options.showDisputeBoundaries) return [];
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 40,
      continent: 80,
      regional: 140,
      near: 220,
      village: 320,
    };
    const max = maxByTier[options.globeTier];
    return filterPaths(
      disputeBoundaryPaths,
      options.viewState,
      options.radiusDeg,
      max,
    );
  }, [disputeBoundaryPaths, options]);

  const visibleShipping = useMemo(() => {
    if (!options.showShippingLanes) return [];
    const max = SHIPPING_LANE_MAX_BY_TIER[options.globeTier];
    return filterPaths(shippingPaths, options.viewState, options.radiusDeg, max);
  }, [shippingPaths, options]);

  const visibleCables = useMemo(() => {
    if (!options.showSubmarineCables) return [];
    const max = SUBMARINE_CABLE_MAX_BY_TIER[options.globeTier];
    return filterPaths(cablePaths, options.viewState, options.radiusDeg, max);
  }, [cablePaths, options]);

  const visibleOilPipelines = useMemo(() => {
    if (!options.showOilPipelines) return [];
    const max = OIL_PIPELINE_MAX_BY_TIER[options.globeTier];
    return filterPaths(oilPipelinePaths, options.viewState, options.radiusDeg, max);
  }, [oilPipelinePaths, options]);

  const visibleGasPipelines = useMemo(() => {
    if (!options.showGasPipelines) return [];
    const max = GAS_PIPELINE_MAX_BY_TIER[options.globeTier];
    return filterPaths(gasPipelinePaths, options.viewState, options.radiusDeg, max);
  }, [gasPipelinePaths, options]);

  const visibleStaticPoints = useMemo(() => {
    const merged: StaticPoint[] = [];
    if (options.showAirports) merged.push(...airports);
    if (options.showPorts) merged.push(...ports);
    if (options.showMilitaryBases) merged.push(...militaryBases);
    if (options.showResources) merged.push(...resources);
    if (options.showCableLandings) merged.push(...cableLandings);
    if (options.showNuclearSites) merged.push(...nuclearSites);
    if (options.showInternetExchanges) merged.push(...internetExchanges);
    if (options.showRefugeeCamps) merged.push(...refugeeCamps);
    if (options.showUcdpEvents) merged.push(...ucdpEvents);
    if (options.showAiDataCenters) merged.push(...aiDataCenters);
    if (options.showEconomicCenters) merged.push(...economicCenters);
    if (options.showSanctionsEntities) merged.push(...sanctionsEntities);
    if (options.showSpaceLaunches) merged.push(...spaceLaunches);
    if (options.showIntelHotspots) merged.push(...intelHotspots);
    if (options.showLngTerminals) merged.push(...lngTerminals);
    return filterStaticPointsForView(
      merged,
      options.viewState,
      options.globeTier,
      options.radiusDeg,
    );
  }, [
    airports,
    aiDataCenters,
    cableLandings,
    economicCenters,
    intelHotspots,
    internetExchanges,
    lngTerminals,
    militaryBases,
    nuclearSites,
    options,
    ports,
    refugeeCamps,
    resources,
    sanctionsEntities,
    spaceLaunches,
    ucdpEvents,
  ]);

  const visibleMilitaryBaseAreas = useMemo(() => {
    if (!options.showMilitaryBases) return [];
    return filterMilitaryBaseAreas(
      militaryBaseAreas,
      options.viewState,
      options.globeTier,
      options.radiusDeg,
    );
  }, [militaryBaseAreas, options]);

  const visibleConflictZones = useMemo(() => {
    if (!options.showConflictZones) return [];
    // 줌 단계별로 상위 클러스터만 — 전역에서 수십 개 붉은 면이 겹치지 않게
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 8,
      continent: 12,
      regional: 16,
      near: 20,
      village: 24,
    };
    const max = maxByTier[options.globeTier];
    const ranked = [...conflictZones].sort((a, b) => b.eventCount - a.eventCount);
    if (options.radiusDeg <= 0) return ranked.slice(0, max);

    return ranked
      .filter((zone) => {
        const latDist = Math.abs(options.viewState.lat - zone.center.lat);
        const lngRaw = Math.abs(options.viewState.lng - zone.center.lng);
        const lngDist = Math.min(lngRaw, 360 - lngRaw);
        return Math.sqrt(latDist ** 2 + lngDist ** 2) <= options.radiusDeg + 4;
      })
      .slice(0, max);
  }, [conflictZones, options.globeTier, options.radiusDeg, options.showConflictZones, options.viewState]);

  const visibleArmsEmbargoZones = useMemo(() => {
    if (!options.showArmsEmbargo) return [];
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 6,
      continent: 10,
      regional: 16,
      near: 24,
      village: 32,
    };
    const max = maxByTier[options.globeTier];
    if (options.radiusDeg <= 0) return armsEmbargoZones.slice(0, max);
    return armsEmbargoZones
      .filter((zone) => isCenterInView(zone.center, options.viewState, options.radiusDeg + 6))
      .slice(0, max);
  }, [armsEmbargoZones, options]);

  return {
    visibleCoastlines,
    visibleCountryBorders,
    visibleDisputeBoundaries: visibleDisputeBoundariesFiltered,
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleStaticPoints,
    visibleMilitaryBaseAreas,
    visibleConflictZones,
    visibleArmsEmbargoZones,
    disputeOverviews,
    counts: {
      coastlines: coastlinePaths.length,
      countryBorders: countryBorderPaths.length,
      disputeBoundaries: disputeBoundaryPaths.length,
      shipping: shippingPaths.length,
      cables: cablePaths.length,
      oilPipelines: oilPipelinePaths.length,
      gasPipelines: gasPipelinePaths.length,
      lngTerminals: lngTerminals.length,
      airports: airports.length,
      ports: ports.length,
      militaryBases: militaryBases.length,
      militaryBaseAreas: militaryBaseAreas.length,
      resources: resources.length,
      cableLandings: cableLandings.length,
      nuclearSites: nuclearSites.length,
      internetExchanges: internetExchanges.length,
      refugeeCamps: refugeeCamps.length,
      ucdpEvents: ucdpEvents.length,
      aiDataCenters: aiDataCenters.length,
      economicCenters: economicCenters.length,
      sanctionsEntities: sanctionsEntities.length,
      spaceLaunches: spaceLaunches.length,
      intelHotspots: intelHotspots.length,
      conflictZones: conflictZones.length,
      armsEmbargoZones: armsEmbargoZones.length,
    },
  };
}
