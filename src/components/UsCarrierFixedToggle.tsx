"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

type UsCarrierFixedToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  carrierCount?: number;
  deployedCount?: number;
};

/** 지도 상단 고정 — 작전중 항모는 항상 표시, 토글 시 전체 함대 */
export function UsCarrierFixedToggle({
  checked,
  onChange,
  carrierCount = 0,
  deployedCount = 0,
}: UsCarrierFixedToggleProps) {
  const { t, lang } = useLocale();
  return (
    <HoverHint
      placement="bottom"
      title={t("hoverUsCarrierTrack")}
      detail={checked ? t("hoverUsCarrierAll") : t("hoverUsCarrierDeployed")}
    >
      <label className="pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-full border border-sky-300/25 bg-[#0a1830]/82 px-3.5 py-2 text-xs text-sky-50 shadow-lg backdrop-blur-md transition hover:border-sky-200/35">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-red-400"
        />
        <span className="font-medium tracking-tight">{t("hoverUsCarrierTrack")}</span>
        {!checked && deployedCount > 0 ? (
          <span className="text-[10px] text-sky-100/50">
            {lang === "en" ? "Deployed only" : "작전중만 표시"}
          </span>
        ) : null}
        {deployedCount > 0 ? (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-100">
            {deployedCount}
          </span>
        ) : null}
        {checked && carrierCount > 0 ? (
          <span className="text-[10px] text-sky-100/45">{carrierCount}</span>
        ) : null}
      </label>
    </HoverHint>
  );
}
