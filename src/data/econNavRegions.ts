import type { ExplorationPreset, NavMenuGroup, NavSelection } from "@/data/navRegions";
import { NAV_MENU_GROUPS, toNavSelection } from "@/data/navRegions";
import { navSelectionFromId } from "@/lib/theaterFocus";

/** 경제 nav id → RSS 필터 키워드 */
export const ECON_REGION_KEYWORDS: Record<string, string[]> = {
  hormuz: ["hormuz", "oil", "brent", "iran", "gulf", "opec"],
  suez: ["suez", "canal", "shipping", "container", "red sea"],
  "bab-el-mandeb": ["red sea", "houthi", "shipping", "suez", "brent"],
  malacca: ["malacca", "shipping", "china trade", "semiconductor"],
  panama: ["panama canal", "shipping", "container"],
  dubai: ["dubai", "uae", "energy", "lng"],
  qatar: ["qatar", "lng", "gas"],
  rotterdam: ["rotterdam", "europe gas", "ttf", "lng"],
  singapore: ["singapore", "shipping", "trade hub"],
  nyc: ["wall street", "fed", "s&p", "nasdaq", "dollar"],
  london: ["london", "ftse", "bank of england", "sterling"],
  "hong-kong": ["hong kong", "hang seng", "china markets"],
  "taiwan-chip": ["tsmc", "taiwan", "semiconductor", "chip"],
  "red-sea-shipping": ["red sea", "shipping", "freight", "houthi"],
  sanctions: ["sanctions", "ofac", "export control", "tariff"],
};

/** nav id → logisticsRiskPoints relatedTickers (override) */
export const ECON_REGION_TICKERS: Record<string, string> = {
  hormuz: "Brent · DXY · VIX",
  suez: "Brent · DXY · VIX",
  "bab-el-mandeb": "Brent · Gold · VIX",
  malacca: "Shanghai · Hang Seng · Brent",
  panama: "S&P 500 · Brent",
  "taiwan-chip": "NASDAQ · Hang Seng · Shanghai",
  "red-sea-shipping": "Brent · VIX",
};

export const ENERGY_CHOKEPOINTS_GROUP: NavMenuGroup = {
  id: "energy-chokepoints",
  label: "에너지 · 초크포인트",
  items: [
    {
      id: "hormuz",
      label: "호르무즈",
      lat: 26.56,
      lng: 56.25,
      altitude: 1.7,
      description: "걸프 원유 ~20% · Brent 즉각 반응",
      bbox: { minLat: 12, maxLat: 40, minLng: 32, maxLng: 66 },
      subItems: [],
    },
    {
      id: "suez",
      label: "수에즈 · 홍해",
      lat: 22,
      lng: 38,
      altitude: 1.72,
      description: "컨테이너·원유 병목 · 운임 프리미엄",
      bbox: { minLat: 8, maxLat: 36, minLng: 28, maxLng: 52 },
      subItems: [
        {
          id: "suez-canal",
          label: "수에즈 운하",
          lat: 30.45,
          lng: 32.35,
          altitude: 0.9,
          description: "유럽·아시아 무역 관문",
          bbox: { minLat: 29, maxLat: 31.5, minLng: 31, maxLng: 33.5 },
        },
        {
          id: "bab-el-mandeb",
          label: "바브엘만데브",
          lat: 12.58,
          lng: 43.33,
          altitude: 0.95,
          description: "홍해·수에즈 연결 · 해상 리스크",
          bbox: { minLat: 11, maxLat: 14, minLng: 42, maxLng: 45 },
        },
      ],
    },
    {
      id: "malacca",
      label: "말라카 · 대만 해협",
      lat: 2.8,
      lng: 101.0,
      altitude: 1.7,
      description: "아시아 제조·에너지 허리",
      bbox: { minLat: -2, maxLat: 28, minLng: 95, maxLng: 125 },
      subItems: [
        {
          id: "malacca-strait",
          label: "말라카 해협",
          lat: 2.8,
          lng: 101.0,
          altitude: 1.0,
          description: "~25% traded goods",
          bbox: { minLat: 0, maxLat: 6, minLng: 98, maxLng: 104 },
        },
        {
          id: "taiwan-strait-econ",
          label: "대만 해협",
          lat: 24.5,
          lng: 119.5,
          altitude: 0.88,
          description: "반도체·해운 수로",
          bbox: { minLat: 22, maxLat: 26, minLng: 117, maxLng: 122 },
        },
      ],
    },
    {
      id: "panama",
      label: "파나마 운하",
      lat: 9.08,
      lng: -79.68,
      altitude: 1.05,
      description: "미주·아시아 컨테이너 연결",
      bbox: { minLat: 8, maxLat: 10.5, minLng: -80.5, maxLng: -78.5 },
      subItems: [],
    },
  ],
};

export const ENERGY_HUBS_GROUP: NavMenuGroup = {
  id: "energy-hubs",
  label: "LNG · 에너지 허브",
  items: [
    {
      id: "dubai",
      label: "두바이 · 걸프",
      lat: 25.2,
      lng: 55.27,
      altitude: 1.7,
      description: "OPEC+ · 에너지 금융",
      bbox: { minLat: 12, maxLat: 38, minLng: 40, maxLng: 62 },
      subItems: [],
    },
    {
      id: "qatar",
      label: "카타르 LNG",
      lat: 25.3,
      lng: 51.5,
      altitude: 0.98,
      description: "LNG 수출 · 가스 spot",
      bbox: { minLat: 24, maxLat: 26.5, minLng: 50, maxLng: 52.5 },
      subItems: [],
    },
    {
      id: "rotterdam",
      label: "로테르담 · EU 가스",
      lat: 51.9,
      lng: 4.5,
      altitude: 1.1,
      description: "TTF · EU LNG 수입",
      bbox: { minLat: 50.5, maxLat: 53, minLng: 3, maxLng: 6 },
      subItems: [],
    },
    {
      id: "singapore-energy",
      label: "싱가포르 허브",
      lat: 1.35,
      lng: 103.8,
      altitude: 1.05,
      description: "아시아 정유·LNG 트레이딩",
      bbox: { minLat: 0.5, maxLat: 2.5, minLng: 102.5, maxLng: 105 },
      subItems: [],
    },
  ],
};

export const FINANCE_TRADE_GROUP: NavMenuGroup = {
  id: "finance-trade",
  label: "금융 · 무역 허브",
  items: [
    {
      id: "nyc",
      label: "뉴욕",
      lat: 40.71,
      lng: -74.0,
      altitude: 1.25,
      description: "Fed · S&P · NASDAQ",
      bbox: { minLat: 39, maxLat: 42, minLng: -75.5, maxLng: -72.5 },
      subItems: [],
    },
    {
      id: "london",
      label: "런던",
      lat: 51.5,
      lng: -0.12,
      altitude: 1.2,
      description: "FTSE · ECB 연동 · 와이어",
      bbox: { minLat: 50.5, maxLat: 52.5, minLng: -1.5, maxLng: 1 },
      subItems: [],
    },
    {
      id: "singapore",
      label: "싱가포르",
      lat: 1.35,
      lng: 103.8,
      altitude: 1.05,
      description: "아시아 금융·무역 중심",
      bbox: { minLat: 0.5, maxLat: 2.5, minLng: 102.5, maxLng: 105 },
      subItems: [],
    },
    {
      id: "hong-kong",
      label: "홍콩",
      lat: 22.3,
      lng: 114.17,
      altitude: 1.0,
      description: "Hang Seng · 중국 자본",
      bbox: { minLat: 21.5, maxLat: 23.5, minLng: 113, maxLng: 115 },
      subItems: [],
    },
  ],
};

export const SANCTIONS_SUPPLY_GROUP: NavMenuGroup = {
  id: "sanctions-supply",
  label: "제재 · 공급망 · 칩",
  items: [
    {
      id: "taiwan-chip",
      label: "대만 · TSMC",
      lat: 24.8,
      lng: 121.0,
      altitude: 0.85,
      description: "반도체 공급망 · 수출 통제",
      bbox: { minLat: 22, maxLat: 26, minLng: 119, maxLng: 122 },
      subItems: [],
    },
    {
      id: "red-sea-shipping",
      label: "홍해 · 운송",
      lat: 15.0,
      lng: 42.0,
      altitude: 1.0,
      description: "운임·보험 · 우회 항로",
      bbox: { minLat: 12, maxLat: 20, minLng: 38, maxLng: 45 },
      subItems: [],
    },
    {
      id: "sanctions",
      label: "제재 · OFAC",
      lat: 38.9,
      lng: -77.0,
      altitude: 1.35,
      description: "미국·EU 제재 · SWIFT",
      bbox: { minLat: 35, maxLat: 42, minLng: -82, maxLng: -72 },
      subItems: [],
    },
  ],
};

export const ECON_NAV_MENU_GROUPS: NavMenuGroup[] = [
  ENERGY_CHOKEPOINTS_GROUP,
  ENERGY_HUBS_GROUP,
  FINANCE_TRADE_GROUP,
  SANCTIONS_SUPPLY_GROUP,
];

export const ECON_EXPLORATION_PRESETS: ExplorationPreset[] = [
  {
    id: "hormuz",
    label: "호르무즈",
    tagline: "걸프 원유 · Brent",
    navItem: ENERGY_CHOKEPOINTS_GROUP.items[0]!,
    groupId: ENERGY_CHOKEPOINTS_GROUP.id,
  },
  {
    id: "suez",
    label: "수에즈",
    tagline: "운하 · 운임",
    navItem: ENERGY_CHOKEPOINTS_GROUP.items[1]!,
    groupId: ENERGY_CHOKEPOINTS_GROUP.id,
  },
  {
    id: "taiwan-chip",
    label: "대만·칩",
    tagline: "TSMC · NASDAQ",
    navItem: SANCTIONS_SUPPLY_GROUP.items[0]!,
    groupId: SANCTIONS_SUPPLY_GROUP.id,
  },
  {
    id: "nyc",
    label: "뉴욕",
    tagline: "Fed · S&P",
    navItem: FINANCE_TRADE_GROUP.items[0]!,
    groupId: FINANCE_TRADE_GROUP.id,
  },
];

export function getNavMenuGroups(mode: "conflict" | "economy"): NavMenuGroup[] {
  return mode === "economy" ? ECON_NAV_MENU_GROUPS : NAV_MENU_GROUPS;
}

export function econNavSelectionFromId(id: string, parentLabel?: string): NavSelection | null {
  for (const group of ECON_NAV_MENU_GROUPS) {
    for (const item of group.items) {
      if (item.id === id) return toNavSelection(item, group.id);
      const sub = item.subItems.find((s) => s.id === id);
      if (sub) return toNavSelection(sub, group.id, parentLabel ?? item.label);
    }
  }
  return null;
}

export function navSelectionFromIdAnyMode(
  id: string,
  mode: "conflict" | "economy",
  parentLabel?: string,
): NavSelection | null {
  if (mode === "economy") return econNavSelectionFromId(id, parentLabel);
  return navSelectionFromId(id, parentLabel);
}
