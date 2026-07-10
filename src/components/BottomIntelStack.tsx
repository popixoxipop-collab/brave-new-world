"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { MapLegend } from "@/components/MapLegend";
import { HoverHint } from "@/components/HoverHint";
import { StockTickerStrip } from "@/components/StockTickerStrip";
import { IntelRelatedMarketsPanel } from "@/components/IntelRelatedMarketsPanel";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import {
  flyTargetForTheater,
  matchesTheaterFilter,
  telegramRegionToTheater,
  THEATER_CHIP_LABELS,
  THEATER_CHIP_ORDER,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import { TELEGRAM_REGION_LABELS } from "@/lib/telegramAlerts";

export type BottomIntelStackHandle = {
  openNewsPanel: (theater?: IntelTheaterFilter) => void;
  closeNewsPanel: () => void;
};

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

type NewsStreamContextValue = {
  payload: NewsStreamPayload | null;
  telegramAlerts: TelegramAlert[];
  refresh: () => void;
  showTier3: boolean;
  setShowTier3: (v: boolean) => void;
  theaterFilter: IntelTheaterFilter;
  setTheaterFilter: (v: IntelTheaterFilter) => void;
};

const NewsStreamContext = createContext<NewsStreamContextValue | null>(null);

function useNewsStreamContext() {
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
    stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, theaters: {} as Record<NewsStreamItem["theater"], number> },
  };
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

function heroShellClass(status: HeroBreakingItem["heroStatus"]): string {
  if (status === "confirmed") return "border-red-400/45 bg-[#140a0a]/90 hero-breaking-confirmed";
  if (status === "unverified") return "border-amber-400/55 bg-amber-950/25 hero-breaking-unverified";
  return "border-rose-400/45 bg-[#140f0a]/88 hero-breaking-breaking";
}

function heroBadgeClass(status: HeroBreakingItem["heroStatus"]): string {
  if (status === "confirmed") return "border-red-400/40 bg-red-500/20 text-red-100";
  if (status === "unverified") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
  return "border-rose-400/40 bg-rose-500/15 text-rose-100";
}

type NewsStreamProviderProps = {
  visible: boolean;
  children: ReactNode;
  theaterFilter: IntelTheaterFilter;
  onTheaterFilterChange: (v: IntelTheaterFilter) => void;
};

export function NewsStreamProvider({
  visible,
  children,
  theaterFilter,
  onTheaterFilterChange,
}: NewsStreamProviderProps) {
  const [payload, setPayload] = useState<NewsStreamPayload | null>(null);
  const [telegramAlerts, setTelegramAlerts] = useState<TelegramAlert[]>([]);
  const [showTier3, setShowTier3] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [newsRes, tgRes] = await Promise.all([
        fetch("/api/news-stream", { cache: "no-store" }),
        fetch("/api/telegram-alerts", { cache: "no-store" }),
      ]);
      const data = (await newsRes.json()) as NewsStreamPayload;
      setPayload(newsRes.ok ? data : { ...emptyPayload(), error: data.error });
      if (tgRes.ok) {
        const tg = (await tgRes.json()) as { alerts?: TelegramAlert[] };
        setTelegramAlerts(tg.alerts ?? []);
      }
    } catch {
      setPayload((prev) => prev ?? emptyPayload());
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, visible]);

  return (
    <NewsStreamContext.Provider
      value={{
        payload,
        telegramAlerts,
        refresh,
        showTier3,
        setShowTier3,
        theaterFilter,
        setTheaterFilter: onTheaterFilterChange,
      }}
    >
      {children}
    </NewsStreamContext.Provider>
  );
}

type IntelCompactBarProps = {
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  onOpenSheet: (theater?: IntelTheaterFilter) => void;
};

export function IntelCompactBar({
  deployedCarrierCount = 0,
  showAllCarriers = false,
  onOpenSheet,
}: IntelCompactBarProps) {
  const { payload } = useNewsStreamContext();
  const hero = payload?.hero ?? null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-[min(96vw,720px)] -translate-x-1/2 flex-col-reverse items-stretch gap-1.5">
      <div className="flex items-end justify-center gap-2">
        <MapLegend
          deployedCarrierCount={deployedCarrierCount}
          showAllCarriers={showAllCarriers}
          className="pointer-events-none w-max max-w-[min(96vw,960px)]"
        />
        {!hero ? (
          <HoverHint
            placement="top"
            title="Intel 뉴스"
            detail="전체 화면 뉴스·속보·Telegram OSINT를 Tier별로 봅니다."
          >
            <button
              type="button"
              onClick={() => onOpenSheet("all")}
              aria-label="Intel 뉴스 열기"
              className="intel-mini-fab pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-[#0a1830]/85 text-sm text-sky-100 shadow-lg backdrop-blur-md transition hover:border-sky-200/40 hover:bg-[#0c2040]/90"
            >
              📰
            </button>
          </HoverHint>
        ) : null}
      </div>

      <HoverHint
        placement="top"
        title="증시 티커"
        detail="방산·에너지·주요 지수 등 글로벌 매크로 시세 (10분 갱신)"
        className="pointer-events-auto w-full"
      >
        <div className="w-full">
          <StockTickerStrip />
        </div>
      </HoverHint>

      {hero ? (
        <div
          className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${heroShellClass(hero.heroStatus)}`}
        >
          <button
            type="button"
            onClick={() => onOpenSheet(hero.theater)}
            className="hero-open-cta flex w-full flex-col text-left transition hover:brightness-110 active:scale-[0.995]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/12 bg-sky-400/10 px-3 py-2">
              <span className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-sky-100">
                <span className="hero-open-cta-arrow text-sky-300" aria-hidden>
                  ▶
                </span>
                탭하면 Intel 뉴스 전체 화면
              </span>
              <span className="shrink-0 rounded-full border border-sky-300/40 bg-sky-400/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-50 shadow-sm">
                열기
              </span>
            </div>
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
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${heroBadgeClass(hero.heroStatus)}`}
              >
                {HERO_STATUS_LABELS[hero.heroStatus]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-slate-50">
                {hero.heroStatus === "unverified" ? `${hero.source}에 따르면 ` : ""}
                {hero.title}
              </span>
              <span className="hidden shrink-0 text-[10px] text-slate-400 sm:inline">
                {THEATER_LABELS[hero.theater]}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {formatAge(hero.ageMinutes)}
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
                  원문 ↗
                </a>
              </HoverHint>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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

type IntelSheetTab = "news" | "markets";

function IntelSheetTabBar({
  active,
  onChange,
  newsCount,
}: {
  active: IntelSheetTab;
  onChange: (tab: IntelSheetTab) => void;
  newsCount: number;
}) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-sky-300/10 px-4 py-2">
      <HoverHint
        placement="bottom"
        title="뉴스"
        detail="Tier별 검증 보도·속보·Telegram OSINT 목록"
      >
        <button
          type="button"
          onClick={() => onChange("news")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
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
      <HoverHint
        placement="bottom"
        title="증시"
        detail="지정학·전장과 연관된 매크로·지수·원자재 전체"
      >
        <button
          type="button"
          onClick={() => onChange("markets")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            active === "markets"
              ? "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40"
              : "text-sky-100/65 hover:bg-white/5 hover:text-emerald-100"
          }`}
        >
          증시
        </button>
      </HoverHint>
    </div>
  );
}

type IntelNewsSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
};

export const IntelNewsSheet = forwardRef<BottomIntelStackHandle, IntelNewsSheetProps>(
  function IntelNewsSheet({ open, onClose, onOpen, onFlyToMap }, ref) {
    const {
      payload,
      telegramAlerts,
      refresh,
      showTier3,
      setShowTier3,
      theaterFilter,
      setTheaterFilter,
    } = useNewsStreamContext();
    const [sheetTab, setSheetTab] = useState<IntelSheetTab>("news");

    const openNewsPanel = useCallback(
      (theater: IntelTheaterFilter = "all") => {
        setTheaterFilter(theater);
        void refresh();
        onOpen?.();
      },
      [onOpen, refresh, setTheaterFilter],
    );

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

    const hero = payload?.hero ?? null;
    const tier1Items =
      payload?.verified.filter(
        (i) => i.trustTier === 1 && matchesTheaterFilter(i.theater, theaterFilter),
      ) ?? [];
    const tier2Items =
      payload?.verified.filter(
        (i) => i.trustTier === 2 && matchesTheaterFilter(i.theater, theaterFilter),
      ) ?? [];
    const tier3Items =
      payload?.stateMedia.filter((i) => matchesTheaterFilter(i.theater, theaterFilter)) ?? [];
    const filteredTelegram = telegramAlerts.filter((alert) =>
      matchesTheaterFilter(telegramRegionToTheater(alert.region), theaterFilter),
    );
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
              {sheetTab === "news" ? "Tier별 뉴스 · 분석" : "지정학 연관 증시"}
              {sheetTab === "news" ? (
                <>
                  <span className="ml-2 text-xs text-sky-200/50">
                    {payload?.verified.length ?? 0}건
                  </span>
                  <span className="ml-2 rounded border border-sky-400/25 px-1.5 py-0.5 text-[10px] text-sky-200/80">
                    한국어 번역
                  </span>
                </>
              ) : (
                <span className="ml-2 text-xs text-emerald-200/55">매크로 · 지수 · 원자재</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sheetTab === "news" ? (
              <HoverHint
                placement="bottom"
                title="Tier 3 표시"
                detail="관영매체·미검증 속보를 함께 봅니다. 사실 단정 전 신호입니다."
              >
                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-amber-200/80">
                  <input
                    type="checkbox"
                    checked={showTier3}
                    onChange={(e) => setShowTier3(e.target.checked)}
                    className="h-3 w-3 accent-amber-400"
                  />
                  Tier 3
                </label>
              </HoverHint>
            ) : null}
            <HoverHint placement="bottom" title="지도로 돌아가기" detail="전체 화면 뉴스를 닫고 3D 지구본으로 복귀합니다.">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-500 bg-slate-800/80 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-300"
              >
                ✕ 지도로
              </button>
            </HoverHint>
          </div>
        </div>

        <IntelSheetTabBar
          active={sheetTab}
          onChange={setSheetTab}
          newsCount={payload?.verified.length ?? 0}
        />

        <TheaterChipBar filter={theaterFilter} onChange={setTheaterFilter} payload={payload} />

        {sheetTab === "news" ? (
          <>
            {showHero ? (
              <div
                className={`mx-4 mt-3 shrink-0 rounded-xl border px-3 py-2.5 ${heroShellClass(hero!.heroStatus)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${heroBadgeClass(hero!.heroStatus)}`}
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
                    label="Tier 1 · 확인 보도"
                    detail="AI 요약·사실 단정 근거"
                    items={tier1Items}
                    marker="✓"
                    tier={1}
                    delay={1}
                    onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                  />
                  <TierSection
                    label="Tier 2 · 보완 보도"
                    detail="Tier 1 보완 · 가중치 낮음"
                    items={tier2Items}
                    marker="○"
                    tier={2}
                    delay={2}
                    onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                  />
                  {showTier3 && tier3Items.length > 0 ? (
                    <TierSection
                      label="Tier 3 · 관영매체 속보"
                      detail="⚠ 당사자 공식입장 · 검증 전"
                      items={tier3Items}
                      marker="⚠"
                      tier={3}
                      delay={3}
                      tier3
                      onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                    />
                  ) : null}
                  {filteredTelegram.length > 0 ? (
                    <TelegramSection
                      alerts={filteredTelegram}
                      delay={4}
                      onFlyToTheater={onFlyToMap ? flyToTheater : undefined}
                    />
                  ) : null}
                  {tier1Items.length === 0 &&
                  tier2Items.length === 0 &&
                  tier3Items.length === 0 &&
                  filteredTelegram.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {theaterFilter === "all"
                        ? "표시할 뉴스가 없습니다."
                        : `${THEATER_CHIP_LABELS[theaterFilter]} 전장 뉴스가 없습니다.`}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <AnalysisPanel hero={hero} payload={payload} open={open} />
          </>
        ) : (
          <IntelRelatedMarketsPanel theaterFilter={theaterFilter} fullPage />
        )}

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

/** @deprecated use NewsStreamProvider + IntelCompactBar + IntelNewsSheet */
export const BottomIntelStack = IntelNewsSheet;

function TelegramSection({
  alerts,
  delay,
  onFlyToTheater,
}: {
  alerts: TelegramAlert[];
  delay: number;
  onFlyToTheater?: (theater: NewsTheater) => void;
}) {
  return (
    <section
      className="intel-tier-section overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-950/10"
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div className="border-b border-cyan-400/15 bg-cyan-950/25 px-4 py-2.5">
        <p className="text-xs font-semibold text-cyan-50/95">Telegram OSINT · 속보</p>
        <p className="mt-0.5 text-[11px] text-cyan-100/50">
          공개 채널 실시간 · 한국어 번역 기본
        </p>
      </div>
      <ul className="divide-y divide-cyan-400/10">
        {alerts.slice(0, 40).map((alert) => {
          const theater = telegramRegionToTheater(alert.region);
          return (
            <li key={alert.id} className="relative">
              {onFlyToTheater ? (
                <div className="absolute right-3 top-3 z-10">
                  <FlyToMapButton onClick={() => onFlyToTheater(theater)} />
                </div>
              ) : null}
              <a
                href={alert.messageUrl || `https://t.me/${alert.channelUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 pr-20 transition hover:bg-white/5"
              >
              <span className="text-[11px] text-cyan-200/70">
                @{alert.channelUsername} · {TELEGRAM_REGION_LABELS[alert.region]}
              </span>
              <p className="mt-1 text-sm leading-5 text-slate-100">{alert.text}</p>
              <span className="mt-1 block text-[10px] text-slate-500">
                {formatTelegramAge(alert.receivedAt)}
              </span>
            </a>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatTelegramAge(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  return formatAge(Math.max(0, Math.round((Date.now() - ts) / 60_000)));
}

function TierSection({
  tier,
  label,
  detail,
  items,
  marker,
  delay,
  tier3,
  onFlyToTheater,
}: {
  tier: 1 | 2 | 3;
  label: string;
  detail: string;
  items: NewsStreamItem[];
  marker: string;
  delay: number;
  tier3?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={`intel-tier-section overflow-hidden rounded-xl border ${
        tier3 ? "border-amber-400/25 bg-amber-950/10" : "border-sky-300/12 bg-[#0a1428]/60"
      }`}
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div
        className={`border-b px-4 py-2.5 ${
          tier3
            ? "border-amber-400/20 bg-amber-950/30"
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
          지도 레이어 · 증시 · 뉴스 교차 분석
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
  const tierLabel = item.trustTier === 1 ? "T1" : item.trustTier === 2 ? "T2" : "T3";

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
