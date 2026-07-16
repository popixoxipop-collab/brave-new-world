/**
 * SOTW 딥 매크로 — 인플레·성장·실업·충격(히스토리) + 피어 비교 + 브리핑 문단.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  buildCountryCard,
  getSotwApiKey,
  pickSotwIndicator,
  resolveSotwCountryIso,
  sotwFetchJson,
  SOTW_ATTRIBUTION,
  type SotwCountryCard,
  type SotwCountryPayload,
  type SotwIndicatorRow,
} from "@/lib/sotw";

export type MacroSeriesPoint = { year: number; value: number };

export type MacroShock = {
  indicatorId: string;
  labelKo: string;
  labelEn: string;
  latest: number | null;
  latestYear: string | null;
  prev: number | null;
  prevYear: string | null;
  deltaPp: number | null;
  min: number | null;
  max: number | null;
  rangePp: number | null;
  series: MacroSeriesPoint[];
};

export type SotwMacroDeep = SotwCountryCard & {
  inflationPct: number | null;
  gdpGrowthPct: number | null;
  unemploymentPct: number | null;
  currentAccountPctGdp: number | null;
  govDebtPctGdp: number | null;
  exportsPctGdp: number | null;
  importsPctGdp: number | null;
  incomeLevel?: string;
  shocks: {
    inflation: MacroShock | null;
    growth: MacroShock | null;
  };
  peers: Array<{
    id: string;
    name: string;
    inflationPct: number | null;
    gdpGrowthPct: number | null;
    gdpPerCapitaUsd: number | null;
  }>;
  /** 양피지·등불용 서술 문단 */
  narrativeKo: string[];
  narrativeEn: string[];
};

type HistoryPayload = {
  data?: Array<{ year?: number | string; value?: number | null }>;
};

const INFLATION_IDS = ["FP.CPI.TOTL.ZG", "IMF.PCPIPCH", "AV.INFLATION"];
const GROWTH_IDS = ["NY.GDP.MKTP.KD.ZG", "IMF.NGDP_RPCH"];
const UNEMP_IDS = ["SL.UEM.TOTL.ZS"];
const CA_IDS = ["BN.CAB.XOKA.GD.ZS"];
const DEBT_IDS = ["GC.DOD.TOTL.GD.ZS"];
const EXP_IDS = ["NE.EXP.GNFS.ZS"];
const IMP_IDS = ["NE.IMP.GNFS.ZS"];

/** ISO3 → 비교 피어 (자국 제외) */
const PEER_ISO: Record<string, string[]> = {
  USA: ["CHN", "DEU"],
  CHN: ["USA", "JPN"],
  JPN: ["USA", "KOR"],
  KOR: ["JPN", "CHN"],
  DEU: ["USA", "FRA"],
  FRA: ["DEU", "USA"],
  GBR: ["USA", "DEU"],
  IND: ["CHN", "USA"],
  IDN: ["VNM", "CHN"],
  VNM: ["CHN", "IDN"],
  AUS: ["CHN", "USA"],
  CHL: ["USA", "AUS"],
  ARE: ["SAU", "USA"],
  SAU: ["ARE", "USA"],
  QAT: ["ARE", "USA"],
  SGP: ["MYS", "CHN"],
  MYS: ["SGP", "CHN"],
  HKG: ["CHN", "SGP"],
  NLD: ["DEU", "USA"],
  IRN: ["SAU", "TUR"],
  TUR: ["DEU", "USA"],
  UKR: ["POL", "DEU"],
  POL: ["DEU", "USA"],
  ISR: ["USA", "DEU"],
  EGY: ["SAU", "TUR"],
  YEM: ["SAU", "EGY"],
  PAN: ["USA", "MEX"],
  BRA: ["USA", "CHN"],
  MEX: ["USA", "CHN"],
  RUS: ["CHN", "DEU"],
  TWN: ["KOR", "JPN"],
  PHL: ["VNM", "CHN"],
  THA: ["VNM", "CHN"],
  NGA: ["ZAF", "USA"],
  ZAF: ["NGA", "USA"],
  CAN: ["USA", "CHN"],
};

function emptyCard(partial: Partial<SotwMacroDeep> & Pick<SotwMacroDeep, "disabled" | "attribution">): SotwMacroDeep {
  return {
    gdpUsd: null,
    gdpPerCapitaUsd: null,
    tradePctGdp: null,
    population: null,
    milSpendPctGdp: null,
    inflationPct: null,
    gdpGrowthPct: null,
    unemploymentPct: null,
    currentAccountPctGdp: null,
    govDebtPctGdp: null,
    exportsPctGdp: null,
    importsPctGdp: null,
    shocks: { inflation: null, growth: null },
    peers: [],
    narrativeKo: [],
    narrativeEn: [],
    ...partial,
  };
}

function parseSeries(data: HistoryPayload["data"] | undefined): MacroSeriesPoint[] {
  if (!data?.length) return [];
  const out: MacroSeriesPoint[] = [];
  for (const row of data) {
    const year = Number(row.year);
    const value = row.value;
    if (!Number.isFinite(year) || typeof value !== "number" || !Number.isFinite(value)) continue;
    out.push({ year, value });
  }
  return out.sort((a, b) => a.year - b.year);
}

async function fetchHistorySeries(indicator: string, iso: string): Promise<MacroSeriesPoint[]> {
  try {
    const payload = await sotwFetchJson<HistoryPayload>("/api/v2/history", {
      searchParams: { indicator, country: iso },
      cacheKey: `sotw:hist:${indicator}:${iso}`,
      ttlMs: 6 * 60 * 60 * 1000,
    });
    return parseSeries(payload.data);
  } catch {
    try {
      const payload = await sotwFetchJson<HistoryPayload>(
        `/api/v1/history/${encodeURIComponent(indicator)}/${encodeURIComponent(iso)}`,
        { cacheKey: `sotw:hist:v1:${indicator}:${iso}`, ttlMs: 6 * 60 * 60 * 1000 },
      );
      return parseSeries(payload.data);
    } catch {
      return [];
    }
  }
}

function buildShock(
  series: MacroSeriesPoint[],
  indicatorId: string,
  labelKo: string,
  labelEn: string,
): MacroShock | null {
  if (series.length < 2) {
    if (series.length === 1) {
      const latest = series[0]!;
      return {
        indicatorId,
        labelKo,
        labelEn,
        latest: latest.value,
        latestYear: String(latest.year),
        prev: null,
        prevYear: null,
        deltaPp: null,
        min: latest.value,
        max: latest.value,
        rangePp: 0,
        series,
      };
    }
    return null;
  }
  const window = series.slice(-8);
  const latest = window[window.length - 1]!;
  const prev = window[window.length - 2]!;
  const values = window.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    indicatorId,
    labelKo,
    labelEn,
    latest: latest.value,
    latestYear: String(latest.year),
    prev: prev.value,
    prevYear: String(prev.year),
    deltaPp: latest.value - prev.value,
    min,
    max,
    rangePp: max - min,
    series: window,
  };
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtUsdCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  return `$${v.toLocaleString()}`;
}

function shakeAdjective(rangePp: number | null, lang: "ko" | "en"): string {
  if (rangePp == null) return lang === "ko" ? "관측" : "observed";
  if (rangePp >= 8) return lang === "ko" ? "크게 흔들린" : "sharply shaken";
  if (rangePp >= 4) return lang === "ko" ? "뚜렷이 흔들린" : "noticeably swung";
  if (rangePp >= 2) return lang === "ko" ? "완만히 흔들린" : "moderately moved";
  return lang === "ko" ? "비교적 안정된" : "relatively steady";
}

function pickLevels(indicators: SotwIndicatorRow[] | undefined) {
  return {
    inflation: pickSotwIndicator(indicators, INFLATION_IDS),
    growth: pickSotwIndicator(indicators, GROWTH_IDS),
    unemp: pickSotwIndicator(indicators, UNEMP_IDS),
    ca: pickSotwIndicator(indicators, CA_IDS),
    debt: pickSotwIndicator(indicators, DEBT_IDS),
    exp: pickSotwIndicator(indicators, EXP_IDS),
    imp: pickSotwIndicator(indicators, IMP_IDS),
  };
}

function buildNarratives(args: {
  name: string;
  iso: string;
  inflationPct: number | null;
  gdpGrowthPct: number | null;
  unemploymentPct: number | null;
  currentAccountPctGdp: number | null;
  govDebtPctGdp: number | null;
  gdpUsd: number | null;
  gdpPerCapitaUsd: number | null;
  tradePctGdp: number | null;
  milSpendPctGdp: number | null;
  inflationShock: MacroShock | null;
  growthShock: MacroShock | null;
  peers: SotwMacroDeep["peers"];
}): { ko: string[]; en: string[] } {
  const {
    name,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct,
    currentAccountPctGdp,
    govDebtPctGdp,
    gdpUsd,
    gdpPerCapitaUsd,
    tradePctGdp,
    milSpendPctGdp,
    inflationShock,
    growthShock,
    peers,
  } = args;

  const ko: string[] = [];
  const en: string[] = [];

  // Core snapshot
  ko.push(
    `${name} 거시 스냅샷 — GDP ${fmtUsdCompact(gdpUsd)} · 1인당 ${fmtUsdCompact(gdpPerCapitaUsd)} · 성장 ${fmtPct(gdpGrowthPct)} · 인플레 ${fmtPct(inflationPct)} · 실업 ${fmtPct(unemploymentPct)}.`,
  );
  en.push(
    `${name} macro snapshot — GDP ${fmtUsdCompact(gdpUsd)} · GDP/cap ${fmtUsdCompact(gdpPerCapitaUsd)} · growth ${fmtPct(gdpGrowthPct)} · inflation ${fmtPct(inflationPct)} · unemployment ${fmtPct(unemploymentPct)}.`,
  );

  // Inflation shock narrative
  if (inflationShock?.latest != null && inflationShock.rangePp != null) {
    const adj = shakeAdjective(inflationShock.rangePp, "ko");
    const adjEn = shakeAdjective(inflationShock.rangePp, "en");
    const delta =
      inflationShock.deltaPp != null
        ? `직전년 대비 ${fmtPct(inflationShock.deltaPp)}p`
        : "전년 대비 변화는 제한적";
    const deltaEn =
      inflationShock.deltaPp != null
        ? `${fmtPct(inflationShock.deltaPp)}p vs prior year`
        : "limited year-on-year change";
    ko.push(
      `인플레이션은 최근 ${inflationShock.series.length}년 창에서 ${adj} 흐름입니다(범위 ${inflationShock.rangePp.toFixed(1)}%p, ${inflationShock.min?.toFixed(1)}→${inflationShock.max?.toFixed(1)}). 최신 ${inflationShock.latestYear ?? ""}년 ${inflationShock.latest.toFixed(1)}%, ${delta}.`,
    );
    en.push(
      `Inflation looks ${adjEn} over the last ${inflationShock.series.length} years (range ${inflationShock.rangePp.toFixed(1)}pp, ${inflationShock.min?.toFixed(1)}→${inflationShock.max?.toFixed(1)}). Latest ${inflationShock.latestYear ?? ""}: ${inflationShock.latest.toFixed(1)}%, ${deltaEn}.`,
    );
  } else if (inflationPct != null) {
    ko.push(`소비자물가 상승률은 약 ${inflationPct.toFixed(1)}%로 집계됩니다.`);
    en.push(`Consumer price inflation prints around ${inflationPct.toFixed(1)}%.`);
  }

  // Growth shock
  if (growthShock?.latest != null && growthShock.rangePp != null) {
    const adj = shakeAdjective(growthShock.rangePp, "ko");
    const adjEn = shakeAdjective(growthShock.rangePp, "en");
    ko.push(
      `실질 GDP 성장은 ${adj} 구간입니다(최근 창 범위 ${growthShock.rangePp.toFixed(1)}%p). 최신 ${growthShock.latestYear ?? ""}년 ${fmtPct(growthShock.latest)}${
        growthShock.deltaPp != null ? `, 직전년 대비 ${fmtPct(growthShock.deltaPp)}p` : ""
      }.`,
    );
    en.push(
      `Real GDP growth has been ${adjEn} (window range ${growthShock.rangePp.toFixed(1)}pp). Latest ${growthShock.latestYear ?? ""}: ${fmtPct(growthShock.latest)}${
        growthShock.deltaPp != null ? `, ${fmtPct(growthShock.deltaPp)}p vs prior year` : ""
      }.`,
    );
  } else if (gdpGrowthPct != null) {
    ko.push(`실질 성장률은 약 ${fmtPct(gdpGrowthPct)}입니다.`);
    en.push(`Real growth is about ${fmtPct(gdpGrowthPct)}.`);
  }

  // External / fiscal
  const extBitsKo: string[] = [];
  const extBitsEn: string[] = [];
  if (tradePctGdp != null) {
    extBitsKo.push(`무역/GDP ${tradePctGdp.toFixed(0)}%`);
    extBitsEn.push(`trade/GDP ${tradePctGdp.toFixed(0)}%`);
  }
  if (currentAccountPctGdp != null) {
    extBitsKo.push(`경상수지 ${fmtPct(currentAccountPctGdp)} GDP`);
    extBitsEn.push(`current account ${fmtPct(currentAccountPctGdp)} of GDP`);
  }
  if (govDebtPctGdp != null) {
    extBitsKo.push(`정부부채 ${govDebtPctGdp.toFixed(0)}% GDP`);
    extBitsEn.push(`gov debt ${govDebtPctGdp.toFixed(0)}% of GDP`);
  }
  if (milSpendPctGdp != null) {
    extBitsKo.push(`국방 ${milSpendPctGdp.toFixed(1)}% GDP`);
    extBitsEn.push(`defense ${milSpendPctGdp.toFixed(1)}% of GDP`);
  }
  if (extBitsKo.length) {
    ko.push(`대외·재정 축: ${extBitsKo.join(" · ")}.`);
    en.push(`External/fiscal axis: ${extBitsEn.join(" · ")}.`);
  }

  // Peer compare
  if (peers.length > 0) {
    const peerBits = peers
      .map((p) => `${p.name}(성장 ${fmtPct(p.gdpGrowthPct)} · 인플레 ${fmtPct(p.inflationPct)})`)
      .join(", ");
    const peerBitsEn = peers
      .map((p) => `${p.name}(growth ${fmtPct(p.gdpGrowthPct)} · infl ${fmtPct(p.inflationPct)})`)
      .join(", ");
    const selfVs = peers[0];
    let compareKo = "";
    let compareEn = "";
    if (selfVs && inflationPct != null && selfVs.inflationPct != null) {
      const d = inflationPct - selfVs.inflationPct;
      compareKo =
        d > 0.4
          ? ` 인플레는 ${selfVs.name}보다 ${Math.abs(d).toFixed(1)}%p 높습니다.`
          : d < -0.4
            ? ` 인플레는 ${selfVs.name}보다 ${Math.abs(d).toFixed(1)}%p 낮습니다.`
            : ` 인플레는 ${selfVs.name}과 비슷한 수준입니다.`;
      compareEn =
        d > 0.4
          ? ` Inflation runs ${Math.abs(d).toFixed(1)}pp hotter than ${selfVs.name}.`
          : d < -0.4
            ? ` Inflation runs ${Math.abs(d).toFixed(1)}pp cooler than ${selfVs.name}.`
            : ` Inflation is roughly in line with ${selfVs.name}.`;
    }
    ko.push(`피어 비교 — ${peerBits}.${compareKo}`);
    en.push(`Peer check — ${peerBitsEn}.${compareEn}`);
  }

  ko.push(`수치 출처: ${SOTW_ATTRIBUTION} (World Bank / IMF 계열). 시점·정의는 지표별로 다를 수 있습니다.`);
  en.push(`Source: ${SOTW_ATTRIBUTION} (World Bank / IMF family). Vintage and definitions vary by series.`);

  return { ko, en };
}

async function fetchPeerSnapshot(iso: string): Promise<SotwMacroDeep["peers"][number] | null> {
  try {
    const payload = await sotwFetchJson<SotwCountryPayload>(
      `/api/v1/countries/${encodeURIComponent(iso)}`,
      { cacheKey: `sotw:country:${iso}` },
    );
    const levels = pickLevels(payload.indicators);
    const gdpPc = pickSotwIndicator(payload.indicators, ["NY.GDP.PCAP.CD", "IMF.NGDPDPC"]);
    return {
      id: payload.country?.id ?? iso,
      name: payload.country?.name ?? iso,
      inflationPct: levels.inflation.value,
      gdpGrowthPct: levels.growth.value,
      gdpPerCapitaUsd: gdpPc.value,
    };
  } catch {
    return null;
  }
}

/** 국가 힌트 → 딥 매크로 (히스토리 충격 + 피어 + 내러티브) */
export async function fetchSotwMacroDeep(hint: string): Promise<SotwMacroDeep> {
  if (!getSotwApiKey()) {
    return emptyCard({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const iso = resolveSotwCountryIso(hint);
  if (!iso) {
    return emptyCard({
      disabled: false,
      name: hint,
      error: "unmapped country hint",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const payload = await sotwFetchJson<SotwCountryPayload>(
    `/api/v1/countries/${encodeURIComponent(iso)}`,
    { cacheKey: `sotw:country:${iso}` },
  );
  const base = buildCountryCard(payload, hint, iso);
  const levels = pickLevels(payload.indicators);

  const [inflSeries, growthSeries, ...peerRows] = await Promise.all([
    fetchHistorySeries("FP.CPI.TOTL.ZG", iso),
    fetchHistorySeries("NY.GDP.MKTP.KD.ZG", iso),
    ...(PEER_ISO[iso] ?? ["USA", "CHN"])
      .filter((p) => p !== iso)
      .slice(0, 2)
      .map((p) => fetchPeerSnapshot(p)),
  ]);

  const inflationShock = buildShock(inflSeries, "FP.CPI.TOTL.ZG", "인플레이션", "Inflation");
  const growthShock = buildShock(growthSeries, "NY.GDP.MKTP.KD.ZG", "실질 GDP 성장", "Real GDP growth");
  const peers = peerRows.filter((p): p is NonNullable<typeof p> => p != null);

  const inflationPct = levels.inflation.value ?? inflationShock?.latest ?? null;
  const gdpGrowthPct = levels.growth.value ?? growthShock?.latest ?? null;

  const yearHints: NonNullable<SotwCountryCard["yearHints"]> = { ...(base.yearHints ?? {}) };
  if (levels.inflation.year) yearHints.inflation = levels.inflation.year;
  if (levels.growth.year) yearHints.growth = levels.growth.year;
  if (levels.unemp.year) yearHints.unemployment = levels.unemp.year;

  const name = base.name ?? hint;
  const { ko, en } = buildNarratives({
    name,
    iso,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct: levels.unemp.value,
    currentAccountPctGdp: levels.ca.value,
    govDebtPctGdp: levels.debt.value,
    gdpUsd: base.gdpUsd,
    gdpPerCapitaUsd: base.gdpPerCapitaUsd,
    tradePctGdp: base.tradePctGdp,
    milSpendPctGdp: base.milSpendPctGdp,
    inflationShock,
    growthShock,
    peers,
  });

  return {
    ...base,
    yearHints,
    incomeLevel: payload.country?.incomeLevel,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct: levels.unemp.value,
    currentAccountPctGdp: levels.ca.value,
    govDebtPctGdp: levels.debt.value,
    exportsPctGdp: levels.exp.value,
    importsPctGdp: levels.imp.value,
    shocks: { inflation: inflationShock, growth: growthShock },
    peers,
    narrativeKo: ko,
    narrativeEn: en,
  };
}

/** 여러 국가 딥 매크로 (등불·비교용) — 병렬, 상한 4 */
export async function fetchSotwMacroDeepMany(hints: string[]): Promise<SotwMacroDeep[]> {
  const unique = [...new Set(hints.map((h) => h.trim()).filter(Boolean))].slice(0, 4);
  const rows = await Promise.all(unique.map((h) => fetchSotwMacroDeep(h)));
  return rows.filter((r) => !r.disabled && !r.error);
}

export function narrativeForLang(macro: SotwMacroDeep, lang: LabelLanguage): string[] {
  return lang === "en" ? macro.narrativeEn : macro.narrativeKo;
}

/** 시장 등불용 — 여러 국 내러티브를 합쳐 짧은 브리핑 문단 세트 */
export function composeMarketLampParagraphs(
  macros: SotwMacroDeep[],
  lang: LabelLanguage,
): string[] {
  if (macros.length === 0) return [];
  const out: string[] = [];
  for (const m of macros) {
    const lines = narrativeForLang(m, lang);
    // 스냅샷 + 인플레 충격(+성장) 위주 2~3줄
    out.push(...lines.slice(0, 3));
  }
  if (lang === "en") {
    out.push("Figures via Statistics of the World. Definitions and vintages differ by series.");
  } else {
    out.push("수치는 Statistics of the World 기준입니다. 지표·시점은 시리즈마다 다를 수 있습니다.");
  }
  return out;
}
