"use client";

import { useState } from "react";
import type { NewsStreamItem } from "@/lib/news/types";

const THEATER_LABELS: Record<NewsStreamItem["theater"], string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "중·대",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  global: "글로벌",
};

const THEATER_GRADIENT: Record<NewsStreamItem["theater"], string> = {
  "middle-east": "from-rose-950/80 via-orange-950/60 to-amber-950/40",
  "russia-ukraine": "from-sky-950/80 via-indigo-950/60 to-slate-900/40",
  "china-taiwan": "from-red-950/80 via-rose-950/60 to-orange-950/40",
  korea: "from-blue-950/80 via-indigo-950/60 to-slate-900/40",
  japan: "from-violet-950/80 via-indigo-950/60 to-slate-900/40",
  "south-asia": "from-amber-950/80 via-orange-950/60 to-red-950/40",
  global: "from-slate-900/80 via-sky-950/60 to-slate-800/40",
};

function formatAge(pubDate: string): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function tierBadgeClass(tier: NewsStreamItem["trustTier"], tier3?: boolean): string {
  if (tier === 1) return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  if (tier3 || tier === 3) return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  return "border-sky-400/30 bg-sky-500/15 text-sky-100";
}

type NewsArticleCardProps = {
  item: NewsStreamItem;
  tier3?: boolean;
};

export function NewsArticleCard({ item, tier3 }: NewsArticleCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = item.imageUrl && !imageFailed;
  const tierLabel = item.trustTier === 1 ? "T1" : item.trustTier === 2 ? "T2" : "T3";

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`news-article-card group flex w-[min(72vw,220px)] shrink-0 flex-col overflow-hidden rounded-xl border bg-[#0a1428]/90 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl ${
        tier3
          ? "border-amber-400/25 hover:border-amber-300/45"
          : "border-sky-300/15 hover:border-sky-200/35"
      }`}
    >
      <div className="relative h-[104px] w-full overflow-hidden bg-slate-900/80">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col justify-end bg-gradient-to-br p-3 ${THEATER_GRADIENT[item.theater]}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              {THEATER_LABELS[item.theater]}
            </span>
            <span className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-white/85">
              {item.source}
            </span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm ${tierBadgeClass(item.trustTier, tier3)}`}
          >
            {tierLabel}
          </span>
          {tier3 ? (
            <span className="rounded-full border border-amber-400/35 bg-black/45 px-1.5 py-0.5 text-[9px] text-amber-100 backdrop-blur-sm">
              미확인
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-4 text-slate-50 group-hover:text-white">
          {item.title}
        </h3>
        {item.summary ? (
          <p className="line-clamp-2 text-[10px] leading-4 text-slate-400">{item.summary}</p>
        ) : (
          <p className="line-clamp-2 text-[10px] leading-4 text-slate-500">
            {item.source} · {THEATER_LABELS[item.theater]} 분쟁·안보 관련 보도
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-500">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0">{formatAge(item.pubDate)}</span>
        </div>
      </div>
    </a>
  );
}
