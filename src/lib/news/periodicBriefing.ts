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

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  if (FRICTION_EPISODES.length === 0) return null;
  const ko = lang !== "en";
  const episode = FRICTION_EPISODES[hashKeyToIndex(dayKey, FRICTION_EPISODES.length)];
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${episode.title}`,
    paragraphs: ko
      ? [
          `${yearText} · ${episode.locationName}`,
          episode.briefing,
          "라이브 집계가 아직 비어 있어 큐레이션 회고로 대신합니다. 지도 허브 「반서방국 충돌사」에서 이어서 볼 수 있습니다.",
        ]
      : [
          `${yearText} · ${episode.locationName}`,
          episode.briefing,
          "Live aggregates are empty — showing a curated episode. Continue in the hub Frictions section.",
        ],
  };
}

function buildEconFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const briefs = allEconInsightBriefs();
  if (briefs.length === 0) return null;
  const ko = lang !== "en";
  const brief = briefs[hashKeyToIndex(dayKey, briefs.length)];
  const kicker = ko ? LAMP_TITLE_ECON.ko[tier] : LAMP_TITLE_ECON.en[tier];
  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${ko ? brief.titleKo : brief.titleEn}`,
    paragraphs: [brief.impactLine, ...brief.paragraphs],
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

  const hot =
    stats.topGdeltTag || stats.topTelegramRegion
      ? [stats.topGdeltTag, stats.topTelegramRegion].filter(Boolean).join(" · ")
      : null;

  const titleLine = hot
    ? ko
      ? `지금 가장 뜨거운 곳: ${hot}`
      : `Hottest theater: ${hot}`
    : ko
      ? "라이브 관측 브리핑"
      : "Live observation briefing";

  const countParts: string[] = [];
  if (stats.gdeltCount > 0) {
    countParts.push(
      ko
        ? `GDELT 긴장점 ${stats.gdeltCount.toLocaleString()}건`
        : `${stats.gdeltCount.toLocaleString()} GDELT tension points`,
    );
  }
  if (stats.firmsCount > 0) {
    countParts.push(
      ko
        ? `FIRMS 열원 ${stats.firmsCount.toLocaleString()}건`
        : `${stats.firmsCount.toLocaleString()} FIRMS hotspots`,
    );
  }
  if (stats.telegramCount > 0) {
    countParts.push(
      ko
        ? `텔레그램 속보 ${stats.telegramCount.toLocaleString()}건`
        : `${stats.telegramCount.toLocaleString()} Telegram alerts`,
    );
  }
  if (stats.newsItemCount > 0) {
    countParts.push(
      ko
        ? `뉴스 스트림 ${stats.newsItemCount.toLocaleString()}건`
        : `${stats.newsItemCount.toLocaleString()} news items`,
    );
  }

  const paragraphs: string[] = [];
  if (countParts.length > 0) {
    paragraphs.push(
      ko
        ? `같은 창의 라이브 관측: ${countParts.join(" · ")}.`
        : `Live window: ${countParts.join(" · ")}.`,
    );
  }

  const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
  if (gdeltSamples.length > 0) {
    const names = gdeltSamples.map((s) => s.name).join(ko ? " · " : " · ");
    paragraphs.push(
      ko ? `주목 긴장 지점: ${names}.` : `Watchpoints: ${names}.`,
    );
  }

  const tgSamples = stats.detail?.telegramSamples?.slice(0, 2) ?? [];
  if (tgSamples.length > 0) {
    for (const s of tgSamples) {
      paragraphs.push(
        ko
          ? `[${s.region}] ${s.text}`
          : `[${s.region}] ${s.text}`,
      );
    }
  }

  if (paragraphs.length === 0) return null;

  paragraphs.push(
    ko
      ? "이 등불은 매일 자정에 다시 켜집니다. 확인하면 오늘 분은 닫히고, 내일 다시 찾아옵니다."
      : "This lamp relights at local midnight. Dismiss for today — it returns tomorrow.",
  );

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
