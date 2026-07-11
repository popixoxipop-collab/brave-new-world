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
  labelLanguage: LabelLanguage;
};

/** v19: 베이스맵 단일화 — mapStyle pref 제거 */
export const LAYER_PREFS_KEY = "geowatch-layers-v19";

/** 토글 가능 레이어는 전부 기본 OFF — 사용자가 켤 때만 로드·렌더 */
export const DEFAULT_LAYER_PREFS: LayerPrefs = {
  showDisputes: false,
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
  showConflictZones: false,
  showCyberIncidents: false,
  showElectionEvents: false,
  showFirmsFires: false,
  showUkraineControl: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showGdeltProtests: false,
  showTelegramOsint: false,
  showTzevaAdom: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  labelLanguage: "ko",
};

const LEGACY_LAYER_KEYS = [
  "geowatch-layers-v18",
  "geowatch-layers-v17",
  "geowatch-layers-v16",
  "geowatch-layers-v15",
  "geowatch-layers-v14",
  "geowatch-layers-v13",
  "geowatch-layers-v11",
  "geowatch-layers-v10",
  "geowatch-layers-v9",
  "geowatch-layers-v8",
  "geowatch-layers-v7",
  "geowatch-layers-v6",
  "geowatch-layers-v4",
  "geowatch-layers-v3",
] as const;

function parseLabelLanguage(value: unknown): LabelLanguage {
  if (value === "en" || value === "ko") return value;
  return DEFAULT_LAYER_PREFS.labelLanguage;
}

type SavedLayerPrefs = Partial<LayerPrefs> & {
  showRoadCityGlow?: boolean;
  showCoastlines?: boolean;
  showCountryBorders?: boolean;
};

/** v19 이전 저장값 — 도시명 언어만 이전, 레이어는 전부 OFF */
function migrateLegacyLayerPrefs(parsed: SavedLayerPrefs): LayerPrefs {
  return {
    ...DEFAULT_LAYER_PREFS,
    labelLanguage: parseLabelLanguage(parsed.labelLanguage),
  };
}

function mergeSavedPrefs(parsed: SavedLayerPrefs): LayerPrefs {
  const { showRoadCityGlow, ...rest } = parsed;
  delete rest.showCoastlines;
  delete rest.showCountryBorders;

  return {
    ...DEFAULT_LAYER_PREFS,
    ...rest,
    showCityLabels:
      typeof rest.showCityLabels === "boolean"
        ? rest.showCityLabels
        : typeof showRoadCityGlow === "boolean"
          ? showRoadCityGlow
          : DEFAULT_LAYER_PREFS.showCityLabels,
    labelLanguage: parseLabelLanguage(rest.labelLanguage),
  };
}

export function loadLayerPrefs(): LayerPrefs {
  if (typeof window === "undefined") return DEFAULT_LAYER_PREFS;
  try {
    const v18Raw = localStorage.getItem(LAYER_PREFS_KEY);
    if (v18Raw) {
      return mergeSavedPrefs(JSON.parse(v18Raw) as SavedLayerPrefs);
    }

    for (const legacyKey of LEGACY_LAYER_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      return migrateLegacyLayerPrefs(JSON.parse(legacyRaw) as SavedLayerPrefs);
    }

    return DEFAULT_LAYER_PREFS;
  } catch {
    return DEFAULT_LAYER_PREFS;
  }
}

export function saveLayerPrefs(prefs: LayerPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(prefs));
}
