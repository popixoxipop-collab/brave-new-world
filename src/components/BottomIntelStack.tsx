"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MapLegend } from "@/components/MapLegend";
import { HoverHint } from "@/components/HoverHint";
import { StockTickerStrip } from "@/components/StockTickerStrip";
import { IntelRelatedMarketsPanel } from "@/components/IntelRelatedMarketsPanel";
import { IntelSheetSearchBar, type IntelSearchResult } from "@/components/IntelSheetSearchBar";
import { TelegramIntelFeed } from "@/components/TelegramIntelFeed";
import { ViinaFrontEventsPanel } from "@/components/ViinaFrontEventsPanel";
import type { ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import { isEconomyNewsMode } from "@/lib/news/feedCatalog";
import type { ViewPackageId, ViewerMode } from "@/lib/viewPackages";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import { ECONOMY_TIER_LABELS } from "@/lib/news/mediaTiers";
import { STOCK_TICKER_SYMBOLS } from "@/lib/stockTickers";
import {
  heroHighlightSymbols,
  resolveIntelStackClearance,
  resolveIntelStackMode,
  TICKER_SPIKE_THRESHOLD_PERCENT,
} from "@/lib/news/intelStackMode";
import {
  flyTargetForTheater,
  matchesTheaterFilter,
  THEATER_CHIP_LABELS,
  THEATER_CHIP_ORDER,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";

export type BottomIntelStackHandle = {
  openNewsPanel: (theater?: IntelTheaterFilter, tab?: IntelSheetTab) => void;
  closeNewsPanel: () => void;
};

export type IntelSheetTab = "news" | "telegram" | "viina";

/** 경제 Intel 전체화면 — RSS vs 증시 */
export type EconomyIntelTab = "news" | "markets";

const POLL_MS = 90_000;

const THEATER_LABELS: Record<NewsStreamItem["theater"], string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "중·대",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  global: "글로벌",
};

const HERO_STATUS_LABELS: Record<HeroBreakingItem["heroStatus"], string> = {
  confirmed: "확인됨",
  breaking: "속보",
  unverified: "미확인",
};

const ECONOMY_HERO_STATUS_LABELS: Record<HeroBreakingItem["heroStatus"], string> = {
  confirmed: "시장 반영",
  breaking: "속보",
  unverified: "미확인",
};

type NewsStreamContextValue = {
  payload: NewsStreamPayload | null;
  refresh: () => void;
  showTier3: boolean;
  setShowTier3: (v: boolean) => void;
  theaterFilter: IntelTheaterFilter;
  setTheaterFilter: (v: IntelTheaterFilter) => void;
  preferEconomyNews: boolean;
};

const NewsStreamContext = createContext<NewsStreamContextValue | null>(null);

export function useNewsStreamContext() {
  const ctx = useContext(NewsStreamContext);
  if (!ctx) throw new Error("NewsStreamProvider required");
  return ctx;
}

function emptyPayload(): NewsStreamPayload {
  return {
    fetchedAt: new Date().toISOString(),
    hero: null,
    verified: [],
    stateMedia: [],
    stats: {
      total: 0,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      economy: 0,
      theaters: {} as Record<NewsStreamItem["theater"], number>,
    },
  };
}

function sortNewsItems(items: NewsStreamItem[], preferEconomy: boolean): NewsStreamItem[] {
  if (!preferEconomy) return items;
  return [...items].sort((a, b) => {
    const ae = a.feedTopic === "economy" ? 0 : 1;
    const be = b.feedTopic === "economy" ? 0 : 1;
    if (ae !== be) return ae - be;
    return Date.parse(b.pubDate || "0") - Date.parse(a.pubDate || "0");
  });
}

function filterNewsByQuery(items: NewsStreamItem[], query: string): NewsStreamItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      (item.summary?.toLowerCase().includes(q) ?? false),
  );
}

function newsItemsToSearchResults(items: NewsStreamItem[]): IntelSearchResult[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.source,
    badge: item.trustTier === 1 ? "확인" : item.trustTier === 2 ? "보완" : "속보",
  }));
}

function formatAge(minutes: number): string {
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatPubAge(pubDate: string): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  return formatAge(Math.max(0, Math.round((Date.now() - ts) / 60_000)));
}

function heroShellClass(status: HeroBreakingItem["heroStatus"], economy = false): string {
  if (economy) {
    if (status === "confirmed") return "border-emerald-400/45 bg-emerald-950/30";
    if (status === "unverified") return "border-amber-400/55 bg-amber-950/25";
    return "border-emerald-300/40 bg-emerald-950/20";
  }
  if (status === "confirmed") return "border-red-400/45 bg-[#140a0a]/90 hero-breaking-confirmed";
  if (status === "unverified") return "border-amber-400/55 bg-amber-950/25 hero-breaking-unverified";
  return "border-rose-400/45 bg-[#140f0a]/88 hero-breaking-breaking";
}

function heroBadgeClass(status: HeroBreakingItem["heroStatus"], economy = false): string {
  if (economy) {
    if (status === "confirmed") return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
    if (status === "unverified") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
    return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  }
  if (status === "confirmed") return "border-red-400/40 bg-red-500/20 text-red-100";
  if (status === "unverified") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
  return "border-rose-400/40 bg-rose-500/15 text-rose-100";
}

type NewsStreamProviderProps = {
  visible: boolean;
  children: ReactNode;
  theaterFilter: IntelTheaterFilter;
  onTheaterFilterChange: (v: IntelTheaterFilter) => void;
  viewPackages?: ViewPackageId[];
  labelLanguage?: LabelLanguage;
};

export function NewsStreamProvider({
  visible,
  children,
  theaterFilter,
  onTheaterFilterChange,
  viewPackages = [],
  labelLanguage = "ko",
}: NewsStreamProviderProps) {
  const [payload, setPayload] = useState<NewsStreamPayload | null>(null);
  const [showTier3, setShowTier3] = useState(false);
  const preferEconomyNews = isEconomyNewsMode(viewPackages);
  const packagesKey = viewPackages.join(",");
  const langKey = labelLanguage;

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (viewPackages.length > 0) {
        params.set("packages", viewPackages.join(","));
      }
      if (labelLanguage === "en") {
        params.set("lang", "en");
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const newsRes = await fetch(`/api/news-stream${qs}`, { cache: "no-store" });
      const data = (await newsRes.json()) as NewsStreamPayload;
      setPayload(newsRes.ok ? data : { ...emptyPayload(), error: data.error });
    } catch {
      setPayload((prev) => prev ?? emptyPayload());
    }
  }, [labelLanguage, viewPackages]);

  useEffect(() => {
    if (!visible) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, visible, packagesKey, langKey]);

  return (
    <NewsStreamContext.Provider
      value={{
        payload,
        refresh,
        showTier3,
        setShowTier3,
        theaterFilter,
        setTheaterFilter: onTheaterFilterChange,
        preferEconomyNews,
      }}
    >
      {children}
    </NewsStreamContext.Provider>
  );
}

type IntelCompactBarProps = {
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  showTicker?: boolean;
  viewerMode?: ViewerMode;
  onOpenSheet: (theater?: IntelTheaterFilter) => void;
};

function HeroHeadlineBanner({
  hero,
  onOpenSheet,
  economy = false,
}: {
  hero: HeroBreakingItem;
  onOpenSheet: (theater?: IntelTheaterFilter) => void;
  economy?: boolean;
}) {
  const { lang, t } = useLocale();
  const statusLabels = economy ? ECONOMY_HERO_STATUS_LABELS : HERO_STATUS_LABELS;
  return (
    <div
      className={`intel-hero-enter pointer-events-auto overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl backdrop-blur-md ${heroShellClass(hero.heroStatus, economy)}`}
      role="status"
      aria-live="polite"
      aria-label={`속보: ${hero.title}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/12 bg-black/20 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-200/90">
          Headline
        </span>
        <span className="text-[10px] text-slate-500">{theaterLabel(hero.theater, lang)}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpenSheet(hero.theater)}
        className="hero-open-cta flex w-full flex-col text-left transition hover:brightness-110 active:scale-[0.995]"
      >
        <div className="flex min-h-[44px] items-center gap-2.5 px-3 py-2.5">
          {hero.heroStatus === "unverified" ? (
            <span className="shrink-0 text-sm text-amber-300" aria-hidden>
              ⚠
            </span>
          ) : (
            <span className="shrink-0 text-[10px] text-red-400" aria-hidden>
              ●
            </span>
          )}
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${heroBadgeClass(hero.heroStatus, economy)}`}
          >
            {statusLabels[hero.heroStatus]}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-slate-50">
            {hero.heroStatus === "unverified"
              ? lang === "ko"
                ? `${hero.source}에 따르면 `
                : `${hero.source}${t("heroAccordingTo")}`
              : ""}
            {hero.title}
          </span>
          <span className="shrink-0 text-[10px] text-slate-500">
            {formatAge(hero.ageMinutes)}
          </span>
          <span className="hero-open-cta-arrow shrink-0 text-[10px] font-bold uppercase tracking-wider text-sky-300">
            {t("openPanel")}
          </span>
        </div>
      </button>
      {hero.link ? (
        <div className="flex justify-end border-t border-white/8 px-2 py-1.5">
          <HoverHint placement="top" title="원문 기사" detail="외부 사이트에서 전체 기사를 엽니다.">
            <a
              href={hero.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-slate-600/60 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-400 hover:text-slate-100"
            >
              {t("openOriginal")}
            </a>
          </HoverHint>
        </div>
      ) : null}
    </div>
  );
}

export function DynamicIntelStack({
  deployedCarrierCount = 0,
  showAllCarriers = false,
  showTicker = true,
  viewerMode = "conflict",
  onOpenSheet,
}: IntelCompactBarProps) {
  const { payload, preferEconomyNews } = useNewsStreamContext();
  const isEconomy = viewerMode === "economy" || preferEconomyNews;
  const hero = payload?.hero ?? null;
  const mode = resolveIntelStackMode(hero);
  const isAlert = mode === "alert";
  const highlightSymbols = isAlert && hero ? heroHighlightSymbols(hero) : [];

  useEffect(() => {
    const clearance = resolveIntelStackClearance(mode, viewerMode);
    document.documentElement.style.setProperty("--bottom-intel-stack-clearance", clearance);
    return () => {
      document.documentElement.style.setProperty(
        "--bottom-intel-stack-clearance",
        resolveIntelStackClearance("calm", viewerMode),
      );
    };
  }, [mode, viewerMode]);

  const showLegend = viewerMode === "conflict";
  const showCompactTicker = viewerMode === "economy" || showTicker;

  return (
    <div
      className={`intel-stack pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-[min(96vw,720px)] -translate-x-1/2 flex-col items-stretch gap-2 ${
        isAlert ? "intel-stack--alert w-[min(96vw,860px)]" : "intel-stack--calm"
      }`}
    >
      <div
        className={`intel-stack-panel pointer-events-auto flex flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${
          isAlert
            ? isEconomy
              ? "intel-stack-panel--alert border-emerald-400/30 bg-[#071018]/92"
              : "intel-stack-panel--alert border-rose-400/30 bg-[#0a0c14]/92"
            : isEconomy
              ? "border-emerald-300/15 bg-[#071018]/88"
              : "border-sky-300/15 bg-[#0a1428]/88"
        }`}
      >
        {isAlert && hero ? (
          <HeroHeadlineBanner hero={hero} onOpenSheet={onOpenSheet} economy={isEconomy} />
        ) : null}

        {showCompactTicker ? (
          <HoverHint
            placement="top"
            title="증시 티커"
            detail={
              isAlert
                ? `연관 심볼 · ${TICKER_SPIKE_THRESHOLD_PERCENT}%↑ 변동 시 SPIKE (10분 갱신)`
                : "WTI·Brent·주요 지수 등 글로벌 매크로 (10분 갱신)"
            }
            className="w-full"
          >
            <StockTickerStrip
              mode={mode}
              highlightSymbols={highlightSymbols}
              alertTone={isAlert && hero ? hero.heroStatus : undefined}
              showHeader
            />
          </HoverHint>
        ) : null}
      </div>

      <div className="flex items-end justify-center gap-2">
        {showLegend ? (
          <MapLegend
            deployedCarrierCount={deployedCarrierCount}
            showAllCarriers={showAllCarriers}
            className="pointer-events-none w-max max-w-[min(96vw,960px)]"
          />
        ) : null}
        {!isAlert ? (
          <HoverHint
            placement="top"
            title={isEconomy ? "경제·증시" : "Intel 뉴스"}
            detail={
              isEconomy
                ? "증시·매크로와 경제 RSS 헤드라인을 봅니다."
                : "전체 화면 Tier별 검증 보도·속보를 봅니다. Telegram OSINT는 별도 패널입니다."
            }
          >
            <button
              type="button"
              onClick={() => onOpenSheet("all")}
              aria-label={isEconomy ? "경제·증시 열기" : "Intel 뉴스 열기"}
              className={`intel-mini-fab pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm shadow-lg backdrop-blur-md transition ${
                isEconomy
                  ? "border-emerald-300/25 bg-emerald-950/85 text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-900/90"
                  : "border-sky-300/20 bg-[#0a1830]/85 text-sky-100 hover:border-sky-200/40 hover:bg-[#0c2040]/90"
              }`}
            >
              {isEconomy ? "📈" : "📰"}
            </button>
          </HoverHint>
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated alias — use DynamicIntelStack */
export const IntelCompactBar = DynamicIntelStack;

function TheaterChipBar({
  filter,
  onChange,
  payload,
}: {
  filter: IntelTheaterFilter;
  onChange: (v: IntelTheaterFilter) => void;
  payload: NewsStreamPayload | null;
}) {
  const chips: Array<{ id: IntelTheaterFilter; label: string; count?: number }> = [
    { id: "all", label: "전체", count: payload?.verified.length },
    ...THEATER_CHIP_ORDER.map((id) => ({
      id,
      label: THEATER_CHIP_LABELS[id],
      count: payload?.stats.theaters[id],
    })),
  ];

  const chipHints: Record<IntelTheaterFilter, string> = {
    all: "모든 전장의 Tier별 뉴스를 표시합니다.",
    "middle-east": "중동·이란·이스라엘·홍해 전선 뉴스만 필터링합니다.",
    "russia-ukraine": "러시아·우크라이나 전선 뉴스만 필터링합니다.",
    "china-taiwan": "대만해협·남중국해·중국 군사 뉴스만 필터링합니다.",
    korea: "한반도·북한 핵·미사일 관련 뉴스만 필터링합니다.",
    japan: "일본 안보·방위·해상 뉴스만 필터링합니다.",
    "south-asia": "인도·파키스탄·LAC 등 남아시아 뉴스만 필터링합니다.",
    global: "글로벌 방산·안보 뉴스만 필터링합니다.",
  };

  return (
    <div className="shrink-0 border-b border-sky-300/10 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map((chip) => {
          const active = filter === chip.id;
          const hasItems = chip.id === "all" || (chip.count ?? 0) > 0;
          return (
            <HoverHint
              key={chip.id}
              placement="bottom"
              title={chip.label}
              detail={chipHints[chip.id]}
            >
              <button
                type="button"
                onClick={() => onChange(chip.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-sky-300/50 bg-sky-400/20 text-sky-50"
                    : hasItems
                      ? "border-sky-300/15 bg-white/5 text-sky-100/75 hover:border-sky-300/30"
                      : "border-slate-700/50 bg-transparent text-slate-500"
                }`}
              >
                {chip.label}
                {chip.count != null && chip.count > 0 ? (
                  <span className="ml-1 text-[10px] opacity-70">{chip.count}</span>
                ) : null}
              </button>
            </HoverHint>
          );
        })}
      </div>
    </div>
  );
}

function FlyToMapButton({ onClick }: { onClick: () => void }) {
  return (
    <HoverHint
      placement="top"
      title="지도에서 보기"
      detail="뉴스 시트를 닫고 해당 전장 위치로 지구본이 이동합니다."
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className="shrink-0 rounded-lg border border-sky-400/25 bg-sky-950/40 px-2 py-1 text-[10px] font-medium text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-900/50"
      >
        🎯 지도
      </button>
    </HoverHint>
  );
}

type IntelSheetTabBarProps = {
  active: IntelSheetTab;
  onChange: (tab: IntelSheetTab) => void;
  newsCount: number;
  telegramCount: number;
  viinaCount: number;
  showTelegram: boolean;
  showViina: boolean;
  economyMode?: boolean;
};

function IntelSheetTabBar({
  active,
  onChange,
  newsCount,
  telegramCount,
  viinaCount,
  showTelegram,
  showViina,
  economyMode = false,
  economyTab = "news",
  onEconomyTabChange,
}: IntelSheetTabBarProps & {
  economyTab?: EconomyIntelTab;
  onEconomyTabChange?: (tab: EconomyIntelTab) => void;
}) {
  if (economyMode) {
    return (
      <div className="flex shrink-0 gap-1 border-b border-emerald-400/15 px-4 py-2">
        <button
          type="button"
          onClick={() => onEconomyTabChange?.("news")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            economyTab === "news"
              ? "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40"
              : "text-emerald-100/65 hover:bg-white/5 hover:text-emerald-100"
          }`}
        >
          RSS · 속보
          {newsCount > 0 ? (
            <span className="ml-1.5 text-[10px] font-medium opacity-70">{newsCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onEconomyTabChange?.("markets")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            economyTab === "markets"
              ? "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40"
              : "text-emerald-100/65 hover:bg-white/5 hover:text-emerald-100"
          }`}
        >
          증시
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-sky-300/10 px-4 py-2">
      <HoverHint placement="bottom" title="뉴스" detail="Tier별 검증 보도·관영매체 속보 (RSS/GDELT)">
        <button
          type="button"
          onClick={() => onChange("news")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === "news"
              ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40"
              : "text-sky-100/65 hover:bg-white/5 hover:text-sky-50"
          }`}
        >
          뉴스
          {newsCount > 0 ? (
            <span className="ml-1.5 text-[10px] font-medium opacity-70">{newsCount}</span>
          ) : null}
        </button>
      </HoverHint>
      {showViina ? (
        <HoverHint placement="bottom" title="VIINA 전선" detail="점령·경합 셀 기반 전선 이벤트 (화면 표시 전용)">
          <button
            type="button"
            onClick={() => onChange("viina")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "viina"
                ? "bg-red-400/20 text-red-50 ring-1 ring-red-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-red-100"
            }`}
          >
            VIINA
            {viinaCount > 0 ? (
              <span className="ml-1.5 text-[10px] font-medium opacity-70">{viinaCount}</span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
      {showTelegram ? (
        <HoverHint placement="bottom" title="Telegram" detail="Raw OSINT 피드 · RSS/GDELT·AI 요약과 분리">
          <button
            type="button"
            onClick={() => onChange("telegram")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "telegram"
                ? "bg-cyan-400/20 text-cyan-50 ring-1 ring-cyan-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-cyan-100"
            }`}
          >
            Telegram
            {telegramCount > 0 ? (
              <span className="ml-1.5 text-[10px] font-medium opacity-70">{telegramCount}</span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
    </div>
  );
}

type IntelNewsSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
  showTelegram?: boolean;
  telegramAlerts?: TelegramAlert[];
  telegramLive?: boolean;
  telegramStatus?: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  telegramNeedsAuth?: boolean;
  telegramSessionExists?: boolean;
  telegramEmbedMode?: boolean;
  telegramChannelCount?: number;
  showViina?: boolean;
  viinaEvents?: ViinaFrontEvent[];
  viinaControlDate?: string | null;
  viinaRuCellCount?: number;
  viinaLoading?: boolean;
  onViinaFlyTo?: (event: ViinaFrontEvent) => void;
  initialIntelTab?: IntelSheetTab;
  autoOpenOnMount?: boolean;
};

export const IntelNewsSheet = forwardRef<BottomIntelStackHandle, IntelNewsSheetProps>(
  function IntelNewsSheet(
    {
      open,
      onClose,
      onOpen,
      onFlyToMap,
      showTelegram = false,
      telegramAlerts = [],
      telegramLive = false,
      telegramStatus = "idle",
      telegramNeedsAuth,
      telegramSessionExists,
      telegramEmbedMode = true,
      telegramChannelCount = 0,
      showViina = false,
      viinaEvents = [],
      viinaControlDate = null,
      viinaRuCellCount = 0,
      viinaLoading = false,
      onViinaFlyTo,
      initialIntelTab = "news",
      autoOpenOnMount = false,
    },
    ref,
  ) {
    const {
      payload,
      refresh,
      showTier3,
      setShowTier3,
      theaterFilter,
      setTheaterFilter,
      preferEconomyNews,
    } = useNewsStreamContext();
    const { lang, t } = useLocale();
    const [sheetTab, setSheetTab] = useState<IntelSheetTab>(initialIntelTab);
    const [economyTab, setEconomyTab] = useState<EconomyIntelTab>("news");
    const [newsSearchQuery, setNewsSearchQuery] = useState("");
    const [marketsSearchQuery, setMarketsSearchQuery] = useState("");
    const autoOpenedRef = useRef(false);

    const openNewsPanel = useCallback(
      (theater: IntelTheaterFilter = "all", tab: IntelSheetTab = "news") => {
        setTheaterFilter(theater);
        setSheetTab(tab);
        void refresh();
        onOpen?.();
      },
      [onOpen, refresh, setTheaterFilter],
    );

    useEffect(() => {
      if (!autoOpenOnMount || autoOpenedRef.current) return;
      autoOpenedRef.current = true;
      openNewsPanel("all", initialIntelTab);
    }, [autoOpenOnMount, initialIntelTab, openNewsPanel]);

    const closeNewsPanel = useCallback(() => {
      onClose();
    }, [onClose]);

    useImperativeHandle(
      ref,
      () => ({
        openNewsPanel,
        closeNewsPanel,
      }),
      [openNewsPanel, closeNewsPanel],
    );

    useEffect(() => {
      if (!preferEconomyNews) return;
      setEconomyTab("news");
      setNewsSearchQuery("");
      setMarketsSearchQuery("");
    }, [preferEconomyNews]);

    const hero = payload?.hero ?? null;
    const tier1Items = sortNewsItems(
      payload?.verified.filter(
        (i) => i.trustTier === 1 && matchesTheaterFilter(i.theater, theaterFilter),
      ) ?? [],
      preferEconomyNews,
    );
    const tier2Items = sortNewsItems(
      payload?.verified.filter(
        (i) => i.trustTier === 2 && matchesTheaterFilter(i.theater, theaterFilter),
      ) ?? [],
      preferEconomyNews,
    );
    const tier3Items = sortNewsItems(
      payload?.stateMedia.filter((i) => matchesTheaterFilter(i.theater, theaterFilter)) ?? [],
      preferEconomyNews,
    );
    const displayTier1 = filterNewsByQuery(tier1Items, newsSearchQuery);
    const displayTier2 = filterNewsByQuery(tier2Items, newsSearchQuery);
    const displayTier3 = filterNewsByQuery(tier3Items, newsSearchQuery);
    const allEconomyNews = useMemo(
      () => [...tier1Items, ...tier2Items, ...(showTier3 ? tier3Items : [])],
      [showTier3, tier1Items, tier2Items, tier3Items],
    );
    const newsSearchResults = useMemo(
      () => newsItemsToSearchResults(filterNewsByQuery(allEconomyNews, newsSearchQuery)),
      [allEconomyNews, newsSearchQuery],
    );
    const newsById = useMemo(() => new Map(allEconomyNews.map((i) => [i.id, i])), [allEconomyNews]);
    const marketsSearchResults = useMemo(() => {
      const q = marketsSearchQuery.trim().toLowerCase();
      if (!q) return [];
      return STOCK_TICKER_SYMBOLS.filter(
        (t) => t.label.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q),
      )
        .slice(0, 8)
        .map((t) => ({
          id: t.symbol,
          title: t.label,
          subtitle: t.symbol,
        }));
    }, [marketsSearchQuery]);
    const showHero =
      hero != null &&
      (theaterFilter === "all" || matchesTheaterFilter(hero.theater, theaterFilter));

    const flyToTheater = useCallback(
      (theater: NewsTheater) => {
        onClose();
        onFlyToMap?.(flyTargetForTheater(theater));
      },
      [onClose, onFlyToMap],
    );

    return (
      <div
        className={`intel-news-sheet fixed inset-0 z-[44] flex flex-col bg-[#050b14] ${
          open ? "intel-news-sheet--open" : ""
        }`}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sky-300/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/70">Intel Stack</p>
            <p className="text-sm text-sky-50/95">
              {preferEconomyNews
                ? economyTab === "markets"
                  ? t("intelSheetMarkets")
                  : t("intelSheetEconomyNews")
                : sheetTab === "news"
                  ? t("intelSheetNews")
                  : sheetTab === "telegram"
                    ? t("intelSheetTelegram")
                    : t("intelSheetViina")}
              {sheetTab === "news" || (preferEconomyNews && economyTab === "news") ? (
                <>
                  <span className="ml-2 text-xs text-sky-200/50">
                    {payload?.verified.length ?? 0}
                    {t("itemsCount")}
                    {preferEconomyNews && (payload?.stats.economy ?? 0) > 0 ? (
                      <span className="ml-1 text-emerald-200/70">
                        · {t("economyCount")} {payload!.stats.economy}
                      </span>
                    ) : null}
                  </span>
                  <span className="ml-2 rounded border border-sky-400/25 px-1.5 py-0.5 text-[10px] text-sky-200/80">
                    {lang === "ko" ? t("translationKo") : t("translationEn")}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sheetTab === "news" && (!preferEconomyNews || economyTab === "news") ? (
              <HoverHint
                placement="bottom"
                title="관영·미검증 속보"
                detail="관영매체·미검증 속보를 함께 봅니다. 사실 단정 전 참고용 신호입니다."
              >
                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-amber-200/80">
                  <input
                    type="checkbox"
                    checked={showTier3}
                    onChange={(e) => setShowTier3(e.target.checked)}
                    className="h-3 w-3 accent-amber-400"
                  />
                  {t("tier3Toggle")}
                </label>
              </HoverHint>
            ) : null}
            <HoverHint placement="bottom" title="지도로 돌아가기" detail="전체 화면 뉴스를 닫고 3D 지구본으로 복귀합니다.">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-500 bg-slate-800/80 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-300"
              >
                {t("backToMap")}
              </button>
            </HoverHint>
          </div>
        </div>

        <IntelSheetTabBar
          active={sheetTab}
          onChange={setSheetTab}
          newsCount={payload?.verified.length ?? 0}
          telegramCount={telegramAlerts.length}
          viinaCount={viinaEvents.length}
          showTelegram={showTelegram && !preferEconomyNews}
          showViina={showViina && !preferEconomyNews}
          economyMode={preferEconomyNews}
          economyTab={economyTab}
          onEconomyTabChange={setEconomyTab}
        />

        {preferEconomyNews ? (
          <div className="shrink-0 border-b border-emerald-400/15 px-4 py-2.5">
            {economyTab === "news" ? (
              <IntelSheetSearchBar
                placeholder="뉴스 키워드 검색…"
                query={newsSearchQuery}
                onQueryChange={setNewsSearchQuery}
                results={newsSearchResults}
                onSelect={(result) => {
                  const item = newsById.get(result.id);
                  if (item?.link) window.open(item.link, "_blank", "noopener,noreferrer");
                }}
                tone="emerald"
              />
            ) : (
              <IntelSheetSearchBar
                placeholder="종목·지수·티커 검색…"
                query={marketsSearchQuery}
                onQueryChange={setMarketsSearchQuery}
                results={marketsSearchResults}
                onSelect={(result) => setMarketsSearchQuery(result.subtitle ?? result.title)}
                tone="emerald"
              />
            )}
          </div>
        ) : null}

        {sheetTab === "news" && !preferEconomyNews ? (
          <TheaterChipBar filter={theaterFilter} onChange={setTheaterFilter} payload={payload} />
        ) : null}

        {preferEconomyNews && economyTab === "markets" ? (
          <IntelRelatedMarketsPanel
            theaterFilter={theaterFilter}
            fullPage
            searchQuery={marketsSearchQuery}
          />
        ) : sheetTab === "news" ? (
          <>
            {showHero ? (
              <div
                className={`mx-4 mt-3 shrink-0 rounded-xl border px-3 py-2.5 ${heroShellClass(hero!.heroStatus, preferEconomyNews)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${heroBadgeClass(hero!.heroStatus, preferEconomyNews)}`}
                      >
                        {HERO_STATUS_LABELS[hero!.heroStatus]}
                      </span>
                      <span className="text-[11px] text-slate-400">{THEATER_LABELS[hero!.theater]}</span>
                      <span className="text-[11px] text-slate-500">{formatAge(hero!.ageMinutes)}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-50">{hero!.title}</p>
                  </div>
                  {onFlyToMap ? (
                    <FlyToMapButton onClick={() => flyToTheater(hero!.theater)} />
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
              {!payload ? (
                <p className="py-12 text-center text-sm text-slate-500">뉴스 스트림 동기화 중…</p>
              ) : (
                <div className="mx-3 flex flex-col gap-3">
                  <TierSection
                    label={preferEconomyNews ? ECONOMY_TIER_LABELS[1].label : "확인 보도"}
                    detail={preferEconomyNews ? ECONOMY_TIER_LABELS[1].detail : "주요 언론·공식 보도 등 신뢰도 높은 출처"}
                    items={preferEconomyNews ? displayTier1 : tier1Items}
                    marker="✓"
                    tier={1}
                    delay={1}
                    economyMode={preferEconomyNews}
                    onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                  />
                  <TierSection
                    label={preferEconomyNews ? ECONOMY_TIER_LABELS[2].label : "보완 보도"}
                    detail={preferEconomyNews ? ECONOMY_TIER_LABELS[2].detail : "확인 보도를 보완 · 가중치 낮음"}
                    items={preferEconomyNews ? displayTier2 : tier2Items}
                    marker="○"
                    tier={2}
                    delay={2}
                    economyMode={preferEconomyNews}
                    onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                  />
                  {showTier3 && (preferEconomyNews ? displayTier3 : tier3Items).length > 0 ? (
                    <TierSection
                      label={preferEconomyNews ? ECONOMY_TIER_LABELS[3].label : "속보·관영매체"}
                      detail={preferEconomyNews ? ECONOMY_TIER_LABELS[3].detail : "⚠ 미검증 속보 · 참고용"}
                      items={preferEconomyNews ? displayTier3 : tier3Items}
                      marker="⚠"
                      tier={3}
                      delay={3}
                      tier3
                      economyMode={preferEconomyNews}
                      onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                    />
                  ) : null}
                  {(preferEconomyNews ? displayTier1 : tier1Items).length === 0 &&
                  (preferEconomyNews ? displayTier2 : tier2Items).length === 0 &&
                  (preferEconomyNews ? displayTier3 : tier3Items).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {newsSearchQuery.trim()
                        ? `"${newsSearchQuery.trim()}" 검색 결과가 없습니다.`
                        : theaterFilter === "all"
                          ? "표시할 뉴스가 없습니다."
                          : `${THEATER_CHIP_LABELS[theaterFilter]} 전장 뉴스가 없습니다.`}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <AnalysisPanel hero={hero} payload={payload} open={open} />
          </>
        ) : sheetTab === "telegram" ? (
          <TelegramIntelFeed
            alerts={telegramAlerts}
            live={telegramLive}
            liveStatus={telegramStatus}
            needsAuth={telegramNeedsAuth}
            sessionExists={telegramSessionExists}
            embedMode={telegramEmbedMode}
            channelCount={telegramChannelCount}
            fullPage
            regionFilter={
              theaterFilter === "russia-ukraine"
                ? "ukraine"
                : theaterFilter === "middle-east"
                  ? "middle-east"
                  : "all"
            }
          />
        ) : sheetTab === "viina" ? (
          <ViinaFrontEventsPanel
            events={viinaEvents}
            controlDate={viinaControlDate}
            ruCellCount={viinaRuCellCount}
            loading={viinaLoading}
            onFlyTo={onViinaFlyTo}
          />
        ) : null}

        <div className="shrink-0 border-t border-sky-300/15 bg-[#050b14]/95 px-4 py-3 backdrop-blur-md">
          <HoverHint placement="top" title="뉴스 닫기" detail="Intel 전체 화면을 닫고 지구본 조작으로 돌아갑니다.">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-500/80 bg-slate-800/90 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-300 hover:bg-slate-700"
            >
              닫기 · 지도로 돌아가기
            </button>
          </HoverHint>
        </div>
      </div>
    );
  },
);

function TierSection({
  tier,
  label,
  detail,
  items,
  marker,
  delay,
  tier3,
  economyMode,
  onFlyToTheater,
}: {
  tier: 1 | 2 | 3;
  label: string;
  detail: string;
  items: NewsStreamItem[];
  marker: string;
  delay: number;
  tier3?: boolean;
  economyMode?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={`intel-tier-section overflow-hidden rounded-xl border ${
        tier3
          ? "border-amber-400/25 bg-amber-950/10"
          : economyMode
            ? "border-emerald-400/20 bg-emerald-950/10"
            : "border-sky-300/12 bg-[#0a1428]/60"
      }`}
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div
        className={`border-b px-4 py-2.5 ${
          tier3
            ? "border-amber-400/20 bg-amber-950/30"
            : economyMode && tier === 1
              ? "border-emerald-400/20 bg-emerald-950/25"
              : tier === 1
              ? "border-emerald-400/15 bg-emerald-950/15"
              : "border-sky-300/10 bg-sky-950/20"
        }`}
      >
        <p className="text-xs font-semibold text-sky-50/95">{label}</p>
        <p className="mt-0.5 text-[11px] text-sky-100/50">{detail}</p>
      </div>
      <ul className="divide-y divide-sky-300/8">
        {items.map((item) => (
          <NewsRow
            key={item.id}
            item={item}
            marker={marker}
            tier3={tier3}
            onFlyToTheater={onFlyToTheater}
          />
        ))}
      </ul>
    </section>
  );
}

function AnalysisPanel({
  hero,
  payload,
  open,
}: {
  hero: HeroBreakingItem | null;
  payload: NewsStreamPayload | null;
  open: boolean;
}) {
  const theaterLabel = hero?.theater ? THEATER_LABELS[hero.theater] : null;

  return (
    <section
      className={`intel-tier-section intel-analysis-panel shrink-0 border-t-2 border-violet-400/25 bg-violet-950/20 ${
        open ? "intel-tier-section--visible" : ""
      }`}
      style={{ animationDelay: "280ms" }}
    >
      <div className="border-b border-violet-400/15 px-4 py-2.5">
        <p className="text-xs font-semibold text-violet-100">분석 · AI 상관관계</p>
        <p className="mt-0.5 text-[11px] text-violet-200/55">
          RSS·GDELT 뉴스 · 지도 레이어 · 증시 교차 분석 (Telegram OSINT 제외)
        </p>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm leading-6 text-slate-300">
        {hero && theaterLabel ? (
          <p>
            <span className="font-medium text-violet-200">
              [{HERO_STATUS_LABELS[hero.heroStatus]}]
            </span>{" "}
            {theaterLabel} 전장 속보 신호. Tier 1 {payload?.stats.tier1 ?? 0}건 · Tier 2{" "}
            {payload?.stats.tier2 ?? 0}건 병치.
            {hero.heroStatus === "unverified"
              ? " 사실 단정 전 — 지도 핀·항로·분쟁 레이어 교차 확인 필요."
              : " GDELT·분쟁 구역 레이어와 대조 권장."}
          </p>
        ) : (
          <p className="text-slate-500">
            속보 선정 시 전장·지도 인프라·증시 반응을 한 흐름으로 분석합니다.
          </p>
        )}
        <p className="text-xs text-slate-500">
          상단 <span className="text-violet-300/90">증시</span> 탭에서 전장별 매크로·지수 반응을 봅니다.
        </p>
      </div>
    </section>
  );
}

function NewsRow({
  item,
  marker,
  tier3,
  onFlyToTheater,
}: {
  item: NewsStreamItem;
  marker?: string;
  tier3?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
}) {
  const tierLabel =
    item.trustTier === 1 ? "확인" : item.trustTier === 2 ? "보완" : "속보";

  return (
    <li className="relative">
      {onFlyToTheater ? (
        <div className="absolute right-3 top-3 z-10">
          <FlyToMapButton onClick={() => onFlyToTheater(item.theater)} />
        </div>
      ) : null}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex gap-3 px-4 py-3 pr-20 transition hover:bg-white/5 ${tier3 ? "hover:bg-amber-400/5" : ""}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-24 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-16 w-8 shrink-0 items-center justify-center text-sm text-slate-400">
            {marker}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="mb-1 inline-flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                item.trustTier === 1
                  ? "bg-emerald-500/20 text-emerald-100"
                  : tier3
                    ? "bg-amber-500/20 text-amber-100"
                    : "bg-sky-500/15 text-sky-100"
              }`}
            >
              {tierLabel}
            </span>
            <span className="text-[11px] text-slate-500">{item.source}</span>
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-5 text-slate-100">
            {item.title}
          </span>
          {item.summary ? (
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-400">
              {item.summary}
            </span>
          ) : null}
          <span className="mt-1 block text-[11px] text-slate-500">
            {THEATER_LABELS[item.theater]} · {formatPubAge(item.pubDate)}
          </span>
        </span>
      </a>
    </li>
  );
}
