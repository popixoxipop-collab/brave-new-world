"use client";

import Fuse from "fuse.js";
import { forwardRef, memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import { CursorHoverCard } from "@/components/CursorHoverCard";
import { DisputeZoneLegend } from "@/components/DisputeZoneLegend";
import { UkraineFrontLegend, UkraineFrontLegendContent } from "@/components/UkraineFrontLegend";
import { LegendReopenButton } from "@/components/MapOverlayLegendPanel";
import { FeatureGuideButton, FeatureGuidePanel } from "@/components/FeatureGuidePanel";
import { MethodologySourcesPanel, SourcesLinkButton } from "@/components/MethodologySourcesPanel";
import { GdeltAlertPanel } from "@/components/GdeltAlertPanel";
import { TelegramOsintPanel } from "@/components/TelegramOsintPanel";
import { TzevaAdomPanel, type AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import { UkraineAirRaidPanel } from "@/components/UkraineAirRaidPanel";
import { NeptunLayerPanel } from "@/components/NeptunLayerPanel";
import { NeptunThreatDetailPanel } from "@/components/NeptunThreatDetailPanel";
import { LocalAlertPanel } from "@/components/LocalAlertPanel";
import { type LayerCategory } from "@/components/LayerCategoryPanel";
import { LayerCategoryDraftHost } from "@/components/LayerCategoryDraftHost";
import { LayerPanelLanguagePicker } from "@/components/LayerPanelLanguagePicker";
import { MapGlobeView } from "@/components/MapGlobeView";
import { HoverNav } from "@/components/HoverNav";
import { HoverHint } from "@/components/HoverHint";
import { TheaterIntelSidebar } from "@/components/TheaterIntelSidebar";
import { TheaterDetailCta } from "@/components/TheaterDetailCta";
import { ExplorationTabs } from "@/components/ExplorationTabs";
import { ModePickerOverlay } from "@/components/ModePickerOverlay";
import { WelcomeParchmentLetter } from "@/components/WelcomeParchmentLetter";
import { EntryCautionOverlay } from "@/components/EntryCautionOverlay";
import { SoundMuteControl } from "@/components/SoundMuteControl";
import { DomainGateOverlay } from "@/components/DomainGateOverlay";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import {
  HOVER,
  carrierStatusLabel,
  disputeCategoryLabel,
  eventTierLabel,
  hatchStyleLabelLocalized,
  pathKindLabel,
  staticKindLabel,
  tensionLabel,
} from "@/lib/hoverLabels";
import { t } from "@/lib/uiStrings";
import { ViewerIntroOverlay, shouldShowViewerIntro } from "@/components/ViewerIntroOverlay";
import { EconomyRegionPanel } from "@/components/EconomyRegionPanel";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { QuickStartCoach, shouldShowQuickStart } from "@/components/QuickStartCoach";
import type { NavSelection, RegionBBox } from "@/data/navRegions";
import { EXPLORATION_PRESETS, toNavSelection } from "@/data/navRegions";
import { ECON_EXPLORATION_PRESETS, econNavSelectionFromId } from "@/data/econNavRegions";
import {
  hottestConflictNavId,
  hottestEconomyNavId,
  type EconomyHubChoice,
} from "@/lib/autoFlyTarget";
import {
  conceptLayersForConflictNavId,
  conceptLayersForEconomyNavId,
} from "@/lib/conceptLayers";
import { gdeltLocationTagLabel, pickGdeltTensionTags, pickGdeltTierPins } from "@/lib/gdeltLocationTags";
import {
  createGdeltLocationTagBadge,
  type GdeltTagHtmlMarker,
} from "@/lib/gdeltLocationTagMarker";
import { gdeltNewsAlertLabel } from "@/lib/gdeltNewsAlert";
import {
  filterEventsByNavSelection,
  pickMenuCoreAlerts,
  type MenuCoreAlert,
} from "@/lib/regionFilter";
import {
  buildTensionHeatmaps,
  diplomaticHeatmapColor,
  warHeatmapColor,
} from "@/lib/tensionHeatmap";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { getTransportLod } from "@/lib/transportLod";
import {
  expandPlaces,
  expandTransportPaths,
} from "@/lib/compactData";
import { dataPath } from "@/lib/dataProfile";
import { fetchAppDataStream, fetchAppDataPlaces, type AppDataLoadProgress } from "@/lib/fetchAppDataStream";
import { computeDashboardBootProgress } from "@/lib/bootLoadingProgress";
import { runWhenIdle } from "@/lib/deferIdle";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import {
  firmsLiveFetchMax,
  liveAisFetchMax,
  liveAisPollMs,
  liveFirmsPollMs,
  liveGdeltPollMs,
  liveMilFetchMax,
  liveMilPollMs,
  liveTelegramPollMs,
  liveTelegramSyncPollMs,
  liveTzevaPollMs,
  liveUsCarriersPollMs,
  shouldDeferLiveNetworkRefresh,
} from "@/lib/liveRenderGuard";
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
  type TelegramAlertsPayload,
} from "@/lib/telegramAlerts";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";
import {
  formatNeptunLocation,
  getNeptunTypeLabel,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import { createNeptunImpactFlashElement } from "@/lib/neptunImpactFlash";
import type { NeptunImpactFlash } from "@/lib/neptunImpactFlash";
import { useNeptunStream } from "@/hooks/useNeptunStream";
import {
  buildArchivedNeptunTrackPaths,
  buildNeptunProjectionPaths,
  buildNeptunTrailPaths,
} from "@/lib/neptunTracks";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";
import {
  filterNeptunThreatsForViewport,
  filterNeptunThreatsInOpsBox,
  getNeptunRenderMode,
  NEPTUN_ARCHIVED_MAX_BY_TIER,
  NEPTUN_THREAT_MAX_BY_TIER,
  neptunElevationForMode,
  neptunShowsMarkers,
  neptunShowsPaths,
  neptunShowsProjection,
  neptunTrailPointBudget,
  neptunProjectionPointBudget,
  neptunArchivedPointBudget,
  neptunMaxGroundTrailVertices,
  isNeptunTheaterInView,
} from "@/lib/neptunLod";
import { createNeptunThreatBadge } from "@/lib/neptunTrackMarker";
import { SoundEffectsBridge } from "@/components/SoundEffectsBridge";
import {
  AIR_RAID_FLY_ALTITUDE,
  AIR_RAID_FLY_MS,
  AIR_RAID_FOCUS_HATCH_MS,
  buildAirRaidFocusHatchPaths,
  isAirRaidFocusPath,
  playAirRaidSirenAfterFly,
  type AirRaidSirenKind,
} from "@/lib/airRaidFocus";
import {
  buildFirmsCombatHotspots,
  buildGdeltWarNewsHotspots,
  classifyFirmsFireForSound,
  firmsFireSoundLabel,
} from "@/lib/firmsSoundClassify";
import { useDataSync } from "@/hooks/useDataSync";
import { useGlobeStaticLayers } from "@/hooks/useGlobeStaticLayers";
import { useLayerPrefsController } from "@/hooks/useLayerPrefsController";
import {
  applyViewPackages,
  DEFAULT_PACKAGE_SELECTION,
  resolveIntroFlyTarget,
  viewerModeFromPackages,
  type MergedViewConfig,
  type ViewPackageId,
  type ViewTheaterChoice,
  type ViewerMode,
} from "@/lib/viewPackages";
import { applyViewerMode, getViewerChrome } from "@/lib/viewerChrome";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";

import {
  anyDisputeOverlay,
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  type LabelLanguage,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import {
  translateOrefRegion,
  translateOrefTitle,
  tzevaUi,
} from "@/lib/tzevaAdomI18n";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import {
  activeLayerCap,
  countActiveLayers,
} from "@/lib/layerExclusiveCap";
import {
  applyNormalCapToLayerPrefs,
  applyUltraLiteToLayerPrefs,
  loadPerfPrefs,
  savePerfPrefs,
  ultraLiteGdeltPinScale,
} from "@/lib/ultraLiteMode";
import { lookupOceanName } from "@/lib/oceanNames";
import { getGlobeTextures } from "@/lib/mapStyles";
import {
  CYBER_WAR_ROOM_THEME,
} from "@/lib/cyberWarRoomTheme";
import { getZoomOutScale } from "@/lib/zoomScale";
import {
  clampGlobeAltitude,
  EXTREME_ZOOM_ALTITUDE,
  globeDistanceForAltitude,
  MIN_GLOBE_ALTITUDE,
  ORBITAL_OVERVIEW_ALTITUDE,
  THEATER_ENTRY_MIN_ALTITUDE,
} from "@/lib/globeCamera";
import {
  STATIC_MARKER_PALETTE,
  STATIC_POINT_COLORS,
  STATIC_POINT_EMOJI,
  isEmojiStaticKind,
  staticPointRadius,
} from "@/lib/staticGlobe";
import { COUNTRY_BORDER_PATH_COLOR, COUNTRY_FILL_ALTITUDE, COUNTRY_TEXTURE_MODE_FILL, POLYGON_NO_STROKE } from "@/lib/countryColors";
import { getPlaceLabelColor, getPlaceLabelDotRadius, getPlaceLabelSize, getPlaceLabelTier } from "@/lib/placeLabelColors";
import { filterMajorCityLabels } from "@/lib/placeLod";
import {
  resolveBottomAlertPanel,
  shouldClosePanelOnDataError,
  shouldCloseLocalForGdelt,
} from "@/lib/localOverlayPolicy";
import {
  CAMERA_IDLE_DEBOUNCE_MS,
  HEATMAP_UPDATE_CADENCE_MS,
  LABEL_UPDATE_CADENCE_MS,
  PATH_UPDATE_CADENCE_MS,
  SETTLEMENT_DETAIL_MIN_MAP_ZOOM,
} from "@/lib/globePerformance";
import {
  cameraBusyUntilAfterFly,
  cameraFlyBusyMs,
  cameraIdleClearBlocked,
} from "@/lib/cameraBusyGuard";
import { useCameraViewport } from "@/hooks/useCameraViewport";
import {
  COUNTRY_POLYGON_MAX_BY_TIER,
  DISPUTE_MAX_BY_TIER,
  FIRMS_FIRE_MAX_BY_TIER,
  VIEWPORT_RADIUS_BY_TIER,
  filterByViewportCenter,
  isCenterInView,
  viewToBbox,
} from "@/lib/viewportCull";
import {
  pickDisputeAlerts,
  type DisputeAlert,
} from "@/lib/disputeAlerts";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import {
  conflictZoneToOutlineAndHatchPaths,
  disputeMatchesWarDiplomaticLayers,
  disputeToOutlineAndHatchPaths,
  getConflictZoneHatchColor,
  getConflictZoneOutlineColor,
  getDisputeHatchColor,
  getDisputeHatchStyle,
  getDisputeOutlineColor,
  isCombatHazard,
  parseConflictHatchGrade,
  rankDisputesForDisplay,
  TENSION_GRADE_STYLES,
} from "@/lib/disputeHatch";
import { selectViinaPolygons } from "@/lib/viinaLod";
import {
  prefetchUkraineControl,
  readUkraineControlCache,
} from "@/lib/viinaPrefetch";
import { prefetchNeptun } from "@/lib/neptunPrefetch";
import { buildViinaFrontEvents, type ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import { filterUkraineSettlementsForView } from "@/lib/ukraineSettlements";
import { ukraineAxisToTransportPath } from "@/lib/ukraineAdvancePaths";
import {
  buildUkraineFrontRender,
  computeUkraineFrontFitBbox,
} from "@/lib/ukraineFrontPaths";
import {
  filterHatchPathsByView,
  lodTierToHatchLod,
} from "@/lib/ukraineHatchPrecompute";
import {
  prefetchUkraineHatchPaths,
  readUkraineHatchPathsCache,
} from "@/lib/ukraineHatchPrefetch";
import {
  prefetchDisputeHatchPaths,
  readDisputeHatchPathsCache,
} from "@/lib/disputeHatchPrefetch";
import type { DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import {
  createUkraineSettlementLabelElement,
  getUkraineSettlementTier,
  isInUkraineTheater,
  ukraineControlStatusLabel,
} from "@/lib/ukraineSettlementLabels";
import {
  UKRAINE_SITUATION_CALLOUTS_SHARED,
  UKRAINE_SITUATION_PATHS,
} from "@/data/ukraineSituationSeed";
import { MIDDLE_EAST_SITUATION_CALLOUTS } from "@/data/middleEastSituationSeed";
import {
  KOREA_SITUATION_CALLOUTS,
  TAIWAN_SITUATION_CALLOUTS,
} from "@/data/asiaSituationSeed";
import {
  SITUATION_CALLOUT_ACCENT,
  type SituationCallout,
} from "@/data/situationCalloutTypes";
import {
  resolveCombatTheaterAt,
} from "@/lib/theaterCombat";
import type {
  AisVessel,
  AppData,
  ConflictEvent,
  ConflictZoneFeature,
  CountryFeature,
  DisputeArea,
  DisputeOverview,
  FirmsFire,
  GeoJsonGeometry,
  MilitaryAircraft,
  MilitaryBaseArea,
  SearchPlace,
  StaticPoint,
  TransportPath,
  UkraineControlData,
  UkraineControlZone,
  UkraineSettlement,
  ViinaRenderMeta,
  UsCarrier,
} from "@/data/geoTypes";
import {
  isFreshEvent,
  scoreEvents,
  TIER_LABELS,
  type ScoredEvent,
} from "@/data/eventTiers";
import { createEventPinElement } from "@/lib/locationPinMarker";
import {
  NewsStreamProvider,
  IntelCompactBar,
  IntelNewsSheet,
  type BottomIntelStackHandle,
} from "@/components/BottomIntelStack";
import {
  navSelectionFromId,
  theaterFocusFromNav,
  isUkraineNavId,
  type TheaterSidebarTab,
} from "@/lib/theaterFocus";
import {
  flyTargetForTheater,
  newsTheaterFromCoords,
  THEATER_FLY_TO,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import { UsCarrierFixedToggle } from "@/components/UsCarrierFixedToggle";
import { carrierLabelOffsets, createUsCarrierBadge, CARRIER_MARKER_ROOT_CLASS, filterVisibleCarriers, isOperationalCarrier } from "@/lib/usCarrierMarkers";
import { US_CARRIER_STATUS_COLORS, US_CARRIER_STATUS_LABELS } from "@/data/usCarriers";

type Selection =
  | {
      kind: "event";
      item: ConflictEvent;
    }
  | {
      kind: "dispute";
      item: DisputeArea;
    }
  | {
      kind: "conflict-zone";
      item: ConflictZoneFeature;
    }
  | {
      kind: "country";
      item: CountryFeature;
    }
  | {
      kind: "ais";
      item: AisVessel;
    }
  | {
      kind: "ukraine-control";
      item: UkraineControlZone;
    }
  | {
      kind: "us-carrier";
      item: UsCarrier;
    }
    | {
      kind: "neptun-threat";
      item: NeptunLiveThreat;
    };

type AnalysisSelection = Exclude<Selection, { kind: "neptun-threat" }>;

type PolygonLayerFeature =
  | (CountryFeature & { polygonLayer: "country" })
  | (MilitaryBaseArea & { polygonLayer: "military-base" })
  | (ConflictZoneFeature & { polygonLayer: "conflict-zone" })
  | (UkraineControlZone & {
      polygonLayer: "ukraine-ru" | "ukraine-ua" | "ukraine-contested";
    });

type GlobePoint = ScoredEvent & { markerId: string; displayKind: "event" };

type StaticGlobePoint = StaticPoint & { markerId: string; displayKind: "static" };

type MilGlobePoint = MilitaryAircraft & { markerId: string; displayKind: "mil" };

type FirmsFireGlobePoint = FirmsFire & { markerId: string; displayKind: "firms-fire" };

type ConflictClusterPoint = ConflictZoneFeature & {
  markerId: string;
  displayKind: "conflict-cluster";
  lat: number;
  lng: number;
};

/** 지도 펄스 링 — AI 클러스터 또는 폭격 추정 FIRMS */
type PulseRingPoint =
  | (ConflictClusterPoint & { pulseKind: "ai-zone" })
  | {
      pulseKind: "firms-bomb";
      id: string;
      lat: number;
      lng: number;
      frp: number | null;
      markerId: string;
    };

type TzevaAdomGlobePoint = TzevaAdomAlert & {
  markerId: string;
  displayKind: "tzeva-adom";
};

type NeptunImpactHtmlMarker = NeptunImpactFlash & {
  markerId: string;
  displayKind: "neptun-impact";
  lat: number;
  lng: number;
};

type NeptunHtmlMarker = NeptunLiveThreat & {
  markerId: string;
  displayKind: "neptun-html";
  lat: number;
  lng: number;
};

type UsCarrierHtmlMarker = UsCarrier & {
  markerId: string;
  displayKind: "us-carrier-html";
  lat: number;
  lng: number;
};

type GlobeDisplayPoint =
  | GlobePoint
  | GdeltTagHtmlMarker
  | StaticGlobePoint
  | MilGlobePoint
  | FirmsFireGlobePoint
  | ConflictClusterPoint
  | TzevaAdomGlobePoint;

type GlobeLabel =
  | (SearchPlace & { labelKind: "place" });

type SituationCalloutMarker = SituationCallout & {
  markerId: string;
  displayKind: "situation-callout";
};

type UkraineSettlementHtmlMarker = UkraineSettlement & {
  markerId: string;
  displayKind: "ua-settlement-html";
  tier: ReturnType<typeof getUkraineSettlementTier>;
};

type HtmlOverlayMarker =
  | StaticGlobePoint
  | GlobePoint
  | UsCarrierHtmlMarker
  | GdeltTagHtmlMarker
  | SituationCalloutMarker
  | UkraineSettlementHtmlMarker
  | NeptunHtmlMarker
  | NeptunImpactHtmlMarker;

type HoverCard =
  | {
      kind: "event";
      title: string;
      detail: string;
      badge?: string;
      meta?: string;
      body?: string;
      hint?: string;
    }
  | { kind: "static"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "polygon"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "path"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "ocean"; title: string; detail: string; meta?: string; body?: string; hint?: string };

const US_BASE_FILL = "rgba(37, 99, 235, 0.32)";
/** RU·UA 점령/주장 테두리·빗금 (지표면) — accentColor 없을 때 폴백 */
const UKRAINE_RU_OCCUPIED_LINE = "rgba(185, 28, 28, 0.72)";
const UKRAINE_UA_OCCUPIED_LINE = "rgba(56, 189, 248, 0.7)";
const UKRAINE_RU_FRONT_LINE = "rgba(220, 38, 38, 1)";
const UKRAINE_UA_FRONT_LINE = "rgba(37, 99, 235, 0.95)";
const UKRAINE_UA_GAIN_LINE = "rgba(37, 99, 235, 0.88)";
/** RU 진격·주장 — 주황 / UA 주장 — 하늘색 */
const UKRAINE_UA_CLAIM_LINE = "rgba(56, 189, 248, 0.9)";
const UKRAINE_RU_CLAIM_LINE = "rgba(251, 146, 60, 0.88)";
/** MapLibre 지면 점령면 — 국경처럼 항상 표시 */
const UKRAINE_RU_FILL = "rgba(185, 28, 28, 0.38)";
const UKRAINE_UA_FILL = "rgba(37, 99, 235, 0.28)";
const UKRAINE_CONTESTED_FILL = "rgba(234, 179, 8, 0.32)";
const UKRAINE_RU_STROKE = "rgba(220, 38, 38, 0.55)";
const UKRAINE_UA_STROKE = "rgba(59, 130, 246, 0.5)";
const UKRAINE_CONTESTED_STROKE = "rgba(234, 179, 8, 0.55)";
const UKRAINE_CONTROL_ALTITUDE = 0;
const UKRAINE_COMBAT_ZONE_LINE = "rgba(100, 116, 139, 0.72)";
const US_BASE_STROKE = "rgba(96, 165, 250, 0.85)";
const US_BASE_ALTITUDE = 0.0022;
const CONFLICT_ZONE_ALTITUDE = 0.0016;
/** 무기금수: 면 채움 없이 사각 테두리만 */
const ARMS_EMBARGO_STROKE = "#c084fc";
const ARMS_EMBARGO_STROKE_WIDTH = 0.72;
const INTEL_MISSILE_ARC = CYBER_WAR_ROOM_THEME.intel.missileArc;
const INTEL_NASA_FIRE = CYBER_WAR_ROOM_THEME.intel.nasaFire;
const TZEVA_ADOM_MARKER = "#ff1744";

function formatViinaDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return value || "N/A";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

/** Polygon / MultiPolygon 외곽을 닫힌 path 링으로 변환 (면 없이 테두리만) */
function geometryToBorderPaths(
  idPrefix: string,
  name: string | null,
  geometry: GeoJsonGeometry,
  kind: TransportPath["kind"] = "arms-embargo",
): TransportPath[] {
  const rings: number[][][] = [];
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates;
    if (Array.isArray(coords) && Array.isArray(coords[0])) {
      const outer = coords[0] as number[][];
      if (outer.length >= 2) rings.push(outer);
    }
  } else if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates;
    if (Array.isArray(polygons)) {
      for (const polygon of polygons) {
        if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) continue;
        const outer = polygon[0] as number[][];
        if (outer.length >= 2) rings.push(outer);
      }
    }
  }

  const paths: TransportPath[] = [];
  rings.forEach((ring, index) => {
    const points = ring
      .map(([lng, lat]) => ({
        lat: Number(lat),
        lng: Number(lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length < 2) return;
    const stride = points.length > 80 ? Math.ceil(points.length / 64) : 1;
    const simplified =
      stride <= 1
        ? points
        : points.filter((_, i) => i % stride === 0 || i === points.length - 1);
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
      simplified.push({ ...first });
    }
    const lats = simplified.map((p) => p.lat);
    const lngs = simplified.map((p) => p.lng);
    paths.push({
      id: `${idPrefix}-${index}`,
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
      points: simplified,
    });
  });
  return paths;
}

function hatchStyleLabel(style: string, dispute?: DisputeArea, lang: "ko" | "en" = "ko") {
  return hatchStyleLabelLocalized(style, lang, Boolean(dispute && isCombatHazard(dispute)));
}

function truncateOverview(text: string, maxLen = 140) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}


const INFRA_COLORS = {
  rail: {
    dim: "rgba(150, 105, 65, 0.58)",
    glow: "rgba(210, 165, 105, 0.74)",
  },
  city: {
    dim: "rgba(255, 255, 255, 0.52)",
    glow: "rgba(255, 214, 60, 0.66)",
  },
} as const;

const INFRA_STROKE = {
  rail: { dim: 0.28, glow: 0.82 },
} as const;

const PATH_LAYER_COLORS = {
  "shipping-lane": "rgba(56, 189, 248, 0.88)",
  "submarine-cable": "rgba(167, 139, 250, 0.82)",
  "oil-pipeline": "rgba(234, 179, 8, 0.9)",
  "gas-pipeline": "rgba(34, 197, 94, 0.88)",
} as const;

const STATIC_KIND_LABELS: Record<StaticPoint["kind"], string> = {
  airport: "공항",
  port: "항구",
  resource: "자원 매장지",
  "military-base": "군사기지",
  "cable-landing": "케이블 착륙지",
  "nuclear-site": "원자력 시설",
  "internet-exchange": "인터넷 교환점",
  "refugee-camp": "난민 캠프",
  "ucdp-event": "분쟁 사건",
  "ai-data-center": "AI 데이터센터",
  "economic-center": "경제 중심지",
  "sanctions-entity": "제재 대상",
  "space-launch": "우주 발사",
  "lng-terminal": "액화가스 터미널",
  chokepoint: "해상 초크포인트",
  "logistics-hub": "핵심 물류 거점",
};

function staticKindLabelLocal(kind: StaticPoint["kind"], lang: "ko" | "en" = "ko") {
  return staticKindLabel(kind, lang);
}

function docLang(): "ko" | "en" {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ko";
}

function usFlagIconSvg() {
  return `
    <svg width="14" height="10" viewBox="0 0 19 10" aria-hidden="true">
      <rect width="19" height="10" fill="#B22234"/>
      <path d="M0 1.1h19M0 3.3h19M0 5.5h19M0 7.7h19M0 9.9h19" stroke="#fff" stroke-width="0.85"/>
      <rect width="7.6" height="5.4" fill="#3C3B6E"/>
      <g fill="#fff">
        <circle cx="1.1" cy="0.9" r="0.28"/><circle cx="2.5" cy="0.9" r="0.28"/><circle cx="3.9" cy="0.9" r="0.28"/><circle cx="5.3" cy="0.9" r="0.28"/><circle cx="6.7" cy="0.9" r="0.28"/>
        <circle cx="1.8" cy="1.8" r="0.28"/><circle cx="3.2" cy="1.8" r="0.28"/><circle cx="4.6" cy="1.8" r="0.28"/><circle cx="6.0" cy="1.8" r="0.28"/>
        <circle cx="1.1" cy="2.7" r="0.28"/><circle cx="2.5" cy="2.7" r="0.28"/><circle cx="3.9" cy="2.7" r="0.28"/><circle cx="5.3" cy="2.7" r="0.28"/><circle cx="6.7" cy="2.7" r="0.28"/>
        <circle cx="1.8" cy="3.6" r="0.28"/><circle cx="3.2" cy="3.6" r="0.28"/><circle cx="4.6" cy="3.6" r="0.28"/><circle cx="6.0" cy="3.6" r="0.28"/>
        <circle cx="1.1" cy="4.5" r="0.28"/><circle cx="2.5" cy="4.5" r="0.28"/><circle cx="3.9" cy="4.5" r="0.28"/><circle cx="5.3" cy="4.5" r="0.28"/><circle cx="6.7" cy="4.5" r="0.28"/>
      </g>
    </svg>
  `;
}

function createAirportPortBadge(
  point: StaticGlobePoint,
  onHover: (point: StaticGlobePoint | null) => void,
  altitude = 0.2,
): HTMLElement {
  const kind = isEmojiStaticKind(point.kind) ? point.kind : "airport";
  const palette = STATIC_MARKER_PALETTE[kind];
  const isSquareHub = kind === "airport" || kind === "port";
  const zoomScale = getZoomOutScale(altitude);
  const baseSize =
    kind === "military-base"
      ? Math.max(1, Number(point.tier) || 1) <= 2
        ? 28
        : 24
      : Math.max(1, Number(point.tier) || 1) <= 1
        ? 24
        : 20;
  const size = Math.max(10, Math.round(baseSize * zoomScale));

  const el = document.createElement("div");
  el.className = "hub-marker";
  el.dataset.kind = kind;
  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    kind === "military-base"
      ? `${HOVER.militaryBase(docLang())} ${point.name}`
      : `${staticKindLabelLocal(point.kind, docLang())} ${point.name}`,
  );
  el.title =
    kind === "military-base"
      ? `${HOVER.militaryBase(docLang())} · ${point.name}`
      : `${staticKindLabelLocal(point.kind, docLang())} · ${point.name}`;

  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.borderRadius = isSquareHub ? "3px" : "6px";
  el.style.background = isSquareHub
    ? palette.fill.replace(/[\d.]+\)$/, "0.82)")
    : `
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.28), transparent 42%),
    ${palette.fill}
  `;
  el.style.border = `1px solid ${palette.rim}`;
  el.style.boxShadow = `
    0 0 0 1px rgba(8, 18, 36, 0.25),
    0 0 10px ${palette.glow},
    0 4px 10px rgba(2, 8, 20, 0.35)
  `;
  el.style.backdropFilter = "blur(4px)";
  el.style.setProperty("-webkit-backdrop-filter", "blur(4px)");
  el.style.color = palette.ink;
  el.style.fontSize = isSquareHub ? `${Math.round(size * 0.58)}px` : "12px";
  el.style.lineHeight = "1";
  el.style.transform = "translate(-50%, -50%) scale(0.92)";
  el.style.opacity = "0";
  el.style.pointerEvents = "auto";
  el.style.cursor = "default";
  el.style.userSelect = "none";
  el.style.transition =
    "opacity 320ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease, border-color 280ms ease";

  if (kind === "airport" || kind === "port") {
    el.textContent = STATIC_POINT_EMOJI[kind];
  } else {
    el.innerHTML = usFlagIconSvg();
  }

  el.addEventListener("mouseenter", () => {
    el.style.transform = "translate(-50%, -50%) scale(1.08)";
    el.style.boxShadow = `
      0 0 0 1px rgba(8, 18, 36, 0.28),
      0 0 14px ${palette.glow},
      0 6px 14px rgba(2, 8, 20, 0.4)
    `;
    onHover(point);
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.boxShadow = `
      0 0 0 1px rgba(8, 18, 36, 0.25),
      0 0 10px ${palette.glow},
      0 4px 10px rgba(2, 8, 20, 0.35)
    `;
    onHover(null);
  });
  el.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  return el;
}

function createSituationCalloutBadge(callout: SituationCalloutMarker): HTMLElement {
  const accent = SITUATION_CALLOUT_ACCENT[callout.side];

  const el = document.createElement("div");
  el.className = "situation-callout";
  el.style.maxWidth = "200px";
  el.style.padding = "6px 8px";
  el.style.borderRadius = "4px";
  el.style.border = `1px solid ${accent.border}`;
  el.style.background = accent.bg;
  el.style.color = "#e2e8f0";
  el.style.fontSize = "11px";
  el.style.lineHeight = "1.35";
  el.style.transform = "translate(-50%, -110%)";
  el.style.opacity = "1";
  el.style.pointerEvents = "auto";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.style.zIndex = "5";
  el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
  el.innerHTML = `<div style="font-weight:700;color:${accent.title};margin-bottom:2px">${escapeHtml(
    callout.title,
  )}</div><div style="opacity:0.92">${escapeHtml(callout.body)}</div>`;
  return el;
}

const EMPTY_OVERLAY_POLYGONS: PolygonLayerFeature[] = [];

function overlayPolygonSignature(polygons: PolygonLayerFeature[]) {
  return polygons.map((feature) => `${feature.id}:${feature.polygonLayer}`).join("|");
}

function overlayPolygonsEqual(
  a: PolygonLayerFeature[],
  b: PolygonLayerFeature[],
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return overlayPolygonSignature(a) === overlayPolygonSignature(b);
}

function isUkraineViinaPolygonLayer(
  layer?: PolygonLayerFeature["polygonLayer"],
): boolean {
  return (
    layer === "ukraine-ru" || layer === "ukraine-ua" || layer === "ukraine-contested"
  );
}

function ukraineThinOutlineStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 0.55;
    case "near":
      return 0.45;
    case "regional":
      return 0.35;
    case "continent":
      return 0.26;
    default:
      return 0.2;
  }
}

function ukraineHatchStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 0.32;
    case "near":
      return 0.28;
    case "regional":
      return 0.24;
    default:
      return 0.2;
  }
}

function ukraineCombatZoneStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 1.05;
    case "near":
      return 0.82;
    case "regional":
      return 0.52;
    case "continent":
      return 0.38;
    default:
      return 0.28;
  }
}

function pathsEqual(a: TransportPath[], b: TransportPath[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.map((path) => `${path.id}:${path.kind}`).join("|") ===
    b.map((path) => `${path.id}:${path.kind}`).join("|");
}

function neptunPathsGeometryEqual(a: TransportPath[], b: TransportPath[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.id !== right.id || left.kind !== right.kind) return false;
    if (left.points.length !== right.points.length) return false;
    const l0 = left.points[0];
    const r0 = right.points[0];
    const ln = left.points[left.points.length - 1];
    const rn = right.points[right.points.length - 1];
    if (
      l0.lat !== r0.lat ||
      l0.lng !== r0.lng ||
      (l0.alt ?? 0) !== (r0.alt ?? 0) ||
      ln.lat !== rn.lat ||
      ln.lng !== rn.lng ||
      (ln.alt ?? 0) !== (rn.alt ?? 0)
    ) {
      return false;
    }
  }
  return true;
}

type GlobeSize = {
  width: number;
  height: number;
};

type ViewState = {
  lat: number;
  lng: number;
  altitude: number;
};

const LAYER_ALTITUDE_SYNC_MIN_DELTA = 0.065;
const MOVING_IDLE_DELAY_MS = CAMERA_IDLE_DEBOUNCE_MS;
const INTRO_CAMERA_DURATION_MS = 2200;
const INTRO_CAMERA_DELAY_MS = 900;
const INTRO_SESSION_KEY = "cv-intro-seen";
const WELCOME_GATE_KEY = "geowatch-welcome-gate-v1";

type EntryGate = "caution" | "welcome" | "domain" | "mode" | null;

function readWelcomeGateDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WELCOME_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

function markWelcomeGateDone() {
  try {
    localStorage.setItem(WELCOME_GATE_KEY, "1");
  } catch {
    // ignore
  }
}
const FLOW_PATH_KINDS = new Set([
  "shipping-lane",
  "submarine-cable",
  "msr",
  "oil-pipeline",
  "gas-pipeline",
  "msr",
  "neptun-projection",
]);
const HEATMAP_MEANINGFUL_DELTA = 28;
const LABEL_MEANINGFUL_DELTA = 56;
const PATH_MEANINGFUL_DELTA = 120;
const LOD_HYSTERESIS_MARGIN = 0.06;
const LOD_TIER_ANCHOR_ALTITUDE: Record<GlobeLodTier, number> = {
  global: 1.9,
  continent: 1.36,
  regional: 0.9,
  near: 0.52,
  village: 0.2,
};
const REGION_FIT_PADDING = 1.18;
const REGION_MIN_SPAN_DEG = 0.8;
const REGION_MIN_ALTITUDE = 0.42;
const REGION_MAX_ALTITUDE = 2.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** HTML 오버레이 — 라벨·뉴스 뱃지 루트는 휠 줌이 지도로 전달되도록 none 유지 */
function applyHtmlOverlayPointerEvents(el: HTMLElement, isVisible: boolean) {
  if (!isVisible) {
    el.style.pointerEvents = "none";
    return;
  }
  if (
    el.classList.contains("gdelt-news-alert-marker") ||
    el.classList.contains("ua-settlement-label") ||
    el.classList.contains("situation-callout") ||
    el.classList.contains("ua-callout") ||
    el.classList.contains(CARRIER_MARKER_ROOT_CLASS)
  ) {
    el.style.pointerEvents = "none";
    return;
  }
  el.style.pointerEvents = "auto";
}

function getStableLodTier(prevTier: GlobeLodTier, altitude: number): GlobeLodTier {
  if (prevTier === "global") return altitude < 1.65 - LOD_HYSTERESIS_MARGIN ? "continent" : "global";
  if (prevTier === "continent") {
    if (altitude > 1.65 + LOD_HYSTERESIS_MARGIN) return "global";
    if (altitude < 1.1 - LOD_HYSTERESIS_MARGIN) return "regional";
    return "continent";
  }
  if (prevTier === "regional") {
    if (altitude > 1.1 + LOD_HYSTERESIS_MARGIN) return "continent";
    if (altitude < 0.72 - LOD_HYSTERESIS_MARGIN) return "near";
    return "regional";
  }
  if (prevTier === "near") {
    if (altitude > 0.72 + LOD_HYSTERESIS_MARGIN) return "regional";
    if (altitude < 0.28 - LOD_HYSTERESIS_MARGIN) return "village";
    return "near";
  }
  return altitude > 0.28 + LOD_HYSTERESIS_MARGIN ? "near" : "village";
}

const emptyData: AppData = {
  generatedAt: "",
  sources: {
    naturalEarth: "",
    gdelt: "",
  },
  countries: [],
  disputes: [],
  places: [],
  events: [],
  roads: [],
  railroads: [],
};

function getTensionLabel(tension: DisputeArea["tension"], lang: "ko" | "en" = "ko") {
  return tensionLabel(tension, lang);
}

function getPathKindLabel(kind: TransportPath["kind"], lang: "ko" | "en" = "ko") {
  return pathKindLabel(kind, lang);
}

function formatCategories(categories: DisputeArea["categories"], lang: "ko" | "en" = "ko") {
  return categories.map((category) => disputeCategoryLabel(category, lang)).join(" · ");
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLabelText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[|/\\,_\-]{4,}/g, " ")
    .trim();
}

function isAbnormalCityLabel(value: string) {
  if (!value) return true;
  if (value.length > 64) return true;
  if (/^(null|undefined|unknown|n\/a|na|none)$/i.test(value)) return true;
  if (/(.)\1{5,}/.test(value)) return true;
  // 깨진 인코딩(모지베이크) 휴리스틱
  if (/Ã.|Â.|â.|ðŸ|ï¿½/.test(value)) return true;
  if (/[\u0080-\u009f]/.test(value)) return true;

  const symbolMatches = value.match(/[^\p{L}\p{N}\s.'()\-]/gu) || [];
  return symbolMatches.length >= Math.max(3, Math.floor(value.length / 3));
}

function getSafePlaceLabel(
  item: Pick<SearchPlace, "name" | "nameKo" | "country" | "type">,
  labelLanguage: LabelLanguage,
) {
  const englishName = normalizeLabelText(item.name);
  const koreanName = normalizeLabelText(item.nameKo);

  // 한국어 모드여도 깨진 한글이면 영문(NAMEASCII) 우선
  const preferredName =
    labelLanguage === "ko" && koreanName && !isAbnormalCityLabel(koreanName)
      ? koreanName
      : englishName;

  const candidates = [
    preferredName,
    englishName,
    koreanName,
  ];
  const valid = candidates.find((candidate) => candidate && !isAbnormalCityLabel(candidate));
  return valid || "도시";
}

function hostFromUrl(url: string | null) {
  if (!url) return "source url 없음";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDateTime(value: string) {
  if (!value) return "생성 전";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function bboxNearView(path: TransportPath, view: ViewState, radiusDeg: number) {
  if (radiusDeg <= 0) return false;

  const latDistance =
    view.lat < path.bbox.minLat
      ? path.bbox.minLat - view.lat
      : view.lat > path.bbox.maxLat
        ? view.lat - path.bbox.maxLat
        : 0;

  const lngCenter = (path.bbox.minLng + path.bbox.maxLng) / 2;
  const lngHalfWidth = Math.max(0.5, longitudeDistance(path.bbox.minLng, path.bbox.maxLng) / 2);
  const lngDistance = Math.max(0, longitudeDistance(view.lng, lngCenter) - lngHalfWidth);

  return Math.sqrt(latDistance ** 2 + lngDistance ** 2) <= radiusDeg;
}

function filterTransportPaths(
  paths: TransportPath[],
  view: ViewState,
  radiusDeg: number,
  maxScalerank: number,
  maxCount: number,
  arterialMaxRank: number,
) {
  if (maxCount <= 0) return [];

  const visible = [];

  for (const path of paths) {
    if (path.scalerank > maxScalerank) continue;

    const isArterial = path.scalerank <= arterialMaxRank;
    if (!isArterial && radiusDeg > 0 && !bboxNearView(path, view, radiusDeg)) continue;

    visible.push(path);
    if (visible.length >= maxCount) break;
  }

  return visible;
}

export type GlobeDashboardProps = {
  viinaMeta?: ViinaRenderMeta | null;
  initialViewConfig?: MergedViewConfig | null;
  onBootProgress?: (progress: number) => void;
  onBootReady?: () => void;
};

const EMPTY_LAYER_CATEGORIES: LayerCategory[] = [];

type PausedMapGlobeProps = React.ComponentProps<typeof MapGlobeView> & {
  interactionPaused: boolean;
};

/** 레이어 패널 열림 동안 지도 GeoJSON 재빌드 차단 — 메인 스레드 UI 멈춤 방지 */
const PausedMapGlobeView = memo(
  forwardRef<MapGlobeMethods, PausedMapGlobeProps>(function PausedMapGlobeView(
    { interactionPaused: _interactionPaused, ...mapProps },
    ref,
  ) {
    return <MapGlobeView ref={ref} {...mapProps} />;
  }),
  (prev, next) => {
    if (next.interactionPaused && prev.interactionPaused) {
      return true;
    }
    return false;
  },
);

export function GlobeDashboard({
  viinaMeta = null,
  initialViewConfig = null,
  onBootProgress,
  onBootReady,
}: GlobeDashboardProps) {
  const globeRef = useRef<MapGlobeMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intelStackRef = useRef<BottomIntelStackHandle>(null);
  const lastGlobeClickAt = useRef(0);
  const skipNextGlobeClickRef = useRef(false);
  const configuredGlobe = useRef(false);
  const introPlayedRef = useRef(false);
  const packageTheaterFocusPlayedRef = useRef(false);
  const packageEconFocusPlayedRef = useRef(false);
  const lastViewUpdateAt = useRef(0);
  const lastFilterCenterUpdateAt = useRef(0);
  const layerCenterRef = useRef<{ lat: number; lng: number }>({ lat: 25, lng: 105 });
  const layerAltitudeRef = useRef(2.25);
  const layerLodTierRef = useRef<GlobeLodTier>("global");
  const moveIdleTimerRef = useRef<number | null>(null);
  const renderStabilizeIdleRef = useRef<number | null>(null);
  const isCameraMovingRef = useRef(false);
  /** flyTo tween 강제 busy 창 — idle debounce가 중간에 moving을 끄지 못하게 */
  const cameraTweenUntilRef = useRef(0);
  const flyBusyTimerRef = useRef<number | null>(null);
  const [size, setSize] = useState<GlobeSize>({ width: 960, height: 720 });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AppData>(emptyData);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const deferLayerMapApplyRef = useRef(false);
  const panelDraftPatchRef = useRef<Partial<LayerPrefs>>({});
  const categorySnapshotRef = useRef<LayerCategory[] | null>(null);
  const layerPanelSessionRef = useRef(0);
  const prevShowLeftPanelRef = useRef(false);
  const [intelSheetOpen, setIntelSheetOpen] = useState(false);
  const [layerPanelReady, setLayerPanelReady] = useState(false);
  const [frozenPanelCategories, setFrozenPanelCategories] = useState<LayerCategory[] | null>(null);

  useEffect(() => {
    if (showLeftPanel && !prevShowLeftPanelRef.current) {
      layerPanelSessionRef.current += 1;
    }
    prevShowLeftPanelRef.current = showLeftPanel;
    deferLayerMapApplyRef.current = showLeftPanel;
  }, [showLeftPanel]);

  useEffect(() => {
    if (!showLeftPanel) {
      setLayerPanelReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setLayerPanelReady(true));
    return () => cancelAnimationFrame(id);
  }, [showLeftPanel]);

  const [intelTheaterFilter, setIntelTheaterFilter] = useState<IntelTheaterFilter>(() => {
    const theater = initialViewConfig?.theater;
    if (theater && theater !== "auto") return theater;
    return "all";
  });
  const [viewUi, setViewUi] = useState(() => initialViewConfig?.ui ?? { showTicker: true, defaultIntelTab: "news" as const, autoOpenIntelSheet: false, openLayerPanel: false });
  const [viewTheater, setViewTheater] = useState<ViewTheaterChoice>(
    () => initialViewConfig?.theater ?? "auto",
  );
  const [viewEconomyHub, setViewEconomyHub] = useState<EconomyHubChoice>(
    () => initialViewConfig?.economyHub ?? "auto",
  );
  const [viewPackages, setViewPackages] = useState<ViewPackageId[]>(() => {
    const saved = initialViewConfig?.packages.filter((id) => id !== "custom");
    return saved && saved.length > 0 ? saved : DEFAULT_PACKAGE_SELECTION;
  });
  const viewerMode = viewerModeFromPackages(viewPackages);
  const viewerChromePreset = getViewerChrome(viewerMode);
  const isEconomyViewer = viewerMode === "economy";
  const [showModePicker, setShowModePicker] = useState(false);
  const [modePickerLockMode, setModePickerLockMode] = useState(false);
  const [modePickerInitialMode, setModePickerInitialMode] = useState<ViewerMode | null>(null);
  const [entryGate, setEntryGate] = useState<EntryGate>(null);
  const [showViewerIntro, setShowViewerIntro] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showLocalAlertPanel, setShowLocalAlertPanel] = useState(false);
  const [showGdeltAlertPanel, setShowGdeltAlertPanel] = useState(false);
  const [showDisputeLegendPanel, setShowDisputeLegendPanel] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GlobeDisplayPoint | null>(null);
  const [hoveredNeptunThreat, setHoveredNeptunThreat] = useState<NeptunLiveThreat | null>(null);
  const [hoveredPolygon, setHoveredPolygon] = useState<PolygonLayerFeature | null>(null);
  const [hoveredPath, setHoveredPath] = useState<TransportPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appDataLoadProgress, setAppDataLoadProgress] = useState<AppDataLoadProgress | null>(
    null,
  );
  const [globeReady, setGlobeReady] = useState(false);
  const [showIntroHint, setShowIntroHint] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gdeltEvents, setGdeltEvents] = useState<ConflictEvent[]>([]);
  const [gdeltLoading, setGdeltLoading] = useState(false);
  const [gdeltError, setGdeltError] = useState<string | null>(null);
  const [gdeltFetchedAt, setGdeltFetchedAt] = useState<string | null>(null);
  const [telegramAlerts, setTelegramAlerts] = useState<TelegramAlert[]>([]);
  const [telegramLive, setTelegramLive] = useState(false);
  const [telegramNeedsAuth, setTelegramNeedsAuth] = useState(false);
  const [telegramSessionExists, setTelegramSessionExists] = useState(false);
  const [telegramEmbedMode, setTelegramEmbedMode] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState<
    "idle" | "loading" | "ok" | "error" | "stub" | "waiting"
  >("idle");
  const [tzevaAdomActive, setTzevaAdomActive] = useState<TzevaAdomAlert[]>([]);
  const [tzevaAdomHistory, setTzevaAdomHistory] = useState<TzevaAdomAlert[]>([]);
  const [tzevaAdomLive, setTzevaAdomLive] = useState(false);
  const [tzevaAdomGeoRestricted, setTzevaAdomGeoRestricted] = useState(false);
  const [tzevaAdomError, setTzevaAdomError] = useState<string | null>(null);
  const [tzevaAdomStatus, setTzevaAdomStatus] = useState<
    "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked"
  >("idle");
  /** 공습사이렌 포커스 — 사각 틀 없이 해당 지역 빗금만 */
  const [airRaidFocusPaths, setAirRaidFocusPaths] = useState<TransportPath[]>([]);
  const airRaidFocusClearRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEconomyViewer) return;
    setShowSourcesPanel(false);
    setAirRaidFocusPaths([]);
    if (airRaidFocusClearRef.current != null) {
      window.clearTimeout(airRaidFocusClearRef.current);
      airRaidFocusClearRef.current = null;
    }
  }, [isEconomyViewer]);

  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const { syncInfo, syncGeneration, forceSync } = useDataSync({
    mode: "default",
    enabled: !isClientApiStubMode(),
    cameraMovingRef: isCameraMovingRef,
  });
  const [syncBusy, setSyncBusy] = useState(false);
  const [ukraineControl, setUkraineControl] = useState<UkraineControlZone[]>([]);
  const [ukraineControlOverview, setUkraineControlOverview] = useState<UkraineControlZone[]>([]);
  const [ukraineControlDate, setUkraineControlDate] = useState<string | null>(
    () => viinaMeta?.controlDate ?? null,
  );
  const [ukraineRuCellCount, setUkraineRuCellCount] = useState(
    () => viinaMeta?.ruCellCount ?? 0,
  );
  const [ukraineSettlements, setUkraineSettlements] = useState<UkraineSettlement[]>([]);
  const [ukraineControlStatus, setUkraineControlStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >(() => (viinaMeta?.available ? "idle" : "error"));
  const ukraineSettlementsLoadedRef = useRef(false);
  const ukraineSettlementsSourceRef = useRef<UkraineSettlement[]>([]);
  const ukraineFetchStartedRef = useRef(false);
  const ukraineZoomPendingRef = useRef(false);
  const neptunZoomPendingRef = useRef(false);
  const [aisVessels, setAisVessels] = useState<AisVessel[]>([]);
  const [aisLoading, setAisLoading] = useState(false);
  const [aisError, setAisError] = useState<string | null>(null);
  const [milAircraft, setMilAircraft] = useState<MilitaryAircraft[]>([]);
  const [usCarriers, setUsCarriers] = useState<UsCarrier[]>([]);
  const [usCarriersLoading, setUsCarriersLoading] = useState(false);
  const [hoveredCarrier, setHoveredCarrier] = useState<UsCarrier | null>(null);
  const mapSectionRef = useRef<HTMLElement>(null);
  const enterTheaterFocusRef = useRef<
    (selection: NavSelection, tab?: TheaterSidebarTab) => void
  >(() => {});
  const enterEconomyRegionFocusRef = useRef<(selection: NavSelection) => void>(() => {});
  const [hoverPointer, setHoverPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverGlobeCoords, setHoverGlobeCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [milLoading, setMilLoading] = useState(false);
  const [milError, setMilError] = useState<string | null>(null);
  const [cyberEvents, setCyberEvents] = useState<ConflictEvent[]>([]);
  const [electionEvents, setElectionEvents] = useState<ConflictEvent[]>([]);
  const [firmsFires, setFirmsFires] = useState<FirmsFire[]>([]);
  const [, setFirmsLoading] = useState(false);
  const [firmsError, setFirmsError] = useState<string | null>(null);
  const firmsBboxRef = useRef("");
  const firmsFetchBusyRef = useRef(false);
  const [railroads, setRailroads] = useState<TransportPath[]>([]);
  const ultraLiteRef = useRef(false);
  const [ultraLite, setUltraLite] = useState(false);
  const {
    layerPrefs,
    draftPrefs,
    togglePref,
    toggleCategoryPrefs,
    applyLayerPrefs,
    batchPending,
    applyGeneration,
    immediateUntilRef,
  } = useLayerPrefsController(deferLayerMapApplyRef, { ultraLiteRef });

  useEffect(() => {
    const perf = loadPerfPrefs();
    ultraLiteRef.current = perf.ultraLite;
    setUltraLite(perf.ultraLite);
    if (perf.ultraLite) {
      applyLayerPrefs(applyUltraLiteToLayerPrefs(loadLayerPrefs()));
    }
  }, [applyLayerPrefs]);

  const handleUltraLiteToggle = useCallback(
    (on: boolean) => {
      ultraLiteRef.current = on;
      setUltraLite(on);
      savePerfPrefs({ ultraLite: on });
      const base = showLeftPanel ? draftPrefs : layerPrefs;
      applyLayerPrefs(on ? applyUltraLiteToLayerPrefs(base) : applyNormalCapToLayerPrefs(base));
    },
    [applyLayerPrefs, draftPrefs, layerPrefs, showLeftPanel],
  );

  const handlePanelDraftPatch = useCallback((patch: Partial<LayerPrefs>) => {
    panelDraftPatchRef.current = { ...panelDraftPatchRef.current, ...patch };
  }, []);

  const handlePanelLangDraft = useCallback((lang: LabelLanguage) => {
    panelDraftPatchRef.current = { ...panelDraftPatchRef.current, labelLanguage: lang };
  }, []);

  const {
    showWarZones,
    showDiplomaticTension,
    showCityLabels,
    showRailGlow,
    showAis,
    showShippingLanes,
    showSubmarineCables,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
    showAirports,
    showPorts,
    showLogisticsRisk,
    showMilitaryBases,
    showResources,
    showNuclearSites,
    showInternetExchanges,
    showRefugeeCamps,
    showUcdpEvents,
    showMilitaryActivity,
    showUsCarriers,
    showSpaceLaunches,
    showIntelHotspots,
    showAiDataCenters,
    showEconomicCenters,
    showSanctionsEntities,
    showArmsEmbargo,
    showConflictZones,
    showCyberIncidents,
    showElectionEvents,
    showFirmsFires,
    showUkraineControl,
    showGdeltWar,
    showGdeltDiplomatic,
    showGdeltAlliance,
    showGdeltProtests,
    showTelegramOsint,
    showTzevaAdom,
    showNeptun,
    showNeptunPreviousTrails,
    labelLanguage,
  } = layerPrefs;

  const refreshUkraineControl = useCallback(async () => {
    if (ukraineFetchStartedRef.current) return;
    ukraineFetchStartedRef.current = true;
    setUkraineControlStatus("loading");

    const applyPayload = (payload: UkraineControlData) => {
      setUkraineControl(payload.features ?? []);
      setUkraineControlOverview(payload.overviewFeatures ?? []);
      setUkraineControlDate(payload.controlDate ?? null);
      setUkraineRuCellCount(payload.ruCellCount ?? 0);
      ukraineSettlementsSourceRef.current = payload.settlements ?? [];
      setUkraineControlStatus("ok");
    };

    try {
      const cached = readUkraineControlCache();
      if (cached?.features?.length) {
        applyPayload(cached);
        return;
      }

      const payload = await prefetchUkraineControl();
      if (payload?.features?.length) {
        applyPayload(payload);
        return;
      }

      throw new Error("viina-render empty");
    } catch {
      ukraineFetchStartedRef.current = false;
      setUkraineControlStatus("error");
    }
  }, []);

  const setShowUkraineControl = (v: boolean) => {
    if (!v) {
      setUkraineFrontLegendEngaged(false);
      if (
        regionNavSelection?.id === "ukraine" ||
        regionNavSelection?.id.startsWith("ukraine-")
      ) {
      setRegionNavSelection(null);
      }
      togglePref("showUkraineControl", v);
      return;
    }
    const ukraineSel = navSelectionFromId("ukraine");
    if (ukraineSel) {
      enterTheaterFocusRef.current?.(ukraineSel);
      return;
    }
    togglePref("showUkraineControl", v);
  };
  const showAnyDisputeOverlay = anyDisputeOverlay({ showWarZones, showDiplomaticTension });

  const setShowWarZones = (v: boolean) => {
    if (v) setShowDisputeLegendPanel(true);
    else if (!showDiplomaticTension) {
      setShowDisputeLegendPanel(false);
      setShowLocalAlertPanel(false);
    }
    togglePref("showWarZones", v);
  };
  const setShowDiplomaticTension = (v: boolean) => {
    if (v) setShowDisputeLegendPanel(true);
    else if (!showWarZones) {
      setShowDisputeLegendPanel(false);
      setShowLocalAlertPanel(false);
    }
    togglePref("showDiplomaticTension", v);
  };
  const setShowCityLabels = (v: boolean) => togglePref("showCityLabels", v);
  const setShowRailGlow = (v: boolean) => togglePref("showRailGlow", v);
  const setShowAis = (v: boolean) => togglePref("showAis", v);
  const setShowShippingLanes = (v: boolean) => togglePref("showShippingLanes", v);
  const setShowSubmarineCables = (v: boolean) => togglePref("showSubmarineCables", v);
  const setShowOilPipelines = (v: boolean) => togglePref("showOilPipelines", v);
  const setShowGasPipelines = (v: boolean) => togglePref("showGasPipelines", v);
  const setShowLngTerminals = (v: boolean) => togglePref("showLngTerminals", v);
  const setShowAirports = (v: boolean) => togglePref("showAirports", v);
  const setShowPorts = (v: boolean) => togglePref("showPorts", v);
  const setShowLogisticsRisk = (v: boolean) => togglePref("showLogisticsRisk", v);
  const setShowMilitaryBases = (v: boolean) => togglePref("showMilitaryBases", v);
  const setShowResources = (v: boolean) => togglePref("showResources", v);
  const setShowNuclearSites = (v: boolean) => togglePref("showNuclearSites", v);
  const setShowInternetExchanges = (v: boolean) => togglePref("showInternetExchanges", v);
  const setShowRefugeeCamps = (v: boolean) => togglePref("showRefugeeCamps", v);
  const setShowUcdpEvents = (v: boolean) => togglePref("showUcdpEvents", v);
  const setShowMilitaryActivity = (v: boolean) => togglePref("showMilitaryActivity", v);
  const setShowUsCarriers = (v: boolean) => togglePref("showUsCarriers", v);
  const setShowSpaceLaunches = (v: boolean) => togglePref("showSpaceLaunches", v);
  const setShowIntelHotspots = (v: boolean) => togglePref("showIntelHotspots", v);
  const setShowAiDataCenters = (v: boolean) => togglePref("showAiDataCenters", v);
  const setShowEconomicCenters = (v: boolean) => togglePref("showEconomicCenters", v);
  const setShowSanctionsEntities = (v: boolean) => togglePref("showSanctionsEntities", v);
  const setShowArmsEmbargo = (v: boolean) => togglePref("showArmsEmbargo", v);
  const setShowConflictZones = (v: boolean) => togglePref("showConflictZones", v);
  const setShowCyberIncidents = (v: boolean) => togglePref("showCyberIncidents", v);
  const setShowElectionEvents = (v: boolean) => togglePref("showElectionEvents", v);
  const setShowFirmsFires = (v: boolean) => togglePref("showFirmsFires", v);
  const setShowGdeltWar = (v: boolean) => togglePref("showGdeltWar", v);
  const setShowGdeltDiplomatic = (v: boolean) => togglePref("showGdeltDiplomatic", v);
  const setShowGdeltAlliance = (v: boolean) => togglePref("showGdeltAlliance", v);
  const setShowGdeltProtests = (v: boolean) => togglePref("showGdeltProtests", v);
  const setShowTelegramOsint = (v: boolean) => togglePref("showTelegramOsint", v);
  const setShowTzevaAdom = (v: boolean) => togglePref("showTzevaAdom", v);

  const setShowNeptun = (v: boolean) => {
    if (v) {
      neptunZoomPendingRef.current = true;
      immediateUntilRef.current = Date.now() + 1500;
      setRegionNavSelection(null);
      setSelected(null);
      togglePref("showNeptun", true);
      return;
    }
    toggleCategoryPrefs({
      showNeptun: false,
      showNeptunPreviousTrails: false,
    });
  };
  const setShowNeptunPreviousTrails = (v: boolean) => {
    if (v && !showNeptun) return;
    togglePref("showNeptunPreviousTrails", v);
  };

  const showGdeltLayers =
    viewerChromePreset.fetchGdelt &&
    (showGdeltWar || showGdeltDiplomatic || showGdeltAlliance || showGdeltProtests);
  const setLabelLanguage = (v: LabelLanguage) => togglePref("labelLanguage", v);

  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [regionNavSelection, setRegionNavSelection] = useState<NavSelection | null>(null);
  const [ukraineFrontLegendEngaged, setUkraineFrontLegendEngaged] = useState(false);
  const [econNavSelection, setEconNavSelection] = useState<NavSelection | null>(null);
  const [theaterSidebarTab, setTheaterSidebarTab] = useState<TheaterSidebarTab>("news");
  const [viewState, setViewState] = useState<ViewState>({
    lat: 25,
    lng: 105,
    altitude: 2.25,
  });
  const [filterCenter, setFilterCenter] = useState<{ lat: number; lng: number }>({
    lat: 25,
    lng: 105,
  });
  const [layerAltitude, setLayerAltitude] = useState(LOD_TIER_ANCHOR_ALTITUDE.global);
  const [isCameraMoving, setIsCameraMoving] = useState(false);

  const { layerViewState, mapZoom } = useCameraViewport(filterCenter, layerAltitude);

  useEffect(() => {
    return () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
        moveIdleTimerRef.current = null;
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
        renderStabilizeIdleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const mapEl = containerRef.current;
    if (!mapEl) return;

    let lastOpenAt = 0;

    const openNewsFromMiddleClick = (event: MouseEvent) => {
      if (event.button !== 1) return;
      if (showLeftPanel || selected || regionNavSelection) return;
      const now = Date.now();
      if (now - lastOpenAt < 250) return;
      lastOpenAt = now;
      event.preventDefault();
      event.stopPropagation();
      setIntelTheaterFilter(
        newsTheaterFromCoords(layerCenterRef.current.lat, layerCenterRef.current.lng),
      );
      setIntelSheetOpen(true);
    };

    mapEl.addEventListener("mousedown", openNewsFromMiddleClick, true);
    return () => {
      mapEl.removeEventListener("mousedown", openNewsFromMiddleClick, true);
    };
  }, [showLeftPanel, selected, regionNavSelection]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        let firstPaint = false;
        const { data: raw } = await fetchAppDataStream({
          onProgress: (progress) => {
            if (!mounted) return;
            setAppDataLoadProgress(progress);
          },
          onPartial: (patch) => {
            if (!mounted) return;
            setData((prev) => ({
              ...prev,
              ...patch,
              countries: patch.countries ?? prev.countries ?? [],
              disputes: patch.disputes ?? prev.disputes ?? [],
              places: [],
              events: [],
              roads: patch.roads ?? prev.roads ?? [],
              railroads: patch.railroads ?? prev.railroads ?? [],
            }));
            if (!firstPaint && patch.countries && patch.countries.length > 0) {
              firstPaint = true;
              setIsLoading(false);
              setLoadError(null);
            }
          },
        });

        const nextData: AppData = {
          ...raw,
          countries: raw.countries ?? [],
          disputes: raw.disputes ?? [],
          roads: raw.roads ?? [],
          railroads: raw.railroads ?? [],
          events: [],
          places: [],
        };

        if (!mounted) return;
        setData(nextData);
        setLoadError(null);
        setIsLoading(false);
        setAppDataLoadProgress(null);

        const cancelPlaces = runWhenIdle(() => {
          if (!mounted) return;
          void fetchAppDataPlaces()
            .then((placesRaw) => {
              if (!mounted) return;
              setData((prev) => ({
                ...prev,
                places: expandPlaces(placesRaw),
              }));
            })
            .catch(() => {
              /* search degraded — globe still usable */
            });
        });
        return cancelPlaces;
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : "데이터 로드 실패");
        setIsLoading(false);
        setAppDataLoadProgress(null);
      }
    }

    let cancelPlaces: (() => void) | undefined;
    void loadData().then((cancel) => {
      cancelPlaces = cancel;
    });
    return () => {
      mounted = false;
      cancelPlaces?.();
    };
  }, [syncGeneration]);

  const bootReadyRef = useRef(false);
  useEffect(() => {
    const progress = computeDashboardBootProgress({
      globeReady,
      isLoading,
      appDataLoadProgress,
    });
    onBootProgress?.(progress);

    if (
      !bootReadyRef.current &&
      progress >= 100 &&
      globeReady &&
      !isLoading
    ) {
      bootReadyRef.current = true;
      onBootReady?.();
    }
  }, [
    appDataLoadProgress,
    globeReady,
    isLoading,
    onBootProgress,
    onBootReady,
  ]);

  useEffect(() => {
    const syncStamp =
      (typeof syncInfo?.status?.lastSuccessAt === "string" && syncInfo.status.lastSuccessAt) ||
      null;
    if (!isLoading && !loadError) {
      setLiveStatus(syncInfo?.running ? "loading" : "ok");
      setLiveUpdatedAt(syncStamp || data.generatedAt || null);
    } else if (loadError) {
      setLiveStatus("error");
    }
  }, [data.generatedAt, isLoading, loadError, syncInfo]);

  useEffect(() => {
    if (!showUkraineControl || !viinaMeta?.available) return;
    if (ukraineControl.length > 0 || ukraineControlStatus === "loading") return;
      void refreshUkraineControl();
  }, [
    refreshUkraineControl,
    showUkraineControl,
    ukraineControl.length,
    ukraineControlStatus,
    viinaMeta?.available,
  ]);

  useEffect(() => {
    if (!showNeptun && !showNeptunPreviousTrails) return;
    void prefetchNeptun();
  }, [showNeptun, showNeptunPreviousTrails]);

  useEffect(() => {
    if (!showUkraineControl || !viinaMeta?.available) return;
    ukraineZoomPendingRef.current = true;
    if (showNeptun) neptunZoomPendingRef.current = true;
    immediateUntilRef.current = Date.now() + 1800;
  }, [showNeptun, showUkraineControl, viinaMeta?.available, immediateUntilRef]);

  useEffect(() => {
    if (!showUkraineControl) {
      setUkraineSettlements([]);
      ukraineSettlementsLoadedRef.current = false;
      return;
    }
    const tier = getGlobeLod(layerAltitude).tier;
    if (
      (tier === "near" || tier === "village") &&
      ukraineSettlementsSourceRef.current.length > 0
    ) {
      setUkraineSettlements(ukraineSettlementsSourceRef.current);
      ukraineSettlementsLoadedRef.current = true;
    } else {
      setUkraineSettlements([]);
      ukraineSettlementsLoadedRef.current = false;
    }
  }, [layerAltitude, showUkraineControl]);

  const viinaSelectionAltitude = useMemo(() => {
    const tier = getGlobeLod(layerAltitude).tier;
    return LOD_TIER_ANCHOR_ALTITUDE[tier];
  }, [layerAltitude]);

  const viinaDisplay = useMemo(
    () =>
      selectViinaPolygons(
        ukraineControl,
        ukraineControlOverview,
        layerViewState,
        viinaSelectionAltitude,
      ),
    [ukraineControl, ukraineControlOverview, layerViewState, viinaSelectionAltitude],
  );

  const viinaFrontEvents = useMemo(() => {
    if (!showUkraineControl) return [];
    return buildViinaFrontEvents([...viinaDisplay.contestedZones, ...viinaDisplay.ruZones]).slice(
      0,
      200,
    );
  }, [showUkraineControl, viinaDisplay.contestedZones, viinaDisplay.ruZones]);

  const globeLod = useMemo(
    () => getGlobeLod(layerAltitude),
    [layerAltitude],
  );

  /** 공습경보 배너용 — 카메라·레이어와 무관하게 NEPTUN 상시 수신 (글로브 마커는 별도 게이트) */
  const neptunFetchEnabled = true;
  const {
    threats: neptunThreats,
    archivedThreats: neptunArchivedThreats,
    alerts: neptunAlerts,
    live: neptunLive,
    status: neptunStatus,
    error: neptunError,
    serverTime: neptunServerTime,
    alertCount: neptunAlertCount,
    impactFlashes: neptunImpactFlashes,
  } = useNeptunStream(neptunFetchEnabled, { pausePublish: isCameraMoving });

  const neptunInTheater = useMemo(
    () =>
      showUkraineControl || isNeptunTheaterInView(layerViewState, globeLod.tier),
    [globeLod.tier, layerViewState, showUkraineControl],
  );
  const neptunRenderMode = useMemo(
    () => getNeptunRenderMode(globeLod.tier, neptunInTheater, showNeptun, showUkraineControl),
    [globeLod.tier, neptunInTheater, showNeptun, showUkraineControl],
  );

  const visibleNeptunThreats = useMemo(() => {
    if (!showNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    const max = NEPTUN_THREAT_MAX_BY_TIER[globeLod.tier];
    if (
      showUkraineControl &&
      (globeLod.tier === "global" || globeLod.tier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunThreats, max);
    }
    return filterNeptunThreatsForViewport(neptunThreats, layerViewState, globeLod.tier, max);
  }, [
    globeLod.tier,
    layerViewState,
    neptunRenderMode,
    neptunThreats,
    showNeptun,
    showUkraineControl,
  ]);

  const visibleNeptunArchived = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const max = NEPTUN_ARCHIVED_MAX_BY_TIER[globeLod.tier];
    if (
      showUkraineControl &&
      (globeLod.tier === "global" || globeLod.tier === "continent")
    ) {
      return filterNeptunThreatsInOpsBox(neptunArchivedThreats, max);
    }
    return filterNeptunThreatsForViewport(
      neptunArchivedThreats,
      layerViewState,
      globeLod.tier,
      max,
    );
  }, [
    globeLod.tier,
    layerViewState,
    neptunArchivedThreats,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    showUkraineControl,
  ]);

  const neptunTrailBudget = useMemo(
    () => neptunTrailPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunProjectionBudget = useMemo(
    () => neptunProjectionPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunArchivedBudget = useMemo(
    () => neptunArchivedPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunGroundTrailBudget = useMemo(
    () => neptunMaxGroundTrailVertices(neptunRenderMode),
    [neptunRenderMode],
  );

  /** 전선 레이어 ON 또는 우크라이나 극동부를 확대해 볼 때 하단 UI 전환 */
  const isUkraineTheaterFocus = useMemo(() => {
    if (showUkraineControl) return true;
    if (!isInUkraineTheater(filterCenter.lat, filterCenter.lng)) return false;
    return layerAltitude <= 1.1;
  }, [filterCenter.lat, filterCenter.lng, layerAltitude, showUkraineControl]);

  /** VIINA 근접 줌 — 폴리곤 raycast·라벨 부하 완화 구간 */
  const isViinaCloseZoom =
    globeLod.tier === "near" || globeLod.tier === "village";

  /** VIINA 근접 줌 — 폴리곤 fill 레이캐스트 제외 (수천 정점 hover 피킹 방지) */
  const mapInteractiveLayerIds = useMemo(
    () =>
      isViinaCloseZoom && showUkraineControl
        ? (["map-points", "map-paths", "map-rings"] as const)
        : (["map-points", "map-paths", "map-polygons-fill", "map-rings"] as const),
    [isViinaCloseZoom, showUkraineControl],
  );

  const transportLod = useMemo(
    () => getTransportLod(layerAltitude),
    [layerAltitude],
  );

  const globeTextures = useMemo(() => getGlobeTextures(), []);
  const isVectorBaseMap = globeTextures.vectorBase;

  const railPaths = useMemo<TransportPath[]>(() => {
    if (!showRailGlow) return [];
    const lod = transportLod;
    return filterTransportPaths(
      railroads,
      layerViewState,
      lod.radiusDeg,
      lod.railMaxScalerank,
      lod.maxRailroads,
      lod.arterialMaxRank,
    );
  }, [railroads, showRailGlow, transportLod, layerViewState]);

  const pathRadiusDeg =
    globeLod.radiusDeg > 0 ? globeLod.radiusDeg : globeLod.tier === "global" ? 40 : 28;

  const staticLayers = useGlobeStaticLayers({
    viewState: layerViewState,
    globeTier: globeLod.tier,
    radiusDeg: pathRadiusDeg,
    showDisputeBoundaries: showAnyDisputeOverlay && globeReady,
    showShippingLanes,
    showSubmarineCables,
    showOilPipelines,
    showGasPipelines,
    showLngTerminals,
    showAirports,
    showPorts,
    showLogisticsRisk,
    showMilitaryBases,
    showResources,
    showCableLandings: showSubmarineCables,
    showNuclearSites,
    showInternetExchanges,
    showRefugeeCamps,
    showUcdpEvents,
    showAiDataCenters,
    showEconomicCenters,
    showSanctionsEntities,
    showSpaceLaunches,
    showIntelHotspots,
    showConflictZones: showConflictZones && globeReady,
    showArmsEmbargo,
    reloadToken: syncGeneration,
  });

  const {
    visibleDisputeBoundaries,
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleStaticPoints,
    visibleMilitaryBaseAreas,
    visibleConflictZones,
    visibleArmsEmbargoZones,
    disputeOverviews,
    counts: staticCounts,
  } = staticLayers;

  const countryPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const withGeometry = (data.countries ?? []).filter((country) => Boolean(country.geometry));
    if (isVectorBaseMap) {
      return withGeometry.map((country) => ({ ...country, polygonLayer: "country" as const }));
    }
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const maxCount = COUNTRY_POLYGON_MAX_BY_TIER[globeLod.tier];
    const visible = filterByViewportCenter(
      withGeometry,
      layerViewState,
      radiusDeg,
      maxCount,
      (a, b) => (b.population ?? 0) - (a.population ?? 0),
    );
    return visible.map((country) => ({ ...country, polygonLayer: "country" as const }));
  }, [data.countries, globeLod.tier, isVectorBaseMap, layerViewState]);

  const ukraineHatchLod = lodTierToHatchLod(globeLod.tier);
  const [ukraineHatchCachePaths, setUkraineHatchCachePaths] = useState<TransportPath[]>(
    () => readUkraineHatchPathsCache(ukraineHatchLod)?.paths ?? [],
  );

  useEffect(() => {
    if (!showUkraineControl || viinaDisplay.lod.mode === "hidden") {
      return;
    }
    let cancelled = false;
    const cached = readUkraineHatchPathsCache(ukraineHatchLod);
    if (cached?.paths?.length) {
      setUkraineHatchCachePaths(cached.paths);
    }
    void prefetchUkraineHatchPaths(ukraineHatchLod).then((payload) => {
      if (cancelled || !payload?.paths?.length) return;
      setUkraineHatchCachePaths(payload.paths);
    });
    return () => {
      cancelled = true;
    };
  }, [showUkraineControl, ukraineHatchLod, viinaDisplay.lod.mode, ukraineControlDate]);

  const disputeHatchLod: DisputeHatchLod =
    globeLod.tier === "global" || globeLod.tier === "continent" ? "overview" : "detail";
  const [disputeHatchCachePaths, setDisputeHatchCachePaths] = useState<TransportPath[]>(
    () => readDisputeHatchPathsCache(disputeHatchLod)?.paths ?? [],
  );

  useEffect(() => {
    if (!showAnyDisputeOverlay) return;
    let cancelled = false;
    const cached = readDisputeHatchPathsCache(disputeHatchLod);
    if (cached?.paths?.length) setDisputeHatchCachePaths(cached.paths);
    void prefetchDisputeHatchPaths(disputeHatchLod).then((payload) => {
      if (cancelled || !payload?.paths?.length) return;
      setDisputeHatchCachePaths(payload.paths);
    });
    return () => {
      cancelled = true;
    };
  }, [disputeHatchLod, showAnyDisputeOverlay]);

  const rawUkraineFrontRender = useMemo(() => {
    if (!showUkraineControl || viinaDisplay.lod.mode === "hidden") {
      return { paths: [] as TransportPath[] };
    }

    const maxPaths =
      globeLod.tier === "global" || globeLod.tier === "continent"
        ? 1800
        : globeLod.tier === "regional"
          ? 3200
          : 5000;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 4;

    // 서버/D1 사전계산 path 우선 — 클라에서는 뷰포트 필터만
    if (ukraineHatchCachePaths.length > 0) {
      return {
        paths: filterHatchPathsByView(
          ukraineHatchCachePaths,
          layerViewState,
          radiusDeg,
          maxPaths,
        ),
      };
    }

    // 캐시 없을 때만 기존 클라 계산 폴백
    const maxZones =
      globeLod.tier === "global" || globeLod.tier === "continent"
        ? 900
        : globeLod.tier === "regional"
          ? 1400
          : 2200;
    return buildUkraineFrontRender(
      viinaDisplay.ruZones,
      viinaDisplay.uaZones,
      viinaDisplay.contestedZones,
      layerViewState,
      { maxZones, lodTier: globeLod.tier },
    );
  }, [
    globeLod.tier,
    layerViewState,
    showUkraineControl,
    ukraineHatchCachePaths,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
    viinaDisplay.uaZones,
  ]);

  const overlayPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const layers: PolygonLayerFeature[] = [];

    // 우크라이나 점령·주장: 면 채우기 없음 — 얇은 테두리+빗금(paths)만

    if (showMilitaryBases && visibleMilitaryBaseAreas.length > 0) {
      layers.push(
        ...visibleMilitaryBaseAreas.map((area) => ({
          ...area,
          polygonLayer: "military-base" as const,
        })),
      );
    }

    return layers.length > 0 ? layers : EMPTY_OVERLAY_POLYGONS;
  }, [showMilitaryBases, visibleMilitaryBaseAreas]);

  const disputeZonePaths = useMemo<TransportPath[]>(() => {
    if (!showAnyDisputeOverlay && !showConflictZones) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 6;
    const maxZones = DISPUTE_MAX_BY_TIER[globeLod.tier];
    const maxPaths = Math.max(400, maxZones * 24);
    const preferDetailSegments =
      globeLod.tier === "regional" || globeLod.tier === "near" || globeLod.tier === "village";
    const paths: TransportPath[] = [];

    if (showAnyDisputeOverlay) {
      if (disputeHatchCachePaths.length > 0) {
        const filtered = filterHatchPathsByView(
          disputeHatchCachePaths,
          layerViewState,
          radiusDeg,
          maxPaths,
        ).filter((path) => {
          // 레이어 체크: war/diplomatic — path id에서 dispute 매칭
          const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
          if (!match) return true;
          const dispute = (data.disputes ?? []).find((d) => d.id === match[1]);
          if (!dispute) return true;
          return disputeMatchesWarDiplomaticLayers(dispute, showWarZones, showDiplomaticTension);
        });
        paths.push(...filtered);
      } else {
        const ranked = rankDisputesForDisplay(data.disputes ?? [])
          .filter((dispute) =>
            disputeMatchesWarDiplomaticLayers(dispute, showWarZones, showDiplomaticTension),
          )
          .filter((dispute) =>
            isCenterInView(resolveDisputeCenter(dispute), layerViewState, radiusDeg),
          )
          .slice(0, maxZones);
        for (const dispute of ranked) {
          paths.push(
            ...disputeToOutlineAndHatchPaths(dispute, {
              preferDetailSegments,
            }),
          );
        }
      }
    }

    if (showConflictZones) {
      for (const zone of visibleConflictZones.slice(0, maxZones)) {
        if (zone.hatchPaths?.length) {
          paths.push(...zone.hatchPaths);
        } else {
          paths.push(...conflictZoneToOutlineAndHatchPaths(zone));
        }
      }
    }

    return paths;
  }, [
    data.disputes,
    disputeHatchCachePaths,
    globeLod.tier,
    layerViewState,
    showAnyDisputeOverlay,
    showConflictZones,
    showDiplomaticTension,
    showWarZones,
    visibleConflictZones,
  ]);

  const disputeByZonePath = useMemo(() => {
    const map = new Map<string, DisputeArea>();
    for (const dispute of data.disputes ?? []) {
      map.set(dispute.id, dispute);
    }
    return map;
  }, [data.disputes]);

  const conflictZoneByPath = useMemo(() => {
    const map = new Map<string, ConflictZoneFeature>();
    for (const zone of visibleConflictZones) {
      map.set(zone.id, zone);
    }
    return map;
  }, [visibleConflictZones]);

  const disputeFromPath = useCallback((path: TransportPath): DisputeArea | undefined => {
    if (path.kind === "conflict-hatch") return undefined;
    const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
    if (!match) return undefined;
    return disputeByZonePath.get(match[1]);
  }, [disputeByZonePath]);

  function conflictZoneFromPath(path: TransportPath): ConflictZoneFeature | undefined {
    const hatchMatch = path.id.match(/^conflict-hatch-(?:combat|gray|high|medium|low)-(.+)-\d+$/);
    if (hatchMatch) return conflictZoneByPath.get(hatchMatch[1]);
    if (path.kind !== "dispute-zone") return undefined;
    const frameMatch = path.id.match(/^dispute-zone-(.+)-\d+$/);
    if (!frameMatch) return undefined;
    return conflictZoneByPath.get(frameMatch[1]);
  }

  const disputeZoneOutlineCount = useMemo(
    () => disputeZonePaths.filter((path) => path.kind === "dispute-zone").length,
    [disputeZonePaths],
  );

  const armsEmbargoFramePaths = useMemo<TransportPath[]>(() => {
    if (!showArmsEmbargo) return [];
    const paths: TransportPath[] = [];
    for (const embargo of visibleArmsEmbargoZones) {
      // 실전투·폭격(빨강) 국가와 겹치면 보라 금수 테두리는 표시하지 않음
      // (이란이 보라로 보이는 원인: arms-embargo 레이어)
      const label = `${embargo.id} ${embargo.name} ${embargo.isoA3 || ""}`;
      if (/iran|\bIRN\b|emb-ir\b/i.test(label)) continue;

      const country = embargo.isoA3
        ? data.countries.find((item) => item.isoA3 === embargo.isoA3)
        : undefined;
      const geometry = embargo.geometry ?? country?.geometry ?? null;
      if (!geometry) continue;
      paths.push(...geometryToBorderPaths(embargo.id, embargo.name, geometry));
    }
    return paths;
  }, [data.countries, showArmsEmbargo, visibleArmsEmbargoZones]);

  const conflictClusterPoints = useMemo<ConflictClusterPoint[]>(
    () =>
      showConflictZones
        ? visibleConflictZones.map((zone) => ({
            ...zone,
            lat: zone.center.lat,
            lng: zone.center.lng,
            markerId: `conflict-cluster-${zone.id}`,
            displayKind: "conflict-cluster" as const,
          }))
        : [],
    [showConflictZones, visibleConflictZones],
  );

  // 카메라 이동 중에는 오버레이(점령지 등)만 동결해 전체 색 깜빡임 완화
  const [stableOverlayPolygons, setStableOverlayPolygons] = useState(overlayPolygonData);
  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current || showUkraineControl;
    if (isCameraMoving && !bypass) return;
    setStableOverlayPolygons((prev) =>
      overlayPolygonsEqual(prev, overlayPolygonData) ? prev : overlayPolygonData,
    );
  }, [applyGeneration, immediateUntilRef, isCameraMoving, overlayPolygonData, showUkraineControl]);

  const polygonData = useMemo<PolygonLayerFeature[]>(
    () => [...countryPolygonData, ...stableOverlayPolygons],
    [countryPolygonData, stableOverlayPolygons],
  );

  const ukraineSituationPaths = useMemo<TransportPath[]>(() => {
    if (!showUkraineControl) return [];
    // UA 진격 화살 제외 — RU 진격 방향만 표시. 점령/주장은 빗금·테두리
    return UKRAINE_SITUATION_PATHS.filter((path) => path.kind !== "ua-advance").map(
      (path) => ukraineAxisToTransportPath(path),
    );
  }, [showUkraineControl]);

  const rawUkraineFrontPaths = rawUkraineFrontRender.paths;

  const [stableUkraineFrontPaths, setStableUkraineFrontPaths] =
    useState<TransportPath[]>(rawUkraineFrontPaths);
  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current || showUkraineControl;
    if (isCameraMoving && !bypass) return;
    setStableUkraineFrontPaths((prev) =>
      pathsEqual(prev, rawUkraineFrontPaths) ? prev : rawUkraineFrontPaths,
    );
  }, [immediateUntilRef, isCameraMoving, rawUkraineFrontPaths, showUkraineControl]);

  const ukraineFrontPaths = stableUkraineFrontPaths;

  const ukraineBoundaryPaths = useMemo(
    () => ukraineFrontPaths,
    [ukraineFrontPaths],
  );

  const polygonDataWithUkraine = useMemo<PolygonLayerFeature[]>(
    () => polygonData,
    [polygonData],
  );

  const rawGlobePaths = useMemo<TransportPath[]>(
    () => [
      ...visibleDisputeBoundaries,
      ...disputeZonePaths,
      ...visibleShipping,
      ...visibleCables,
      ...visibleOilPipelines,
      ...visibleGasPipelines,
      ...railPaths,
      ...armsEmbargoFramePaths,
      ...ukraineBoundaryPaths,
      ...ukraineSituationPaths,
    ],
    [
      armsEmbargoFramePaths,
      disputeZonePaths,
      railPaths,
      ukraineBoundaryPaths,
      ukraineSituationPaths,
      visibleCables,
      visibleDisputeBoundaries,
      visibleGasPipelines,
      visibleOilPipelines,
      visibleShipping,
    ],
  );

  const scoredEvents = useMemo(() => scoreEvents(gdeltEvents), [gdeltEvents]);
  const scoredCyberEvents = useMemo(() => scoreEvents(cyberEvents), [cyberEvents]);
  const scoredElectionEvents = useMemo(() => scoreEvents(electionEvents), [electionEvents]);

  const localDisputeAlerts = useMemo(
    () => pickDisputeAlerts(data.disputes ?? [], { limit: 12 }),
    [data.disputes],
  );

  const regionFilteredEvents = useMemo(
    () => filterEventsByNavSelection(scoredEvents, regionNavSelection),
    [scoredEvents, regionNavSelection],
  );

  const theaterFocusConfig = useMemo(
    () => (regionNavSelection ? theaterFocusFromNav(regionNavSelection) : null),
    [regionNavSelection],
  );

  const gdeltMenuCoreAlerts = useMemo(
    () => pickMenuCoreAlerts(scoredEvents, { limit: 12 }),
    [scoredEvents],
  );

  const bottomAlertPanel = useMemo(
    () =>
      resolveBottomAlertPanel({
        showGdeltLayers,
        showDisputes: showAnyDisputeOverlay,
        gdeltError,
        gdeltLoading,
        gdeltAlertCount: gdeltMenuCoreAlerts.length,
        loadError,
        isLoading,
        localAlertCount: localDisputeAlerts.length,
        wantLocalPanel: showLocalAlertPanel,
        wantGdeltPanel: showGdeltAlertPanel,
      }),
    [
      showGdeltLayers,
      showAnyDisputeOverlay,
      gdeltError,
      gdeltLoading,
      gdeltMenuCoreAlerts.length,
      loadError,
      isLoading,
      localDisputeAlerts.length,
      showLocalAlertPanel,
      showGdeltAlertPanel,
    ],
  );

  useEffect(() => {
    if (shouldCloseLocalForGdelt(showGdeltLayers)) {
      setShowLocalAlertPanel(false);
      setShowGdeltAlertPanel(showGdeltLayers);
    }
  }, [showGdeltLayers]);

  useEffect(() => {
    const { local, gdelt } = shouldClosePanelOnDataError({
      loadError,
      gdeltError,
      showGdeltLayers,
    });
    if (local) setShowLocalAlertPanel(false);
    if (gdelt) setShowGdeltAlertPanel(false);
  }, [loadError, gdeltError, showGdeltLayers]);

  useEffect(() => {
    if (!showAnyDisputeOverlay || showGdeltLayers || loadError || isLoading) return;
    if (localDisputeAlerts.length > 0) setShowLocalAlertPanel(true);
  }, [showAnyDisputeOverlay, showGdeltLayers, loadError, isLoading, localDisputeAlerts.length]);

  const gdeltTierPins = useMemo(() => {
    const pins = pickGdeltTierPins(scoredEvents, {
      showAlliance: showGdeltAlliance,
      showProtest: showGdeltProtests,
      view: layerViewState,
    });
    if (!ultraLite) return pins;
    const max = Math.max(4, Math.ceil(pins.length * ultraLiteGdeltPinScale()));
    return pins.slice(0, Math.min(50, max));
  }, [layerViewState, scoredEvents, showGdeltAlliance, showGdeltProtests, ultraLite]);

  const globePoints = useMemo<GlobePoint[]>(() => {
    const core = gdeltTierPins.map((event) => ({
      ...event,
      markerId: `marker-${event.id}`,
      displayKind: "event" as const,
    }));

    const themed: GlobePoint[] = [];
    if (showCyberIncidents) {
      for (const event of scoredCyberEvents) {
        themed.push({
          ...event,
          markerId: `cyber-${event.id}`,
          displayKind: "event" as const,
        });
      }
    }
    if (showElectionEvents) {
      for (const event of scoredElectionEvents) {
        themed.push({
          ...event,
          markerId: `election-${event.id}`,
          displayKind: "event" as const,
        });
      }
    }

    return [...core, ...themed];
  }, [
    gdeltTierPins,
    scoredCyberEvents,
    scoredElectionEvents,
    showCyberIncidents,
    showElectionEvents,
  ]);

  const staticGlobePoints = useMemo<StaticGlobePoint[]>(
    () =>
      visibleStaticPoints.map((point) => ({
        ...point,
        markerId: `static-${point.id}`,
        displayKind: "static" as const,
      })),
    [visibleStaticPoints],
  );

  /** 공항/항구/미군기지 HTML 마커 */
  const airportPortHtmlMarkers = useMemo(
    () => staticGlobePoints.filter((point) => isEmojiStaticKind(point.kind)),
    [staticGlobePoints],
  );

  const visibleUsCarriers = useMemo(
    () => filterVisibleCarriers(usCarriers, showUsCarriers),
    [showUsCarriers, usCarriers],
  );

  const deployedCarrierCount = useMemo(
    () => usCarriers.filter(isOperationalCarrier).length,
    [usCarriers],
  );

  const usCarrierLabelOffsets = useMemo(
    () => carrierLabelOffsets(visibleUsCarriers),
    [visibleUsCarriers],
  );

  const usCarrierHtmlMarkers = useMemo<UsCarrierHtmlMarker[]>(
    () =>
      visibleUsCarriers.map((carrier) => ({
        ...carrier,
        markerId: `carrier-html-${carrier.id}`,
        displayKind: "us-carrier-html" as const,
      })),
    [visibleUsCarriers],
  );

  const milDisplayPoints = useMemo<MilGlobePoint[]>(
    () =>
      showMilitaryActivity
        ? milAircraft.map((aircraft) => ({
            ...aircraft,
            markerId: `mil-${aircraft.hex || aircraft.id}`,
            displayKind: "mil" as const,
          }))
        : [],
    [milAircraft, showMilitaryActivity],
  );

  const visibleFirmsFires = useMemo(() => {
    if (!showFirmsFires) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const maxCount = FIRMS_FIRE_MAX_BY_TIER[globeLod.tier];
    return firmsFires
      .filter((fire) => isCenterInView(fire, layerViewState, radiusDeg))
      .slice()
      .sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0))
      .slice(0, maxCount);
  }, [firmsFires, globeLod.tier, layerViewState, showFirmsFires]);

  const firmsCombatHotspots = useMemo(() => {
    const base = buildFirmsCombatHotspots({
      disputes: data.disputes,
      includeWarZones: showWarZones,
      conflictZones: visibleConflictZones,
      includeConflictZones: showConflictZones,
    });
    // 전쟁뉴스 근처 화재경보 — 전쟁구역 빗금 없이도 GDELT war 좌표로 교차
    if (showGdeltWar || showFirmsFires) {
      const warEvents = scoredEvents.filter((event) => event.eventTier === "war");
      return [...base, ...buildGdeltWarNewsHotspots(warEvents)];
    }
    return base;
  }, [
    data.disputes,
    scoredEvents,
    showConflictZones,
    showFirmsFires,
    showGdeltWar,
    showWarZones,
    visibleConflictZones,
  ]);

  const firmsCombatFireIds = useMemo(() => {
    if (!showFirmsFires) return [];
    return visibleFirmsFires
      .filter(
        (fire) =>
          classifyFirmsFireForSound(fire, {
            ukraineFrontActive: showUkraineControl,
            combatHotspots: firmsCombatHotspots,
          }) === "combat",
      )
      .map((fire) => fire.id);
  }, [firmsCombatHotspots, showFirmsFires, showUkraineControl, visibleFirmsFires]);

  const firmsBombRingPoints = useMemo<PulseRingPoint[]>(() => {
    if (!showFirmsFires) return [];
    const combatIdSet = new Set(firmsCombatFireIds);
    return visibleFirmsFires
      .filter((fire) => combatIdSet.has(fire.id))
      .slice(0, 36)
      .map((fire) => ({
        pulseKind: "firms-bomb" as const,
        id: fire.id,
        lat: fire.lat,
        lng: fire.lng,
        frp: fire.frp ?? null,
        markerId: `firms-bomb-ring-${fire.id}`,
      }));
  }, [firmsCombatFireIds, showFirmsFires, visibleFirmsFires]);

  const firmsDisplayPoints = useMemo<FirmsFireGlobePoint[]>(
    () =>
      visibleFirmsFires.map((fire) => ({
        ...fire,
        markerId: `firms-${fire.id}`,
        displayKind: "firms-fire" as const,
      })),
    [visibleFirmsFires],
  );

  const tzevaAdomDisplayPoints = useMemo<TzevaAdomGlobePoint[]>(() => {
    if (!showTzevaAdom) return [];
    const source =
      tzevaAdomActive.length > 0
        ? tzevaAdomActive
        : tzevaAdomHistory.filter((alert) => alert.active).slice(0, 24);
    return source.map((alert) => ({
      ...alert,
      markerId: `tzeva-${alert.id}`,
      displayKind: "tzeva-adom" as const,
    }));
  }, [showTzevaAdom, tzevaAdomActive, tzevaAdomHistory]);

  const neptunHtmlMarkers = useMemo<NeptunHtmlMarker[]>(() => {
    if (!showNeptun || !neptunShowsMarkers(neptunRenderMode)) return [];
    return visibleNeptunThreats.map((threat) => ({
      ...threat,
      lat: threat.predictedLat,
      lng: threat.predictedLon,
      markerId: `neptun-html-${threat.id}`,
      displayKind: "neptun-html" as const,
    }));
  }, [neptunRenderMode, showNeptun, visibleNeptunThreats]);

  const neptunImpactHtmlMarkers = useMemo<NeptunImpactHtmlMarker[]>(
    () =>
      showNeptun
        ? neptunImpactFlashes.map((flash) => ({
            ...flash,
            lat: flash.lat,
            lng: flash.lng,
            markerId: flash.id,
            displayKind: "neptun-impact" as const,
          }))
        : [],
    [neptunImpactFlashes, showNeptun],
  );

  const neptunImpactInView = useMemo(() => {
    if (!showNeptun || neptunImpactFlashes.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    return neptunImpactFlashes.some((flash) =>
      isCenterInView(flash, layerViewState, radiusDeg),
    );
  }, [globeLod.tier, layerViewState, neptunImpactFlashes, showNeptun]);

  const firmsCombatInView = firmsCombatFireIds.length > 0;

  /** 우크라·중동·대만·한반도 등 교전 전장 위 regional 이하 → 전장 사운드 */
  const soundFrontlineAmbient = useMemo(() => {
    if (isEconomyViewer) return false;
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return false;
    if (showUkraineControl) return true;
    return resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng) != null;
  }, [filterCenter.lat, filterCenter.lng, globeLod.tier, isEconomyViewer, showUkraineControl]);

  /** 전쟁/고긴장 분쟁 구역이 뷰에 있으면 긴장 rumble (전선보다 낮은 우선순위) */
  const soundTensionAmbient = useMemo(() => {
    if (isEconomyViewer || soundFrontlineAmbient || !showAnyDisputeOverlay) return false;
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 2;
    return (data.disputes ?? []).some((dispute) => {
      if (!disputeMatchesWarDiplomaticLayers(dispute, showWarZones, showDiplomaticTension)) {
        return false;
      }
      if (!(isCombatHazard(dispute) || dispute.tension === "high")) return false;
      return isCenterInView(resolveDisputeCenter(dispute), layerViewState, radiusDeg);
    });
  }, [
    data.disputes,
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showAnyDisputeOverlay,
    showDiplomaticTension,
    showWarZones,
    soundFrontlineAmbient,
  ]);

  /** 미 항모가 뷰에 있으면 갑판 앰비언스 */
  const soundCarrierAmbient = useMemo(() => {
    if (isEconomyViewer || soundFrontlineAmbient || soundTensionAmbient || !showUsCarriers) {
      return false;
    }
    if (visibleUsCarriers.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 4;
    return visibleUsCarriers.some((carrier) =>
      isCenterInView({ lat: carrier.lat, lng: carrier.lng }, layerViewState, radiusDeg),
    );
  }, [
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showUsCarriers,
    soundFrontlineAmbient,
    soundTensionAmbient,
    visibleUsCarriers,
  ]);

  const soundConflictAmbient = useMemo((): "frontline" | "tension" | "carrier" | null => {
    if (soundFrontlineAmbient) return "frontline";
    if (soundTensionAmbient) return "tension";
    if (soundCarrierAmbient) return "carrier";
    return null;
  }, [soundCarrierAmbient, soundFrontlineAmbient, soundTensionAmbient]);

  const soundEconomyAmbient = useMemo((): "port" | "construction" | "datacenter" | "pipeline" | null => {
    if (!isEconomyViewer) return null;
    if (showOilPipelines || showGasPipelines) return "pipeline";
    if (showAiDataCenters || showInternetExchanges) return "datacenter";
    if (showPorts || showShippingLanes || showLngTerminals) return "port";
    if (showEconomicCenters) return "construction";
    return null;
  }, [
    isEconomyViewer,
    showAiDataCenters,
    showEconomicCenters,
    showGasPipelines,
    showInternetExchanges,
    showLngTerminals,
    showOilPipelines,
    showPorts,
    showShippingLanes,
  ]);

  const neptunPathElevation = useMemo<NeptunPathElevationMode>(
    () => neptunElevationForMode(neptunRenderMode),
    [neptunRenderMode],
  );

  const neptunTrailPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsPaths(neptunRenderMode)) return [];
    return buildNeptunTrailPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunTrailBudget,
      neptunGroundTrailBudget,
    );
  }, [
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    neptunTrailBudget,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunProjectionPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsProjection(neptunRenderMode)) return [];
    return buildNeptunProjectionPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunProjectionBudget,
    );
  }, [
    neptunPathElevation,
    neptunProjectionBudget,
    neptunRenderMode,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunArchivedTrackPathsRaw = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const archivedGroundBudget = Math.max(6, Math.floor(neptunGroundTrailBudget * 0.75));
    return buildArchivedNeptunTrackPaths(
      visibleNeptunArchived,
      neptunPathElevation,
      neptunArchivedBudget,
      archivedGroundBudget,
    );
  }, [
    neptunArchivedBudget,
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    visibleNeptunArchived,
  ]);

  const neptunLivePathsPending = useMemo(
    () => [...neptunTrailPaths, ...neptunProjectionPaths],
    [neptunProjectionPaths, neptunTrailPaths],
  );

  const [stableNeptunLivePaths, setStableNeptunLivePaths] = useState<TransportPath[]>([]);
  const [stableNeptunArchivedPaths, setStableNeptunArchivedPaths] = useState<TransportPath[]>([]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunLivePaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunLivePathsPending) ? prev : neptunLivePathsPending,
    );
  }, [immediateUntilRef, isCameraMoving, neptunLivePathsPending]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunArchivedPaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunArchivedTrackPathsRaw) ? prev : neptunArchivedTrackPathsRaw,
    );
  }, [immediateUntilRef, isCameraMoving, neptunArchivedTrackPathsRaw]);

  /** 정적 포인트(자원/기지/착륙지) + ADS-B 군용기 + AI 전쟁지역 + FIRMS 화재 (이벤트는 HTML 핀 마커) */
  const globeDisplayPoints = useMemo<GlobeDisplayPoint[]>(() => {
    const points: GlobeDisplayPoint[] = [
      ...staticGlobePoints.filter((point) => !isEmojiStaticKind(point.kind)),
      ...milDisplayPoints,
      ...firmsDisplayPoints,
      ...conflictClusterPoints,
      ...tzevaAdomDisplayPoints,
    ];
    return points;
  }, [
      conflictClusterPoints,
      firmsDisplayPoints,
      milDisplayPoints,
      staticGlobePoints,
      tzevaAdomDisplayPoints,
  ]);

  const conflictClusterRings = useMemo<PulseRingPoint[]>(
    () => [
      ...conflictClusterPoints.map((point) => ({ ...point, pulseKind: "ai-zone" as const })),
      ...firmsBombRingPoints,
    ],
    [conflictClusterPoints, firmsBombRingPoints],
  );

  const handleHtmlMarkerHover = useCallback((point: GlobeDisplayPoint | null) => {
    setHoveredPoint(point);
  }, []);

  const handleGlobeMouseMove = useCallback((coords: { lat: number; lng: number } | null) => {
    setHoverGlobeCoords(coords);
  }, []);

  const handleMapPointerMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const section = mapSectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    setHoverPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleMapPointerLeave = useCallback(() => {
    setHoverPointer(null);
    setHoverGlobeCoords(null);
    setHoveredNeptunThreat(null);
  }, []);

  const rawTensionHeatmaps = useMemo(
    () =>
      // 전투·외교는 위치 태그로 대체 — 히트맵(수천 점 WebGL) 비활성화로 메모리 절약
      buildTensionHeatmaps(scoredEvents, {
        showWar: false,
        showDiplomatic: false,
        altitude: layerAltitude,
      }),
    [layerAltitude, scoredEvents],
  );

  const gdeltTensionTags = useMemo(() => {
    const tags = pickGdeltTensionTags(scoredEvents, {
      showWar: showGdeltWar,
      showDiplomatic: showGdeltDiplomatic,
      showProtest: showGdeltProtests,
      view: layerViewState,
    });
    if (!ultraLite) return tags;
    const max = Math.max(6, Math.ceil(tags.length * ultraLiteGdeltPinScale()));
    return tags.slice(0, Math.min(50, max));
  }, [
    layerViewState,
    scoredEvents,
    showGdeltDiplomatic,
    showGdeltProtests,
    showGdeltWar,
    ultraLite,
  ]);

  const gdeltTagHtmlMarkers = useMemo<GdeltTagHtmlMarker[]>(
    () =>
      gdeltTensionTags.map((event) => ({
        ...event,
        markerId: `gdelt-tag-${event.id}`,
        displayKind: "gdelt-tag-html" as const,
      })),
    [gdeltTensionTags],
  );

  const situationCalloutMarkers = useMemo<SituationCalloutMarker[]>(() => {
    if (isEconomyViewer) return [];
    const nearEnough =
      globeLod.tier === "regional" ||
      globeLod.tier === "near" ||
      globeLod.tier === "village";
    if (!nearEnough) return [];

    const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
    const seeds: SituationCallout[] = [];

    // 우크라: 전선 레이어 ON 또는 전장 박스 안
    if (showUkraineControl || theater === "russia-ukraine") {
      seeds.push(...UKRAINE_SITUATION_CALLOUTS_SHARED);
    }
    // 중동·이란: 전쟁구역/긴장/공습경보 또는 중동 박스
    if (
      theater === "middle-east" ||
      showWarZones ||
      showDiplomaticTension ||
      showTzevaAdom
    ) {
      if (theater === "middle-east" || showWarZones || showTzevaAdom) {
        seeds.push(...MIDDLE_EAST_SITUATION_CALLOUTS);
      }
    }
    // 대만·한반도: 해당 전장 위 + 전쟁구역/긴장
    if (theater === "china-taiwan" && (showWarZones || showDiplomaticTension)) {
      seeds.push(...TAIWAN_SITUATION_CALLOUTS);
    }
    if (theater === "korea" && (showWarZones || showDiplomaticTension || showMilitaryActivity)) {
      seeds.push(...KOREA_SITUATION_CALLOUTS);
    }

    // 카메라가 해당 전장에 있을 때만 그 전장 콜아웃 표시 (혼선 방지)
    const visible =
      theater == null
        ? seeds.filter((c) => c.theater === "russia-ukraine" && showUkraineControl)
        : seeds.filter((c) => c.theater === theater);

    return visible.map((callout) => ({
      ...callout,
      markerId: `sit-callout-${callout.theater}-${callout.id}`,
      displayKind: "situation-callout" as const,
    }));
  }, [
    filterCenter.lat,
    filterCenter.lng,
    globeLod.tier,
    isEconomyViewer,
    showDiplomaticTension,
    showMilitaryActivity,
    showTzevaAdom,
    showUkraineControl,
    showWarZones,
  ]);

  const ukraineSettlementHtmlMarkers = useMemo<UkraineSettlementHtmlMarker[]>(() => {
    if (!showUkraineControl) return [];
    if (mapZoom <= SETTLEMENT_DETAIL_MIN_MAP_ZOOM) return [];
    if (ukraineSettlements.length === 0 && viinaDisplay.zones.length === 0) return [];
    return filterUkraineSettlementsForView(
      ukraineSettlements,
      viinaDisplay.ruFillZones.length > 0 ? viinaDisplay.ruFillZones : viinaDisplay.zones,
      layerViewState,
      layerViewState.altitude,
    ).map((settlement) => ({
      ...settlement,
      markerId: `ua-settle-${settlement.geonameId}`,
      displayKind: "ua-settlement-html" as const,
      tier: getUkraineSettlementTier(settlement.population),
    }));
  }, [layerViewState, mapZoom, showUkraineControl, ukraineSettlements, viinaDisplay.ruFillZones, viinaDisplay.zones]);

  const labelPlaces = useMemo(() => {
    if (!showCityLabels) return [];
    const filtered = filterMajorCityLabels(data.places ?? [], layerViewState, layerViewState.altitude);
    if (showUkraineControl) {
      return filtered.filter((place) => !isInUkraineTheater(place.lat, place.lng));
    }
    return filtered;
  }, [data.places, layerViewState, showCityLabels, showUkraineControl]);

  const rawGlobeLabels = useMemo<GlobeLabel[]>(
    () =>
      labelPlaces.map((place) => ({
        ...place,
        labelKind: "place" as const,
      })),
    [labelPlaces],
  );

  const htmlOverlayMarkers = useMemo<HtmlOverlayMarker[]>(() => {
    const markers: HtmlOverlayMarker[] = [
      ...globePoints,
      ...airportPortHtmlMarkers,
      ...situationCalloutMarkers,
      ...ukraineSettlementHtmlMarkers,
      ...usCarrierHtmlMarkers,
      ...gdeltTagHtmlMarkers,
      ...neptunHtmlMarkers,
      ...neptunImpactHtmlMarkers,
    ];
    return markers;
  }, [
      airportPortHtmlMarkers,
      gdeltTagHtmlMarkers,
      globePoints,
      neptunHtmlMarkers,
    neptunImpactHtmlMarkers,
      situationCalloutMarkers,
      ukraineSettlementHtmlMarkers,
      usCarrierHtmlMarkers,
  ]);

  const [tensionHeatmaps, setTensionHeatmaps] = useState(rawTensionHeatmaps);
  const [globeLabels, setGlobeLabels] = useState(rawGlobeLabels);
  const [globePaths, setGlobePaths] = useState(rawGlobePaths);

  const dynamicGlobePaths = useMemo(() => rawGlobePaths, [rawGlobePaths]);

  const heatmapStabilityRef = useRef<{ signature: string; points: number; updatedAt: number }>({
    signature: "",
    points: 0,
    updatedAt: 0,
  });
  const labelStabilityRef = useRef<{ signature: string; count: number; updatedAt: number }>({
    signature: "",
    count: 0,
    updatedAt: 0,
  });
  const pathStabilityRef = useRef<{ signature: string; count: number; updatedAt: number }>({
    signature: "",
    count: 0,
    updatedAt: 0,
  });

  useEffect(() => {
    // 줌/팬 중 히트맵·라벨·경로 교체를 막아서 WebGL 부담과 흰 화면 유발 재할당을 줄임
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const points = rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0);
    const signature = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const prev = heatmapStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(points - prev.points) >= HEATMAP_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= HEATMAP_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setTensionHeatmaps(rawTensionHeatmaps);
      heatmapStabilityRef.current = { signature, points, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawTensionHeatmaps]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const count = rawGlobeLabels.length;
    const signature = rawGlobeLabels
      .slice(0, 84)
      .map((item) => `p:${item.id}`)
      .join("|");
    const prev = labelStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= LABEL_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= LABEL_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setGlobeLabels(rawGlobeLabels);
      labelStabilityRef.current = { signature, count, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawGlobeLabels]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current || isVectorBaseMap;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const count = dynamicGlobePaths.length;
    const signature = dynamicGlobePaths
      .slice(0, 96)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|");
    const prev = pathStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= PATH_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= PATH_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setGlobePaths([...dynamicGlobePaths]);
      pathStabilityRef.current = { signature, count, updatedAt: now };
    }
  }, [
    applyGeneration,
    dynamicGlobePaths,
    immediateUntilRef,
    isCameraMoving,
    isVectorBaseMap,
  ]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setGlobePaths((prev) => {
      const base = prev.filter(
        (path) =>
          path.kind !== "neptun-trail" &&
          path.kind !== "neptun-projection" &&
          path.kind !== "neptun-trail-archived",
      );
      const paths = [...stableNeptunLivePaths, ...stableNeptunArchivedPaths];
      if (paths.length === 0) {
        const hadNeptun = prev.some((path) => path.kind.startsWith("neptun-"));
        return hadNeptun ? base : prev;
      }
      const prevNeptun = prev.filter((path) => path.kind.startsWith("neptun-"));
      if (neptunPathsGeometryEqual(prevNeptun, paths)) return prev;
      return [...base, ...paths];
    });
  }, [
    immediateUntilRef,
    isCameraMoving,
    stableNeptunArchivedPaths,
    stableNeptunLivePaths,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(data.places, {
        keys: ["name", "country", "type"],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [data.places],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((result) => result.item);
  }, [fuse, query]);

  const hoverCard = useMemo<HoverCard>(() => {
    const lang = labelLanguage;
    if (hoveredCarrier) {
      const operational = hoveredCarrier.status === "deployed";
      return {
        kind: "static",
        title: hoveredCarrier.name,
        detail: HOVER.usCarrierDetail(carrierStatusLabel(hoveredCarrier.status, lang), lang),
        badge: operational ? HOVER.operational(lang) : undefined,
        meta: `${hoveredCarrier.hull} · ${hoveredCarrier.location}`,
      };
    }
    if (hoveredNeptunThreat) {
      return {
        kind: "event",
        title: getNeptunTypeLabel(hoveredNeptunThreat.type, lang),
        detail: HOVER.neptunTrack(lang),
        meta: [
          formatNeptunLocation(hoveredNeptunThreat),
          hoveredNeptunThreat.confidenceLevel,
          hoveredNeptunThreat.velocity?.speedKmh
            ? `${Math.round(hoveredNeptunThreat.velocity.speedKmh)} km/h`
            : null,
          hoveredNeptunThreat.predictedHeading != null
            ? HOVER.heading(Math.round(hoveredNeptunThreat.predictedHeading), lang)
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
        body: hoveredNeptunThreat.explanationShort || undefined,
      };
    }
    if (hoveredPoint) {
      if (hoveredPoint.displayKind === "static") {
        if (hoveredPoint.kind === "chokepoint" || hoveredPoint.kind === "logistics-hub") {
          const riskNote = hoveredPoint.meta?.riskNote;
          const relatedTickers = hoveredPoint.meta?.relatedTickers;
          const throughput = hoveredPoint.meta?.throughput;
          return {
            kind: "static",
            title: hoveredPoint.name,
            detail: staticKindLabelLocal(hoveredPoint.kind, lang),
            body: typeof riskNote === "string" ? riskNote : undefined,
            meta:
              [
                typeof throughput === "string" ? throughput : null,
                typeof relatedTickers === "string"
                  ? HOVER.relatedTickers(relatedTickers, lang)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            hint: HOVER.hintFlyZone(lang),
          };
        }
        const firstMeta = hoveredPoint.meta
          ? Object.entries(hoveredPoint.meta).find(([, value]) => value != null && value !== "")
          : null;
        return {
          kind: "static",
          title: hoveredPoint.name,
          detail:
            hoveredPoint.kind === "military-base"
              ? HOVER.militaryBase(lang)
              : staticKindLabelLocal(hoveredPoint.kind, lang),
          meta:
            hoveredPoint.kind === "military-base"
              ? [
                  hoveredPoint.meta?.branch,
                  hoveredPoint.meta?.hostCountry || hoveredPoint.meta?.state,
                  hoveredPoint.meta?.hostCountry ? "USA" : hoveredPoint.meta?.country,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              : firstMeta
                ? `${firstMeta[0]}: ${firstMeta[1]}`
                : undefined,
        };
      }
      if (hoveredPoint.displayKind === "mil") {
        return {
          kind: "event",
          title: hoveredPoint.callsign || hoveredPoint.hex || "Military aircraft",
          detail: HOVER.milAircraft(lang),
          meta: [hoveredPoint.type, hoveredPoint.altitude != null ? `${hoveredPoint.altitude} ft` : null]
            .filter(Boolean)
            .join(" · ") || undefined,
        };
      }
      if (hoveredPoint.displayKind === "firms-fire") {
        const soundKind = classifyFirmsFireForSound(hoveredPoint, {
          ukraineFrontActive: showUkraineControl,
          combatHotspots: firmsCombatHotspots,
        });
        return {
          kind: "static",
          title: soundKind === "combat" ? HOVER.firmsCombat(lang) : HOVER.firmsFire(lang),
          detail: `NASA FIRMS · ${firmsFireSoundLabel(soundKind, lang)}`,
          meta: [
            hoveredPoint.frp != null ? `FRP ${hoveredPoint.frp} MW` : null,
            hoveredPoint.confidence,
            hoveredPoint.acqDate || null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          hint: soundKind === "combat" ? HOVER.firmsCombatHint(lang) : undefined,
        };
      }
      if (hoveredPoint.displayKind === "conflict-cluster") {
        return {
          kind: "polygon",
          title: hoveredPoint.name,
          detail: HOVER.aiWarZone(getTensionLabel(hoveredPoint.tension, lang), lang),
          meta: HOVER.countSuffix(hoveredPoint.eventCount, lang),
          hint: HOVER.hintDetail(lang),
        };
      }
      if (hoveredPoint.displayKind === "tzeva-adom") {
        return {
          kind: "event",
          title: translateOrefTitle(hoveredPoint.title || hoveredPoint.region, labelLanguage),
          detail: tzevaUi("brand", labelLanguage),
          meta: hoveredPoint.active ? HOVER.active(lang) : hoveredPoint.alertDate,
        };
      }
      if (hoveredPoint.displayKind === "gdelt-tag-html") {
        return {
          kind: "event",
          badge: gdeltNewsAlertLabel(lang),
          title: hoveredPoint.title || hoveredPoint.category || HOVER.gdeltNews(lang),
          detail: gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
          meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" · ") || undefined,
          hint: HOVER.hintView(lang),
        };
      }

      return {
        kind: "event",
        badge: gdeltNewsAlertLabel(lang),
        title: hoveredPoint.title || `Event ${hoveredPoint.globalEventId}`,
        detail: `${eventTierLabel(hoveredPoint.eventTier, lang)}${
          isFreshEvent(hoveredPoint) ? HOVER.freshBreaking(lang) : ""
        }`,
        meta: hoveredPoint.country || hoveredPoint.category,
      };
    }

    if (hoveredPolygon) {
      if (hoveredPolygon.polygonLayer === "country") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: hoveredPolygon.nameLong || HOVER.country(lang),
          meta: [hoveredPolygon.isoA3, hoveredPolygon.continent].filter(Boolean).join(" · ") || undefined,
        };
      }
      if (hoveredPolygon.polygonLayer === "military-base") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: HOVER.militaryBase(lang),
          meta: [hoveredPolygon.component, hoveredPolygon.state, hoveredPolygon.country]
            .filter(Boolean)
            .join(" · ") || undefined,
        };
      }
      if (hoveredPolygon.polygonLayer === "conflict-zone") {
        return {
          kind: "polygon",
          title: hoveredPolygon.name,
          detail: HOVER.aiWarZone(getTensionLabel(hoveredPolygon.tension, lang), lang),
          meta: HOVER.countSuffix(hoveredPolygon.eventCount, lang),
        };
      }
      if (isUkraineViinaPolygonLayer(hoveredPolygon.polygonLayer)) {
        const status =
          hoveredPolygon.polygonLayer === "ukraine-ru"
            ? HOVER.uaRu(lang)
            : hoveredPolygon.polygonLayer === "ukraine-ua"
              ? HOVER.uaUa(lang)
              : HOVER.uaContested(lang);
        return {
          kind: "polygon",
          title: hoveredPolygon.name || status,
          detail: HOVER.ukraineFront(status, lang),
          meta: hoveredPolygon.adm1 || hoveredPolygon.nameLong || undefined,
          hint: HOVER.hintView(lang),
        };
      }
    }

    if (hoveredPath) {
      const dispute =
        hoveredPath.kind === "dispute-zone" || hoveredPath.kind === "dispute-hatch"
          ? disputeFromPath(hoveredPath)
          : undefined;
      if (dispute) {
        const overview = disputeOverviews.get(dispute.id);
        const overviewText = overview?.overviewKo
          ? truncateOverview(overview.overviewKo)
          : dispute.note || undefined;
        return {
          kind: "path",
          title: dispute.name,
          detail: HOVER.disputeBorder(
            hatchStyleLabel(getDisputeHatchStyle(dispute), dispute, lang),
            lang,
          ),
          body: overviewText,
          meta: `${isCombatHazard(dispute) ? HOVER.combatPrefix(lang) : ""}${HOVER.tensionPrefix(
            getTensionLabel(dispute.tension, lang),
            lang,
          )}${
            dispute.categories.length ? ` · ${formatCategories(dispute.categories, lang)}` : ""
          }${overview?.parties?.length ? ` · ${overview.parties.join(" · ")}` : ""}`,
          hint: HOVER.hintDetail(lang),
        };
      }
      const detail = getPathKindLabel(hoveredPath.kind, lang);
      const distanceMeta =
        hoveredPath.lengthKm && Number.isFinite(hoveredPath.lengthKm)
          ? HOVER.pathLength(hoveredPath.lengthKm.toLocaleString(), lang)
          : undefined;
      if (
        hoveredPath.kind === "neptun-trail" ||
        hoveredPath.kind === "neptun-projection" ||
        hoveredPath.kind === "neptun-trail-archived"
      ) {
        return {
          kind: "path",
          title: hoveredPath.name || detail,
          detail,
          meta: distanceMeta,
          body:
            hoveredPath.kind === "neptun-projection"
              ? HOVER.neptunProjection(lang)
              : HOVER.neptunTrailBody(lang),
        };
      }
      return {
        kind: "path",
        title: hoveredPath.name || detail,
        detail,
        meta: distanceMeta,
      };
    }

    if (hoverGlobeCoords) {
      const ocean = lookupOceanName(
        hoverGlobeCoords.lat,
        hoverGlobeCoords.lng,
        labelLanguage,
      );
      return {
        kind: "ocean",
        title: ocean.title,
        detail: ocean.detail,
      };
    }

    return {
      kind: "ocean",
      title: HOVER.ocean(lang),
      detail: HOVER.oceanDetail(lang),
    };
  }, [
    disputeFromPath,
    disputeOverviews,
    firmsCombatHotspots,
    hoveredCarrier,
    hoverGlobeCoords,
    hoveredNeptunThreat,
    hoveredPath,
    hoveredPoint,
    hoveredPolygon,
    labelLanguage,
    showUkraineControl,
  ]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(420, Math.floor(height)),
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const refreshAis = useCallback(async () => {
    if (isClientApiStubMode()) {
      setAisVessels([]);
      setAisError(null);
      setAisLoading(false);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setAisLoading(true);
    setAisError(null);

    try {
      const max = liveAisFetchMax();
      const response = await fetch(`/api/ais?seconds=8&max=${max}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `AIS 요청 실패: ${response.status}`);
      }

      setAisVessels((payload.vessels || []).slice(0, max));
    } catch (error) {
      setAisError(error instanceof Error ? error.message : "AIS 로드 실패");
    } finally {
      setAisLoading(false);
    }
  }, []);

  const refreshMilAircraft = useCallback(async () => {
    if (isClientApiStubMode()) {
      setMilAircraft([]);
      setMilError(null);
      setMilLoading(false);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setMilLoading(true);
    setMilError(null);

    try {
      const max = liveMilFetchMax();
      const response = await fetch(`/api/adsb-mil?max=${max}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `ADS-B mil 요청 실패: ${response.status}`);
      }

      setMilAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setMilError(error instanceof Error ? error.message : "ADS-B mil 로드 실패");
    } finally {
      setMilLoading(false);
    }
  }, []);

  const refreshUsCarriers = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setUsCarriersLoading(true);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/us-carriers", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        carriers?: UsCarrier[];
        updatedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "항모 데이터 로드 실패");
      }
      setUsCarriers(payload.carriers || []);
    } catch {
      // 마지막 성공 스냅샷 유지
    } finally {
      setUsCarriersLoading(false);
    }
  }, []);

  const refreshCyberEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setCyberEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=cyber", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `사이버 이벤트 요청 실패: ${response.status}`);
      }
      setCyberEvents(payload.events || []);
    } catch {
      setCyberEvents([]);
    }
  }, []);

  const refreshElectionEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setElectionEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=election", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `선거 이벤트 요청 실패: ${response.status}`);
      }
      setElectionEvents(payload.events || []);
    } catch {
      setElectionEvents([]);
    }
  }, []);

  const refreshGdeltEvents = useCallback(async () => {
    if (!viewerChromePreset.fetchGdelt || !showGdeltLayers) {
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setGdeltLoading(false);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setGdeltLoading(true);
    setGdeltError(null);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/gdelt", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        fetchedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `GDELT 요청 실패: ${response.status}`);
      }
      setGdeltEvents(payload.events || []);
      setGdeltFetchedAt(payload.fetchedAt || new Date().toISOString());
    } catch (error) {
      setGdeltError(error instanceof Error ? error.message : "GDELT 로드 실패");
      // 마지막 성공 스냅샷 유지 — 빈 배열로 지우지 않음
    } finally {
      setGdeltLoading(false);
    }
  }, [showGdeltLayers, viewerChromePreset.fetchGdelt]);

  const refreshFirmsFires = useCallback(async () => {
    if (!showFirmsFires) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    if (firmsFetchBusyRef.current) return;
    firmsFetchBusyRef.current = true;
    setFirmsLoading(true);
    setFirmsError(null);

    try {
      const lod = getGlobeLod(layerAltitude);
      const radiusDeg = VIEWPORT_RADIUS_BY_TIER[lod.tier];
      const bbox = viewToBbox(layerViewState, radiusDeg);
      const maxParam = firmsLiveFetchMax(lod.tier);
      const params = new URLSearchParams({
        west: String(bbox.west),
        south: String(bbox.south),
        east: String(bbox.east),
        north: String(bbox.north),
        days: lod.tier === "near" || lod.tier === "village" ? "2" : "1",
        max: String(maxParam),
      });
      const response = await fetch(`/api/firms-fires?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        fires?: FirmsFire[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `FIRMS 요청 실패: ${response.status}`);
      }

      const fires = (payload.fires || []).slice(0, maxParam);
      startTransition(() => {
        setFirmsFires(fires);
      });
    } catch (error) {
      setFirmsError(error instanceof Error ? error.message : "FIRMS 로드 실패");
      // 실패 시 빈 배열로 지우지 않음 — 재시도 루프/깜빡임 방지
    } finally {
      firmsFetchBusyRef.current = false;
      setFirmsLoading(false);
    }
  }, [layerAltitude, layerViewState, showFirmsFires]);

  const loadTransportLayers = useCallback(async () => {
    if (railroads.length > 0) return;

    setTransportLoading(true);
    setTransportError(null);

    try {
      const railroadsResponse = await fetch(dataPath("railroads.json"), { cache: "no-store" });

      if (!railroadsResponse.ok) {
        throw new Error(`railroads.json 로드 실패: ${railroadsResponse.status}`);
      }

      const nextRailroads = expandTransportPaths(await railroadsResponse.json());
      setRailroads(nextRailroads);
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : "철도 데이터 로드 실패");
    } finally {
      setTransportLoading(false);
    }
  }, [railroads]);

  useEffect(() => {
    if (!showAis) return;
    void refreshAis();
    const timer = window.setInterval(() => {
      void refreshAis();
    }, liveAisPollMs());
    return () => window.clearInterval(timer);
  }, [refreshAis, showAis]);

  useEffect(() => {
    if (!showMilitaryActivity) return;
    void refreshMilAircraft();
    const timer = window.setInterval(() => {
      void refreshMilAircraft();
    }, liveMilPollMs());
    return () => window.clearInterval(timer);
  }, [refreshMilAircraft, showMilitaryActivity]);

  useEffect(() => {
    if (!showUsCarriers) return;
    void refreshUsCarriers();
    const timer = window.setInterval(() => {
      void refreshUsCarriers();
    }, liveUsCarriersPollMs());
    return () => window.clearInterval(timer);
  }, [refreshUsCarriers, showUsCarriers]);

  useEffect(() => {
    if (!showCyberIncidents) return;
    void refreshCyberEvents();
  }, [refreshCyberEvents, showCyberIncidents]);

  useEffect(() => {
    if (!showElectionEvents) return;
    void refreshElectionEvents();
  }, [refreshElectionEvents, showElectionEvents]);

  useEffect(() => {
    if (!showGdeltLayers || !globeReady) {
      if (!showGdeltLayers) {
        setGdeltEvents([]);
        setGdeltError(null);
        setGdeltFetchedAt(null);
      }
      return;
    }
    const cancel = runWhenIdle(() => {
      void refreshGdeltEvents();
    });
    return cancel;
  }, [globeReady, refreshGdeltEvents, showGdeltLayers]);

  useEffect(() => {
    if (!showGdeltLayers || !globeReady) return;
    const timer = window.setInterval(() => {
      void refreshGdeltEvents();
    }, liveGdeltPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, refreshGdeltEvents, showGdeltLayers]);

  const refreshTelegramAlerts = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const [alertsRes, statusRes] = await Promise.all([
        fetch("/api/telegram-alerts", { cache: "no-store" }),
        fetch("/api/telegram-alerts/status", { cache: "no-store" }),
      ]);
      if (!alertsRes.ok) throw new Error(`HTTP ${alertsRes.status}`);
      const payload = (await alertsRes.json()) as TelegramAlertsPayload;
      setTelegramAlerts(payload.alerts ?? []);
      setTelegramLive(Boolean(payload.live) || (payload.alerts?.length ?? 0) > 0);
      if (statusRes.ok) {
        const status = (await statusRes.json()) as {
          needsAuth?: boolean;
          sessionExists?: boolean;
          embedMode?: boolean;
        };
        setTelegramEmbedMode(status.embedMode !== false);
        setTelegramNeedsAuth(Boolean(status.needsAuth));
        setTelegramSessionExists(Boolean(status.sessionExists));
      }
      setTelegramStatus(
        payload.stub ? "stub" : payload.waiting ? "waiting" : "ok",
      );
    } catch {
      setTelegramStatus("error");
    }
  }, [intelSheetOpen, showTelegramOsint, viewerChromePreset.fetchTelegram]);

  const syncTelegramEmbed = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus("loading");
    try {
      const res = await fetch("/api/telegram-alerts/sync", { method: "POST" });
      if (!res.ok) throw new Error(`sync HTTP ${res.status}`);
      await refreshTelegramAlerts();
    } catch {
      setTelegramStatus("error");
    }
  }, [intelSheetOpen, refreshTelegramAlerts, showTelegramOsint, viewerChromePreset.fetchTelegram]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) {
      if (!showTelegramOsint && !intelSheetOpen) {
        setTelegramAlerts([]);
        setTelegramLive(false);
        setTelegramStatus("idle");
      }
      return;
    }
    const cancel = runWhenIdle(() => {
      void syncTelegramEmbed();
    }, 3500);
    return cancel;
  }, [globeReady, intelSheetOpen, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void syncTelegramEmbed();
    }, liveTelegramSyncPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void refreshTelegramAlerts();
    }, liveTelegramPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, refreshTelegramAlerts, showTelegramOsint]);

  const refreshTzevaAdom = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTzevaAdomStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/tzeva-adom", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as TzevaAdomPayload;
      setTzevaAdomActive(payload.active ?? []);
      setTzevaAdomHistory(payload.history ?? []);
      setTzevaAdomLive(Boolean(payload.live));
      setTzevaAdomGeoRestricted(Boolean(payload.geoRestricted));
      setTzevaAdomError(payload.error ?? null);
      setTzevaAdomStatus(
        payload.stub ? "stub" : payload.geoRestricted ? "geo-blocked" : "ok",
      );
    } catch {
      setTzevaAdomStatus("error");
    }
  }, []);

  useEffect(() => {
    void refreshTzevaAdom();
  }, [refreshTzevaAdom]);

  useEffect(() => {
    const pollMs = liveTzevaPollMs();
    const timer = window.setInterval(() => {
      void refreshTzevaAdom();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refreshTzevaAdom]);

  useEffect(() => {
    if (!showFirmsFires) {
      setFirmsFires([]);
      firmsBboxRef.current = "";
      return;
    }
    void refreshFirmsFires();
  }, [refreshFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (!showFirmsFires || (isCameraMoving && Date.now() >= immediateUntilRef.current)) return;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const bbox = viewToBbox(layerViewState, radiusDeg);
    const signature = `${bbox.west.toFixed(1)},${bbox.south.toFixed(1)},${bbox.east.toFixed(1)},${bbox.north.toFixed(1)}:${globeLod.tier}`;
    if (signature === firmsBboxRef.current) return;
    firmsBboxRef.current = signature;
    void refreshFirmsFires();
  }, [applyGeneration, globeLod.tier, immediateUntilRef, isCameraMoving, layerViewState, refreshFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (!showFirmsFires) return;
    const timer = window.setInterval(() => {
      void refreshFirmsFires();
    }, liveFirmsPollMs());
    return () => window.clearInterval(timer);
  }, [refreshFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (showRailGlow && transportLod.maxRailroads > 0) {
      loadTransportLayers();
    }
  }, [loadTransportLayers, showRailGlow, transportLod.maxRailroads]);

  const layerPanelActive = showLeftPanel;
  /** 패널 닫힘 시 deps 고정 — GDELT·카메라 등과 layerCategories 재계산 분리 */
  const lpg = <T,>(active: T, idle: T): T => (layerPanelActive ? active : idle);

  const layerPanelGdeltCounts = useMemo(
    () => ({
      war: gdeltTensionTags.filter((e) => e.eventTier === "war").length,
      diplomatic: gdeltTensionTags.filter((e) => e.eventTier === "diplomatic").length,
      alliance: gdeltTierPins.filter((e) => e.eventTier === "alliance").length,
      protest: gdeltTensionTags.filter((e) => e.eventTier === "protest").length,
    }),
    [gdeltTensionTags, gdeltTierPins],
  );

  const layerCategories = useMemo<LayerCategory[]>(() => {
    if (!showLeftPanel || !layerPanelReady) {
      return EMPTY_LAYER_CATEGORIES;
    }
    if (categorySnapshotRef.current !== null) {
      return categorySnapshotRef.current;
    }
    const off = (count?: number) =>
      count && count > 0 ? `${count.toLocaleString()}곳 · 꺼짐` : "꺼짐";
    const zoom = globeLod.label;

    const allCategories: LayerCategory[] = [
      {
        id: "map",
        title: "지도 · 지명",
        hint: "도시명 · 철도 (국경선·해안선은 항상 표시)",
        items: [
          {
            id: "city-labels",
            label: "도시명",
            detail: showCityLabels
              ? `${labelPlaces.length.toLocaleString()}개 · 주요 도시 · WebGL · ${zoom}`
              : "꺼짐",
            checked: layerPrefs.showCityLabels,
            onChange: setShowCityLabels,
          },
          {
            id: "rail",
            label: "철도",
            detail: showRailGlow
              ? `노선 ${railPaths.length.toLocaleString()}개`
              : "꺼짐",
            checked: layerPrefs.showRailGlow,
            onChange: setShowRailGlow,
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showCityLabels: enabled,
            showRailGlow: enabled,
          }),
      },
      {
        id: "conflict",
        title: "분쟁 · 영토",
        hint: "전투·외교 뉴스 · 분쟁 구역",
        items: [
          {
            id: "ukraine",
            label: "우크라이나 점령·주장",
            detail:
              ukraineControlStatus === "loading"
                ? "불러오는 중…"
                : showUkraineControl && ukraineFrontPaths.length > 0
                  ? `테두리·빗금 ${ukraineFrontPaths.length.toLocaleString()}개 · 지표면 · ${zoom}`
                  : showUkraineControl
                    ? viinaMeta?.available
                      ? ukraineControlStatus === "ok"
                        ? "켜짐"
                        : "로드 실패"
                      : "데이터 빌드 필요"
                    : "꺼짐",
            checked: layerPrefs.showUkraineControl,
            onChange: setShowUkraineControl,
            accent: "red",
          },
          {
            id: "neptun",
            label: "드론·미사일 궤적",
            detail: showNeptun
              ? !neptunFetchEnabled
                ? "우크라이나 근처로 이동 시 로드"
                : neptunRenderMode === "hidden"
                  ? `${globeLod.label} · 우크라이나 근처로 이동`
                  : neptunRenderMode === "flat"
                    ? `Shahed·미사일 ${visibleNeptunThreats.length.toLocaleString()}건 · 개요`
                    : neptunRenderMode === "low"
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · 예측 항로 포함`
                      : neptunAlertCount > 0
                    ? `공습 경보 ${neptunAlertCount.toLocaleString()} · 추적 ${visibleNeptunThreats.length.toLocaleString()}건`
                    : neptunLive
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · ${globeLod.label}`
                      : neptunStatus === "stub"
                        ? "데모 궤적"
                        : neptunStatus === "error"
                          ? "연결 오류"
                          : "연결 중"
              : "Shahed · 순항 · 탄도 · KAB",
            checked: layerPrefs.showNeptun,
            onChange: setShowNeptun,
            accent: "orange",
          },
          {
            id: "neptun-previous-trails",
            label: "지나간 미사일·드론 궤적",
            detail: !showNeptun
              ? "드론·미사일을 먼저 켜세요"
              : showNeptunPreviousTrails
                ? `공중 항로 ${visibleNeptunArchived.length.toLocaleString()}건 · ${globeLod.label}`
                : "꺼짐",
            checked: layerPrefs.showNeptunPreviousTrails,
            onChange: setShowNeptunPreviousTrails,
            accent: "orange",
            disabled: !showNeptun,
          },
          {
            id: "war-zones",
            label: "전쟁구역",
            detail: showWarZones
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 빨강 빗금`
              : "꺼짐 · 실전투·폭격급",
            checked: layerPrefs.showWarZones,
            onChange: setShowWarZones,
            accent: "red",
          },
          {
            id: "diplomatic-tension",
            label: "외교적 긴장구역",
            detail: showDiplomaticTension
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 주황 빗금`
              : "꺼짐 · 외교 긴장",
            checked: layerPrefs.showDiplomaticTension,
            onChange: setShowDiplomaticTension,
            accent: "orange",
          },
          {
            id: "conflict-zones",
            label: "AI 전쟁지역 (데모)",
            detail: showConflictZones
              ? `${visibleConflictZones.length.toLocaleString()}곳 · 휴리스틱 · ${zoom}`
              : "꺼짐 · 외부 AI API 없음",
            checked: layerPrefs.showConflictZones,
            onChange: setShowConflictZones,
            accent: "red",
          },
          {
            id: "arms-embargo",
            label: "무기 금수",
            detail: showArmsEmbargo
              ? `구역 ${armsEmbargoFramePaths.length.toLocaleString()}곳`
              : "꺼짐",
            checked: layerPrefs.showArmsEmbargo,
            onChange: setShowArmsEmbargo,
            accent: "fuchsia",
          },
          {
            id: "ucdp",
            label: "분쟁 사건",
            detail: showUcdpEvents ? "세계 분쟁·전쟁 기록" : "꺼짐",
            checked: layerPrefs.showUcdpEvents,
            onChange: setShowUcdpEvents,
            accent: "red",
          },
          {
            id: "gdelt-war",
            label: "뉴스 · 전투·충돌",
            detail: showGdeltWar
              ? gdeltLoading
                ? "불러오는 중…"
                : `알림 ${layerPanelGdeltCounts.war.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltWar,
            onChange: setShowGdeltWar,
            accent: "red",
            presentation: "tag",
          },
          {
            id: "gdelt-diplomatic",
            label: "뉴스 · 외교 긴장",
            detail: showGdeltDiplomatic
              ? gdeltLoading
                ? "불러오는 중…"
                : `알림 ${layerPanelGdeltCounts.diplomatic.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltDiplomatic,
            onChange: setShowGdeltDiplomatic,
            accent: "orange",
            presentation: "tag",
          },
          {
            id: "gdelt-alliance",
            label: "뉴스 · 동맹 갈등",
            detail: showGdeltAlliance
              ? `알림 ${layerPanelGdeltCounts.alliance.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltAlliance,
            onChange: setShowGdeltAlliance,
            accent: "fuchsia",
          },
          {
            id: "gdelt-protest",
            label: "뉴스 · 시위",
            detail: showGdeltProtests
              ? `알림 ${layerPanelGdeltCounts.protest.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltProtests,
            onChange: setShowGdeltProtests,
            accent: "blue",
            presentation: "tag",
          },
          {
            id: "telegram-osint",
            label: "텔레그램 채널",
            detail: showTelegramOsint
              ? telegramStatus === "loading"
                ? `불러오는 중 · ${TELEGRAM_CHANNEL_COUNT}채널`
                : telegramLive
                  ? `소식 ${telegramAlerts.length.toLocaleString()}건`
                  : telegramStatus === "waiting"
                    ? telegramEmbedMode
                      ? "연결 대기"
                      : "수집기 필요"
                    : telegramAlerts.length > 0
                      ? `${telegramAlerts.length.toLocaleString()}건`
                      : telegramEmbedMode
                        ? `공개 ${TELEGRAM_CHANNEL_COUNT}채널`
                        : "대기 중"
              : "꺼짐",
            checked: layerPrefs.showTelegramOsint,
            onChange: setShowTelegramOsint,
            accent: "blue",
          },
          {
            id: "tzeva-adom",
            label: "이스라엘 공습 경보",
            detail: showTzevaAdom
              ? tzevaAdomActive.length > 0
                ? `지금 경보 ${tzevaAdomActive.length.toLocaleString()}건`
                : tzevaAdomLive
                  ? `감시 중 · 이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                  : tzevaAdomStatus === "geo-blocked"
                    ? "지역 제한"
                    : tzevaAdomHistory.length > 0
                      ? `이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                      : "폴러 대기"
              : "꺼짐",
            checked: layerPrefs.showTzevaAdom,
            onChange: setShowTzevaAdom,
            accent: "red",
          },
        ],
        footer: (
          <>
            {showUkraineControl ? (
              <div className="mb-2 rounded-lg border border-red-300/15 bg-red-950/20 px-2.5 py-2.5">
                <UkraineFrontLegendContent
                  compact
                  controlDate={ukraineControlDate}
                  lodLabel={
                    viinaDisplay.lod.mode === "hidden"
                      ? "줌인 필요"
                      : viinaDisplay.lod.mode === "overview"
                        ? "개요"
                        : "상세"
                  }
                />
              </div>
            ) : null}
            {showGdeltLayers ? (
              <>
                <button
                  type="button"
                  onClick={() => startTransition(() => void refreshGdeltEvents())}
                  disabled={gdeltLoading}
                  className="w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {gdeltLoading ? "뉴스 불러오는 중…" : "뉴스 새로고침"}
                </button>
                {gdeltError ? <p className="mt-2 text-xs leading-5 text-red-200">{gdeltError}</p> : null}
                {gdeltFetchedAt ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    뉴스 갱신: {formatDateTime(gdeltFetchedAt)}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ),
        onToggleAll: (enabled) => {
          setShowDisputeLegendPanel(enabled);
          toggleCategoryPrefs({
            showUkraineControl: enabled,
            showNeptun: enabled,
            showNeptunPreviousTrails: enabled,
            showWarZones: enabled,
            showDiplomaticTension: enabled,
            showConflictZones: enabled,
            showArmsEmbargo: enabled,
            showUcdpEvents: enabled,
            showGdeltWar: enabled,
            showGdeltDiplomatic: enabled,
            showGdeltAlliance: enabled,
            showGdeltProtests: enabled,
          });
        },
      },
      {
        id: "energy",
        title: "에너지·자원",
        hint: "기름 · 가스 · 광물",
        items: [
          {
            id: "oil-pipelines",
            label: "기름 파이프",
            detail: showOilPipelines
              ? `${visibleOilPipelines.length.toLocaleString()}개`
              : off(staticCounts.oilPipelines),
            checked: layerPrefs.showOilPipelines,
            onChange: setShowOilPipelines,
            accent: "orange",
          },
          {
            id: "gas-pipelines",
            label: "가스관",
            detail: showGasPipelines
              ? `${visibleGasPipelines.length.toLocaleString()}개`
              : off(staticCounts.gasPipelines),
            checked: layerPrefs.showGasPipelines,
            onChange: setShowGasPipelines,
            accent: "green",
          },
          {
            id: "lng-terminals",
            label: "액화가스 터미널",
            detail: showLngTerminals
              ? `${visibleStaticPoints.filter((p) => p.kind === "lng-terminal").length.toLocaleString()}곳`
              : off(staticCounts.lngTerminals),
            checked: layerPrefs.showLngTerminals,
            onChange: setShowLngTerminals,
            accent: "orange",
          },
          {
            id: "resources",
            label: "광물·자원지",
            detail: showResources ? "광물·자원 매장지" : off(staticCounts.resources),
            checked: layerPrefs.showResources,
            onChange: setShowResources,
            accent: "orange",
          },
          {
            id: "nuclear",
            label: "원자력 시설",
            detail: showNuclearSites ? "발전소·연구시설" : "꺼짐",
            checked: layerPrefs.showNuclearSites,
            onChange: setShowNuclearSites,
            accent: "orange",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showOilPipelines: enabled,
            showGasPipelines: enabled,
            showLngTerminals: enabled,
            showResources: enabled,
            showNuclearSites: enabled,
          }),
      },
      {
        id: "transport",
        title: "운송 · 통신",
        hint: "항로, 해저 케이블, 공항·항구, 초크포인트",
        items: [
          {
            id: "shipping",
            label: "항로",
            detail: showShippingLanes
              ? `${visibleShipping.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.shipping),
            checked: layerPrefs.showShippingLanes,
            onChange: setShowShippingLanes,
            accent: "blue",
          },
          {
            id: "cables",
            label: "해저 케이블",
            detail: showSubmarineCables
              ? `${visibleCables.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.cables),
            checked: layerPrefs.showSubmarineCables,
            onChange: setShowSubmarineCables,
            accent: "blue",
          },
          {
            id: "airports",
            label: "공항",
            detail: showAirports
              ? `${visibleStaticPoints.filter((p) => p.kind === "airport").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.airports),
            checked: layerPrefs.showAirports,
            onChange: setShowAirports,
          },
          {
            id: "ports",
            label: "항구",
            detail: showPorts
              ? `${visibleStaticPoints.filter((p) => p.kind === "port").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.ports),
            checked: layerPrefs.showPorts,
            onChange: setShowPorts,
          },
          {
            id: "ixp",
            label: "인터넷 교환점",
            detail: showInternetExchanges ? "인터넷 거점" : "꺼짐",
            checked: layerPrefs.showInternetExchanges,
            onChange: setShowInternetExchanges,
            accent: "blue",
          },
          {
            id: "logistics-risk",
            label: "초크포인트 · 물류 거점",
            detail: showLogisticsRisk
              ? `${visibleStaticPoints.filter((p) => p.kind === "chokepoint" || p.kind === "logistics-hub").length.toLocaleString()}곳 · 전역`
              : off(staticCounts.logisticsRisk),
            checked: layerPrefs.showLogisticsRisk,
            onChange: setShowLogisticsRisk,
            accent: "orange",
          },
          {
            id: "ais",
            label: "선박 위치",
            detail: showAis ? `선박 ${aisVessels.length.toLocaleString()}척` : "꺼짐",
            checked: layerPrefs.showAis,
            onChange: setShowAis,
            accent: "blue",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showShippingLanes: enabled,
            showSubmarineCables: enabled,
            showAirports: enabled,
            showPorts: enabled,
            showInternetExchanges: enabled,
            showLogisticsRisk: enabled,
            showAis: enabled,
          }),
      },
      {
        id: "military",
        title: "군사 · 안보",
        hint: "기지, 항공, 난민",
        items: [
          {
            id: "military-bases",
            label: "미군 기지",
            detail: showMilitaryBases
              ? `구역 ${visibleMilitaryBaseAreas.length.toLocaleString()} · 시설 ${
                  visibleStaticPoints.filter((p) => p.kind === "military-base").length
                }`
              : off(staticCounts.militaryBases),
            checked: layerPrefs.showMilitaryBases,
            onChange: setShowMilitaryBases,
            accent: "blue",
          },
          {
            id: "military-air",
            label: "군사 항공기",
            detail: showMilitaryActivity
              ? `비행기 ${milAircraft.length.toLocaleString()}대`
              : "꺼짐",
            checked: layerPrefs.showMilitaryActivity,
            onChange: setShowMilitaryActivity,
            accent: "red",
          },
          {
            id: "intel",
            label: "정보 수집 거점",
            detail: showIntelHotspots ? "정찰·감시 거점" : "꺼짐",
            checked: layerPrefs.showIntelHotspots,
            onChange: setShowIntelHotspots,
            accent: "orange",
          },
          {
            id: "refugee",
            label: "난민 캠프",
            detail: showRefugeeCamps ? "난민 수용 시설" : "꺼짐",
            checked: layerPrefs.showRefugeeCamps,
            onChange: setShowRefugeeCamps,
            accent: "orange",
          },
        ],
        footer: (
          <>
            <button
              type="button"
              onClick={() => startTransition(() => void refreshMilAircraft())}
              disabled={milLoading || !showMilitaryActivity}
              className="w-full rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-xs text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {milLoading ? "군사 항공기 불러오는 중…" : "군사 항공기 새로고침"}
            </button>
            {milError ? <p className="mt-2 text-xs leading-5 text-red-200">{milError}</p> : null}
          </>
        ),
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showMilitaryBases: enabled,
            showMilitaryActivity: enabled,
            showIntelHotspots: enabled,
            showRefugeeCamps: enabled,
          }),
      },
      {
        id: "live",
        title: "실시간 · 사건",
        hint: "화재, 사이버, 선거, 우주",
        items: [
          {
            id: "firms",
            label: "전쟁뉴스 근처 화재경보",
            detail: showFirmsFires
              ? `열감지 ${visibleFirmsFires.length.toLocaleString()} · 폭격추정 ${firmsCombatFireIds.length.toLocaleString()}`
              : firmsError || "꺼짐 · GDELT 전쟁뉴스 교차",
            checked: layerPrefs.showFirmsFires,
            onChange: setShowFirmsFires,
            accent: "orange",
          },
          {
            id: "cyber",
            label: "사이버 공격",
            detail: showCyberIncidents
              ? `${cyberEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showCyberIncidents,
            onChange: setShowCyberIncidents,
            accent: "fuchsia",
          },
          {
            id: "election",
            label: "선거 사건",
            detail: showElectionEvents
              ? `${electionEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showElectionEvents,
            onChange: setShowElectionEvents,
            accent: "blue",
          },
          {
            id: "space",
            label: "우주 발사",
            detail: showSpaceLaunches ? "로켓·위성 발사 기록" : "꺼짐",
            checked: layerPrefs.showSpaceLaunches,
            onChange: setShowSpaceLaunches,
            accent: "blue",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showFirmsFires: enabled,
            showCyberIncidents: enabled,
            showElectionEvents: enabled,
            showSpaceLaunches: enabled,
          }),
      },
      {
        id: "economy",
        title: "경제 · 제재",
        hint: "허브, 데이터센터, 제재",
        items: [
          {
            id: "economic",
            label: "경제 중심지",
            detail: showEconomicCenters ? "금융·무역 허브" : "꺼짐",
            checked: layerPrefs.showEconomicCenters,
            onChange: setShowEconomicCenters,
            accent: "emerald",
          },
          {
            id: "ai-dc",
            label: "AI 데이터센터",
            detail: showAiDataCenters ? "데이터센터 시설" : "꺼짐",
            checked: layerPrefs.showAiDataCenters,
            onChange: setShowAiDataCenters,
            accent: "blue",
          },
          {
            id: "sanctions",
            label: "제재 대상",
            detail: showSanctionsEntities ? "제재 국가·기업" : "꺼짐",
            checked: layerPrefs.showSanctionsEntities,
            onChange: setShowSanctionsEntities,
            accent: "fuchsia",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showEconomicCenters: enabled,
            showAiDataCenters: enabled,
            showSanctionsEntities: enabled,
          }),
      },
    ];
    const allowed = new Set(viewerChromePreset.layerCategoryIds);
    const filtered = allCategories.filter((cat) =>
      allowed.has(cat.id as (typeof viewerChromePreset.layerCategoryIds)[number]),
    );
    return filtered;
    /* eslint-disable react-hooks/exhaustive-deps -- lpg() freezes deps when panel closed; setShow* use togglePref */
  }, [
    layerPanelActive,
    layerPanelReady,
    lpg(layerPanelGdeltCounts.alliance, 0),
    lpg(layerPanelGdeltCounts.diplomatic, 0),
    lpg(layerPanelGdeltCounts.protest, 0),
    lpg(layerPanelGdeltCounts.war, 0),
    lpg(aisVessels.length, 0),
    lpg(armsEmbargoFramePaths.length, 0),
    lpg(cyberEvents.length, 0),
    lpg(disputeZoneOutlineCount, 0),
    lpg(electionEvents.length, 0),
    lpg(firmsError, null),
    lpg(gdeltError, null),
    lpg(gdeltFetchedAt, null),
    lpg(gdeltLoading, false),
    lpg(refreshGdeltEvents, null),
    lpg(showGdeltAlliance, false),
    lpg(showGdeltDiplomatic, false),
    lpg(showGdeltLayers, false),
    lpg(showGdeltProtests, false),
    lpg(showGdeltWar, false),
    lpg(labelPlaces.length, 0),
    lpg(globeLod.label, ""),
    lpg(milAircraft.length, 0),
    lpg(milError, null),
    lpg(milLoading, false),
    lpg(railPaths.length, 0),
    lpg(refreshMilAircraft, null),
    lpg(refreshUsCarriers, null),
    lpg(showUsCarriers, false),
    lpg(usCarriers.length, 0),
    lpg(usCarriersLoading, false),
    lpg(showAis, false),
    lpg(showAiDataCenters, false),
    lpg(showArmsEmbargo, false),
    lpg(showCityLabels, false),
    lpg(showConflictZones, false),
    lpg(showCyberIncidents, false),
    lpg(showDiplomaticTension, false),
    lpg(showWarZones, false),
    lpg(showEconomicCenters, false),
    lpg(showElectionEvents, false),
    lpg(showFirmsFires, false),
    lpg(showGasPipelines, false),
    lpg(showIntelHotspots, false),
    lpg(showInternetExchanges, false),
    lpg(showLngTerminals, false),
    lpg(showMilitaryActivity, false),
    lpg(showMilitaryBases, false),
    lpg(showNuclearSites, false),
    lpg(showOilPipelines, false),
    lpg(showPorts, false),
    lpg(showLogisticsRisk, false),
    lpg(showRailGlow, false),
    lpg(showRefugeeCamps, false),
    lpg(showResources, false),
    lpg(showSanctionsEntities, false),
    lpg(showShippingLanes, false),
    lpg(showSpaceLaunches, false),
    lpg(showSubmarineCables, false),
    lpg(showTelegramOsint, false),
    lpg(showTzevaAdom, false),
    lpg(showNeptun, false),
    lpg(showNeptunPreviousTrails, false),
    lpg(showUcdpEvents, false),
    lpg(showUkraineControl, false),
    lpg(ukraineControlDate, null),
    lpg(ukraineControlStatus, "idle"),
    lpg(ukraineRuCellCount, 0),
    lpg(viinaDisplay.lod.mode, "hidden"),
    lpg(ukraineFrontPaths.length, 0),
    lpg(viinaMeta?.featureCount, 0),
    lpg(telegramAlerts.length, 0),
    lpg(telegramLive, false),
    lpg(telegramStatus, "idle"),
    lpg(tzevaAdomActive.length, 0),
    lpg(tzevaAdomHistory.length, 0),
    lpg(tzevaAdomLive, false),
    lpg(tzevaAdomStatus, "idle"),
    lpg(neptunThreats.length, 0),
    lpg(neptunArchivedThreats.length, 0),
    lpg(neptunAlertCount, 0),
    lpg(neptunFetchEnabled, false),
    lpg(neptunLive, false),
    lpg(neptunRenderMode, "hidden"),
    lpg(neptunStatus, "idle"),
    lpg(visibleNeptunArchived.length, 0),
    lpg(visibleNeptunThreats.length, 0),
    lpg(showAirports, false),
    lpg(staticCounts, null),
    lpg(toggleCategoryPrefs, null),
    lpg(visibleCables.length, 0),
    lpg(visibleConflictZones.length, 0),
    lpg(visibleFirmsFires.length, 0),
    lpg(visibleGasPipelines.length, 0),
    lpg(visibleMilitaryBaseAreas.length, 0),
    lpg(visibleOilPipelines.length, 0),
    lpg(visibleShipping.length, 0),
    lpg(visibleStaticPoints.length, 0),
    lpg(viewerChromePreset, null),
    lpg(telegramEmbedMode, false),
    lpg(viinaMeta?.available, false),
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const applyPanelDraft = useCallback(() => {
    const patch = panelDraftPatchRef.current;
    if (Object.keys(patch).length === 0) return;
    startTransition(() => {
      applyLayerPrefs({ ...layerPrefs, ...patch });
    });
    panelDraftPatchRef.current = {};
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [applyLayerPrefs, layerPrefs]);

  useEffect(() => {
    if (!showLeftPanel) {
      categorySnapshotRef.current = null;
      panelDraftPatchRef.current = {};
      setFrozenPanelCategories(null);
      return;
    }
    if (
      layerPanelReady &&
      frozenPanelCategories === null &&
      layerCategories !== EMPTY_LAYER_CATEGORIES
    ) {
      categorySnapshotRef.current = layerCategories;
      setFrozenPanelCategories(layerCategories);
    }
  }, [frozenPanelCategories, layerCategories, layerPanelReady, showLeftPanel]);

  const dismissLayerPanel = useCallback(
    (closePanel = true) => {
      deferLayerMapApplyRef.current = false;
      applyPanelDraft();
      if (closePanel) {
        startTransition(() => setShowLeftPanel(false));
      }
    },
    [applyPanelDraft],
  );

  const toggleLeftPanel = useCallback(() => {
    startTransition(() => {
      setShowLeftPanel((open) => {
        if (open) {
          dismissLayerPanel(true);
          return false;
        }
        setIntelSheetOpen(false);
        setRegionNavSelection(null);
        setEconNavSelection(null);
        return true;
      });
    });
  }, [dismissLayerPanel]);

  const closeLeftPanel = useCallback(() => {
    dismissLayerPanel(true);
  }, [dismissLayerPanel]);

  const handleResetCheckboxSettings = useCallback(() => {
    const next: LayerPrefs = ultraLiteRef.current
      ? applyUltraLiteToLayerPrefs({
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        })
      : {
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        };
    panelDraftPatchRef.current = {};
    deferLayerMapApplyRef.current = false;
    applyLayerPrefs(next);

    const base = categorySnapshotRef.current ?? frozenPanelCategories;
    if (base) {
      const updated = base.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const key = LAYER_ITEM_PREF_KEYS[item.id];
          if (!key || typeof next[key] !== "boolean") return item;
          return { ...item, checked: next[key] as boolean };
        }),
      }));
      categorySnapshotRef.current = updated;
      setFrozenPanelCategories(updated);
    }
    layerPanelSessionRef.current += 1;
  }, [applyLayerPrefs, frozenPanelCategories, layerPrefs.labelLanguage]);

  function configureGlobe() {
    if (configuredGlobe.current) return;
    const globe = globeRef.current;
    if (!globe) return;

    configuredGlobe.current = true;
    globe.pointOfView({ lat: 25, lng: 105, altitude: 2.25 }, 0);
    setGlobeReady(true);

    const controls = globe.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = globeDistanceForAltitude(MIN_GLOBE_ALTITUDE);
    controls.maxDistance = 720;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.18;

    const syncViewState = () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      if (!isCameraMovingRef.current) {
        isCameraMovingRef.current = true;
        setIsCameraMoving(true);
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
      }
      renderStabilizeIdleRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
      }, MOVING_IDLE_DELAY_MS);

      const pov = globe.pointOfView();

      if (pov.altitude < MIN_GLOBE_ALTITUDE) {
        globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: MIN_GLOBE_ALTITUDE }, 0);
      }

      // 드래그 중 setViewState 금지 — 대시보드 전체 리렌더가 프레임을 갉아먹음 (idle에서만 반영)
      lastViewUpdateAt.current = Date.now();

      moveIdleTimerRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        const idlePov = globe.pointOfView();
        const nextTier = getStableLodTier(layerLodTierRef.current, idlePov.altitude);
        const tierChanged = nextTier !== layerLodTierRef.current;
        if (tierChanged) {
          layerLodTierRef.current = nextTier;
          const nextLayerAltitude = LOD_TIER_ANCHOR_ALTITUDE[nextTier];
          layerAltitudeRef.current = nextLayerAltitude;
          setLayerAltitude(nextLayerAltitude);
        } else if (
          Math.abs(idlePov.altitude - layerAltitudeRef.current) >= LAYER_ALTITUDE_SYNC_MIN_DELTA
        ) {
          layerAltitudeRef.current = idlePov.altitude;
          setLayerAltitude(idlePov.altitude);
        }

        const nextCenter = { lat: idlePov.lat, lng: idlePov.lng };
        lastFilterCenterUpdateAt.current = Date.now();
        layerCenterRef.current = nextCenter;
        setFilterCenter(nextCenter);

        setViewState({
          lat: idlePov.lat,
          lng: idlePov.lng,
          altitude: idlePov.altitude,
        });
      }, MOVING_IDLE_DELAY_MS);
    };

    controls.addEventListener("change", syncViewState);
    syncViewState();
  }

  const flyTo = useCallback((lat: number, lng: number, altitude = 1.18, durationMs = 850) => {
    const clampedAlt = clampGlobeAltitude(altitude);
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = false;

    const busyMs = cameraFlyBusyMs(durationMs);
    cameraTweenUntilRef.current = cameraBusyUntilAfterFly(durationMs);
    isCameraMovingRef.current = true;
    setIsCameraMoving(true);

    if (flyBusyTimerRef.current != null) {
      window.clearTimeout(flyBusyTimerRef.current);
    }
    if (renderStabilizeIdleRef.current != null) {
      window.clearTimeout(renderStabilizeIdleRef.current);
      renderStabilizeIdleRef.current = null;
    }

    globeRef.current?.pointOfView({ lat, lng, altitude: clampedAlt }, durationMs);

    flyBusyTimerRef.current = window.setTimeout(() => {
      flyBusyTimerRef.current = null;
      cameraTweenUntilRef.current = 0;
      const pov = globeRef.current?.pointOfView();
      if (!pov) {
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
        return;
      }
      const nextAlt = clampGlobeAltitude(pov.altitude);
      // fly 완료 시 한 번에 LOD·뷰 반영 (tween 중 프레임 업데이트 없음)
      setViewState({
        lat: pov.lat,
        lng: pov.lng,
        altitude: nextAlt,
      });
      layerCenterRef.current = { lat: pov.lat, lng: pov.lng };
      layerAltitudeRef.current = nextAlt;
      layerLodTierRef.current = getGlobeLod(nextAlt).tier;
      setLayerAltitude(nextAlt);
      setFilterCenter({ lat: pov.lat, lng: pov.lng });
      renderStabilizeIdleRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
      }, CAMERA_IDLE_DEBOUNCE_MS);
    }, busyMs);
  }, []);

  function openIntelSheet(options?: {
    theater?: IntelTheaterFilter;
    tab?: "news" | "telegram" | "viina";
    lat?: number;
    lng?: number;
    altitude?: number;
  }) {
    setSelected(null);
    setRegionNavSelection(null);
    setIntelTheaterFilter(options?.theater ?? "all");
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(options?.theater ?? "all", options?.tab ?? "news");
    if (options?.lat != null && options?.lng != null) {
      flyTo(options.lat, options.lng, options.altitude ?? 0.92);
    }
  }

  const handleViinaEventFlyTo = useCallback(
    (event: ViinaFrontEvent) => {
      setIntelSheetOpen(false);
      flyTo(event.lat, event.lng, 0.68);
    },
    [flyTo],
  );

  const openIntelFromCoords = useCallback((lat: number, lng: number, altitude = 0.92) => {
    setSelected(null);
    setRegionNavSelection(null);
    setIntelTheaterFilter(newsTheaterFromCoords(lat, lng));
    setIntelSheetOpen(true);
    intelStackRef.current?.openNewsPanel(newsTheaterFromCoords(lat, lng), "news");
    flyTo(lat, lng, altitude);
  }, [flyTo]);

  function handleIntelFlyTo(target: MapFlyTarget) {
    if (target.kind === "coords") {
      flyTo(target.lat, target.lng, target.altitude ?? 0.92);
      return;
    }
    const center = THEATER_FLY_TO[target.theater];
    flyTo(center.lat, center.lng, center.altitude);
  }

  const computeRegionFitAltitude = useCallback((bbox: RegionBBox, fallbackAltitude: number) => {
    const latSpan = Math.max(REGION_MIN_SPAN_DEG, (bbox.maxLat - bbox.minLat) * REGION_FIT_PADDING);
    const lngSpan = Math.max(REGION_MIN_SPAN_DEG, longitudeDistance(bbox.minLng, bbox.maxLng) * REGION_FIT_PADDING);
    const aspect = Math.max(0.75, size.width / Math.max(1, size.height));
    const dominantSpan = Math.max(latSpan, lngSpan / aspect);
    // 넓은 전장(중동급)일수록 ISS급 원거리에 가깝게 — 타이트 줌인 방지
    const fittedAltitude =
      dominantSpan <= 8
        ? 0.72 + dominantSpan * 0.08
        : dominantSpan <= 24
          ? 1.35 + (dominantSpan - 8) * 0.028
          : Math.min(ORBITAL_OVERVIEW_ALTITUDE + 0.15, 1.55 + (dominantSpan - 24) * 0.012);
    const seededAltitude = fittedAltitude * 0.72 + fallbackAltitude * 0.28;
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    const minAltitude =
      isInUkraineTheater(centerLat, centerLng) ? MIN_GLOBE_ALTITUDE : REGION_MIN_ALTITUDE;
    return clamp(seededAltitude, minAltitude, REGION_MAX_ALTITUDE);
  }, [size.height, size.width]);

  const flyToBounds = useCallback(
    (
      selection: NavSelection,
      durationMs = 850,
      mode: "overview" | "detail" = "overview",
    ) => {
    const targetLat = (selection.bbox.minLat + selection.bbox.maxLat) / 2;
    const targetLng = (selection.bbox.minLng + selection.bbox.maxLng) / 2;
      const fittedAltitude = computeRegionFitAltitude(selection.bbox, selection.altitude);
      const targetAltitude =
        mode === "overview"
          ? Math.max(
              fittedAltitude,
              selection.altitude,
              THEATER_ENTRY_MIN_ALTITUDE,
              ORBITAL_OVERVIEW_ALTITUDE * 0.92,
            )
          : fittedAltitude;
    flyTo(targetLat, targetLng, targetAltitude, durationMs);
    },
    [computeRegionFitAltitude, flyTo],
  );

  function enterEconomyRegionFocus(selection: NavSelection) {
    closeLeftPanel();
    setSelected(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
    setRegionNavSelection(null);
    setEconNavSelection(selection);
    flyToBounds(selection, 1100, "overview");

    const conceptLayers = conceptLayersForEconomyNavId(selection.id);
    if (Object.keys(conceptLayers).length > 0) {
      requestAnimationFrame(() => {
        toggleCategoryPrefs(conceptLayers);
      });
    }
  }

  function enterTheaterFocus(selection: NavSelection, tab: TheaterSidebarTab = "news") {
    const config = theaterFocusFromNav(selection);
    if (isUkraineNavId(selection.id)) {
      setUkraineFrontLegendEngaged(true);
    } else {
      setUkraineFrontLegendEngaged(false);
    }
    closeLeftPanel();
    setSelected(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
    setEconNavSelection(null);
    setRegionNavSelection(selection);
    setTheaterSidebarTab(tab);
    setIntelTheaterFilter(config.newsTheater);
    immediateUntilRef.current = Date.now() + 1800;
    ukraineZoomPendingRef.current = false;
    neptunZoomPendingRef.current = false;
    flyToBounds(selection, 1100, "overview");

    const conceptLayers = conceptLayersForConflictNavId(selection.id);
    requestAnimationFrame(() => {
      toggleCategoryPrefs(conceptLayers);
    });

    if (config.enableUkraineLayers) {
      if (ukraineControl.length === 0 && viinaMeta?.available) {
        void refreshUkraineControl();
      }
    }
  }

  enterTheaterFocusRef.current = enterTheaterFocus;
  enterEconomyRegionFocusRef.current = enterEconomyRegionFocus;

  useEffect(() => {
    if (packageTheaterFocusPlayedRef.current || !globeReady || isLoading || loadError) return;
    const navId =
      viewUi.autoEnterTheaterNavId ?? initialViewConfig?.ui.autoEnterTheaterNavId ?? null;
    if (!navId) return;
    const sel = navSelectionFromId(navId);
    if (!sel) return;
    packageTheaterFocusPlayedRef.current = true;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    enterTheaterFocusRef.current(sel);
  }, [
    globeReady,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isLoading,
    loadError,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (packageEconFocusPlayedRef.current || !globeReady || isLoading || loadError) return;
    const navId = viewUi.autoEnterEconNavId ?? initialViewConfig?.ui.autoEnterEconNavId ?? null;
    if (!navId) return;
    const sel = econNavSelectionFromId(navId);
    if (!sel) return;
    packageEconFocusPlayedRef.current = true;
    introPlayedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }
    enterEconomyRegionFocusRef.current(sel);
  }, [
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    isLoading,
    loadError,
    viewUi.autoEnterEconNavId,
  ]);

  function flyToTheaterDetail() {
    if (!theaterFocusConfig) return;
    if (theaterFocusConfig.enableUkraineLayers) {
      setUkraineFrontLegendEngaged(true);
    }
    const detail = theaterFocusConfig.detailSelection;
    if (theaterFocusConfig.enableUkraineLayers) {
      ukraineZoomPendingRef.current = true;
      if (showUkraineControl && globeReady) {
        flyToBounds(detail, 1100, "detail");
      }
      return;
    }
    flyToBounds(detail, 1100, "detail");
  }

  useEffect(() => {
    if (!showUkraineControl || !globeReady || !ukraineZoomPendingRef.current) return;
    if (ukraineControl.length === 0) return;

    ukraineZoomPendingRef.current = false;
    const extraPoints = UKRAINE_SITUATION_PATHS.flatMap((path) => path.points);
    const bbox = computeUkraineFrontFitBbox(ukraineControl, extraPoints);
    const targetLat = (bbox.minLat + bbox.maxLat) / 2;
    const targetLng = (bbox.minLng + bbox.maxLng) / 2;
    const targetAltitude = computeRegionFitAltitude(bbox, 0.22);
    layerCenterRef.current = { lat: targetLat, lng: targetLng };
    layerAltitudeRef.current = targetAltitude;
    layerLodTierRef.current = getGlobeLod(targetAltitude).tier;
    setFilterCenter({ lat: targetLat, lng: targetLng });
    setLayerAltitude(targetAltitude);
    flyTo(targetLat, targetLng, targetAltitude, 1100);
  }, [computeRegionFitAltitude, flyTo, globeReady, showUkraineControl, ukraineControl]);

  useEffect(() => {
    if (!isUkraineTheaterFocus) return;
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(false);
    setShowLocalAlertPanel(false);
  }, [isUkraineTheaterFocus]);

  useEffect(() => {
    if (!showNeptun || !globeReady || !neptunZoomPendingRef.current) return;
    neptunZoomPendingRef.current = false;
    const targetLat = 49;
    const targetLng = 32;
    const targetAltitude = 0.72;
    layerCenterRef.current = { lat: targetLat, lng: targetLng };
    layerAltitudeRef.current = targetAltitude;
    layerLodTierRef.current = getGlobeLod(targetAltitude).tier;
    setFilterCenter({ lat: targetLat, lng: targetLng });
    setLayerAltitude(targetAltitude);
    flyTo(targetLat, targetLng, targetAltitude, 1100);
  }, [flyTo, globeReady, showNeptun]);

  useEffect(() => {
    if (!initialViewConfig?.ui.openLayerPanel) return;
    const timer = window.setTimeout(() => setShowLeftPanel(true), 0);
    return () => window.clearTimeout(timer);
  }, [initialViewConfig?.ui.openLayerPanel]);

  function applyMergedViewConfig(
    merged: MergedViewConfig,
    packages: ViewPackageId[],
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = merged.economyHub ?? "auto",
  ) {
    dismissLayerPanel(true);
    startTransition(() => {
      applyLayerPrefs(merged.layers);
      setViewUi(merged.ui);
      setViewTheater(theater);
      setViewEconomyHub(economyHub);
      setViewPackages(packages.filter((id) => id !== "custom"));
      setIntelTheaterFilter(theater !== "auto" ? theater : "all");
      setShowModePicker(false);
      setModePickerLockMode(false);
      setModePickerInitialMode(null);
      setEntryGate(null);
      markWelcomeGateDone();
      if (merged.ui.openLayerPanel) {
        setShowLeftPanel(true);
      }
      if (merged.ui.autoOpenIntelSheet) {
        openIntelSheet({
          theater: theater !== "auto" ? theater : "all",
          tab: merged.ui.defaultIntelTab,
        });
      }
    });
  }

  function handleModeApply(
    mode: ViewerMode,
    theater: ViewTheaterChoice,
    economyHub: EconomyHubChoice = "auto",
  ) {
    setIntelSheetOpen(false);
    setRegionNavSelection(null);
    setEconNavSelection(null);
    setSelected(null);
    packageTheaterFocusPlayedRef.current = false;
    packageEconFocusPlayedRef.current = false;
    introPlayedRef.current = false;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(INTRO_SESSION_KEY);
    }
    const effectiveTheater = mode === "conflict" ? theater : "auto";
    const effectiveHub = mode === "economy" ? economyHub : "auto";
    const { merged, packages } = applyViewerMode(mode, effectiveTheater, effectiveHub);
    applyMergedViewConfig(merged, packages, effectiveTheater, effectiveHub);
    if (mode === "economy") {
      setGdeltEvents([]);
      setGdeltFetchedAt(null);
      setGdeltError(null);
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
    }
  }

  function handleCustomLayerApply() {
    const merged = applyViewPackages(["custom"], "auto");
    applyMergedViewConfig(merged, ["custom"], "auto");
  }

  function handleViewerModeChange(mode: ViewerMode) {
    if (viewerMode === mode) return;
    startTransition(() => {
      handleModeApply(
        mode,
        mode === "conflict" ? viewTheater : "auto",
        mode === "economy" ? viewEconomyHub : "auto",
      );
    });
  }

  useEffect(() => {
    if (isLoading || loadError || !globeReady || introPlayedRef.current) return;
    if (viewUi.autoEnterTheaterNavId ?? initialViewConfig?.ui.autoEnterTheaterNavId) return;
    if (viewUi.autoEnterEconNavId ?? initialViewConfig?.ui.autoEnterEconNavId) return;

    if (typeof window !== "undefined" && sessionStorage.getItem(INTRO_SESSION_KEY)) {
      introPlayedRef.current = true;
      return;
    }

    introPlayedRef.current = true;

    if (showUkraineControl) {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      return;
    }

    const topAlert = localDisputeAlerts[0];
    const introTarget = resolveIntroFlyTarget({
      viewerMode,
      theater: viewTheater,
      economyHub: viewEconomyHub,
      topAlert: topAlert ? { lat: topAlert.center.lat, lng: topAlert.center.lng } : null,
      conflictNavId: hottestConflictNavId(localDisputeAlerts),
      economyNavId: hottestEconomyNavId(localDisputeAlerts),
    });

    const startTimer = window.setTimeout(() => {
      setShowIntroHint(true);
      if (introTarget?.kind === "coords") {
        flyTo(
          introTarget.lat,
          introTarget.lng,
          introTarget.altitude ?? ORBITAL_OVERVIEW_ALTITUDE,
          INTRO_CAMERA_DURATION_MS,
        );
      } else if (introTarget?.kind === "exploration") {
        if (isEconomyViewer) {
          const sel = econNavSelectionFromId(introTarget.presetId);
          if (sel) enterEconomyRegionFocusRef.current(sel);
        } else {
          const preset = EXPLORATION_PRESETS.find((item) => item.id === introTarget.presetId);
          if (preset) {
            enterTheaterFocusRef.current(toNavSelection(preset.navItem, preset.groupId));
          }
        }
      }
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }, INTRO_CAMERA_DELAY_MS);

    const hintTimer = window.setTimeout(() => {
      setShowIntroHint(false);
    }, INTRO_CAMERA_DELAY_MS + INTRO_CAMERA_DURATION_MS + 600);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hintTimer);
    };
  }, [
    flyTo,
    globeReady,
    initialViewConfig?.ui.autoEnterEconNavId,
    initialViewConfig?.ui.autoEnterTheaterNavId,
    isEconomyViewer,
    isLoading,
    loadError,
    localDisputeAlerts,
    showUkraineControl,
    viewEconomyHub,
    viewTheater,
    viewerMode,
    viewUi.autoEnterEconNavId,
    viewUi.autoEnterTheaterNavId,
  ]);

  useEffect(() => {
    if (isLoading || !globeReady || loadError) return;
    if (entryGate !== null || showModePicker) return;
    if (readWelcomeGateDone()) return;
    setEntryGate("caution");
  }, [entryGate, globeReady, isLoading, loadError, showModePicker]);

  useEffect(() => {
    if (showModePicker || entryGate !== null || isLoading || !globeReady || loadError) return;
    if (shouldShowViewerIntro(viewerMode)) {
      setShowViewerIntro(true);
    }
  }, [entryGate, showModePicker, isLoading, globeReady, loadError, viewerMode]);

  function openModePickerManual() {
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    setShowModePicker(true);
  }

  function handleDomainSelect(mode: ViewerMode, ultraLiteOn: boolean) {
    ultraLiteRef.current = ultraLiteOn;
    setUltraLite(ultraLiteOn);
    savePerfPrefs({ ultraLite: ultraLiteOn });
    applyLayerPrefs(
      ultraLiteOn
        ? applyUltraLiteToLayerPrefs(loadLayerPrefs())
        : applyNormalCapToLayerPrefs(loadLayerPrefs()),
    );
    setModePickerInitialMode(mode);
    setModePickerLockMode(true);
    setEntryGate("mode");
    setShowModePicker(true);
  }

  function handleModePickerCancel() {
    setShowModePicker(false);
    setModePickerLockMode(false);
    setModePickerInitialMode(null);
    if (entryGate === "mode" && !readWelcomeGateDone()) {
      setEntryGate("domain");
    } else {
      setEntryGate(null);
    }
  }

  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!shouldShowQuickStart(viewerMode)) return;
    const timer = window.setTimeout(() => setShowQuickStart(true), 1200);
    return () => window.clearTimeout(timer);
  }, [entryGate, globeReady, isLoading, loadError, showModePicker, viewerMode]);

  const layerDebugPrevRef = useRef<{
    labels: number;
    heatmaps: number;
    polygons: number;
    paths: number;
    labelKey: string;
    heatmapKey: string;
    polygonKey: string;
    pathKey: string;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const labelKey = globeLabels
      .slice(0, 24)
      .map((item) => `p:${item.id}`)
      .join("|");
    const heatmapKey = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const polygonKey = polygonData
      .slice(0, 24)
      .map((item) => `${item.polygonLayer}:${item.id}`)
      .join("|");
    const pathKey = rawGlobePaths
      .slice(0, 24)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|");

    const next = {
      labels: globeLabels.length,
      heatmaps: rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0),
      polygons: polygonData.length,
      paths: rawGlobePaths.length,
      labelKey,
      heatmapKey,
      polygonKey,
      pathKey,
    };

    const prev = layerDebugPrevRef.current;
    if (prev) {
      const churned =
        prev.labelKey !== next.labelKey ||
        prev.heatmapKey !== next.heatmapKey ||
        prev.polygonKey !== next.polygonKey ||
        prev.pathKey !== next.pathKey;
      if (churned) {
        console.debug("[globe-layer-churn]", {
          viewAltitude: Number(viewState.altitude.toFixed(3)),
          layerAltitude: Number(layerViewState.altitude.toFixed(3)),
          lodTier: layerLodTierRef.current,
          labels: `${prev.labels} -> ${next.labels}`,
          heatmapPoints: `${prev.heatmaps} -> ${next.heatmaps}`,
          polygons: `${prev.polygons} -> ${next.polygons}`,
          paths: `${prev.paths} -> ${next.paths}`,
        });
      }
    }
    layerDebugPrevRef.current = next;
  }, [
    globeLabels,
    rawGlobePaths,
    layerViewState.altitude,
    polygonData,
    rawTensionHeatmaps,
    viewState.altitude,
  ]);

  function handleNavNavigate(selection: NavSelection) {
    if (isEconomyViewer) {
      enterEconomyRegionFocus(selection);
    } else {
      enterTheaterFocus(selection);
    }
  }

  function handleExplorationSelect(preset: (typeof EXPLORATION_PRESETS)[number]) {
    handleNavNavigate(toNavSelection(preset.navItem, preset.groupId));
  }

  function handleRegionEventSelect(event: ScoredEvent) {
    flyTo(event.lat, event.lng, 0.72);
    openSelection({ kind: "event", item: event });
  }

  const handleNeptunThreatSelect = useCallback(
    (threat: NeptunLiveThreat) => {
      dismissLayerPanel(true);
    setRegionNavSelection(null);
    setIntelSheetOpen(false);
      setUkraineFrontLegendEngaged(true);
      if (!showUkraineControl) togglePref("showUkraineControl", true);
      if (!showNeptun) togglePref("showNeptun", true);
      requestAnimationFrame(() => {
    flyTo(threat.predictedLat, threat.predictedLon, 0.58);
        setSelected({ kind: "neptun-threat", item: threat });
      });
    },
    [dismissLayerPanel, flyTo, showNeptun, showUkraineControl, togglePref],
  );

  function handleAlertSelect(alert: DisputeAlert) {
    setRegionNavSelection(null);
    setIntelSheetOpen(false);
    setShowDisputeLegendPanel(true);
    flyTo(alert.center.lat, alert.center.lng, 0.88);
    openSelection({ kind: "dispute", item: alert });
  }

  function handleGdeltAlertSelect(alert: MenuCoreAlert) {
    setRegionNavSelection(null);
    setIntelSheetOpen(false);
    flyTo(alert.lat, alert.lng, 0.88);
    openSelection({ kind: "event", item: alert });
  }

  const handleAirRaidFocus = useCallback(
    (target: AirRaidFocusTarget, kind: AirRaidSirenKind) => {
      flyTo(target.lat, target.lng, AIR_RAID_FLY_ALTITUDE, AIR_RAID_FLY_MS);
      playAirRaidSirenAfterFly(kind);
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
        airRaidFocusClearRef.current = null;
      }
      setAirRaidFocusPaths(
        buildAirRaidFocusHatchPaths(target.lat, target.lng, kind, target.label),
      );
      airRaidFocusClearRef.current = window.setTimeout(() => {
        setAirRaidFocusPaths([]);
        airRaidFocusClearRef.current = null;
      }, AIR_RAID_FOCUS_HATCH_MS);
    },
    [flyTo],
  );

  useEffect(() => {
    return () => {
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
      }
    };
  }, []);

  function openSelection(next: Selection) {
    dismissLayerPanel(true);
    setSelected(next);
  }

  function handlePointClick(event: ConflictEvent) {
    openIntelFromCoords(event.lat, event.lng, 0.92);
  }

  const handleCarrierSelect = useCallback((carrier: UsCarrier) => {
    openSelection({ kind: "us-carrier", item: carrier });
    flyTo(carrier.lat, carrier.lng, 0.75);
  }, [flyTo]);

  const createHtmlOverlayElement = useCallback(
    (point: object) => {
      const item = point as HtmlOverlayMarker;
      const alt = layerAltitudeRef.current;
      if (item.displayKind === "event") {
        return createEventPinElement(
          item,
          alt,
          {
            onHover: handleHtmlMarkerHover,
            onClick: (eventPoint) => {
              openIntelFromCoords(eventPoint.lat, eventPoint.lng, 0.92);
            },
          },
          { newsAlert: true },
        );
      }
      if (item.displayKind === "us-carrier-html") {
        return createUsCarrierBadge(
          item,
          {
            onHover: setHoveredCarrier,
            onClick: handleCarrierSelect,
          },
          { labelOffsetY: usCarrierLabelOffsets.get(item.id) ?? 0 },
        );
      }
      if (item.displayKind === "gdelt-tag-html") {
        return createGdeltLocationTagBadge(
          item,
          alt,
          {
            onHover: handleHtmlMarkerHover,
            onClick: (event) => {
              openIntelFromCoords(event.lat, event.lng, 0.92);
            },
          },
        );
      }
      if (item.displayKind === "situation-callout") {
        return createSituationCalloutBadge(item);
      }
      if (item.displayKind === "ua-settlement-html") {
        return createUkraineSettlementLabelElement(
          normalizeLabelText(item.name) || "마을",
          item.tier,
        );
      }
      if (item.displayKind === "neptun-html") {
        return createNeptunThreatBadge(item, {
          onHover: setHoveredNeptunThreat,
          onClick: handleNeptunThreatSelect,
        });
      }
      if (item.displayKind === "neptun-impact") {
        return createNeptunImpactFlashElement(item);
      }
      return createAirportPortBadge(item as StaticGlobePoint, handleHtmlMarkerHover, alt);
    },
    [handleCarrierSelect, handleHtmlMarkerHover, handleNeptunThreatSelect, openIntelFromCoords, usCarrierLabelOffsets],
  );

  function handleGlobePointClick(point: GlobeDisplayPoint) {
    if (
      point.displayKind === "static" ||
      point.displayKind === "mil" ||
      point.displayKind === "firms-fire" ||
      point.displayKind === "conflict-cluster"
    ) {
      if (point.displayKind === "conflict-cluster") {
        skipNextGlobeClickRef.current = true;
        openIntelFromCoords(point.lat, point.lng, 0.85);
        return;
      }
      if (point.displayKind === "firms-fire") {
        flyTo(point.lat, point.lng, 0.65);
        return;
      }
      if (
        point.displayKind === "static" &&
        (point.kind === "chokepoint" || point.kind === "logistics-hub")
      ) {
        flyTo(point.lat, point.lng, 0.72);
      }
      return;
    }
    if (point.displayKind === "tzeva-adom") {
      flyTo(point.lat, point.lng, 0.75);
      return;
    }
    if (point.displayKind === "event") {
      handlePointClick(point);
    }
  }

  function handlePathClick(path: TransportPath) {
    const dispute =
      path.kind === "dispute-zone" || path.kind === "dispute-hatch"
        ? disputeFromPath(path)
        : undefined;
    if (!dispute) return;

    skipNextGlobeClickRef.current = true;
    const center = resolveDisputeCenter(dispute);
    openIntelFromCoords(center.lat, center.lng, 0.88);
  }

  function handlePolygonClick(feature: PolygonLayerFeature) {
    if (feature.polygonLayer === "country") {
      openSelection({ kind: "country", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 1.05);
      return;
    }

    if (feature.polygonLayer === "military-base") {
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "conflict-zone") {
      openIntelFromCoords(feature.center.lat, feature.center.lng, 0.85);
      return;
    }

    if (isUkraineViinaPolygonLayer(feature.polygonLayer)) {
      openSelection({ kind: "ukraine-control", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 0.72);
    }
  }

  function handleGlobeClick(coords: { lat: number; lng: number }) {
    if (skipNextGlobeClickRef.current) {
      skipNextGlobeClickRef.current = false;
      return;
    }

    // 빈 영역 클릭 시 이전 선택/호버 정보를 정리해 잔상 툴팁을 제거
    setSelected(null);
    setHoveredPoint(null);
    setHoveredCarrier(null);
    setHoveredPolygon(null);
    setHoveredPath(null);

    const now = Date.now();
    if (now - lastGlobeClickAt.current < 320) {
      flyTo(coords.lat, coords.lng, 0.12);
    }
    lastGlobeClickAt.current = now;
  }

  function handleSearchSelect(place: SearchPlace) {
    setQuery(place.name);
    flyTo(place.lat, place.lng, place.type === "city" ? 0.88 : 1.1);

    if (place.type === "dispute") {
      const dispute = (data.disputes ?? []).find((area) => `search-${area.id}` === place.id);
      if (dispute) {
        const center = resolveDisputeCenter(dispute);
        openIntelFromCoords(center.lat, center.lng, 0.88);
      }
    }

    if (place.type === "country") {
      const country = data.countries.find((item) => `country-${item.id}` === place.id);
      if (country) openSelection({ kind: "country", item: country });
    }
  }

  return (
    <LocaleProvider lang={labelLanguage}>
    <main className="relative flex h-screen w-screen flex-col overflow-hidden space-ambient text-slate-100">

      <SoundEffectsBridge
        viewerMode={viewerMode}
        neptunImpactInView={neptunImpactInView}
        firmsCombatInView={firmsCombatInView}
        conflictAmbient={soundConflictAmbient}
        economyAmbient={soundEconomyAmbient}
        cameraAltitude={layerAltitude}
      />

      <HoverNav
        viewerMode={viewerMode}
        onNavigate={handleNavNavigate}
        lastUpdated={liveUpdatedAt || data.generatedAt || null}
        liveStatus={liveStatus}
        query={query}
        onQueryChange={setQuery}
        searchResults={searchResults}
        onSearchSelect={handleSearchSelect}
      />

      <ViewModeSwitcher mode={viewerMode} onChange={handleViewerModeChange} />

      <NewsStreamProvider
        visible={
          !showLeftPanel &&
          (intelSheetOpen ||
            regionNavSelection != null ||
            econNavSelection != null ||
            (!selected && !isUkraineTheaterFocus))
        }
        theaterFilter={intelTheaterFilter}
        onTheaterFilterChange={setIntelTheaterFilter}
        viewPackages={viewPackages}
        labelLanguage={labelLanguage}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
      <section
        ref={mapSectionRef}
        className="relative min-h-0 flex-1 w-full"
        onMouseMove={handleMapPointerMove}
        onMouseLeave={handleMapPointerLeave}
      >
        <div
          ref={containerRef}
          className="relative h-full w-full"
          style={{ backgroundColor: globeTextures.backgroundColor }}
        >
          <div className="absolute inset-0 z-10">
          <PausedMapGlobeView
              interactionPaused={showLeftPanel}
              ref={globeRef}
              mapStyleUrl={globeTextures.mapStyleUrl}
              backgroundColor={globeTextures.backgroundColor}
              interactiveLayerIds={mapInteractiveLayerIds}
              onGlobeReady={configureGlobe}
              onGlobeMouseMove={handleGlobeMouseMove}
              heatmapsData={tensionHeatmaps}
              heatmapPoints={(layer: { points: { lat: number; lng: number; weight: number }[] }) =>
                layer.points
              }
              heatmapPointLat={(point: { lat: number }) => point.lat}
              heatmapPointLng={(point: { lng: number }) => point.lng}
              heatmapPointWeight={(point: { weight: number }) => point.weight}
              heatmapBandwidth={(layer: { bandwidth: number }) => layer.bandwidth}
              heatmapColorSaturation={(layer: { colorSaturation: number }) =>
                isCameraMoving
                  ? Math.max(0.45, layer.colorSaturation * 0.7)
                  : layer.colorSaturation
              }
              heatmapColorFn={(layer: { tier: "war" | "diplomatic" }) =>
                layer.tier === "war" ? warHeatmapColor : diplomaticHeatmapColor
              }
              heatmapBaseAltitude={() => 0.003}
              heatmapTopAltitude={() => (isCameraMoving ? 0.0048 : 0.006)}
              heatmapsTransitionDuration={0}
              pointsData={globeDisplayPoints}
              pointLat={(point: GlobeDisplayPoint) => point.lat}
              pointLng={(point: GlobeDisplayPoint) => point.lng}
              pointColor={(point: GlobeDisplayPoint) => {
                if (point.displayKind === "static") return STATIC_POINT_COLORS[point.kind];
                if (point.displayKind === "mil") return "rgba(248, 113, 113, 0.92)";
                if (point.displayKind === "firms-fire") {
                  return INTEL_NASA_FIRE;
                }
                if (point.displayKind === "tzeva-adom") {
                  return TZEVA_ADOM_MARKER;
                }
                if (point.displayKind === "conflict-cluster") {
                  if (point.tension === "high") return "rgba(239, 68, 68, 0.92)";
                  if (point.tension === "medium") return "rgba(249, 115, 22, 0.9)";
                  return "rgba(250, 204, 21, 0.88)";
                }

                return "rgba(148, 163, 184, 0.8)";
              }}
              pointRadius={(point: GlobeDisplayPoint) => {
                const alt = viewState.altitude;
                if (point.displayKind === "static") return staticPointRadius(point.kind, alt);
                if (point.displayKind === "mil") return 0.22 * getZoomOutScale(alt);
                if (point.displayKind === "firms-fire") {
                  const frp = point.frp ?? 0;
                  const base = frp >= 50 ? 0.28 : frp >= 20 ? 0.22 : 0.17;
                  return base * getZoomOutScale(alt);
                }
                if (point.displayKind === "tzeva-adom") {
                  return (point.active ? 0.42 : 0.28) * getZoomOutScale(alt);
                }
                if (point.displayKind === "conflict-cluster") {
                  const base = point.tension === "high" ? 0.55 : point.tension === "medium" ? 0.42 : 0.32;
                  return (
                    Math.min(0.7, base + Math.log10(Math.max(10, point.eventCount)) * 0.08) *
                    getZoomOutScale(alt)
                  );
                }

                return 0.15 * getZoomOutScale(alt);
              }}
              pointAltitude={() => 0.004}
              pointResolution={
                viewState.altitude < EXTREME_ZOOM_ALTITUDE ? 6 : isCameraMoving ? 8 : 14
              }
              pointsMerge={false}
              pointLabel={(point: GlobeDisplayPoint) => {
                if (point.displayKind === "static") {
                  const metaLines = point.meta
                    ? Object.entries(point.meta)
                        .filter(([, value]) => value != null && value !== "")
                        .slice(0, 3)
                        .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(String(value))}`)
                        .join("<br/>")
                    : "";
                  return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(STATIC_KIND_LABELS[point.kind])}</strong><br/>
                    ${escapeHtml(point.name)}
                    ${metaLines ? `<br/>${metaLines}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "mil") {
                  return `
                  <div style="max-width: 260px">
                    <strong>군사 항공기</strong><br/>
                    ${escapeHtml(point.callsign || point.hex)}
                    ${point.type ? `<br/>기종 ${escapeHtml(point.type)}` : ""}
                    ${point.altitude != null ? `<br/>고도 ${escapeHtml(String(point.altitude))} ft` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "firms-fire") {
                  const isBomb = firmsCombatFireIds.includes(point.id);
                  return `
                  <div style="max-width: 280px">
                    <strong>${isBomb ? "폭격·화재 추정 (NASA FIRMS)" : "위성 화재 탐지 (NASA FIRMS)"}</strong><br/>
                    ${isBomb ? "전쟁 뉴스 인근 열감지<br/>" : ""}
                    ${point.acqDate ? `관측 ${escapeHtml(point.acqDate)}` : "관측 시각 미상"}
                    ${point.acqTime ? ` ${escapeHtml(point.acqTime)} UTC` : ""}
                    ${point.frp != null ? `<br/>FRP ${escapeHtml(String(point.frp))} MW` : ""}
                    ${point.confidence ? `<br/>신뢰도 ${escapeHtml(point.confidence)}` : ""}
                    ${point.satellite ? `<br/>${escapeHtml(point.satellite)}` : ""}
                  </div>
                `;
                }
                if (point.displayKind === "conflict-cluster") {
                  return `
                  <div style="max-width: 280px">
                    <strong>AI 전쟁지역 (데모)</strong><br/>
                    ${escapeHtml(point.name)}<br/>
                    이벤트 ${point.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(point.tension)}
                  </div>
                `;
                }
                if (point.displayKind === "tzeva-adom") {
                  const regionKo = translateOrefRegion(point.region || "", labelLanguage);
                  const titleKo = translateOrefTitle(point.title || point.region || "", labelLanguage);
                  return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(tzevaUi("brand", labelLanguage))}</strong><br/>
                    ${escapeHtml(titleKo)}
                    ${regionKo ? `<br/>${escapeHtml(regionKo)}` : ""}
                  </div>
                `;
                }
                if (point.displayKind !== "event") return "";

                const tier = point.eventTier ?? "war";
                return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(TIER_LABELS[tier])}</strong>
                    ${isFreshEvent(point) ? " · <span style='color:#facc15'>최신 속보</span>" : ""}<br/>
                    ${escapeHtml(point.category)}${point.eventDate ? ` · ${escapeHtml(point.eventDate)}` : ""}<br/>
                    ${point.actor1Country || point.actor2Country ? `행위자 ${escapeHtml(point.actor1Country || "?")} ↔ ${escapeHtml(point.actor2Country || "?")}<br/>` : ""}
                    ${escapeHtml(hostFromUrl(point.sourceUrl))}
                  </div>
                `;
              }}
              onPointHover={(point: GlobeDisplayPoint | null) => {
                setHoveredPoint(point);
              }}
              onPointClick={(point: GlobeDisplayPoint) => handleGlobePointClick(point)}
              ringsData={conflictClusterRings}
              ringLat={(point: PulseRingPoint) => point.lat}
              ringLng={(point: PulseRingPoint) => point.lng}
              ringAltitude={() => 0.005}
              ringColor={(point: PulseRingPoint) => {
                if (point.pulseKind === "firms-bomb") {
                  const frp = point.frp ?? 0;
                  if (frp >= 50) return "rgba(255, 69, 0, 0.7)";
                  if (frp >= 20) return "rgba(239, 68, 68, 0.62)";
                  return "rgba(251, 146, 60, 0.55)";
                }
                if (point.tension === "high") return "rgba(239,68,68,0.55)";
                if (point.tension === "medium") return "rgba(249,115,22,0.5)";
                return "rgba(250,204,21,0.45)";
              }}
              ringMaxRadius={(point: PulseRingPoint) => {
                const scale = getZoomOutScale(viewState.altitude);
                if (point.pulseKind === "firms-bomb") {
                  const frp = point.frp ?? 0;
                  const base = frp >= 50 ? 2.4 : frp >= 20 ? 1.9 : 1.45;
                  return base * scale;
                }
                const base =
                  point.tension === "high" ? 1.8 : point.tension === "medium" ? 1.35 : 1.0;
                return base * scale;
              }}
              ringPropagationSpeed={2.2}
              htmlElementsData={htmlOverlayMarkers}
              htmlLat={(point: HtmlOverlayMarker) => point.lat}
              htmlLng={(point: HtmlOverlayMarker) => point.lng}
              htmlAltitude={() => 0.004}
              htmlElement={createHtmlOverlayElement}
              htmlElementVisibilityModifier={(el: HTMLElement, isVisible: boolean) => {
                el.style.opacity = isVisible ? "1" : "0";
                applyHtmlOverlayPointerEvents(el, isVisible);
                if (el.classList.contains(CARRIER_MARKER_ROOT_CLASS)) {
                  const stackY = Number(el.dataset.stackOffsetY || 0);
                  el.style.transform = isVisible
                    ? `translate(-50%, calc(-50% + ${stackY}px)) scale(1)`
                    : `translate(-50%, calc(-50% + ${stackY}px)) scale(0.86)`;
                  return;
                }
                if (el.classList.contains("gdelt-news-alert-marker")) {
                  el.style.transform = isVisible
                    ? "translate(-50%, -100%) scale(1)"
                    : "translate(-50%, -100%) scale(0.86)";
                  return;
                }
                el.style.transform = isVisible
                  ? "translate(-50%, -50%) scale(1)"
                  : "translate(-50%, -50%) scale(0.86)";
              }}
              htmlTransitionDuration={isViinaCloseZoom && showUkraineControl ? 0 : 280}
              labelsData={globeLabels}
              labelLat={(item: GlobeLabel) => item.lat}
              labelLng={(item: GlobeLabel) => item.lng}
              labelText={(item: GlobeLabel) => getSafePlaceLabel(item, labelLanguage)}
              labelSize={(item: GlobeLabel) =>
                getPlaceLabelSize(
                  getPlaceLabelTier(item.population, item.type, item.scalerank),
                  viewState.altitude,
                )
              }
              labelIncludeDot={() => true}
              labelDotRadius={(item: GlobeLabel) =>
                getPlaceLabelDotRadius(
                  getPlaceLabelTier(item.population, item.type, item.scalerank),
                  viewState.altitude,
                )
              }
              labelColor={(item: GlobeLabel) => {
                const tier = getPlaceLabelTier(item.population, item.type, item.scalerank);
                return getPlaceLabelColor(tier, showCityLabels);
              }}
              labelResolution={2}
              labelsTransitionDuration={0}
              labelAltitude={() => 0.006}
              polygonsData={polygonDataWithUkraine}
              polygonGeoJsonGeometry={(feature: PolygonLayerFeature) => feature.geometry}
              polygonCapColor={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") {
                  return COUNTRY_TEXTURE_MODE_FILL;
                }
                if (feature.polygonLayer === "military-base") return US_BASE_FILL;
                if (feature.polygonLayer === "conflict-zone") {
                  return COUNTRY_TEXTURE_MODE_FILL;
                }
                if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_FILL;
                if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_FILL;
                if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_FILL;
                return COUNTRY_TEXTURE_MODE_FILL;
              }}
              polygonFillOpacity={(feature: PolygonLayerFeature) => {
                if (isUkraineViinaPolygonLayer(feature.polygonLayer)) return 1;
                return 0.72;
              }}
              // sideColor 미설정 — falsy(undefined)는 polished 파서에서 런타임 오류 유발
              polygonStrokeColor={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") return POLYGON_NO_STROKE;
                if (feature.polygonLayer === "military-base") return US_BASE_STROKE;
                if (feature.polygonLayer === "conflict-zone") return "rgba(248,113,113,0.7)";
                if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_STROKE;
                if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_STROKE;
                if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_STROKE;
                return POLYGON_NO_STROKE;
              }}
              polygonAltitude={(feature: PolygonLayerFeature) => {
                if (feature.polygonLayer === "country") return COUNTRY_FILL_ALTITUDE;
                if (feature.polygonLayer === "military-base") return US_BASE_ALTITUDE;
                if (feature.polygonLayer === "conflict-zone") return CONFLICT_ZONE_ALTITUDE;
                if (isUkraineViinaPolygonLayer(feature.polygonLayer)) {
                  return UKRAINE_CONTROL_ALTITUDE;
                }
                return COUNTRY_FILL_ALTITUDE;
              }}
              polygonsTransitionDuration={0}
              polygonLabel={(feature: PolygonLayerFeature) => {
                if (isViinaCloseZoom && isUkraineViinaPolygonLayer(feature.polygonLayer)) {
                  return "";
                }
                if (feature.polygonLayer === "country") {
                  return `
                      <div style="max-width: 280px">
                        <strong>${escapeHtml(feature.name)}</strong><br/>
                        ${escapeHtml(feature.nameLong || feature.name)}
                        ${feature.isoA3 ? `<br/>${escapeHtml(feature.isoA3)}` : ""}
                        ${feature.continent ? ` · ${escapeHtml(feature.continent)}` : ""}
                      </div>
                    `;
                }

                if (feature.polygonLayer === "military-base") {
                  const meta = [
                    feature.component,
                    feature.jointBase,
                    feature.state,
                    feature.country,
                  ]
                    .filter(Boolean)
                    .map((value) => escapeHtml(String(value)))
                    .join(" · ");
                  return `
                      <div style="max-width: 300px">
                        <strong>미군기지</strong><br/>
                        ${escapeHtml(feature.name)}
                        ${meta ? `<br/>${meta}` : ""}
                      </div>
                    `;
                }

                if (feature.polygonLayer === "conflict-zone") {
                  const aiLine =
                    typeof feature.aiScore === "number"
                      ? `<br/>AI 신뢰도 ${feature.aiScore}%`
                      : "";
                  return `
                      <div style="max-width: 300px">
                        <strong>AI 전쟁지역 (데모)</strong><br/>
                        ${escapeHtml(feature.name)}<br/>
                        이벤트 ${feature.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(feature.tension)}${aiLine}
                      </div>
                    `;
                }

                return "";
              }}
              onPolygonClick={(feature: PolygonLayerFeature) => handlePolygonClick(feature)}
              onPolygonHover={
                isViinaCloseZoom && showUkraineControl
                  ? undefined
                  : (feature: PolygonLayerFeature | null) => {
                setHoveredPolygon(feature);
                    }
              }
              pathsData={
                airRaidFocusPaths.length > 0
                  ? [...globePaths, ...airRaidFocusPaths]
                  : globePaths
              }
              pathPoints={(path: TransportPath) => path.points}
              pathPointLat={(point: { lat: number; lng: number }) => point.lat}
              pathPointLng={(point: { lat: number; lng: number }) => point.lng}
              pathPointAlt={(point: { lat: number; lng: number; alt?: number }) => point.alt ?? 0}
              pathResolution={(path: TransportPath) =>
                path.kind === "neptun-trail" ||
                path.kind === "neptun-projection" ||
                path.kind === "neptun-trail-archived"
                  ? neptunPathElevation === "elevated"
                    ? 2.2
                    : neptunPathElevation === "low"
                      ? 1.8
                      : 1.4
                  : 2
              }
              pathsTransitionDuration={0}
              pathColor={(path: TransportPath) => {
                if (path.accentColor) return path.accentColor;
                if (path.kind === "coastline") return globeTextures.coastlineColor;
                if (path.kind === "country-border") {
                  return globeTextures.vectorBase ? globeTextures.borderColor : COUNTRY_BORDER_PATH_COLOR;
                }
                if (FLOW_PATH_KINDS.has(path.kind)) return INTEL_MISSILE_ARC;
                if (path.kind === "dispute-boundary") return "rgba(251, 191, 36, 0.92)";
                if (path.kind === "dispute-zone") {
                  const dispute = disputeFromPath(path);
                  if (dispute) return getDisputeOutlineColor(dispute);
                  const zone = conflictZoneFromPath(path);
                  if (zone) return getConflictZoneOutlineColor(zone);
                  return "rgba(251, 146, 60, 0.92)";
                }
                if (path.kind === "dispute-hatch") {
                  const dispute = disputeFromPath(path);
                  return dispute ? getDisputeHatchColor(dispute) : "rgba(251, 146, 60, 0.55)";
                }
                if (path.kind === "conflict-hatch") {
                  const grade = parseConflictHatchGrade(path.id);
                  if (grade) return TENSION_GRADE_STYLES[grade].hatch;
                  const zone = conflictZoneFromPath(path);
                  if (zone) return getConflictZoneHatchColor(zone);
                  return TENSION_GRADE_STYLES.medium.hatch;
                }
                if (path.kind === "shipping-lane") return PATH_LAYER_COLORS["shipping-lane"];
                if (path.kind === "submarine-cable") return PATH_LAYER_COLORS["submarine-cable"];
                if (path.kind === "oil-pipeline") return PATH_LAYER_COLORS["oil-pipeline"];
                if (path.kind === "gas-pipeline") return PATH_LAYER_COLORS["gas-pipeline"];
                if (path.kind === "arms-embargo") return ARMS_EMBARGO_STROKE;
                if (path.kind === "msr") return "rgba(250, 204, 21, 0.9)";
                if (
                  path.kind === "ukraine-ru-occupied" ||
                  path.kind === "ukraine-ru-occupied-hatch"
                ) {
                  return UKRAINE_RU_OCCUPIED_LINE;
                }
                if (
                  path.kind === "ukraine-ua-occupied" ||
                  path.kind === "ukraine-ua-occupied-hatch"
                ) {
                  return UKRAINE_UA_OCCUPIED_LINE;
                }
                if (
                  path.kind === "ukraine-ru-claim" ||
                  path.kind === "ukraine-ru-claim-hatch"
                ) {
                  return UKRAINE_RU_CLAIM_LINE;
                }
                if (
                  path.kind === "ukraine-ua-claim" ||
                  path.kind === "ukraine-ua-claim-hatch"
                ) {
                  return UKRAINE_UA_CLAIM_LINE;
                }
                if (path.kind === "ukraine-ua-front" || path.kind === "ukraine-ua-gain") {
                  return path.kind === "ukraine-ua-gain" ? UKRAINE_UA_GAIN_LINE : UKRAINE_UA_FRONT_LINE;
                }
                if (
                  path.kind === "ukraine-ru-front" ||
                  path.kind === "ukraine-contested-front"
                ) {
                  return UKRAINE_RU_FRONT_LINE;
                }
                if (path.kind === "ukraine-combat-zone") return UKRAINE_COMBAT_ZONE_LINE;
                if (path.kind === "ua-advance" || path.kind === "ua-axis") {
                  return UKRAINE_UA_FRONT_LINE;
                }
                if (path.kind === "ru-advance" || path.kind === "ru-axis") {
                  return UKRAINE_RU_FRONT_LINE;
                }
                return showRailGlow ? INFRA_COLORS.rail.glow : INFRA_COLORS.rail.dim;
              }}
              pathStroke={(path: TransportPath) => {
                if (isAirRaidFocusPath(path)) {
                  if (path.kind === "dispute-zone") return 3.2;
                  if (path.kind === "conflict-hatch") return 0.55;
                }
                if (path.kind === "neptun-trail") return 1.55;
                if (path.kind === "neptun-trail-archived") return 1.2;
                if (path.kind === "neptun-projection") return 1.05;
                if (path.kind === "coastline") return 0.38;
                if (path.kind === "country-border") {
                  return globeTextures.vectorBase
                    ? globeTextures.borderStrokeWidth
                    : 1.05;
                }
                if (path.kind === "dispute-boundary") return 0.52;
                if (path.kind === "dispute-zone") return 0.95;
                if (path.kind === "dispute-hatch") return 0.28;
                if (path.kind === "conflict-hatch") return 0.3;
                if (path.kind === "shipping-lane") return 0.48;
                if (path.kind === "submarine-cable") return 0.36;
                if (path.kind === "oil-pipeline") return 0.52;
                if (path.kind === "gas-pipeline") return 0.5;
                if (path.kind === "arms-embargo") return ARMS_EMBARGO_STROKE_WIDTH;
                if (path.kind === "msr") return 0.55;
                if (
                  path.kind === "ukraine-ru-occupied" ||
                  path.kind === "ukraine-ua-occupied" ||
                  path.kind === "ukraine-ru-claim" ||
                  path.kind === "ukraine-ua-claim"
                ) {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (
                  path.kind === "ukraine-ru-occupied-hatch" ||
                  path.kind === "ukraine-ua-occupied-hatch" ||
                  path.kind === "ukraine-ru-claim-hatch" ||
                  path.kind === "ukraine-ua-claim-hatch"
                ) {
                  return ukraineHatchStroke(globeLod.tier);
                }
                if (path.kind === "ukraine-ua-gain") {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (
                  path.kind === "ukraine-ru-front" ||
                  path.kind === "ukraine-contested-front" ||
                  path.kind === "ukraine-ua-front"
                ) {
                  return ukraineThinOutlineStroke(globeLod.tier);
                }
                if (path.kind === "ukraine-combat-zone") {
                  return ukraineCombatZoneStroke(globeLod.tier);
                }
                if (path.kind === "ua-advance" || path.kind === "ua-axis") {
                  return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
                }
                if (path.kind === "ru-advance" || path.kind === "ru-axis") {
                  return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
                }
                return showRailGlow ? INFRA_STROKE.rail.glow : INFRA_STROKE.rail.dim;
              }}
              pathDashLength={(path: TransportPath) => {
                if (path.kind === "neptun-projection") return 0.28;
                if (path.kind === "neptun-trail-archived") return 0.22;
                if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.42;
                if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
                  return 0.22;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 0.35 : 0;
              }}
              pathDashGap={(path: TransportPath) => {
                if (path.kind === "neptun-projection") return 0.16;
                if (path.kind === "neptun-trail-archived") return 0.14;
                if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.18;
                if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
                  return 0.14;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 0.12 : 0;
              }}
              pathDashAnimateTime={(path: TransportPath) => {
                if (
                  path.kind === "neptun-projection" ||
                  path.kind === "neptun-trail" ||
                  path.kind === "neptun-trail-archived"
                ) {
                  return 0;
                }
                return FLOW_PATH_KINDS.has(path.kind) ? 3500 : 0;
              }}
              pathLabel={(path: TransportPath) => {
                const lang = labelLanguage;
                const dispute =
                  path.kind === "dispute-zone" || path.kind === "dispute-hatch"
                    ? disputeFromPath(path)
                    : undefined;
                if (dispute) {
                  const overview = disputeOverviews.get(dispute.id);
                  const hatch = hatchStyleLabel(getDisputeHatchStyle(dispute), dispute, lang);
                  const combatLine = isCombatHazard(dispute)
                    ? `${escapeHtml(
                        lang === "en"
                          ? "Active combat · elevated risk"
                          : "실전투·폭격 · 피해가중",
                      )}<br/>`
                    : "";
                  const overviewLine = overview?.overviewKo
                    ? `<br/><span style="opacity:0.85">${escapeHtml(truncateOverview(overview.overviewKo, 180))}</span>`
                    : dispute.note
                      ? `<br/>${escapeHtml(dispute.note)}`
                      : "";
                  return `
                  <div style="max-width: 300px">
                    <strong>${escapeHtml(dispute.name)}</strong><br/>
                    ${escapeHtml(HOVER.disputeBorder(hatch, lang))}<br/>
                    ${combatLine}
                    ${escapeHtml(HOVER.tensionPrefix(getTensionLabel(dispute.tension, lang), lang))}
                    ${overviewLine}
                    <br/><span style="opacity:0.6;font-size:10px">${escapeHtml(HOVER.hintDetail(lang))}</span>
                  </div>
                `;
                }
                const kindLabel = getPathKindLabel(path.kind, lang);
                const lengthLabel =
                  path.lengthKm && Number.isFinite(path.lengthKm)
                    ? `<br/>${escapeHtml(HOVER.pathLength(path.lengthKm.toLocaleString(), lang))}`
                    : "";
                return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(path.name || kindLabel)}</strong><br/>
                    ${escapeHtml(kindLabel)}
                    ${lengthLabel}
                  </div>
                `;
              }}
              onPathHover={(path: TransportPath | null) => {
                setHoveredPath(path);
              }}
              onPathClick={(path: TransportPath) => handlePathClick(path)}
              onGlobeClick={(coords: { lat: number; lng: number }) => handleGlobeClick(coords)}
            />
          {loadError && (
            <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex justify-center sm:inset-x-auto sm:bottom-6 sm:max-w-md">
              <LoadErrorBanner message={loadError} compact />
            </div>
          )}
          {regionNavSelection && !selected && !intelSheetOpen && theaterFocusConfig ? (
            <TheaterDetailCta
              label={theaterFocusConfig.ctaLabel}
              onClick={flyToTheaterDetail}
            />
          ) : null}
          </div>
        </div>

        <UkraineFrontLegend
          visible={
            ukraineFrontLegendEngaged &&
            showUkraineControl &&
            !intelSheetOpen &&
            !showLeftPanel &&
            (!selected || selected.kind === "neptun-threat")
          }
          dockLow={ukraineFrontLegendEngaged && showUkraineControl}
          controlDate={ukraineControlDate}
          lodLabel={
            viinaDisplay.lod.mode === "hidden"
              ? "줌인 필요"
              : viinaDisplay.lod.mode === "overview"
                ? "점령 개요"
                : "상세"
          }
        />
        <div className="pointer-events-none absolute left-[4.5rem] top-3 z-[55]">
          <UsCarrierFixedToggle
            checked={showUsCarriers}
            onChange={setShowUsCarriers}
            carrierCount={usCarriers.length}
            deployedCount={deployedCarrierCount}
          />
        </div>
        <DisputeZoneLegend
          open={
            showAnyDisputeOverlay &&
            showDisputeLegendPanel &&
            !isUkraineTheaterFocus &&
            !showLeftPanel &&
            !selected &&
            !regionNavSelection
          }
          onClose={() => setShowDisputeLegendPanel(false)}
        />
        {!intelSheetOpen && !showLeftPanel && !selected && !regionNavSelection && !isUkraineTheaterFocus && (
          <div className="pointer-events-none absolute bottom-[var(--bottom-intel-stack-clearance)] left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
            {showAnyDisputeOverlay && !showDisputeLegendPanel && (
              <LegendReopenButton
                label="전쟁·외교 긴장 범례"
                accent="orange"
                onClick={() => setShowDisputeLegendPanel(true)}
              />
            )}
          </div>
        )}
        {/* Telegram OSINT — Intel 시트 Telegram 탭과 중복 방지 (시트 닫힘 + 레이어 ON일 때만 미니 패널) */}
        {showTelegramOsint && !isEconomyViewer && !intelSheetOpen && !selected && !regionNavSelection && (
          <TelegramOsintPanel
            alerts={telegramAlerts}
            live={telegramLive}
            liveStatus={telegramStatus}
            needsAuth={telegramNeedsAuth}
            sessionExists={telegramSessionExists}
            embedMode={telegramEmbedMode}
            channelCount={TELEGRAM_CHANNEL_COUNT}
          />
        )}
        {!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && bottomAlertPanel === "gdelt" && (
          <GdeltAlertPanel
            alerts={gdeltMenuCoreAlerts}
            liveStatus={gdeltLoading ? "loading" : gdeltError ? "error" : "ok"}
            errorMessage={gdeltError}
            onSelect={handleGdeltAlertSelect}
            onClose={() => setShowGdeltAlertPanel(false)}
          />
        )}
        {!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && bottomAlertPanel === "local" && (
          <LocalAlertPanel
            alerts={localDisputeAlerts}
            dataStatus={isLoading ? "loading" : loadError ? "error" : "ok"}
            errorMessage={loadError}
            onSelect={handleAlertSelect}
            onClose={() => setShowLocalAlertPanel(false)}
          />
        )}
        {!showLeftPanel && !selected && !regionNavSelection && hoverPointer && (
          <CursorHoverCard
            visible
            x={hoverPointer.x}
            y={hoverPointer.y}
            title={hoverCard.title}
            detail={hoverCard.detail}
            badge={"badge" in hoverCard ? hoverCard.badge : undefined}
            meta={hoverCard.meta}
            body={hoverCard.body}
            hint={hoverCard.hint}
          />
        )}
        <div
          className={
            !intelSheetOpen && !showLeftPanel && !selected && !isUkraineTheaterFocus
              ? "contents"
              : "pointer-events-none invisible"
          }
          aria-hidden={
            showLeftPanel ||
            intelSheetOpen ||
            selected !== null ||
            isUkraineTheaterFocus
          }
        >
          <IntelCompactBar
            deployedCarrierCount={deployedCarrierCount}
            showAllCarriers={showUsCarriers}
            showTicker={viewUi.showTicker}
            viewerMode={viewerMode}
            pauseUpdates={isCameraMoving}
            onOpenSheet={(theater) => openIntelSheet({ theater: theater ?? "all" })}
            onFlyToTheater={(theater) => {
              const target = flyTargetForTheater(theater);
              if (target) handleIntelFlyTo(target);
            }}
          />
        </div>
      </section>
        </div>

        <IntelNewsSheet
          ref={intelStackRef}
          open={intelSheetOpen && !showLeftPanel && !selected}
          onClose={() => setIntelSheetOpen(false)}
          onOpen={() => setIntelSheetOpen(true)}
          onFlyToMap={handleIntelFlyTo}
          showTelegram={!isEconomyViewer}
          telegramAlerts={telegramAlerts}
          telegramLive={telegramLive}
          telegramStatus={telegramStatus}
          telegramNeedsAuth={telegramNeedsAuth}
          telegramSessionExists={telegramSessionExists}
          telegramEmbedMode={telegramEmbedMode}
          telegramChannelCount={TELEGRAM_CHANNEL_COUNT}
          showViina={!isEconomyViewer && showUkraineControl}
          viinaEvents={viinaFrontEvents}
          viinaControlDate={ukraineControlDate}
          viinaRuCellCount={ukraineRuCellCount}
          viinaLoading={ukraineControlStatus === "loading"}
          onViinaFlyTo={handleViinaEventFlyTo}
          initialIntelTab={viewUi.defaultIntelTab}
          autoOpenOnMount={!viewUi.autoEnterTheaterNavId && viewUi.autoOpenIntelSheet}
        />

      {showIntroHint && (
        <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-40 flex justify-center">
          <div className="rounded-full border border-sky-300/25 bg-[#0a1830]/80 px-4 py-2 text-sm text-sky-100/90 shadow-lg backdrop-blur-md">
            {showUkraineControl ? "우크라이나 전선으로 이동 중…" : "주요 분쟁 지역으로 이동 중…"}
          </div>
        </div>
      )}

      <QuickStartCoach
        visible={
          showQuickStart &&
          !showViewerIntro &&
          !showLeftPanel &&
          !selected &&
          !regionNavSelection &&
          !econNavSelection &&
          !intelSheetOpen &&
          !showModePicker &&
          entryGate === null
        }
        viewerMode={viewerMode}
        onDismiss={() => setShowQuickStart(false)}
      />

      <ViewerIntroOverlay
        visible={
          showViewerIntro &&
          !showModePicker &&
          entryGate === null &&
          globeReady &&
          !isLoading
        }
        viewerMode={viewerMode}
        onDismiss={() => setShowViewerIntro(false)}
      />

      {showLeftPanel ? (
        <button
          type="button"
          aria-label={t("ariaClosePanel", labelLanguage)}
          className="absolute inset-0 z-20 bg-[#0a1528]/40 backdrop-blur-[1px]"
          onClick={closeLeftPanel}
        />
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 z-[60]">
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <HoverHint
            placement="bottom"
            title={
              showLeftPanel
                ? t("hoverLayerPanelClose", labelLanguage)
                : t("hoverLayerPanel", labelLanguage)
            }
            detail={t("hoverLayerPanelHint", labelLanguage)}
          >
            <button
              type="button"
              aria-label={
                showLeftPanel
                  ? t("hoverLayerPanelClose", labelLanguage)
                  : t("hoverLayerPanelOpenAria", labelLanguage)
              }
              onClick={() => toggleLeftPanel()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
            >
              <HamburgerIcon open={showLeftPanel} />
            </button>
          </HoverHint>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[60] flex items-start justify-end gap-2">
        {!isEconomyViewer && (showNeptun || neptunAlertCount > 0) ? (
          <div className="pointer-events-auto">
            <UkraineAirRaidPanel
              alerts={neptunAlerts}
              live={neptunLive}
              liveStatus={neptunStatus}
              error={neptunError}
              lang={labelLanguage}
              onFocusRegion={(target) => handleAirRaidFocus(target, "neptun")}
            />
          </div>
        ) : null}
        {!isEconomyViewer && (showTzevaAdom || tzevaAdomActive.length > 0) ? (
          <div className="pointer-events-auto">
            <TzevaAdomPanel
              active={tzevaAdomActive}
              history={tzevaAdomHistory}
              live={tzevaAdomLive}
              liveStatus={tzevaAdomStatus}
              geoRestricted={tzevaAdomGeoRestricted}
              error={tzevaAdomError}
              lang={labelLanguage}
              onFocusRegion={(target) => handleAirRaidFocus(target, "tzeva")}
            />
          </div>
        ) : null}
        {!showLeftPanel && !selected && !regionNavSelection && !econNavSelection && (
          <ExplorationTabs
            presets={isEconomyViewer ? ECON_EXPLORATION_PRESETS : EXPLORATION_PRESETS}
            activeId={null}
            onSelect={handleExplorationSelect}
            variant={isEconomyViewer ? "hubs" : "fronts"}
            label={
              isEconomyViewer
                ? t("hoverExplorationHubs", labelLanguage)
                : t("hoverExplorationFronts", labelLanguage)
            }
            hint={
              isEconomyViewer
                ? t("hoverExplorationHubsHint", labelLanguage)
                : t("hoverExplorationFrontsHint", labelLanguage)
            }
          />
        )}
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          {!isEconomyViewer ? (
            <SourcesLinkButton onClick={() => setShowSourcesPanel(true)} />
          ) : null}
          <FeatureGuideButton viewerMode={viewerMode} onClick={() => setShowFeatureGuide(true)} />
        </div>
      </div>
      <FeatureGuidePanel
        open={showFeatureGuide}
        viewerMode={viewerMode}
        onClose={() => setShowFeatureGuide(false)}
      />
      {!isEconomyViewer ? (
        <MethodologySourcesPanel open={showSourcesPanel} onClose={() => setShowSourcesPanel(false)} />
      ) : null}

      {showLeftPanel ? (
        <aside className="intel-panel pointer-events-auto absolute left-3 top-14 z-50 flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),384px)] flex-col gap-4 overflow-y-auto rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">
              {viewerChromePreset.navHeaderLabel}
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-sky-50">
              {viewerChromePreset.layerPanelTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={closeLeftPanel}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/50 hover:text-sky-50"
          >
            ✕
          </button>
        </div>

        <LayerPanelLanguagePicker
          initialLang={labelLanguage}
          onChange={handlePanelLangDraft}
        />

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">성능</p>
          <p className="mt-1 text-[11px] text-slate-600">
            저사양(내장 GPU·8GB)용 Ultra-Lite — 동시 레이어 {activeLayerCap(true)}개·핀 축소·무거운 레이어 강제 OFF
          </p>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-black/20 px-3 py-2.5">
            <span className="text-xs text-slate-200">Ultra-Lite 모드</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber-300"
              checked={ultraLite}
              onChange={(event) => handleUltraLiteToggle(event.target.checked)}
            />
          </label>
          <p className="mt-2 text-[11px] text-slate-500">
            일반 캡 {activeLayerCap(false)}개 · 현재 활성{" "}
            {countActiveLayers(showLeftPanel ? draftPrefs : layerPrefs)}/
            {activeLayerCap(ultraLite)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {t("viewSettings", labelLanguage)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {t("viewSettingsHint", labelLanguage)}
          </p>
            <button
              type="button"
            onClick={() => {
              closeLeftPanel();
              openModePickerManual();
            }}
            className="mt-3 w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200"
          >
            {t("changeViewMode", labelLanguage)}
            </button>
            <button
              type="button"
            onClick={handleResetCheckboxSettings}
            className="mt-2 w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            {t("resetCheckboxSettings", labelLanguage)}
            </button>
            <SoundMuteControl lang={labelLanguage} variant="panel" />
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {t("layers", labelLanguage)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">켜진 레이어가 있는 주제는 자동으로 펼쳐집니다 · 패널을 닫으면 지도에 반영됩니다</p>
          <div className="mt-3 text-sm">
            {frozenPanelCategories ? (
            <LayerCategoryDraftHost
              key={layerPanelSessionRef.current}
              categories={frozenPanelCategories}
              ultraLite={ultraLite}
              batchStatus={
                batchPending ? "레이어 일괄 적용 중… 잠시 후 지구본에 반영됩니다." : null
              }
              autoExpandCategoryId={isEconomyViewer ? "energy" : "conflict"}
              autoExpandWhen={showUkraineControl}
              expandActiveCategories
              onPatch={handlePanelDraftPatch}
            />
            ) : (
              <p className="rounded-lg border border-slate-800/90 bg-slate-950/30 px-3 py-4 text-xs text-slate-500">
                레이어 목록 준비 중…
              </p>
            )}
          </div>
          {showNeptun ? (
            <div className="mt-3">
              <NeptunLayerPanel
                threats={neptunThreats}
                alerts={neptunAlerts}
                live={neptunLive}
                liveStatus={neptunStatus}
                serverTime={neptunServerTime}
                error={neptunError}
                lang={labelLanguage}
                viewportHint={
                  !neptunFetchEnabled
                    ? "우크라이나 극동부로 이동하거나 전선 레이어를 켜면 데이터를 불러옵니다."
                    : neptunRenderMode === "hidden"
                      ? "우크라이나 극동부로 이동하면 궤적이 표시됩니다."
                      : neptunRenderMode === "flat"
                        ? "개요 모드: 가벼운 평면 궤적. 더 가까이 줌인하면 상세 궤적이 나타납니다."
                        : neptunRenderMode === "low"
                          ? "저고도 궤적. 더 가까이 줌인하면 예측 항로가 표시됩니다."
                          : null
                }
                onSelectThreat={handleNeptunThreatSelect}
              />
            </div>
          ) : null}
          <p className="mt-3 text-[10px] leading-4 text-slate-600">
            GEM · TeleGeography · OurAirports · NGA WPI · Natural Earth
          </p>
          {transportLoading && (
            <p className="mt-2 text-xs leading-5 text-slate-400">철도 데이터 로딩 중...</p>
          )}
            <p className="mt-2 text-xs leading-5 text-slate-500">
              현재 배율: {globeLod.label}
              {showUkraineControl && viinaDisplay.lod.mode === "overview"
                ? " · 점령 개요"
                : showUkraineControl && viinaDisplay.lod.mode === "hidden"
                  ? " · 점령(줌인 필요)"
                  : ""}{" "}
              · 이벤트 {globePoints.length.toLocaleString()}개
            </p>
          {transportError && <p className="mt-2 text-xs leading-5 text-red-200">{transportError}</p>}
          <button
            type="button"
            onClick={() => startTransition(() => void refreshAis())}
            disabled={aisLoading || !showAis}
            className="mt-3 w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aisLoading ? "배 위치 불러오는 중…" : "배 위치 새로고침"}
          </button>
          {aisError && <p className="mt-2 text-xs leading-5 text-red-200">{aisError}</p>}
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
              setSyncBusy(true);
              void forceSync().finally(() => setSyncBusy(false));
              });
            }}
            disabled={syncBusy || syncInfo?.running === true}
            className="mt-3 w-full rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 transition hover:border-amber-200 disabled:cursor-wait disabled:opacity-60"
          >
            {syncBusy || syncInfo?.running
              ? "스냅샷 동기화 중…"
              : "스냅샷 데이터 동기화"}
          </button>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            정적 스냅샷은 약 6시간마다 자동 갱신됩니다. AIS/ADS-B는 별도 실시간 API입니다.
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            GDELT 실시간 이벤트는 꺼 두었습니다. 우측 경보 패널은 로컬 분쟁 데이터를 사용합니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">데이터 상태</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="GDELT" value={gdeltEvents.length.toLocaleString()} />
            <Metric label="로컬 분쟁" value={(data.disputes ?? []).length.toLocaleString()} />
            <Metric label="철도" value={railPaths.length.toLocaleString()} />
            <Metric label="AIS" value={aisVessels.length.toLocaleString()} />
            <Metric label="ADS-B mil" value={milAircraft.length.toLocaleString()} />
            <Metric label="FIRMS" value={visibleFirmsFires.length.toLocaleString()} />
            <Metric label="국가" value={data.countries.length.toLocaleString()} />
            <Metric label="도시 라벨" value={labelPlaces.length.toLocaleString()} />
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            생성 시각: {formatDateTime(data.generatedAt)}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-slate-600">
            AI 전쟁지역은 외부 AI API 없이 Natural Earth 분쟁 구역 + GDELT 전투 뉴스 밀도로 데모 탐지합니다.
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            점멸 체크 A: 국가 간 갈등 + 도시 이름 ON, 대륙/지역 경계 줌에서 회전
          </p>
          <p className="text-[11px] leading-5 text-slate-500">
            점멸 체크 B: 전투·군사 충돌 + 우크라이나 점령지 ON, 동유럽 근접 줌 팬/줌
          </p>
        </div>

        {loadError ? <LoadErrorBanner message={loadError} className="mt-3" /> : null}
      </aside>
      ) : null}

      {regionNavSelection && !selected && !showLeftPanel && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseRegionNews", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setRegionNavSelection(null)}
          />
          <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 flex h-full flex-col overflow-hidden border-l border-slate-800/80 p-4 shadow-2xl">
            {theaterFocusConfig ? (
              <TheaterIntelSidebar
              selection={regionNavSelection}
                newsTheater={theaterFocusConfig.newsTheater}
                telegramRegion={theaterFocusConfig.telegramRegion}
                gdeltEvents={regionFilteredEvents}
                telegramAlerts={telegramAlerts}
                telegramLive={telegramLive}
                telegramStatus={telegramStatus}
                telegramNeedsAuth={telegramNeedsAuth}
                telegramSessionExists={telegramSessionExists}
                telegramEmbedMode={telegramEmbedMode}
                telegramChannelCount={TELEGRAM_CHANNEL_COUNT}
                initialTab={theaterSidebarTab}
              onClose={() => setRegionNavSelection(null)}
                onFlyToCoords={(lat, lng, altitude) => flyTo(lat, lng, altitude ?? 0.72)}
                onSelectGdeltEvent={handleRegionEventSelect}
            />
            ) : null}
          </aside>
        </>
      )}

      {selected && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseInfoPanel", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setSelected(null)}
          />
          <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-30 h-full overflow-y-auto border-l border-slate-800/80 p-4 shadow-2xl">
            {selected.kind === "neptun-threat" ? (
              <NeptunThreatDetailPanel
                threat={selected.item}
                lang={labelLanguage}
                onClose={() => setSelected(null)}
              />
            ) : (
              <>
            {regionNavSelection && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mb-3 text-xs text-amber-200/80 transition hover:text-amber-100"
              >
                ← {regionNavSelection.label} 뉴스 목록
              </button>
            )}
            <AnalysisPanel
              selection={selected}
              onClose={() => setSelected(null)}
              ukraineControlDate={ukraineControlDate}
              ukraineRuCellCount={ukraineRuCellCount}
              disputeOverview={
                selected.kind === "dispute" ? disputeOverviews.get(selected.item.id) ?? null : null
              }
            />
              </>
            )}
          </aside>
        </>
      )}
      {econNavSelection && !selected && (
        <>
          <button
            type="button"
            aria-label={t("ariaCloseEconomyRegion", labelLanguage)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setEconNavSelection(null)}
          />
          <EconomyRegionPanel
            selection={econNavSelection}
            onClose={() => setEconNavSelection(null)}
            onOpenIntel={() => {
              setEconNavSelection(null);
              openIntelSheet({ theater: "all", tab: "news" });
            }}
          />
        </>
      )}

      {entryGate === "caution" ? (
        <EntryCautionOverlay
          lang={labelLanguage}
          onContinue={() => setEntryGate("welcome")}
        />
      ) : null}

      {entryGate === "welcome" ? (
        <WelcomeParchmentLetter
          lang={labelLanguage}
          onContinue={() => setEntryGate("domain")}
        />
      ) : null}

      {entryGate === null && !showModePicker ? (
        <div className="pointer-events-none fixed bottom-5 right-4 z-[60] sm:bottom-6 sm:right-5">
          <SoundMuteControl lang={labelLanguage} variant="fab" />
        </div>
      ) : null}

      {entryGate === "domain" ? (
        <DomainGateOverlay onSelect={handleDomainSelect} />
      ) : null}

      {showModePicker ? (
        <ModePickerOverlay
          initialMode={modePickerInitialMode ?? viewerMode}
          initialTheater={viewTheater}
          initialEconomyHub={viewEconomyHub}
          lockMode={modePickerLockMode}
          onConfirm={handleModeApply}
          onCustom={handleCustomLayerApply}
          onCancel={handleModePickerCancel}
        />
      ) : null}
      </NewsStreamProvider>
    </main>
    </LocaleProvider>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}


function AnalysisPanel({
  selection,
  onClose,
  ukraineControlDate,
  ukraineRuCellCount,
  disputeOverview,
}: {
  selection: AnalysisSelection;
  onClose: () => void;
  ukraineControlDate?: string | null;
  ukraineRuCellCount?: number;
  disputeOverview?: DisputeOverview | null;
}) {
  if (selection.kind === "country") {
    const country = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="Natural Earth Country"
          title={country.name}
          badge={country.isoA3 || "ISO 없음"}
          onClose={onClose}
        />
        <section className="grid grid-cols-2 gap-3">
          <Metric label="대륙" value={country.continent || "N/A"} />
          <Metric label="인구" value={country.population?.toLocaleString() || "N/A"} />
          <Metric label="Lat" value={country.center.lat.toString()} />
          <Metric label="Lng" value={country.center.lng.toString()} />
        </section>
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4 text-sm leading-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">원본 이름</p>
          <p className="mt-3">{country.nameLong}</p>
        </section>
      </div>
    );
  }

  if (selection.kind === "us-carrier") {
    const carrier = selection.item;
    const statusColor = US_CARRIER_STATUS_COLORS[carrier.status];
    const operational = carrier.status === "deployed";
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="US Navy Carrier"
          title={carrier.name}
          badge={carrier.hull}
          onClose={onClose}
        />
        <section
          className="rounded-xl border p-4"
          style={{
            borderColor: `${statusColor}66`,
            backgroundColor: `${statusColor}14`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">상태</p>
            {operational ? (
              <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-100">
                작전중
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-100">
            {US_CARRIER_STATUS_LABELS[carrier.status]}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{carrier.location}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <Metric label="Air Wing" value={carrier.airwing} />
          <Metric label="Lat" value={carrier.lat.toFixed(2)} />
          <Metric label="Lng" value={carrier.lng.toFixed(2)} />
        </section>
        <section className="rounded-xl border border-slate-800 bg-black/25 p-4 text-sm leading-6 text-slate-300">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Notes</p>
          <p className="mt-3">{carrier.notes}</p>
        </section>
      </div>
    );
  }

  if (selection.kind === "ukraine-control") {
    const zone = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="VIINA Territorial Control"
          title={zone.name}
          badge={ukraineControlStatusLabel(zone.controlStatus)}
          onClose={onClose}
        />

        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-red-200/70">전황 설명</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            VIINA 거주지 단위 영토 통제 데이터입니다. 화면 렌더링 전용이며 원본 데이터는 공개 API로
            제공되지 않습니다 (ODbL Produced Work).
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="RU 셀" value={`${(ukraineRuCellCount ?? 0).toLocaleString()}곳`} />
          <Metric label="기준일" value={formatViinaDate(ukraineControlDate ?? null)} />
          <Metric label="Lat" value={zone.center.lat.toFixed(2)} />
          <Metric label="Lng" value={zone.center.lng.toFixed(2)} />
        </section>
      </div>
    );
  }

  if (selection.kind === "dispute") {
    const area = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="Natural Earth Disputed Area"
          title={area.name}
          badge={formatCategories(area.categories)}
          onClose={onClose}
        />

        {disputeOverview?.overviewKo && (
          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">지역 개요</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{disputeOverview.overviewKo}</p>
            {disputeOverview.parties.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                관련 당사자: {disputeOverview.parties.join(" · ")}
              </p>
            )}
            {disputeOverview.updatedAt && (
              <p className="mt-1 text-[10px] text-slate-500">갱신 {disputeOverview.updatedAt}</p>
            )}
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {disputeOverview ? "원본 메모" : "설명"}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {area.note || "Natural Earth 원본에 별도 메모가 없습니다."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="긴장도" value={getTensionLabel(area.tension)} />
          <Metric
            label="빗금 패턴"
            value={hatchStyleLabel(getDisputeHatchStyle(area), area)}
          />
          <Metric label="GDELT 매칭" value={`${area.matchedEventCount}건`} />
          <Metric label="관리 주체" value={area.admin || "N/A"} />
        </section>

        <p className="mt-auto text-xs leading-5 text-slate-500">
          빗금 박스에 마우스를 올리면 요약을, 클릭하면 이 패널을 볼 수 있습니다. 색·패턴 의미는 지도 하단 범례를 참고하세요.
        </p>
      </div>
    );
  }

  if (selection.kind === "conflict-zone") {
    const zone = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="AI War Zone (Demo)"
          title={zone.name}
          badge={getTensionLabel(zone.tension)}
          onClose={onClose}
        />

        <section className="rounded-xl border border-red-900/35 bg-red-950/15 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-red-200/70">AI 전쟁지역 (데모)</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {zone.aiSummary ||
              "외부 AI API 없음 · 분쟁 구역 + GDELT 전투 뉴스 밀도 휴리스틱 데모입니다."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="긴장도" value={getTensionLabel(zone.tension)} />
          <Metric
            label="AI 신뢰도"
            value={typeof zone.aiScore === "number" ? `${zone.aiScore}%` : "데모"}
          />
          <Metric label="이벤트" value={`${zone.eventCount.toLocaleString()}건`} />
          <Metric label="탐지" value={zone.detectedBy === "ai-demo" ? "로컬 휴리스틱" : "—"} />
          <Metric label="Lat" value={zone.center.lat.toFixed(2)} />
          <Metric label="Lng" value={zone.center.lng.toFixed(2)} />
        </section>
      </div>
    );
  }

  if (selection.kind === "ais") {
    const vessel = selection.item;
    return (
      <div className="flex flex-col gap-4">
        <PanelHeader
          eyebrow="AIS PositionReport"
          title={vessel.shipName || `MMSI ${vessel.mmsi}`}
          badge="AISstream"
          onClose={onClose}
        />

        <section className="grid grid-cols-2 gap-3">
          <Metric label="MMSI" value={vessel.mmsi} />
          <Metric label="SOG" value={vessel.speedOverGround === null ? "N/A" : `${vessel.speedOverGround} kn`} />
          <Metric label="COG" value={vessel.courseOverGround === null ? "N/A" : vessel.courseOverGround.toString()} />
          <Metric label="Heading" value={vessel.trueHeading === null ? "N/A" : vessel.trueHeading.toString()} />
        </section>

        <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">실시간 위치</p>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
            <MetaRow label="좌표" value={`${vessel.lat}, ${vessel.lng}`} />
            <MetaRow label="수신 시각" value={vessel.timestamp || "N/A"} />
          </dl>
        </section>

        <p className="mt-auto text-xs leading-5 text-slate-500">
          현재 AIS는 서버 프록시가 짧게 스트림을 열어 수집한 샘플입니다. 장시간 실시간 반영은 별도 백엔드/WebSocket 브로드캐스트로 확장하는 구조가 맞습니다.
        </p>
      </div>
    );
  }

  if (selection.kind !== "event") return null;

  const event = selection.item;
  const tier = event.eventTier ? TIER_LABELS[event.eventTier] : "미분류";
  const fresh = isFreshEvent(event);

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        eyebrow={tier}
        title={`Event ${event.globalEventId}`}
        badge={fresh ? "최신 속보" : tier}
        onClose={onClose}
      />

      <section className="grid grid-cols-2 gap-3">
        <Metric label="분류" value={tier} />
        <Metric label="Event Date" value={event.eventDate || "N/A"} />
        <Metric label="Country" value={event.country || "N/A"} />
        <Metric label="Goldstein" value={event.goldsteinScale?.toString() || "N/A"} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">실제 이벤트 메타데이터</p>
        <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
          <MetaRow label="좌표" value={`${event.lat}, ${event.lng}`} />
          <MetaRow label="카테고리" value={event.category} />
          {(event.actor1Country || event.actor2Country) && (
            <MetaRow
              label="행위자"
              value={`${event.actor1Country || "?"} ↔ ${event.actor2Country || "?"}`}
            />
          )}
          <MetaRow label="수집 시각" value={event.createdAt ? formatDateTime(event.createdAt) : "N/A"} />
          <MetaRow label="출처 호스트" value={hostFromUrl(event.sourceUrl)} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">원문 링크</p>
        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm leading-6 text-emerald-200 transition hover:border-emerald-300/50"
          >
            {event.sourceUrl}
          </a>
        ) : (
          <p className="mt-3 text-sm text-slate-500">GDELT 이벤트에 source URL이 없습니다.</p>
        )}
      </section>

      <p className="mt-auto text-xs leading-5 text-slate-500">
        mock AI 요약은 제거했습니다. 실제 3줄 요약은 화이트리스트 뉴스/LLM 파이프라인을 붙인 뒤 다시 추가하는 영역입니다.
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-slate-200">{value}</dd>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  badge,
  onClose,
}: {
  eyebrow: string;
  title: string;
  badge: string;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-sky-300/80">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-50">{title}</h2>
        <span className="mt-3 inline-flex rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
          {badge}
        </span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ariaCloseInfoPanel")}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
        >
          ✕
        </button>
      )}
    </header>
  );
}
