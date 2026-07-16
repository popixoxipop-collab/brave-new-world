"use client";

import { useMemo } from "react";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";

type MobileAlertFeedProps = {
  onSwitchToGlobe: () => void;
};

/** 화면에 한 번에 보여줄 최대 기사 수 (오래된 건 굳이 다 안 당겨옴) */
const MAX_ITEMS = 14;
/** 전장 그룹당 표시할 기사 수 */
const MAX_ITEMS_PER_THEATER = 4;

function ageMinutesOf(item: NewsStreamItem): number {
  const ts = new Date(item.pubDate).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, (Date.now() - ts) / 60_000);
}

/**
 * 지도를 안 긁어도 되는 모바일 기본 화면(수첩형 알림 피드) — 최근 검증 기사를 전장별로 묶어서,
 * 각 전장 헤더에 "이 사건 이후" 종목 반응(EventMarketReactionCard)을 같이 보여준다.
 * 데이터는 이미 떠 있는 NewsStreamContext를 그대로 읽으므로 추가 폴링·호출이 없다.
 * mobileHomeView 설정으로 언제든 지도 화면과 전환 가능(끄고 켤 수 있음).
 */
export function MobileAlertFeed({ onSwitchToGlobe }: MobileAlertFeedProps) {
  const { payload } = useNewsStreamContext();
  const { lang } = useLocale();

  const groups = useMemo(() => {
    const items = (payload?.verified ?? [])
      .slice()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, MAX_ITEMS);

    const byTheater = new Map<NewsTheater, NewsStreamItem[]>();
    for (const item of items) {
      const list = byTheater.get(item.theater) ?? [];
      list.push(item);
      byTheater.set(item.theater, list);
    }
    return Array.from(byTheater.entries()).map(([theater, list]) => ({
      theater,
      items: list,
      ageMinutes: ageMinutesOf(list[0]),
    }));
  }, [payload]);

  return (
    <div
      className="cv-compact-only pointer-events-auto fixed inset-x-0 z-[38] flex flex-col bg-[#050b18]"
      style={{
        top: "calc(max(0.75rem, env(safe-area-inset-top, 0px)) + 2.85rem)",
        bottom: "calc(var(--bottom-intel-stack-clearance) + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label={lang === "en" ? "Alerts" : "알림"}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-sky-200/10 px-3.5 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">
          {lang === "en" ? "Alerts" : "알림"}
        </p>
        <button
          type="button"
          onClick={onSwitchToGlobe}
          className="tap-target min-h-[32px] rounded-lg border border-sky-300/20 bg-white/5 px-2.5 text-[11px] font-medium text-sky-100/85 transition hover:border-sky-200/40 hover:bg-white/10"
        >
          {lang === "en" ? "View map →" : "지도 보기 →"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-500">
            {lang === "en" ? "No recent alerts." : "최근 알림이 없습니다."}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.theater} className="border-b border-white/5 last:border-b-0">
              <div className="px-3 pb-1 pt-2.5">
                <span className="text-[11px] font-semibold text-sky-200/80">
                  {theaterLabel(group.theater, lang)}
                </span>
              </div>
              <EventMarketReactionCard theater={group.theater} ageMinutes={group.ageMinutes} />
              <ul className="px-2 py-1.5">
                {group.items.slice(0, MAX_ITEMS_PER_THEATER).map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg px-1.5 py-1.5 text-[12px] leading-snug text-slate-200 transition hover:bg-white/5"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
