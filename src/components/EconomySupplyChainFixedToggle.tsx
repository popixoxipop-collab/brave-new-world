"use client";

import { useLocale } from "@/contexts/LocaleContext";

type EconomySupplyChainFixedToggleProps = {
  showUsDfc: boolean;
  showChinaBri: boolean;
  onUsDfcChange: (checked: boolean) => void;
  onChinaBriChange: (checked: boolean) => void;
  usLinkCount: number;
  chinaLinkCount: number;
};

export function EconomySupplyChainFixedToggle({
  showUsDfc,
  showChinaBri,
  onUsDfcChange,
  onChinaBriChange,
  usLinkCount,
  chinaLinkCount,
}: EconomySupplyChainFixedToggleProps) {
  const { lang } = useLocale();
  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-5.5rem)] flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-sky-300/25 bg-[#0a1830]/88 px-3.5 py-2 text-xs text-sky-50 shadow-lg backdrop-blur-md">
      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={showUsDfc}
          onChange={(event) => onUsDfcChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-blue-500"
        />
        <span className="font-medium text-blue-100">
          {lang === "en" ? "U.S. DFC Network" : "미국 DFC 개발금융망"}
        </span>
        {showUsDfc ? (
          <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-100">
            {usLinkCount}
          </span>
        ) : null}
      </label>
      <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />
      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={showChinaBri}
          onChange={(event) => onChinaBriChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-amber-400"
        />
        <span className="font-medium text-amber-100">
          {lang === "en" ? "China Belt and Road" : "중국 일대일로"}
        </span>
        {showChinaBri ? (
          <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
            {chinaLinkCount}
          </span>
        ) : null}
      </label>
    </div>
  );
}
