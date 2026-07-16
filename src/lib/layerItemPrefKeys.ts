import type { LayerPrefs } from "@/lib/layerPrefs";

/** LayerCategoryPanel item id → LayerPrefs boolean/string key */
export const LAYER_ITEM_PREF_KEYS: Partial<Record<string, keyof LayerPrefs>> = {
  "city-labels": "showCityLabels",
  rail: "showRailGlow",
  ukraine: "showUkraineControl",
  neptun: "showNeptun",
  disputes: "showWarZones",
  "war-zones": "showWarZones",
  "diplomatic-tension": "showDiplomaticTension",
  "conflict-zones": "showConflictZones",
  "arms-embargo": "showArmsEmbargo",
  ucdp: "showUcdpEvents",
  "gdelt-war": "showGdeltWar",
  "gdelt-diplomatic": "showGdeltDiplomatic",
  "gdelt-alliance": "showGdeltAlliance",
  "gdelt-protest": "showGdeltProtests",
  "telegram-osint": "showTelegramOsint",
  "tzeva-adom": "showTzevaAdom",
  "newfeeds-iran": "showNewfeedsIranAttacks",
  "oil-pipelines": "showOilPipelines",
  "gas-pipelines": "showGasPipelines",
  "lng-terminals": "showLngTerminals",
  resources: "showResources",
  nuclear: "showNuclearSites",
  shipping: "showShippingLanes",
  "bri-trade": "showBriTradeConnectivity",
  "us-dfc-supply": "showUsDfcSupplyChain",
  cables: "showSubmarineCables",
  tunnels: "showSubmarineTunnels",
  airports: "showAirports",
  ports: "showPorts",
  ixp: "showInternetExchanges",
  "logistics-risk": "showLogisticsRisk",
  "critical-nodes": "showCriticalNodes",
  ais: "showAis",
  "military-bases": "showMilitaryBases",
  "military-air": "showMilitaryActivity",
  "air-traffic": "showAirTraffic",
  intel: "showIntelHotspots",
  refugee: "showRefugeeCamps",
  firms: "showFirmsFires",
  cyber: "showCyberIncidents",
  election: "showElectionEvents",
  space: "showSpaceLaunches",
  economic: "showEconomicCenters",
  "ai-dc": "showAiDataCenters",
  sanctions: "showSanctionsEntities",
  "east-asia-adiz": "showEastAsiaAdiz",
  "axis-network": "showAxisNetwork",
};

export function patchFromCategoryItems(
  items: Array<{ id: string }>,
  enabled: boolean,
): Partial<LayerPrefs> {
  const patch: Partial<LayerPrefs> = {};
  for (const item of items) {
    const key = LAYER_ITEM_PREF_KEYS[item.id];
    if (key) {
      (patch as Record<string, boolean>)[key] = enabled;
    }
  }
  return patch;
}
