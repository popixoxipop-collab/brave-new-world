export type MapStyleMode = "night" | "satellite" | "topo";
export type LabelLanguage = "en" | "ko";

export type LayerPrefs = {
  /** Natural Earth + 동아시아 회색지대/긴장 면 */
  showDisputes: boolean;
  /** 도시 이름 강조 (구 showRoadCityGlow). 도로 레이어는 제거됨 */
  showCityLabels: boolean;
  showRailGlow: boolean;
  showAis: boolean;
  showShippingLanes: boolean;
  showSubmarineCables: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  showAirports: boolean;
  showPorts: boolean;
  showMilitaryBases: boolean;
  showResources: boolean;
  showNuclearSites: boolean;
  showInternetExchanges: boolean;
  showRefugeeCamps: boolean;
  showUcdpEvents: boolean;
  showMilitaryActivity: boolean;
  /** 미 해군 항공모함 위치 추적 */
  showUsCarriers: boolean;
  showSpaceLaunches: boolean;
  showIntelHotspots: boolean;
  showAiDataCenters: boolean;
  showEconomicCenters: boolean;
  showSanctionsEntities: boolean;
  showArmsEmbargo: boolean;
  showConflictZones: boolean;
  showCyberIncidents: boolean;
  showElectionEvents: boolean;
  showFirmsFires: boolean;
  /** VIINA 우크라이나 전선 (렌더링 전용) */
  showUkraineControl: boolean;
  /** GDELT 지정학 이벤트 — 티어별 핀·히트맵 */
  showGdeltWar: boolean;
  showGdeltDiplomatic: boolean;
  showGdeltAlliance: boolean;
  showGdeltProtests: boolean;
  showTelegramOsint: boolean;
  /** 이스라엘 Tzeva Adom (Pikud HaOref) 실시간 경보 */
  showTzevaAdom: boolean;
  /** 우크라이나 NEPTUN 공중 위협·경보 (neptun.in.ua) */
  showNeptun: boolean;
  /** 사라진 드론·미사일의 지나간 이동 경로 (WebSocket delta 보존) */
  showNeptunPreviousTrails: boolean;
  mapStyle: MapStyleMode;
  labelLanguage: LabelLanguage;
};

/** v17: NEPTUN 기본 OFF · stub/lite·뷰포트 LOD 정책 */
export const LAYER_PREFS_KEY = "geowatch-layers-v17";

/** 스펙 13 — 토글 가능 레이어는 기본 OFF (핵심 분쟁·GDELT는 별도 state) */
export const DEFAULT_LAYER_PREFS: LayerPrefs = {
  showDisputes: true,
  showCityLabels: false,
  showRailGlow: false,
  showAis: false,
  showShippingLanes: false,
  showSubmarineCables: false,
  showOilPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
  showAirports: false,
  showPorts: false,
  showMilitaryBases: false,
  showResources: false,
  showNuclearSites: false,
  showInternetExchanges: false,
  showRefugeeCamps: false,
  showUcdpEvents: false,
  showMilitaryActivity: false,
  showUsCarriers: false,
  showSpaceLaunches: false,
  showIntelHotspots: false,
  showAiDataCenters: false,
  showEconomicCenters: false,
  showSanctionsEntities: false,
  showArmsEmbargo: false,
  showConflictZones: true,
  showCyberIncidents: false,
  showElectionEvents: false,
  showFirmsFires: false,
  showUkraineControl: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showGdeltAlliance: false,
  showGdeltProtests: true,
  showTelegramOsint: true,
  showTzevaAdom: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  mapStyle: "night",
  labelLanguage: "ko",
};

export function loadLayerPrefs(): LayerPrefs {
  if (typeof window === "undefined") return DEFAULT_LAYER_PREFS;
  try {
    const hasV17 = Boolean(localStorage.getItem(LAYER_PREFS_KEY));
    const hasV16 = Boolean(localStorage.getItem("geowatch-layers-v16"));
    const hasV15 = Boolean(localStorage.getItem("geowatch-layers-v15"));
    const hasV14 = Boolean(localStorage.getItem("geowatch-layers-v14"));
    const hasV13 = Boolean(localStorage.getItem("geowatch-layers-v13"));
    const raw =
      localStorage.getItem(LAYER_PREFS_KEY) ||
      localStorage.getItem("geowatch-layers-v16") ||
      localStorage.getItem("geowatch-layers-v15") ||
      localStorage.getItem("geowatch-layers-v14") ||
      localStorage.getItem("geowatch-layers-v13") ||
      localStorage.getItem("geowatch-layers-v11") ||
      localStorage.getItem("geowatch-layers-v10") ||
      localStorage.getItem("geowatch-layers-v9") ||
      localStorage.getItem("geowatch-layers-v8") ||
      localStorage.getItem("geowatch-layers-v7") ||
      localStorage.getItem("geowatch-layers-v6") ||
      localStorage.getItem("geowatch-layers-v4") ||
      localStorage.getItem("geowatch-layers-v3");
    if (!raw) return DEFAULT_LAYER_PREFS;
    const parsed = JSON.parse(raw) as Partial<LayerPrefs> & {
      showRoadCityGlow?: boolean;
      showCoastlines?: boolean;
      showCountryBorders?: boolean;
      showUkraineControl?: boolean;
    };
    const { showRoadCityGlow, ...rest } = parsed;
    delete (rest as { showCoastlines?: boolean }).showCoastlines;
    delete (rest as { showCountryBorders?: boolean }).showCountryBorders;
    return {
      ...DEFAULT_LAYER_PREFS,
      ...rest,
      showUsCarriers:
        typeof rest.showUsCarriers === "boolean"
          ? rest.showUsCarriers
          : DEFAULT_LAYER_PREFS.showUsCarriers,
      showCityLabels:
        typeof rest.showCityLabels === "boolean"
          ? rest.showCityLabels
          : typeof showRoadCityGlow === "boolean"
            ? showRoadCityGlow
            : DEFAULT_LAYER_PREFS.showCityLabels,
      showUkraineControl:
        hasV16 || hasV15
          ? typeof rest.showUkraineControl === "boolean"
            ? rest.showUkraineControl
            : DEFAULT_LAYER_PREFS.showUkraineControl
          : true,
      showNeptun:
        hasV17 || hasV16 || hasV15
          ? typeof rest.showNeptun === "boolean"
            ? rest.showNeptun
            : DEFAULT_LAYER_PREFS.showNeptun
          : false,
      showGdeltProtests: hasV17 || hasV16 || hasV15 || hasV14 || hasV13
        ? typeof rest.showGdeltProtests === "boolean"
          ? rest.showGdeltProtests
          : DEFAULT_LAYER_PREFS.showGdeltProtests
        : true,
      showNeptunPreviousTrails: hasV17 || hasV16
        ? typeof rest.showNeptunPreviousTrails === "boolean"
          ? rest.showNeptunPreviousTrails
          : DEFAULT_LAYER_PREFS.showNeptunPreviousTrails
        : typeof rest.showNeptunPreviousTrails === "boolean"
          ? rest.showNeptunPreviousTrails
          : DEFAULT_LAYER_PREFS.showNeptunPreviousTrails,
      labelLanguage:
        typeof rest.labelLanguage === "string"
          ? rest.labelLanguage
          : DEFAULT_LAYER_PREFS.labelLanguage,
    };
  } catch {
    return DEFAULT_LAYER_PREFS;
  }
}

export function saveLayerPrefs(prefs: LayerPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(prefs));
}
