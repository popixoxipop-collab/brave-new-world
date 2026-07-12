import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";

const UI = {
  close: { ko: "닫기", en: "Close" },
  cancel: { ko: "취소", en: "Cancel" },
  english: { ko: "English", en: "English" },
  korean: { ko: "한국어", en: "Korean" },
  displayLanguage: { ko: "표시 언어", en: "Display language" },
  displayLanguageHint: {
    ko: "지도 라벨 · 뉴스 · 인텔 패널 언어",
    en: "Map labels · news · intel panel language",
  },
  cityLabelsEn: { ko: "도시명 영문", en: "English place names" },
  cityLabelsKo: { ko: "도시명 한글", en: "Korean place names" },
  viewSettings: { ko: "보기 설정", en: "View settings" },
  viewSettingsHint: { ko: "지정학 · 경제·시장 보기 모드", en: "Geopolitics · markets view mode" },
  changeViewMode: { ko: "보기 모드 변경", en: "Change view mode" },
  resetCheckboxSettings: { ko: "체크박스 설정 초기화", en: "Reset checkbox settings" },
  layers: { ko: "레이어", en: "Layers" },
  backToMap: { ko: "✕ 지도로", en: "✕ Back to map" },
  openOriginal: { ko: "원문 ↗", en: "Source ↗" },
  openPanel: { ko: "열기 ▶", en: "Open ▶" },
  translationKo: { ko: "한국어 번역", en: "Korean translation" },
  translationEn: { ko: "영문 표시", en: "English display" },
  tier3Toggle: { ko: "속보·관영", en: "Breaking · state media" },
  liveNews: { ko: "실시간 뉴스", en: "Live news" },
  telegramOsint: { ko: "텔레그램 OSINT", en: "Telegram OSINT" },
  conflictZone: { ko: "충돌지역", en: "Conflict zone" },
  intercontinental: { ko: "대륙간 갈등과 협력", en: "Intercontinental conflict & cooperation" },
  relatedNews: { ko: "관련 뉴스", en: "Related news" },
  noGdeltEvents: {
    ko: "이 지역·동맹 범위에 해당하는 GDELT 이벤트가 없습니다.",
    en: "No GDELT events match this region or alliance scope.",
  },
  modePickerTitle: { ko: "어떤 관점으로 볼까요?", en: "How would you like to view?" },
  modePickerSubtitle: {
    ko: "두 가지 보기 모드 중 하나를 선택하세요 · 상단에서 언제든 전환 가능",
    en: "Pick a view mode · switch anytime from the top bar",
  },
  modePickerDetailConflictTitle: {
    ko: "지정학 — 어디를 먼저 볼까요?",
    en: "Geopolitics — where to focus first?",
  },
  modePickerDetailEconomyTitle: {
    ko: "지경학 — 어느 허브로 갈까요?",
    en: "Geoeconomics — which hub first?",
  },
  modePickerDetailSubtitle: {
    ko: "관심 지역을 고르거나 자동으로 두면 신호가 이끕니다",
    en: "Pick a focus, or leave Auto and follow the signals",
  },
  domainGateTitle: { ko: "어느 창으로 들어설까요?", en: "Which window will you enter?" },
  domainGateSubtitle: {
    ko: "지정학과 지경학, 두 갈래의 문입니다",
    en: "Two doors: geopolitics and geoeconomics",
  },
  domainConflictTitle: { ko: "지정학의 창", en: "Window of Geopolitics" },
  domainConflictHint: {
    ko: "전선과 분쟁, 군사·외교의 긴장을 따라갑니다",
    en: "Follow front lines, disputes, and military–diplomatic tension",
  },
  domainEconomyTitle: { ko: "지경학의 창", en: "Window of Geoeconomics" },
  domainEconomyHint: {
    ko: "에너지와 물류, 항로와 시장의 맥을 읽습니다",
    en: "Read energy, logistics, sea lanes, and markets",
  },
  welcomeLetterCta: { ko: "편지를 접고 입장하기", en: "Fold the letter and enter" },
  modePickerPreview: { ko: "시작하면 보이는 것", en: "What you'll see on start" },
  modePickerAdvancedShow: { ko: "레이어 직접 설정 (고급)", en: "Custom layers (advanced)" },
  modePickerAdvancedHide: { ko: "고급 옵션 숨기기", en: "Hide advanced options" },
  modePickerCustomLayers: { ko: "레이어 직접 설정", en: "Custom layers" },
  modePickerTheater: { ko: "관심 전장 (선택)", en: "Focus theater (optional)" },
  modePickerTheaterHint: {
    ko: "자동이면 실시간 신호 기준 가장 뜨거운 충돌지로 이동합니다",
    en: "Auto flies to the hottest conflict zone by live signals",
  },
  modePickerHub: { ko: "관심 허브 (선택)", en: "Focus hub (optional)" },
  modePickerHubHint: {
    ko: "자동이면 RSS·분쟁 신호 기준 가장 핫한 지정학·투자 허브로 이동합니다",
    en: "Auto flies to the hottest geopolitical · investment hub",
  },
  modeStartConflict: { ko: "지정학으로 시작", en: "Start in Geopolitics" },
  modeStartEconomy: { ko: "경제, 시장 으로 시작", en: "Start in Markets" },
  viewerModeLabel: { ko: "뷰어 모드", en: "Viewer mode" },
  modeConflict: { ko: "지정학", en: "Geopolitics" },
  modeConflictHint: { ko: "전선 · 분쟁 · OSINT · 군사 뉴스", en: "Frontline · conflict · OSINT · military news" },
  modeEconomy: { ko: "경제·시장", en: "Markets" },
  modeEconomyHint: { ko: "증시 · 유가 · 제재 · 경제 RSS", en: "Stocks · oil · sanctions · economy RSS" },
  intelNews: { ko: "Intel 뉴스", en: "Intel news" },
  intelEconomy: { ko: "경제·증시", en: "Markets" },
  heroAccordingTo: { ko: "에 따르면 ", en: " reports " },
  justNow: { ko: "방금", en: "just now" },
  minutesAgo: { ko: "분 전", en: "m ago" },
  hoursAgo: { ko: "시간 전", en: "h ago" },
  daysAgo: { ko: "일 전", en: "d ago" },
  itemsCount: { ko: "건", en: " items" },
  economyCount: { ko: "경제", en: "economy" },
  intelSheetNews: { ko: "Tier별 뉴스 · 분석", en: "Tier news · analysis" },
  intelSheetTelegram: { ko: "Telegram OSINT · Raw", en: "Telegram OSINT · Raw" },
  intelSheetViina: { ko: "VIINA · 우크라이나 전선", en: "VIINA · Ukraine front" },
  intelSheetEconomyNews: { ko: "경제 · RSS · 속보", en: "Economy · RSS · breaking" },
  intelSheetMarkets: { ko: "증시 · 매크로 · 지수", en: "Markets · macro · indices" },
} as const;

export type UiStringKey = keyof typeof UI;

export function t(key: UiStringKey, lang: LabelLanguage): string {
  return UI[key][lang];
}

export const THEATER_LABELS: Record<LabelLanguage, Record<NewsTheater, string>> = {
  ko: {
    "middle-east": "중동",
    "russia-ukraine": "러·우",
    "china-taiwan": "중·대",
    korea: "한반도",
    japan: "일본",
    "south-asia": "남아시아",
    global: "글로벌",
  },
  en: {
    "middle-east": "Middle East",
    "russia-ukraine": "Russia-Ukraine",
    "china-taiwan": "China-Taiwan",
    korea: "Korea",
    japan: "Japan",
    "south-asia": "South Asia",
    global: "Global",
  },
};

export function theaterLabel(theater: NewsTheater, lang: LabelLanguage): string {
  return THEATER_LABELS[lang][theater];
}

export const VIEW_THEATER_LABELS: Record<
  LabelLanguage,
  Record<"auto" | "korea" | "china-taiwan" | "russia-ukraine" | "middle-east" | "global", string>
> = {
  ko: {
    auto: "자동",
    korea: "한반도",
    "china-taiwan": "대만",
    "russia-ukraine": "우크라",
    "middle-east": "중동",
    global: "글로벌",
  },
  en: {
    auto: "Auto",
    korea: "Korea",
    "china-taiwan": "Taiwan",
    "russia-ukraine": "Ukraine",
    "middle-east": "Middle East",
    global: "Global",
  },
};

export const MODE_PICKER_CHROME: Record<
  ViewerMode,
  Record<LabelLanguage, { title: string; tagline: string; bullets: string[] }>
> = {
  conflict: {
    ko: {
      title: "지정학",
      tagline: "전선 · GDELT · Telegram OSINT",
      bullets: [
        "우크라이나 전선·NEPTUN 드론·미사일 궤적",
        "GDELT 전투·외교 뉴스 핀",
        "Telegram OSINT · VIINA 점령지",
        "하단: 속보 + GDELT 범례",
      ],
    },
    en: {
      title: "Geopolitics",
      tagline: "Frontline · GDELT · Telegram OSINT",
      bullets: [
        "Ukraine front · NEPTUN drone & missile tracks",
        "GDELT combat · diplomatic news pins",
        "Telegram OSINT · VIINA occupation map",
        "Bottom: breaking news + GDELT legend",
      ],
    },
  },
  economy: {
    ko: {
      title: "경제 · 시장",
      tagline: "유가 · VIX · 제재 · 물류",
      bullets: [
        "주요 증시·VIX·유가 티커",
        "경제 RSS · 시장 속보",
        "제재·파이프라인·해운·초크포인트 레이어",
        "하단: 티커 + 시장 속보 (GDELT/TG 없음)",
      ],
    },
    en: {
      title: "Markets",
      tagline: "Oil · VIX · sanctions · logistics",
      bullets: [
        "Major indices · VIX · oil tickers",
        "Economy RSS · market breaking news",
        "Sanctions · pipelines · shipping · chokepoints",
        "Bottom: ticker + market headlines (no GDELT/TG)",
      ],
    },
  },
};

export function previewModeSelectionLocalized(
  mode: ViewerMode,
  lang: LabelLanguage,
  theaterLabel_: string,
  hubLabel: string,
  isAutoTheater: boolean,
  isAutoHub: boolean,
): string[] {
  const bullets = [...MODE_PICKER_CHROME[mode][lang].bullets];
  if (mode === "conflict") {
    bullets.push(
      isAutoTheater
        ? lang === "ko"
          ? "시작 시 가장 뜨거운 충돌지로 자동 이동"
          : "Auto-fly to the hottest conflict zone on start"
        : lang === "ko"
          ? `시작 시 ${theaterLabel_} 전장으로 카메라 이동`
          : `Camera starts at ${theaterLabel_} theater`,
    );
  } else {
    bullets.push(
      isAutoHub
        ? lang === "ko"
          ? "시작 시 가장 핫한 지정학·투자 허브로 자동 이동"
          : "Auto-fly to the hottest geopolitical · investment hub"
        : lang === "ko"
          ? `시작 시 ${hubLabel} 허브로 카메라 이동`
          : `Camera starts at ${hubLabel} hub`,
    );
  }
  return bullets.slice(0, 6);
}

export function formatRelativeAge(pubDate: string, lang: LabelLanguage): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 1) return t("justNow", lang);
  if (minutes < 60) return `${minutes}${t("minutesAgo", lang)}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${t("hoursAgo", lang)}`;
  return `${Math.floor(hours / 24)}${t("daysAgo", lang)}`;
}
