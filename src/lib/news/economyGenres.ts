/**
 * 경제 뉴스 장르 (geo-trader Intel 시트 카테고리).
 * @see feedCatalog SHARED_ECONOMY · BottomIntelStack EconomyGenreChipBar
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export type EconomyNewsGenre =
  | "macro"
  | "infra"
  | "energy"
  | "shipping"
  | "chips"
  | "markets";

export type EconomyGenreFilter = EconomyNewsGenre | "all";

export const ECONOMY_GENRE_ORDER: EconomyNewsGenre[] = [
  "macro",
  "infra",
  "energy",
  "shipping",
  "chips",
  "markets",
];

const GENRE_LABELS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    macro: "거시",
    infra: "인프라·투자",
    energy: "에너지",
    shipping: "물류·항로",
    chips: "반도체",
    markets: "시장·일반",
  },
  en: {
    macro: "Macro",
    infra: "Infra · FDI",
    energy: "Energy",
    shipping: "Shipping",
    chips: "Chips",
    markets: "Markets",
  },
};

const GENRE_HINTS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    macro: "금리·인플레·중앙은행·IMF·관세·제재",
    infra: "국제 인프라·개발은행·항만·전력·광물·FDI",
    energy: "원유·가스·LNG·OPEC",
    shipping: "수에즈·호르무즈·운임·해운",
    chips: "반도체·TSMC·수출통제",
    markets: "지수·증시·일반 비즈니스",
  },
  en: {
    macro: "Rates · inflation · central banks · IMF · tariffs",
    infra: "Global infra · MDBs · ports · power · minerals · FDI",
    energy: "Oil · gas · LNG · OPEC",
    shipping: "Suez · Hormuz · freight · shipping",
    chips: "Semiconductors · TSMC · export controls",
    markets: "Indices · equities · general business",
  },
};

export function economyGenreLabel(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_LABELS[lang][genre];
}

export function economyGenreHint(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_HINTS[lang][genre];
}

export function matchesEconomyGenreFilter(
  genre: EconomyNewsGenre | undefined,
  filter: EconomyGenreFilter,
): boolean {
  if (filter === "all") return true;
  return (genre ?? "markets") === filter;
}
