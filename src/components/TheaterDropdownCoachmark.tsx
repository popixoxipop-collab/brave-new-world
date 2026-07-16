"use client";

import { useEffect, useState } from "react";
import { markTheaterCoachmarkDone, readTheaterCoachmarkDone } from "@/lib/battlefieldPresets";

type TheaterDropdownCoachmarkProps = {
  open: boolean;
  lang?: "ko" | "en";
  targetSelector?: string;
  onDismiss: () => void;
};

/**
 * 상단 「주요전선」드롭다운을 가리키는 1회성 코치마크.
 */
export function TheaterDropdownCoachmark({
  open,
  lang = "ko",
  targetSelector = "#exploration-theater-dropdown",
  onDismiss,
}: TheaterDropdownCoachmarkProps) {
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
  const cy = anchor.bottom + 8;
  const copy =
    lang === "en"
      ? "Tap here to fly into a major front and feel the battlespace."
      : "여기를 누르면 주요 전선으로 이동해 전장을 실감나게 볼 수 있어요.";

  function dismiss() {
    markTheaterCoachmarkDone();
    onDismiss();
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-transparent"
        aria-label="dismiss"
        onClick={dismiss}
      />
      {/* 스포트라이트 컷아웃은 아래 box-shadow가 전담 — 풀스크린 스크림과 중복 시 타겟(nav)까지 어두워짐 */}
      <div
        className="pointer-events-none absolute rounded-full border-2 border-sky-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
        style={{
          left: anchor.left - 10,
          top: anchor.top - 10,
          width: anchor.width + 20,
          height: anchor.height + 20,
        }}
      />
      <svg
        className="pointer-events-none absolute overflow-visible text-sky-200"
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <defs>
          <marker id="coach-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        <path
          d={`M ${cx} ${cy + 72} Q ${cx - 18} ${cy + 36} ${cx} ${cy + 4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          markerEnd="url(#coach-arrow)"
        />
        <circle cx={cx} cy={cy + 72} r="5" fill="currentColor" opacity="0.85" />
      </svg>
      <div
        className="pointer-events-auto absolute max-w-[min(88vw,280px)] rounded-2xl border border-sky-300/30 bg-[#0a1830]/95 px-4 py-3 text-sm text-sky-50 shadow-2xl backdrop-blur-md"
        style={{
          left: Math.min(Math.max(12, cx - 140), window.innerWidth - 292),
          top: cy + 84,
        }}
      >
        <p className="leading-snug">{copy}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 rounded-full border border-sky-300/30 px-3 py-1 text-xs text-sky-100/90 hover:bg-sky-400/15"
        >
          {lang === "en" ? "Got it" : "확인"}
        </button>
      </div>
    </div>
  );
}

export function shouldOfferTheaterCoachmark(): boolean {
  return !readTheaterCoachmarkDone();
}
