"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type ParchmentProTipChipProps = {
  lang: LabelLanguage;
};

const COPY = {
  ko: { label: "꿀팁!", tip: "F11키 누르면 브라우저 전체화면" },
  en: { label: "Tip!", tip: "Press F11 for browser fullscreen" },
} as const;

/**
 * 네비·햄버거 옆 고정 슬롯 — 양피지 천조각 꿀팁, 호버·포커스 시 짧은 드롭다운.
 */
export function ParchmentProTipChip({ lang }: ParchmentProTipChipProps) {
  const copy = COPY[lang] ?? COPY.ko;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  return (
    <div
      ref={rootRef}
      className="group/protip relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className="parchment-pro-tip-chip econ-insight-parchment relative flex h-10 min-w-[3.35rem] items-center justify-center px-2.5 text-[0.72rem] font-semibold tracking-[0.08em] text-[#4a3418] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6914]/55"
      >
        <span className="parchment-pro-tip-chip-edge pointer-events-none absolute inset-0" aria-hidden />
        <span className="parchment-pro-tip-chip-thread pointer-events-none absolute inset-0" aria-hidden />
        <span className="relative z-[1]">{copy.label}</span>
      </button>

      <div
        id={menuId}
        role="tooltip"
        className={`parchment-pro-tip-drop econ-insight-parchment pointer-events-none absolute left-0 top-[calc(100%+0.45rem)] z-[90] min-w-[11.5rem] max-w-[min(72vw,16rem)] px-3 py-2.5 text-[0.72rem] leading-snug tracking-[0.02em] text-[#4a3418] shadow-[0_10px_28px_rgba(0,0,0,0.42)] transition-all duration-150 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-1 scale-[0.98] opacity-0 group-hover/protip:translate-y-0 group-hover/protip:scale-100 group-hover/protip:opacity-100 group-focus-within/protip:translate-y-0 group-focus-within/protip:scale-100 group-focus-within/protip:opacity-100"
        }`}
      >
        <span className="parchment-pro-tip-drop-edge pointer-events-none absolute inset-0" aria-hidden />
        <span className="parchment-pro-tip-drop-thread pointer-events-none absolute inset-0" aria-hidden />
        <span className="relative z-[1] block font-medium">{copy.tip}</span>
      </div>
    </div>
  );
}
