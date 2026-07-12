import type { IntelTheaterFilter } from "@/lib/news/theaterMap";
import { flyTargetForTheater, type MapFlyTarget } from "@/lib/news/theaterMap";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { economyHubLabel } from "@/lib/autoFlyTarget";
import {
  DEFAULT_LAYER_PREFS,
  LAYER_PREFS_KEY,
  loadLayerPrefs,
  saveLayerPrefs,
  type LayerPrefs,
} from "@/lib/layerPrefs";
export const VIEW_CONFIG_KEY = "geowatch-view-config-v1";

export type ViewIntelTab = "news" | "telegram" | "viina";

export type ViewPackageId = "conflict-watch" | "geo-trader" | "frontline-live" | "custom";

/** 상단 스위치 — 지정학 뷰어 vs 경제·시장 뷰어 (패키지 1:1) */
export type ViewerMode = "conflict" | "economy";

export const CONFLICT_VIEWER_PACKAGE: ViewPackageId = "frontline-live";
export const ECONOMY_VIEWER_PACKAGE: ViewPackageId = "geo-trader";

export function packagesForViewerMode(mode: ViewerMode): ViewPackageId[] {
  return mode === "economy" ? [ECONOMY_VIEWER_PACKAGE] : [CONFLICT_VIEWER_PACKAGE];
}

export function viewerModeFromPackages(packages: ViewPackageId[]): ViewerMode {
  const ids = packages.filter((id) => id !== "custom");
  if (ids.length === 1 && ids[0] === ECONOMY_VIEWER_PACKAGE) return "economy";
  return "conflict";
}

export type ViewTheaterChoice = "auto" | IntelTheaterFilter;

export type SavedViewConfig = {
  version: 1;
  packages: ViewPackageId[];
  theater: ViewTheaterChoice;
  /** 경제 모드 — 관심 허브 (auto = RSS·분쟁 신호 기반 최적 허브) */
  economyHub?: EconomyHubChoice;
  appliedAt: string;
  customizedLayers?: boolean;
  viewerMode?: ViewerMode;
};

export type ViewPackageUi = {
  showTicker: boolean;
  defaultIntelTab: ViewIntelTab;
  autoOpenIntelSheet: boolean;
  openLayerPanel: boolean;
  /** 전선 실시간 등 — 하단 Intel 시트 대신 전장 포커스(우측 뉴스·CTA) */
  autoEnterTheaterNavId?: string | null;
  /** 경제 모드 — 시작 시 허브 포커스 nav id */
  autoEnterEconNavId?: string | null;
};

export type MergedViewConfig = {
  packages: ViewPackageId[];
  theater: ViewTheaterChoice;
  economyHub?: EconomyHubChoice;
  layers: LayerPrefs;
  ui: ViewPackageUi;
};

type ViewPackageDef = {
  id: ViewPackageId;
  label: string;
  tagline: string;
  description: string;
  layers: Partial<LayerPrefs>;
  ui: Partial<ViewPackageUi>;
};

export const VIEW_PACKAGES: ViewPackageDef[] = [
  {
    id: "conflict-watch",
    label: "분쟁 상황판",
    tagline: "영토·뉴스·OSINT",
    description: "전쟁·외교 긴장 · GDELT 뉴스 · 텔레그램 OSINT",
    layers: {
      showWarZones: true,
      showDiplomaticTension: true,
      showConflictZones: true,
      showGdeltWar: true,
      showGdeltDiplomatic: true,
      showTelegramOsint: true,
      showUkraineControl: false,
    },
    ui: {
      showTicker: false,
      defaultIntelTab: "news",
      autoOpenIntelSheet: false,
    },
  },
  {
    id: "geo-trader",
    label: "지정학 트레이더",
    tagline: "유가·VIX·제재",
    description: "VIX · 유가 · 금 · 제재 · 에너지",
    layers: {
      showWarZones: true,
      showDiplomaticTension: true,
      showSanctionsEntities: true,
      showOilPipelines: true,
      showGasPipelines: true,
      showLngTerminals: true,
      showShippingLanes: true,
      showLogisticsRisk: true,
      showAiDataCenters: true,
      showInternetExchanges: true,
      showPorts: true,
      showEconomicCenters: true,
      showGdeltWar: false,
      showGdeltDiplomatic: false,
      showGdeltAlliance: false,
      showGdeltProtests: false,
      showTelegramOsint: false,
      showConflictZones: false,
      showUkraineControl: false,
    },
    ui: {
      showTicker: true,
      defaultIntelTab: "news",
      autoOpenIntelSheet: false,
    },
  },
  {
    id: "frontline-live",
    label: "전선 실시간",
    tagline: "우크라·중동",
    description: "우크라 전선 · NEPTUN · 이스라엘 공습 경보",
    layers: {
      showUkraineControl: true,
      showNeptun: true,
      showNeptunPreviousTrails: true,
      showTzevaAdom: true,
      showTelegramOsint: true,
      showGdeltWar: true,
      showWarZones: true,
      showDiplomaticTension: true,
      showConflictZones: false,
    },
    ui: {
      showTicker: false,
      defaultIntelTab: "viina",
      autoOpenIntelSheet: false,
    },
  },
  {
    id: "custom",
    label: "직접 설정",
    tagline: "레이어 수동",
    description: "레이어 패널에서 직접 선택",
    layers: {
      ...DEFAULT_LAYER_PREFS,
      showUkraineControl: false,
    },
    ui: {
      showTicker: true,
      defaultIntelTab: "news",
      autoOpenIntelSheet: false,
      openLayerPanel: true,
    },
  },
];

/** 패키지 선택 화면 기본 체크 — 첫 방문자에게 가장 직관적인 프리셋 */
export const RECOMMENDED_PACKAGE_ID: ViewPackageId = "frontline-live";

export const DEFAULT_PACKAGE_SELECTION: ViewPackageId[] = [RECOMMENDED_PACKAGE_ID];

export const VIEW_THEATER_OPTIONS: Array<{ id: ViewTheaterChoice; label: string }> = [
  { id: "auto", label: "자동" },
  { id: "korea", label: "한반도" },
  { id: "china-taiwan", label: "대만" },
  { id: "russia-ukraine", label: "우크라" },
  { id: "middle-east", label: "중동" },
  { id: "global", label: "글로벌" },
];

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

const LAYER_DROP_PRIORITY: BooleanLayerKey[] = [
  "showUcdpEvents",
  "showArmsEmbargo",
  "showGdeltAlliance",
  "showGdeltProtests",
  "showMilitaryActivity",
  "showMilitaryBases",
  "showUsCarriers",
  "showConflictZones",
  "showDiplomaticTension",
  "showWarZones",
  "showLngTerminals",
  "showGasPipelines",
  "showOilPipelines",
];

const ECONOMY_LAYER_DROP_PRIORITY: BooleanLayerKey[] = [
  "showDiplomaticTension",
  "showWarZones",
  "showEconomicCenters",
  "showPorts",
  "showInternetExchanges",
  "showGasPipelines",
  "showLngTerminals",
  "showOilPipelines",
  "showSubmarineCables",
  "showAirports",
];

export const LAYER_PREF_LABELS: Partial<Record<BooleanLayerKey, string>> = {
  showWarZones: "전쟁구역",
  showDiplomaticTension: "외교적 긴장구역",
  showConflictZones: "AI 전쟁지역 (데모)",
  showGdeltWar: "뉴스 · 전투",
  showGdeltDiplomatic: "뉴스 · 외교",
  showGdeltAlliance: "뉴스 · 동맹",
  showGdeltProtests: "뉴스 · 시위",
  showTelegramOsint: "텔레그램 OSINT",
  showUkraineControl: "우크라이나 전선",
  showNeptun: "드론·미사일 궤적",
  showNeptunPreviousTrails: "지나간 미사일 궤적",
  showTzevaAdom: "이스라엘 공습 경보",
  showSanctionsEntities: "제재",
  showOilPipelines: "유가 파이프라인",
  showLngTerminals: "LNG 터미널",
  showGasPipelines: "가스 파이프라인",
  showShippingLanes: "해운로",
  showLogisticsRisk: "물류 리스크",
  showUcdpEvents: "분쟁 사건",
  showArmsEmbargo: "무기 금수",
};

const MAX_ON_LAYERS = 11;
const MAX_ON_LAYERS_ECONOMY = 12;

const PACKAGE_BY_ID = Object.fromEntries(
  VIEW_PACKAGES.map((pkg) => [pkg.id, pkg]),
) as Record<ViewPackageId, ViewPackageDef>;

const DEFAULT_UI: ViewPackageUi = {
  showTicker: true,
  defaultIntelTab: "news",
  autoOpenIntelSheet: false,
  openLayerPanel: false,
};

function countBooleanLayers(layers: LayerPrefs): number {
  return Object.entries(layers).filter(([key, value]) => key !== "labelLanguage" && value === true)
    .length;
}

function capLayerCount(layers: LayerPrefs, maxLayers = MAX_ON_LAYERS, priority = LAYER_DROP_PRIORITY): LayerPrefs {
  const next = { ...layers };
  let onCount = countBooleanLayers(next);
  for (const key of priority) {
    if (onCount <= maxLayers) break;
    if (next[key] === true) {
      next[key] = false;
      onCount -= 1;
    }
  }
  return next;
}

export function capLayerCountForMode(layers: LayerPrefs, mode: ViewerMode): LayerPrefs {
  if (mode === "economy") {
    return capLayerCount(layers, MAX_ON_LAYERS_ECONOMY, ECONOMY_LAYER_DROP_PRIORITY);
  }
  return capLayerCount(layers);
}

function mergeLayersRaw(ids: ViewPackageId[]): LayerPrefs {
  const layers: LayerPrefs = {
    ...DEFAULT_LAYER_PREFS,
    showUkraineControl: false,
  };

  for (const id of ids) {
    const pkg = PACKAGE_BY_ID[id];
    if (!pkg) continue;
    for (const [key, value] of Object.entries(pkg.layers) as [keyof LayerPrefs, boolean][]) {
      if (value === true) {
        (layers as Record<keyof LayerPrefs, LayerPrefs[keyof LayerPrefs]>)[key] = true;
      }
    }
  }

  return layers;
}

function droppedLayerKeys(raw: LayerPrefs, capped: LayerPrefs): BooleanLayerKey[] {
  const dropped: BooleanLayerKey[] = [];
  for (const key of Object.keys(raw) as BooleanLayerKey[]) {
    if (raw[key] === true && capped[key] === false) {
      dropped.push(key);
    }
  }
  return dropped;
}

function resolveAutoTheaterNavId(
  ids: ViewPackageId[],
  theater: ViewTheaterChoice,
): string | null {
  if (!ids.includes("frontline-live")) return null;
  if (theater === "korea") return "korea";
  if (theater === "china-taiwan") return "taiwan";
  if (theater === "russia-ukraine") return "ukraine";
  if (theater === "middle-east") return "middle-east";
  if (theater === "auto") return null;
  return null;
}

/** 패키지 카드·미리보기용 — 단일 패키지가 켜는 레이어 수 */
export function enabledLayerCountForPackage(id: ViewPackageId): number {
  return countBooleanLayers(mergeLayersRaw([id]));
}

/** 멀티 선택 시 cap 적용 결과·빠진 레이어 */
export function analyzePackageLayers(packages: ViewPackageId[]): {
  enabledCount: number;
  uncappedCount: number;
  droppedLabels: string[];
} {
  const ids = packages.length > 0 ? packages : DEFAULT_PACKAGE_SELECTION;
  const raw = mergeLayersRaw(ids);
  const capped = capLayerCount(raw);
  const dropped = droppedLayerKeys(raw, capped);
  return {
    enabledCount: countBooleanLayers(capped),
    uncappedCount: countBooleanLayers(raw),
    droppedLabels: dropped.map((key) => LAYER_PREF_LABELS[key] ?? key),
  };
}

function mergeUi(
  ids: ViewPackageId[],
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice = "auto",
): ViewPackageUi {
  const ui: ViewPackageUi = { ...DEFAULT_UI };

  if (ids.includes("geo-trader") && !ids.includes("frontline-live") && !ids.includes("conflict-watch")) {
    ui.showTicker = true;
    ui.defaultIntelTab = "news";
  } else if (ids.includes("geo-trader")) {
    ui.showTicker = false;
  } else if (ids.includes("conflict-watch") || ids.includes("frontline-live")) {
    ui.showTicker = false;
  }

  if (ids.includes("frontline-live")) {
    ui.defaultIntelTab = "viina";
    ui.autoOpenIntelSheet = false;
    ui.autoEnterTheaterNavId = resolveAutoTheaterNavId(ids, theater);
  } else if (ids.includes("conflict-watch")) {
    ui.defaultIntelTab = "news";
  } else if (ids.includes("geo-trader")) {
    ui.defaultIntelTab = "news";
    if (economyHub !== "auto") {
      ui.autoEnterEconNavId = economyHub;
    }
  }

  if (ids.includes("custom") && ids.length === 1) {
    ui.openLayerPanel = true;
    ui.showTicker = true;
  }

  return ui;
}

export function mergeViewPackages(
  packages: ViewPackageId[],
  theater: ViewTheaterChoice = "auto",
  economyHub: EconomyHubChoice = "auto",
): MergedViewConfig {
  const ids = packages.length > 0 ? packages : DEFAULT_PACKAGE_SELECTION;
  const layers = capLayerCount(mergeLayersRaw(ids));

  return {
    packages: ids,
    theater,
    economyHub,
    layers,
    ui: mergeUi(ids, theater, economyHub),
  };
}

export function applyViewPackages(
  packages: ViewPackageId[],
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice = "auto",
): MergedViewConfig {
  const merged = mergeViewPackages(packages, theater, economyHub);
  saveLayerPrefs(merged.layers);
  saveViewConfig({
    version: 1,
    packages: merged.packages,
    theater,
    economyHub,
    appliedAt: new Date().toISOString(),
  });
  return merged;
}

export function loadViewConfig(): SavedViewConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIEW_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedViewConfig;
    if (parsed.version !== 1 || !Array.isArray(parsed.packages)) return null;
    if (!parsed.viewerMode) {
      parsed.viewerMode = viewerModeFromPackages(parsed.packages);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveViewConfig(config: SavedViewConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEW_CONFIG_KEY, JSON.stringify(config));
}

export function markViewConfigCustomized() {
  const existing = loadViewConfig();
  if (!existing) return;
  saveViewConfig({ ...existing, customizedLayers: true });
}

/** 신규 유저 — 모드 선택 화면 표시 여부 */
export function shouldShowModePicker(): boolean {
  if (typeof window === "undefined") return false;
  if (loadViewConfig()) return false;
  if (localStorage.getItem(LAYER_PREFS_KEY)) return false;
  return true;
}

/** @deprecated use shouldShowModePicker */
export const shouldShowPackagePicker = shouldShowModePicker;

export function resolveMergedViewConfig(): MergedViewConfig {
  const saved = loadViewConfig();
  if (saved && !saved.customizedLayers) {
    return mergeViewPackages(saved.packages, saved.theater, saved.economyHub ?? "auto");
  }
  return {
    packages: [],
    theater: "auto",
    economyHub: "auto",
    layers: loadLayerPrefs(),
    ui: DEFAULT_UI,
  };
}

const THEATER_TO_EXPLORATION_ID: Partial<Record<IntelTheaterFilter, string>> = {
  korea: "korea",
  "china-taiwan": "taiwan",
  "russia-ukraine": "ukraine",
  "middle-east": "middle-east",
};

export function resolveIntroFlyTarget(input: {
  viewerMode?: ViewerMode;
  theater: ViewTheaterChoice;
  economyHub?: EconomyHubChoice;
  topAlert?: { lat: number; lng: number } | null;
  conflictNavId?: string | null;
  economyNavId?: string | null;
}): MapFlyTarget | { kind: "exploration"; presetId: string } | null {
  if (input.viewerMode === "economy") {
    const hubId =
      input.economyHub && input.economyHub !== "auto"
        ? input.economyHub
        : (input.economyNavId ?? "hormuz");
    return { kind: "exploration", presetId: hubId };
  }

  if (input.theater !== "auto" && input.theater !== "all") {
    return flyTargetForTheater(input.theater);
  }

  if (input.topAlert) {
    return { kind: "coords", lat: input.topAlert.lat, lng: input.topAlert.lng, altitude: 1.78 };
  }

  const presetId =
    input.conflictNavId ??
    (input.theater !== "auto" && input.theater !== "all"
      ? THEATER_TO_EXPLORATION_ID[input.theater]
      : undefined) ??
    "ukraine";

  if (presetId) {
    return { kind: "exploration", presetId };
  }

  return null;
}

export function summarizeViewSelection(
  packages: ViewPackageId[],
  theater: ViewTheaterChoice,
): string {
  const labels = packages
    .map((id) => PACKAGE_BY_ID[id]?.label)
    .filter(Boolean)
    .join(" + ");
  const theaterLabel =
    VIEW_THEATER_OPTIONS.find((opt) => opt.id === theater)?.label ?? "자동";
  return `${labels || "기본"} · 전장: ${theaterLabel}`;
}

/** 모드 선택 UI용 — 시작 후 보이는 항목 미리보기 */
export function previewModeSelection(
  mode: ViewerMode,
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice = "auto",
): string[] {
  const bullets: string[] = [];
  if (mode === "conflict") {
    bullets.push("우크라이나 전선·NEPTUN 드론·미사일 궤적");
    bullets.push("GDELT 전투·외교 뉴스 · Telegram OSINT");
    bullets.push("하단: 속보 + GDELT 범례");
  } else {
    bullets.push("주요 증시·VIX·유가 티커");
    bullets.push("경제 RSS · 시장 속보");
    bullets.push("제재·파이프라인·해운·초크포인트 레이어");
    bullets.push("GDELT/Telegram fetch 없음");
  }

  if (mode === "conflict" && theater !== "auto") {
    const theaterLabel =
      VIEW_THEATER_OPTIONS.find((opt) => opt.id === theater)?.label ?? "자동";
    bullets.push(`시작 시 ${theaterLabel} 전장으로 카메라 이동`);
  } else if (mode === "conflict") {
    bullets.push("시작 시 가장 뜨거운 충돌지로 자동 이동");
  } else if (economyHub !== "auto") {
    bullets.push(`시작 시 ${economyHubLabel(economyHub)} 허브로 카메라 이동`);
  } else {
    bullets.push("시작 시 가장 핫한 지정학·투자 허브로 자동 이동");
  }

  return bullets.slice(0, 6);
}

/** @deprecated mode picker uses previewModeSelection */
export function previewViewSelection(
  packages: ViewPackageId[],
  theater: ViewTheaterChoice,
): string[] {
  const bullets: string[] = [];
  const ids = packages.length > 0 ? packages : DEFAULT_PACKAGE_SELECTION;

  if (ids.includes("frontline-live")) {
    bullets.push("우크라이나 전선·RU 점령지 폴리곤");
    bullets.push("NEPTUN 드론·미사일 실시간 궤적");
    bullets.push("우측 뉴스 사이드바 + 전장 상세 CTA");
  }
  if (ids.includes("conflict-watch")) {
    bullets.push("전쟁·외교 긴장 빗금 박스 · GDELT 뉴스 핀");
    bullets.push("텔레그램 OSINT 미니 패널");
  }
  if (ids.includes("geo-trader")) {
    bullets.push("VIX·유가·금 시장 티커");
    bullets.push("제재·에너지 파이프라인 레이어");
  }

  const theaterLabel =
    VIEW_THEATER_OPTIONS.find((opt) => opt.id === theater)?.label ?? "자동";
  if (theater !== "auto") {
    bullets.push(`시작 시 ${theaterLabel} 전장으로 카메라 이동`);
  } else if (ids.includes("frontline-live") && !ids.includes("conflict-watch")) {
    bullets.push("시작 시 우크라이나 전선 근처로 자동 이동");
  }

  if (bullets.length === 0) {
    bullets.push("≡ 레이어 패널에서 원하는 항목을 직접 켭니다");
  }

  const { droppedLabels, enabledCount } = analyzePackageLayers(ids);
  if (droppedLabels.length > 0) {
    bullets.push(
      `레이어 ${enabledCount}개 적용 · 성능 제한으로 꺼짐: ${droppedLabels.join(", ")}`,
    );
  }

  return bullets.slice(0, 6);
}
