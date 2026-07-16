import { FRICTION_EPISODES } from "@/data/frictionEpisodes";
import { allEconInsightBriefs } from "@/data/econInsightBriefs";
import type { BriefingPeriodStats } from "@/lib/briefingPeriodStats";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 매일 등불 브리핑 — 지정학·지경학 각각 하루 1회.
 *
 * - 첫 방문: 입장 인트로(경고→편지→도메인)가 끝난 뒤에 점화
 * - 재방문: 로컬 자정 기준 그날 아직 안 봤으면 모드별 양피지
 * - seen 키 = `daily-YYYY-MM-DD-{conflict|economy}`
 * - 본문 = (지경학) SOTW market-lamp → D1 집계 → 큐레이션 폴백
 * - 스토리텔링 뼈대 = 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)
 */

export type BriefingTier = "monthly" | "weekly" | "daily";

export type PeriodicBriefing = {
  tier: BriefingTier;
  /** 등불 seen 키 — 캘린더 일 + 뷰어 모드 */
  key: string;
  title: string;
  paragraphs: string[];
};

const STORAGE_PREFIX = "cv-periodic-brief-seen-";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 브라우저 로컬 캘린더 날짜 키 — 등불 seen / 자정 감지의 기준 */
export function localCalendarDayKey(now: Date = new Date()): string {
  return `daily-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);

  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

function isMonthEndWindow(date: Date): boolean {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() >= lastDay - 2 || date.getDate() === 1;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 카피/집계 티어 — 월말 > 주말 > 평일 (동시에 하나만) */
export function resolvePeriodTier(now: Date = new Date()): { tier: BriefingTier; key: string } {
  if (isMonthEndWindow(now)) {
    const ref =
      now.getDate() === 1 ? new Date(now.getFullYear(), now.getMonth() - 1, 15) : now;
    return {
      tier: "monthly",
      key: `monthly-${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}`,
    };
  }
  if (isWeekend(now)) {
    const { year, week } = isoWeek(now);
    return { tier: "weekly", key: `weekly-${year}-W${pad2(week)}` };
  }
  return {
    tier: "daily",
    key: localCalendarDayKey(now),
  };
}

/** 등불 주기 = 로컬 캘린더 하루. 티어는 카피용. */
export function resolveLampPeriod(now: Date = new Date()): {
  dayKey: string;
  tier: BriefingTier;
  statsKey: string;
} {
  const { tier, key: statsKey } = resolvePeriodTier(now);
  return { dayKey: localCalendarDayKey(now), tier, statsKey };
}

/** 모드별 일일 등불 seen 키 — 지정학·지경학 각각 하루 1회 */
export function lampSeenKey(dayKey: string, mode: ViewerMode): string {
  return `${dayKey}-${mode}`;
}

export function hasSeenPeriod(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return true;
  }
}

export function markPeriodSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

function hashKeyToIndex(key: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

const LAMP_TITLE = {
  ko: {
    daily: "오늘의 전장 등불",
    weekly: "이번 주 전장 등불",
    monthly: "이번 달 전장 등불",
  },
  en: {
    daily: "Today's frontline lamp",
    weekly: "This week's frontline lamp",
    monthly: "This month's frontline lamp",
  },
} as const;

const LAMP_TITLE_ECON = {
  ko: {
    daily: "오늘의 시장 등불",
    weekly: "이번 주 시장 등불",
    monthly: "이번 달 시장 등불",
  },
  en: {
    daily: "Today's market lamp",
    weekly: "This week's market lamp",
    monthly: "This month's market lamp",
  },
} as const;

/**
 * 등불 스토리텔링 — 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 뼈대로 하되
 * 라벨 나열이 아니라 한 편의 짧은 이야기로 이어 쓴다.
 */
function looksMostlyKorean(text: string): boolean {
  const ko = (text.match(/[\uac00-\ud7a3]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ko >= 6 && ko >= latin * 0.5;
}

function pickKoreanLines(lines: string[], limit = 2): string[] {
  return lines.filter(looksMostlyKorean).slice(0, limit);
}

function partyLabel(parties: string[]): string {
  if (parties.length === 0) return "관련 세력";
  return parties.join("·");
}

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  if (FRICTION_EPISODES.length === 0) return null;
  const ko = lang !== "en";
  const episode = FRICTION_EPISODES[hashKeyToIndex(dayKey, FRICTION_EPISODES.length)];
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;
  const who = partyLabel(episode.parties);

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${episode.title}`,
    paragraphs: ko
      ? [
          // 언제 · 어디서 · 누가
          `${yearText}, ${episode.locationName}에서 ${who}이(가) 맞붙었습니다. 오늘 등불은 그 자리로 돌아갑니다.`,
          // 무엇을 · 왜
          episode.briefing,
          // 어떻게
          "라이브 집계가 비어 있어도, 이 과거는 오늘의 긴장을 읽는 렌즈가 됩니다. 지도 허브 「반서방국 충돌사」에서 이어서 읽고, 이 등불은 자정에 다시 켜집니다.",
        ]
      : [
          `When ${yearText}, at ${episode.locationName}, ${who} collided. Tonight the lamp returns there.`,
          episode.briefing,
          "Even without live aggregates, this past is a lens on today's tension. Continue in Frictions. The lamp relights at local midnight.",
        ],
  };
}

function buildEconFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const briefs = allEconInsightBriefs();
  if (briefs.length === 0) return null;
  const ko = lang !== "en";
  const brief = briefs[hashKeyToIndex(dayKey, briefs.length)];
  const kicker = ko ? LAMP_TITLE_ECON.ko[tier] : LAMP_TITLE_ECON.en[tier];

  if (ko) {
    const koLines = pickKoreanLines(brief.paragraphs, 2);
    const whatWhy =
      koLines.length > 0
        ? koLines
        : [
            `${brief.titleKo}은(는) 물자와 가격이 지나가는 병목입니다.`,
            "긴장이 번지면 에너지·물류·물가 경로로 파급됩니다. 그래서 오늘 시장 등불이 이곳을 고릅니다.",
          ];
    return {
      tier,
      key: dayKey,
      title: `${kicker}\n${brief.titleKo}`,
      paragraphs: [
        // 누가 · 언제 · 어디서
        `누가 보나 — 시장과 물류를 읽는 눈. 언제 — 오늘. 어디서 — ${brief.titleKo}.`,
        // 무엇을 · 왜
        ...whatWhy.slice(0, 2),
        // 어떻게
        "표로 외우지 말고, 육하원칙으로 한 장면만 가져가세요. 수치는 시리즈마다 시점이 다를 수 있습니다. 이 등불은 자정에 다시 켜집니다.",
      ],
    };
  }

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${brief.titleEn}`,
    paragraphs: [
      `Who watches markets; when is today; where is ${brief.titleEn}.`,
      brief.impactLine,
      ...brief.paragraphs.slice(0, 2),
      "Read it as 5W1H, not a ledger. The lamp relights at local midnight.",
    ],
  };
}

/** 통계·샘플로 본문 구성. 데이터 없으면 null → 호출부가 폴백. */
export function buildBriefingFromStats(
  stats: BriefingPeriodStats | null | undefined,
  tier: BriefingTier,
  dayKey: string,
  lang: LabelLanguage,
  viewerMode: ViewerMode,
): PeriodicBriefing | null {
  if (!stats) return null;
  const total =
    stats.gdeltCount + stats.firmsCount + stats.telegramCount + stats.newsItemCount;
  if (total <= 0 && !(stats.detail?.gdeltSamples?.length || stats.detail?.telegramSamples?.length)) {
    return null;
  }

  const ko = lang !== "en";
  const econ = viewerMode === "economy";
  const kicker = econ
    ? ko
      ? LAMP_TITLE_ECON.ko[tier]
      : LAMP_TITLE_ECON.en[tier]
    : ko
      ? LAMP_TITLE.ko[tier]
      : LAMP_TITLE.en[tier];

  const hotTag = stats.topGdeltTag || null;
  const hotRegion = stats.topTelegramRegion || null;
  const hot = [hotTag, hotRegion].filter(Boolean).join(ko ? "·" : " / ") || null;

  const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
  const placeNames = (() => {
    const koPlaces = gdeltSamples
      .map((s) => s.name)
      .filter((n) => looksMostlyKorean(n) || /[가-힣]/.test(n));
    if (koPlaces.length > 0) return koPlaces.slice(0, 3).join(" · ");
    return gdeltSamples
      .map((s) => s.name)
      .slice(0, 2)
      .join(" · ");
  })();

  const tgSamples = stats.detail?.telegramSamples?.slice(0, 3) ?? [];
  const koTg = tgSamples.filter((s) => looksMostlyKorean(s.text));
  const tgRegions = [...new Set(tgSamples.map((s) => s.region).filter(Boolean))].slice(0, 2);

  const titleLine = hot
    ? ko
      ? `${hot} — 육하원칙으로 읽기`
      : `${hot} — in 5W1H`
    : ko
      ? econ
        ? "시장 창을 육하원칙으로"
        : "전선을 육하원칙으로"
      : econ
        ? "Markets in 5W1H"
        : "The front in 5W1H";

  const paragraphs: string[] = [];

  if (ko) {
    // 언제 · 어디서
    const whenWhere = hot
      ? `언제 — 오늘 같은 관측 창. 어디서 — ${hot}${placeNames ? ` (가까이 ${placeNames})` : ""}.`
      : placeNames
        ? `언제 — 오늘 같은 관측 창. 어디서 — ${placeNames} 일대.`
        : "언제 — 오늘 같은 관측 창. 어디서 — 지도 전역에서 깜빡인 신호들.";
    paragraphs.push(whenWhere);

    // 누가 · 무엇을
    const actors: string[] = [];
    if (stats.gdeltCount > 0) {
      actors.push(`긴장 관측 ${stats.gdeltCount.toLocaleString()}곳`);
    }
    if (stats.firmsCount > 0) {
      actors.push(`열원 ${stats.firmsCount.toLocaleString()}점`);
    }
    if (stats.telegramCount > 0) {
      actors.push(`현장 채널 ${stats.telegramCount.toLocaleString()}건`);
    } else if (stats.newsItemCount > 0) {
      actors.push(`뉴스 흐름 ${stats.newsItemCount.toLocaleString()}건`);
    }
    if (actors.length > 0) {
      paragraphs.push(
        `누가·무엇을 — ${actors.join(", ")}이(가) 같은 창에 남긴 흔적입니다.${
          econ ? " 시장은 잠들어도 지도는 깨어 있습니다." : ""
        }`,
      );
    }

    // 왜
    if (koTg.length > 0) {
      const s = koTg[0]!;
      paragraphs.push(
        `왜 지금이냐면 — ${s.region} 쪽에서 「${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}」라는 전언이 온도를 올렸기 때문입니다.`,
      );
    } else if (tgRegions.length > 0) {
      paragraphs.push(
        `왜 지금이냐면 — ${tgRegions.join("·")} 일대 채널이 위치를 가리키고, 전선의 결이 그쪽으로 기울었기 때문입니다. (원문은 외국어 섞임이 많아 위치만 남깁니다.)`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(
        `왜 지금이냐면 — ${hot || placeNames}이(가) 오늘 창에서 가장 먼저 밝아졌기 때문입니다.`,
      );
    }

    // 어떻게
    paragraphs.push(
      econ
        ? "어떻게 읽나 — 숫자 표가 아니라 누가·언제·어디서·무엇을·왜·어떻게, 여섯 칸만 챙기세요. 이 등불은 자정에 다시 켜집니다."
        : "어떻게 읽나 — 목록이 아니라 육하원칙 한 장면으로. 누가·언제·어디서·무엇을·왜·어떻게. 이 등불은 자정에 다시 켜집니다.",
    );
  } else {
    paragraphs.push(
      hot
        ? `When — this live window. Where — ${hot}${placeNames ? ` (near ${placeNames})` : ""}.`
        : placeNames
          ? `When — this live window. Where — ${placeNames}.`
          : "When — this live window. Where — sparks across the map.",
    );
    const actors: string[] = [];
    if (stats.gdeltCount > 0) actors.push(`${stats.gdeltCount.toLocaleString()} GDELT sparks`);
    if (stats.firmsCount > 0) actors.push(`${stats.firmsCount.toLocaleString()} FIRMS embers`);
    if (stats.telegramCount > 0) actors.push(`${stats.telegramCount.toLocaleString()} field notes`);
    if (actors.length > 0) {
      paragraphs.push(`Who & what — ${actors.join("; ")} left traces in the same frame.`);
    }
    if (tgSamples[0]) {
      const s = tgSamples[0];
      paragraphs.push(
        `Why now — from ${s.region}: “${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}”.`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(`Why now — ${hot || placeNames} lit up first in tonight's window.`);
    }
    paragraphs.push(
      "How to read — as 5W1H, not a checklist. This lamp relights at local midnight.",
    );
  }

  if (paragraphs.length < 2) return null;

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${titleLine}`,
    paragraphs,
  };
}

/**
 * 폴백만 — 라이브 집계 없을 때.
 * 호출부에서 key를 lampSeenKey(dayKey, mode)로 덮어쓴다.
 */
export function buildPeriodicBriefing(
  viewerMode: ViewerMode,
  lang: LabelLanguage,
  now: Date = new Date(),
): PeriodicBriefing | null {
  const { dayKey, tier } = resolveLampPeriod(now);
  if (viewerMode === "economy") {
    return buildEconFallback(tier, dayKey, lang) ?? buildGeoFallback(tier, dayKey, lang);
  }
  return buildGeoFallback(tier, dayKey, lang);
}

/** @deprecated 본문이 이미 집계 기반이면 no-op에 가깝게 유지 */
export function mergeBriefingStats(
  briefing: PeriodicBriefing,
  stats: BriefingPeriodStats | null | undefined,
  lang: LabelLanguage,
): PeriodicBriefing {
  if (!stats) return briefing;
  const fromStats = buildBriefingFromStats(
    stats,
    briefing.tier,
    briefing.key,
    lang,
    "conflict",
  );
  return fromStats ?? briefing;
}
