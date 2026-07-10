"use client";

import { HoverHint } from "@/components/HoverHint";

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
  return (
    <HoverHint
      placement="bottom"
      title="미 항공모함 추적"
      detail={
        checked
          ? "미 해군 항모 전체 함대를 지도에 표시합니다."
          : "현재 작전 배치 중인 항모만 강조 표시합니다."
      }
    >
      <label className="pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-full border border-sky-300/25 bg-[#0a1830]/82 px-3.5 py-2 text-xs text-sky-50 shadow-lg backdrop-blur-md transition hover:border-sky-200/35">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-red-400"
      />
      <span className="font-medium tracking-tight">미 항공모함 추적</span>
      {!checked && deployedCount > 0 ? (
        <span className="text-[10px] text-sky-100/50">작전중만 표시</span>
      ) : null}
      {deployedCount > 0 ? (
        <span className="rounded-full border border-red-400/35 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-100/90">
          작전중 {deployedCount}
        </span>
      ) : null}
      {checked && carrierCount > 0 ? (
        <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] text-sky-100/75">
          전체 {carrierCount}척
        </span>
      ) : null}
      </label>
    </HoverHint>
  );
}
