"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type {
  ArmsEmbargoZone,
  ConflictZoneFeature,
  DisputeOverview,
  MilitaryBaseArea,
  StaticPoint,
  TransportPath,
} from "@/data/geoTypes";
import { dataPath } from "@/lib/dataProfile";
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
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { criticalNodesAsStaticPoints } from "@/data/criticalNodes";

const CRITICAL_NODE_STATIC_POINTS = criticalNodesAsStaticPoints();

type ViewState = { lat: number; lng: number; altitude: number };

type ApiPointsPayload = {
  enabled?: boolean;
  points?: unknown[];
  zones?: unknown[];
};

function pathNearView(path: TransportPath, view: ViewState, radiusDeg: number) {
  // global tier radiusDeg=0 → 전역 허용 (서버 bboxNearView와 동일)
  if (radiusDeg <= 0) return true;
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
  showSubmarineTunnels?: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  showAirports: boolean;
  showPorts: boolean;
  showLogisticsRisk?: boolean;
  showCriticalNodes?: boolean;
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
  showGeoRisk?: boolean;
  showSpaceLaunches?: boolean;
  showIntelHotspots?: boolean;
  showConflictZones?: boolean;
  showArmsEmbargo?: boolean;
  /** Bump after live sync so cached layers re-fetch from disk/API. */
  reloadToken?: number;
}) {
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
  const [geoRiskPoints, setGeoRiskPoints] = useState<StaticPoint[]>([]);
  const [spaceLaunches, setSpaceLaunches] = useState<StaticPoint[]>([]);
  const [intelHotspots, setIntelHotspots] = useState<StaticPoint[]>([]);
  const [submarineTunnels, setSubmarineTunnels] = useState<StaticPoint[]>([]);
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

  const fetchViewportLayer = useCallback(
    async (layer: string, setter: (value: TransportPath[]) => void) => {
      try {
        const params = new URLSearchParams({
          layer,
          lat: String(Math.round(options.viewState.lat * 10) / 10),
          lng: String(Math.round(options.viewState.lng * 10) / 10),
          radius: String(options.radiusDeg),
          tier: options.globeTier,
        });
        const response = await fetch(`/api/layers/viewport-paths?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { paths?: TransportPath[] };
        const paths = Array.isArray(payload.paths) ? payload.paths : [];
        // 체크 직후 대용량 경로 주입이 메인 스레드를 막지 않도록 transition
        startTransition(() => setter(paths));
      } catch {
        // optional
      }
    },
    [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng],
  );

  const fetchViewportPoints = useCallback(
    async (layer: string, setter: (value: StaticPoint[]) => void) => {
      try {
        const params = new URLSearchParams({
          layer,
          lat: String(Math.round(options.viewState.lat * 10) / 10),
          lng: String(Math.round(options.viewState.lng * 10) / 10),
          radius: String(options.radiusDeg),
          tier: options.globeTier,
        });
        const response = await fetch(`/api/layers/viewport-points?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { points?: StaticPoint[] };
        const points = Array.isArray(payload.points) ? payload.points : [];
        startTransition(() => setter(points));
      } catch {
        // optional
      }
    },
    [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng],
  );

  const fetchViewportBaseAreas = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        layer: "military-base-areas",
        lat: String(Math.round(options.viewState.lat * 10) / 10),
        lng: String(Math.round(options.viewState.lng * 10) / 10),
        radius: String(options.radiusDeg),
        tier: options.globeTier,
      });
      const response = await fetch(`/api/layers/viewport-points?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { areas?: MilitaryBaseArea[] };
      setMilitaryBaseAreas(Array.isArray(payload.areas) ? payload.areas : []);
    } catch {
      // optional
    }
  }, [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng]);


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
    if (!options.showDisputeBoundaries) {
      setDisputeBoundaryPaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("dispute-boundaries", setDisputeBoundaryPaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showDisputeBoundaries,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showShippingLanes) {
      setShippingPaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("shipping-lanes", setShippingPaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showShippingLanes,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showSubmarineCables) {
      setCablePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("submarine-cables", setCablePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showSubmarineCables,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  /** 해저터널 — 토글 ON 시 D1 클라우드 로그 1회 fetch */
  useEffect(() => {
    if (!options.showSubmarineTunnels) {
      setSubmarineTunnels([]);
      loadedRef.current["submarine-tunnels"] = false;
      return;
    }
    if (loadedRef.current["submarine-tunnels"]) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/submarine-tunnels", { cache: "no-store" });
        const payload = (await response.json()) as { tunnels?: StaticPoint[] };
        if (cancelled) return;
        setSubmarineTunnels(Array.isArray(payload.tunnels) ? payload.tunnels : []);
        loadedRef.current["submarine-tunnels"] = true;
      } catch {
        if (!cancelled) setSubmarineTunnels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options.showSubmarineTunnels, reloadToken]);

  useEffect(() => {
    if (!options.showOilPipelines) {
      setOilPipelinePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("oil-pipelines", setOilPipelinePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showOilPipelines,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showGasPipelines) {
      setGasPipelinePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("gas-pipelines", setGasPipelinePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showGasPipelines,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showLngTerminals) {
      setLngTerminals([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("lng-terminals", setLngTerminals);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showLngTerminals,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showAirports) {
      setAirports([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("airports", setAirports);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showAirports,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showPorts) {
      setPorts([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("ports", setPorts);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showPorts,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showMilitaryBases) {
      setMilitaryBases([]);
      setMilitaryBaseAreas([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("military-bases", setMilitaryBases);
      void fetchViewportBaseAreas();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportBaseAreas,
    fetchViewportPoints,
    options.showMilitaryBases,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showResources) {
      setResources([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("resources", setResources);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showResources,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showCableLandings) {
      setCableLandings([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("cable-landings", setCableLandings);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showCableLandings,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showNuclearSites) {
      setNuclearSites([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("nuclear-sites", setNuclearSites);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showNuclearSites,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showInternetExchanges) {
      setInternetExchanges([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("internet-exchanges", setInternetExchanges);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showInternetExchanges,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showRefugeeCamps) {
      setRefugeeCamps([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("refugee-camps", setRefugeeCamps);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showRefugeeCamps,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showUcdpEvents) {
      setUcdpEvents([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("ucdp-events", setUcdpEvents);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showUcdpEvents,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

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
    if (options.showGeoRisk) {
      loadOnceApiPoints("geoRisk", "/api/geo-risk/cards", setGeoRiskPoints);
    }
  }, [loadOnceApiPoints, options.showGeoRisk, reloadToken]);

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
  }, [
    disputeBoundaryPaths,
    options.globeTier,
    options.radiusDeg,
    options.showDisputeBoundaries,
    options.viewState,
  ]);

  const visibleShipping = useMemo(() => {
    if (!options.showShippingLanes) return [];
    const max = SHIPPING_LANE_MAX_BY_TIER[options.globeTier];
    return filterPaths(shippingPaths, options.viewState, options.radiusDeg, max);
  }, [
    options.globeTier,
    options.radiusDeg,
    options.showShippingLanes,
    options.viewState,
    shippingPaths,
  ]);

  const visibleCables = useMemo(() => {
    if (!options.showSubmarineCables) return [];
    const max = SUBMARINE_CABLE_MAX_BY_TIER[options.globeTier];
    return filterPaths(cablePaths, options.viewState, options.radiusDeg, max);
  }, [
    cablePaths,
    options.globeTier,
    options.radiusDeg,
    options.showSubmarineCables,
    options.viewState,
  ]);

  const visibleOilPipelines = useMemo(() => {
    if (!options.showOilPipelines) return [];
    const max = OIL_PIPELINE_MAX_BY_TIER[options.globeTier];
    return filterPaths(oilPipelinePaths, options.viewState, options.radiusDeg, max);
  }, [
    oilPipelinePaths,
    options.globeTier,
    options.radiusDeg,
    options.showOilPipelines,
    options.viewState,
  ]);

  const visibleGasPipelines = useMemo(() => {
    if (!options.showGasPipelines) return [];
    const max = GAS_PIPELINE_MAX_BY_TIER[options.globeTier];
    return filterPaths(gasPipelinePaths, options.viewState, options.radiusDeg, max);
  }, [
    gasPipelinePaths,
    options.globeTier,
    options.radiusDeg,
    options.showGasPipelines,
    options.viewState,
  ]);

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
    if (options.showGeoRisk) merged.push(...geoRiskPoints);
    if (options.showSpaceLaunches) merged.push(...spaceLaunches);
    if (options.showIntelHotspots) merged.push(...intelHotspots);
    if (options.showLngTerminals) merged.push(...lngTerminals);
    if (options.showLogisticsRisk) merged.push(...LOGISTICS_RISK_POINTS);
    if (options.showCriticalNodes) merged.push(...CRITICAL_NODE_STATIC_POINTS);
    if (options.showSubmarineTunnels) merged.push(...submarineTunnels);
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
    options.globeTier,
    options.radiusDeg,
    options.showAiDataCenters,
    options.showAirports,
    options.showCableLandings,
    options.showEconomicCenters,
    options.showIntelHotspots,
    options.showInternetExchanges,
    options.showLngTerminals,
    options.showLogisticsRisk,
    options.showCriticalNodes,
    options.showMilitaryBases,
    options.showNuclearSites,
    options.showPorts,
    options.showRefugeeCamps,
    options.showResources,
    options.showSanctionsEntities,
    options.showGeoRisk,
    options.showSpaceLaunches,
    options.showSubmarineTunnels,
    options.showUcdpEvents,
    options.viewState,
    ports,
    refugeeCamps,
    resources,
    sanctionsEntities,
    geoRiskPoints,
    spaceLaunches,
    submarineTunnels,
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
  }, [
    militaryBaseAreas,
    options.globeTier,
    options.radiusDeg,
    options.showMilitaryBases,
    options.viewState,
  ]);

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
  }, [
    armsEmbargoZones,
    options.globeTier,
    options.radiusDeg,
    options.showArmsEmbargo,
    options.viewState,
  ]);

  return {
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
      logisticsRisk: LOGISTICS_RISK_POINTS.length,
      criticalNodes: CRITICAL_NODE_STATIC_POINTS.length,
      conflictZones: conflictZones.length,
      armsEmbargoZones: armsEmbargoZones.length,
    },
  };
}
