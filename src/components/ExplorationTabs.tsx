"use client";

import { useEffect, useRef, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import type { ExplorationPreset } from "@/data/navRegions";

type ExplorationTabsProps = {
  presets: ExplorationPreset[];
  activeId: string | null;
  onSelect: (preset: ExplorationPreset) => void;
};

export function ExplorationTabs({ presets, activeId, onSelect }: ExplorationTabsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(preset: ExplorationPreset) {
    onSelect(preset);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto relative z-[62]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative flex flex-col items-end">
        <HoverHint
          placement="bottom"
          title="주요전선"
          detail="대만·한반도·우크라이나·중동으로 이동하며 Intel 뉴스 시트가 해당 전장으로 열립니다."
        >
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
            className={`flex items-center gap-2 border border-sky-300/25 bg-[#0a1830]/88 px-3 py-2 text-xs text-sky-100/90 shadow-lg backdrop-blur-md transition-all duration-200 ${
              open
                ? "rounded-t-full rounded-b-md border-b-sky-300/10"
                : "rounded-full hover:border-sky-200/35"
            }`}
          >
            <span className="font-medium tracking-tight">주요전선</span>
            <ChevronDown
              className={`text-sky-200/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </HoverHint>

        <div
          className={`absolute right-0 top-full z-[70] w-[min(92vw,240px)] origin-top transition-all duration-200 ease-out ${
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-b-2xl rounded-tl-2xl border border-sky-300/20 border-t-0 bg-[#0a1830]/95 shadow-2xl backdrop-blur-md">
            <ul className="divide-y divide-sky-300/10 p-1.5" role="listbox">
              {presets.map((preset) => {
                const active = activeId === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => handleSelect(preset)}
                      className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-sky-400/15 text-sky-50"
                          : "text-sky-100/90 hover:bg-sky-300/10"
                      }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{preset.label}</span>
                      <span
                        className={`mt-0.5 text-[11px] leading-snug ${
                          active ? "text-sky-100/75" : "text-sky-200/50"
                        }`}
                      >
                        {preset.tagline}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
