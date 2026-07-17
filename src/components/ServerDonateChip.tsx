"use client";

import { useEffect, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import type { LabelLanguage } from "@/lib/layerPrefs";

type ServerDonateChipProps = {
  lang: LabelLanguage;
};

/**
 * 데스크톱 전용 — 좌측 크롬(햄버거·항모) 아래 서버비 후원 칩.
 * 클릭 시 QR만 담은 작은 창을 연다.
 */
export function ServerDonateChip({ lang }: ServerDonateChipProps) {
  const [open, setOpen] = useState(false);
  const isEn = lang === "en";
  const title = isEn ? "☕ Server tip jar" : "☕ 서버비 후원";
  const detail = isEn
    ? "Scan the QR to help keep the map online."
    : "QR을 스캔해 서버비를 보태 주세요.";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <HoverHint placement="right" title={title} detail={detail}>
        <button
          type="button"
          aria-label={title}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-[#2a1e0f]/82 px-3.5 py-2 text-xs font-medium text-amber-50 shadow-lg backdrop-blur-md transition hover:border-amber-300/50 hover:bg-[#3a2a15]/88"
        >
          <span aria-hidden>☕</span>
          <span className="whitespace-nowrap tracking-tight">
            {isEn ? "Server tip jar" : "서버비 후원"}
          </span>
        </button>
      </HoverHint>

      {open ? (
        <>
          <button
            type="button"
            aria-label={isEn ? "Close tip jar" : "후원 창 닫기"}
            className="fixed inset-0 z-[90] bg-[#0a1528]/55 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed left-1/2 top-1/2 z-[91] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-amber-300/25 bg-[#1a140c]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-amber-200/15 px-4 py-3">
              <p className="text-sm font-semibold text-amber-50">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-amber-200/20 px-2 py-1 text-xs text-amber-100/80 transition hover:border-amber-200/40 hover:text-amber-50"
              >
                {isEn ? "Close" : "닫기"}
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 px-5 py-5">
              <img
                src="/donate-qr.png"
                alt={isEn ? "Donation QR code" : "후원 QR 코드"}
                width={280}
                height={280}
                className="h-[min(70vw,17.5rem)] w-[min(70vw,17.5rem)] rounded-xl bg-white p-2"
                draggable={false}
              />
              <p className="text-center text-[11px] leading-5 text-amber-100/65">{detail}</p>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
