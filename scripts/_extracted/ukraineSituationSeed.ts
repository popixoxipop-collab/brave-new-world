/**
 * ISW형 주석 시드 — VIINA에 없는 진격축·MSR·콜아웃.
 * 실데이터(통제 면·거주지)와 함께 표시용. 날짜는 통제 스냅샷과 별개 평가 문구.
 */

export type UkraineCallout = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  body: string;
  side: "ua" | "ru" | "neutral";
};

export type UkraineAxisPath = {
  id: string;
  kind: "ua-axis" | "ru-axis" | "msr" | "ua-advance" | "ru-advance";
  name: string;
  points: { lat: number; lng: number }[];
};

export const UKRAINE_SITUATION_CALLOUTS: UkraineCallout[] = [
  {
    id: "callout-zaporizhzhia-axis",
    lat: 47.55,
    lng: 35.65,
    title: "우크라이나 주력 작전 축",
    body: "Verbove–Novoprokopivka",
    side: "ua",
  },
  {
    id: "callout-ru-defense-in-depth",
    lat: 47.32,
    lng: 35.85,
    title: "러시아군 종심 방어",
    body: "3개 제대 방어 진지 (평가)",
    side: "ru",
  },
  {
    id: "callout-bakhmut",
    lat: 48.59,
    lng: 38.0,
    title: "경합·측면 압박",
    body: "Bakhmut 도심 및 측면",
    side: "neutral",
  },
  {
    id: "callout-tokmak",
    lat: 47.25,
    lng: 35.7,
    title: "핵심 물류 거점",
    body: "Tokmak · MSR 병목",
    side: "ru",
  },
  {
    id: "callout-msr-choke",
    lat: 46.95,
    lng: 35.35,
    title: "보급로 병목",
    body: "Melitopol 접근로",
    side: "neutral",
  },
  {
    id: "callout-kharkiv-axis",
    lat: 49.92,
    lng: 36.45,
    title: "하르키우 방면 압박",
    body: "북동 전선 교전 (평가)",
    side: "ru",
  },
  {
    id: "callout-kupiansk",
    lat: 49.72,
    lng: 37.68,
    title: "쿠피얀스크 축",
    body: "오스콜 강 동안 교전",
    side: "neutral",
  },
];

export const UKRAINE_SITUATION_PATHS: UkraineAxisPath[] = [
  {
    id: "advance-ua-verbove",
    kind: "ua-advance",
    name: "UA 진격 · Verbove 축",
    points: [
      { lat: 47.72, lng: 35.55 },
      { lat: 47.58, lng: 35.68 },
      { lat: 47.48, lng: 35.78 },
      { lat: 47.4, lng: 35.9 },
    ],
  },
  {
    id: "advance-ua-robotyne",
    kind: "ua-advance",
    name: "UA 진격 · Robotyne",
    points: [
      { lat: 47.18, lng: 35.78 },
      { lat: 47.12, lng: 35.86 },
      { lat: 47.05, lng: 35.95 },
    ],
  },
  {
    id: "advance-ru-kharkiv",
    kind: "ru-advance",
    name: "RU 압박 · 하르키우 북동",
    points: [
      { lat: 50.12, lng: 36.82 },
      { lat: 50.02, lng: 36.65 },
      { lat: 49.92, lng: 36.48 },
    ],
  },
  {
    id: "advance-ru-kupiansk",
    kind: "ru-advance",
    name: "RU 압박 · 쿠피얀스크",
    points: [
      { lat: 49.88, lng: 37.92 },
      { lat: 49.8, lng: 37.78 },
      { lat: 49.72, lng: 37.65 },
    ],
  },
  {
    id: "axis-ua-verbove",
    kind: "ua-axis",
    name: "UA 작전 축 · Verbove",
    points: [
      { lat: 47.72, lng: 35.55 },
      { lat: 47.58, lng: 35.68 },
      { lat: 47.48, lng: 35.78 },
      { lat: 47.4, lng: 35.9 },
    ],
  },
  {
    id: "axis-ru-defense",
    kind: "ru-axis",
    name: "RU 종심 방어선",
    points: [
      { lat: 47.45, lng: 35.3 },
      { lat: 47.38, lng: 35.7 },
      { lat: 47.35, lng: 36.1 },
      { lat: 47.42, lng: 36.5 },
    ],
  },
  {
    id: "msr-tokmak",
    kind: "msr",
    name: "MSR · Tokmak–Melitopol",
    points: [
      { lat: 47.25, lng: 35.7 },
      { lat: 47.1, lng: 35.55 },
      { lat: 46.85, lng: 35.38 },
    ],
  },
];
