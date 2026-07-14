"use client";

import { useEffect, useState } from "react";

export type SpotlightPlacement = "below" | "above";

type UiSpotlightCoachmarkProps = {
  open: boolean;
  targetSelector: string;
  title: string;
  body: string;
  ctaLabel: string;
  onDismiss: () => void;
  /** 전체 설명 스킵 (첫 화면용) */
  skipLabel?: string;
  onSkip?: () => void;
  /** 말풍선·화살표가 타겟의 아래(기본) / 위 */
  placement?: SpotlightPlacement;
  accent?: "sky" | "amber" | "emerald";
};

/**
 * 화면 요소를 가리키는 1회성 표지 + 설명창.
 */
export function UiSpotlightCoachmark({
  open,
  targetSelector,
  title,
  body,
  ctaLabel,
  onDismiss,
  skipLabel,
  onSkip,
  placement = "below",
  accent = "sky",
}: UiSpotlightCoachmarkProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    function measure() {
      const el = document.querySelector(targetSelector);
      if (el) setAnchor(el.getBoundingClientRect());
    }
    measure();
    window.addEventListener("resize", measure);
    const timer = window.setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearInterval(timer);
    };
  }, [open, targetSelector]);

  if (!open || !anchor) return null;

  const cx = anchor.left + anchor.width / 2;
  const below = placement === "below";
  const tipY = below ? anchor.bottom + 8 : anchor.top - 8;
  const bubbleTop = below ? tipY + 84 : Math.max(12, tipY - 200);
  const arrowStart = below ? tipY + 72 : tipY - 72;
  const arrowEnd = below ? tipY + 4 : tipY - 4;

  const tone =
    accent === "emerald"
      ? {
          ring: "border-emerald-300/90",
          text: "text-emerald-100",
          card: "border-emerald-300/30 bg-[#0a1f18]/95 text-emerald-50",
          btn: "border-emerald-300/30 text-emerald-100/90 hover:bg-emerald-400/15",
        }
      : accent === "amber"
        ? {
            ring: "border-amber-300/90",
            text: "text-amber-100",
            card: "border-amber-300/30 bg-[#1a1408]/95 text-amber-50",
            btn: "border-amber-300/30 text-amber-100/90 hover:bg-amber-400/15",
          }
        : {
            ring: "border-sky-300/90",
            text: "text-sky-200",
            card: "border-sky-300/30 bg-[#0a1830]/95 text-sky-50",
            btn: "border-sky-300/30 text-sky-100/90 hover:bg-sky-400/15",
          };

  const bubbleLeft = Math.min(
    Math.max(12, cx - 150),
    typeof window !== "undefined" ? window.innerWidth - 312 : cx - 150,
  );

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={ctaLabel}
        onClick={onDismiss}
      />
      <div
        className={`pointer-events-none absolute rounded-2xl border-2 ${tone.ring} shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]`}
        style={{
          left: anchor.left - 8,
          top: anchor.top - 8,
          width: anchor.width + 16,
          height: anchor.height + 16,
        }}
      />
      <svg
        className={`pointer-events-none absolute overflow-visible ${tone.text}`}
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <defs>
          <marker
            id={`coach-arrow-${accent}-${placement}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        <path
          d={`M ${cx} ${arrowStart} Q ${cx + (below ? -18 : 18)} ${(arrowStart + arrowEnd) / 2} ${cx} ${arrowEnd}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          markerEnd={`url(#coach-arrow-${accent}-${placement})`}
        />
        <circle cx={cx} cy={arrowStart} r="5" fill="currentColor" opacity="0.85" />
      </svg>
      <div
        className={`pointer-events-auto absolute max-w-[min(88vw,300px)] rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${tone.card}`}
        style={{ left: bubbleLeft, top: bubbleTop }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{title}</p>
        <p className="mt-1.5 leading-snug">{body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {skipLabel && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className={`rounded-full border px-3 py-1 text-xs opacity-80 ${tone.btn}`}
            >
              {skipLabel}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onDismiss}
            className={`rounded-full border px-3 py-1 text-xs ${tone.btn}`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
