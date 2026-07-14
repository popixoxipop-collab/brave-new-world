"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PARCHMENT_FOLD_EXIT_MS } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  insightRiskToCss,
  type EconInsightBrief,
  type MarketLinkDirection,
} from "@/data/econInsightBriefs";
import { CRITICAL_NODES_ATTRIBUTION } from "@/data/criticalNodes";
import {
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";

type WorldStatsCard = {
  disabled?: boolean;
  name?: string;
  gdpUsd?: number | null;
  tradePctGdp?: number | null;
  population?: number | null;
  error?: string;
};

function arrowFor(dir: MarketLinkDirection): string {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "·";
}

function formatUsdBn(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  return `$${value.toLocaleString()}`;
}

const TYPE_MS_PER_CHAR = 26;

const SPACE_GROTESK_STACK =
  'var(--font-space-grotesk), "Space Grotesk", var(--font-pretendard), sans-serif';

export type EconInsightParchmentProps = {
  lang: LabelLanguage;
  brief: EconInsightBrief;
  onMapOnly: () => void;
  onOpenNews: () => void;
  compact?: boolean;
};

export function EconInsightParchment({
  lang,
  brief,
  onMapOnly,
  onOpenNews,
  compact = false,
}: EconInsightParchmentProps) {
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [worldStats, setWorldStats] = useState<WorldStatsCard | null>(null);
  const [typedChars, setTypedChars] = useState(0);
  const title = lang === "en" ? brief.titleEn : brief.titleKo;
  const paragraphs = useMemo(
    () => (compact ? brief.paragraphs.slice(0, 3) : brief.paragraphs),
    [brief.paragraphs, compact],
  );
  const fullBody = useMemo(() => paragraphs.join("\n\n"), [paragraphs]);
  const totalChars = fullBody.length;
  const typingDone = typedChars >= totalChars;

  useEffect(() => {
    emitParchmentUnfoldSound();
  }, []);

  useEffect(() => {
    setTypedChars(0);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || totalChars === 0) {
      setTypedChars(totalChars);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTypedChars(i);
      if (i >= totalChars) window.clearInterval(id);
    }, TYPE_MS_PER_CHAR);
    return () => window.clearInterval(id);
  }, [totalChars, fullBody]);

  const visibleParagraphs = useMemo(() => {
    if (typedChars >= totalChars) return paragraphs;
    let remaining = typedChars;
    const out: string[] = [];
    for (const p of paragraphs) {
      if (remaining <= 0) break;
      if (remaining >= p.length) {
        out.push(p);
        remaining -= p.length;
        if (remaining > 0) remaining = Math.max(0, remaining - 2);
      } else {
        out.push(p.slice(0, remaining));
        remaining = 0;
      }
    }
    return out.length > 0 ? out : [""];
  }, [paragraphs, typedChars, totalChars]);

  useEffect(() => {
    if (!brief.countryHint) {
      setWorldStats(null);
      return;
    }
    let cancelled = false;
    const q = encodeURIComponent(brief.countryHint);
    void fetch(`/api/world-stats/countries?country=${q}`)
      .then((r) => r.json())
      .then((data: WorldStatsCard) => {
        if (cancelled) return;
        if (data?.disabled) {
          setWorldStats(null);
          return;
        }
        setWorldStats(data);
      })
      .catch(() => {
        if (!cancelled) setWorldStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [brief.countryHint]);

  const finish = useCallback(
    (next: () => void) => {
      if (phase !== "idle") return;
      if (!typingDone) {
        setTypedChars(totalChars);
        return;
      }
      setPhase("folding");
      emitParchmentFoldSound();
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        setPhase("done");
        next();
      }, reduced ? 80 : PARCHMENT_FOLD_EXIT_MS);
    },
    [phase, totalChars, typingDone],
  );

  const exiting = phase === "folding" || phase === "done";
  const gdp = formatUsdBn(worldStats?.gdpUsd);

  return (
    <div
      className={`welcome-letter-scrim fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-6 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="econ-insight-title"
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage">
        <div
          className={`econ-insight-parchment welcome-letter-card ${
            exiting ? "welcome-letter-card--fold-exit" : "welcome-letter-card--unfold-enter"
          }`}
          style={{ fontFamily: SPACE_GROTESK_STACK }}
        >
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-7 py-8 sm:px-12 sm:py-10">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`rounded-sm border px-3 py-1 font-mono text-[0.72rem] tracking-[0.18em] ${insightRiskToCss(brief.riskLevel)}`}
                >
                  RISK · {brief.riskLevel}
                </span>
              </div>

              <h1
                id="econ-insight-title"
                className="welcome-letter-title shrink-0 text-center text-[1.55rem] leading-[1.45] tracking-[0.04em] text-[#3d2a18] sm:text-[1.95rem]"
                style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 600 }}
              >
                {title}
              </h1>

              <p
                className="mt-3 text-center text-[0.95rem] leading-relaxed tracking-[0.01em] text-[#5a4428]"
                style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 400 }}
              >
                {brief.impactLine}
              </p>

              {brief.marketLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {brief.marketLinks.map((link) => (
                    <span
                      key={link.symbol}
                      className="rounded-sm border border-[#8b6914]/35 bg-[#efe0b8]/70 px-2.5 py-1 text-[0.78rem] tracking-wide text-[#3d2a18]"
                      style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 500 }}
                    >
                      {link.symbol} {arrowFor(link.direction)}
                    </span>
                  ))}
                </div>
              ) : null}

              {worldStats && !worldStats.disabled && (gdp || worldStats.population != null) ? (
                <div className="mt-4 rounded-sm border border-[#8b6914]/28 bg-[#f6ebcf]/55 px-3 py-2 text-center text-[0.82rem] leading-relaxed text-[#4a3724]">
                  <div className="font-medium tracking-[0.04em]" style={{ fontFamily: SPACE_GROTESK_STACK }}>
                    {worldStats.name ?? brief.countryHint} · countries API
                  </div>
                  <div
                    className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.75rem]"
                    style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 500 }}
                  >
                    {gdp ? <span>GDP {gdp}</span> : null}
                    {worldStats.population != null ? (
                      <span>Pop {(worldStats.population / 1e6).toFixed(1)}M</span>
                    ) : null}
                    {worldStats.tradePctGdp != null ? (
                      <span>Trade {worldStats.tradePctGdp.toFixed(1)}% GDP</span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="welcome-letter-divider mx-auto mt-4 shrink-0" aria-hidden />

              <div
                className="welcome-letter-body mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain text-[1.02rem] leading-[1.9] tracking-[0.01em] text-[#3f2e1c] sm:text-[1.08rem]"
                style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 400 }}
                aria-live="polite"
              >
                {visibleParagraphs.map((p, i) => (
                  <p key={i} className="welcome-letter-verse whitespace-pre-line text-pretty">
                    {p}
                    {!typingDone && i === visibleParagraphs.length - 1 ? (
                      <span className="parchment-type-caret" aria-hidden>
                        ▍
                      </span>
                    ) : null}
                  </p>
                ))}
                {typingDone ? (
                  <p className="pt-1 text-[0.72rem] tracking-[0.02em] text-[#7a6348]/90">
                    {CRITICAL_NODES_ATTRIBUTION}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="relative flex shrink-0 flex-col gap-2 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-5 py-3.5 sm:flex-row sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={() => finish(onOpenNews)}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/35 bg-[#e8d5a8]/80 px-4 py-2.5 text-[0.92rem] tracking-[0.04em] text-[#3d2a18] transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 500 }}
              >
                {!typingDone
                  ? lang === "en"
                    ? "Skip typing"
                    : "타자 건너뛰기"
                  : lang === "en"
                    ? "Fold → news panel"
                    : "접고 뉴스 패널로"}
              </button>
              <button
                type="button"
                onClick={() => finish(onMapOnly)}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-4 py-2.5 text-[0.92rem] tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: SPACE_GROTESK_STACK, fontWeight: 500 }}
              >
                {!typingDone
                  ? lang === "en"
                    ? "Skip typing"
                    : "타자 건너뛰기"
                  : lang === "en"
                    ? "Map only"
                    : "지도만 남기기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CriticalNodeInsightParchment(props: EconInsightParchmentProps) {
  return <EconInsightParchment {...props} compact />;
}
