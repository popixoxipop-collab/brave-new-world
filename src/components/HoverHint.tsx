"use client";

import type { ReactElement } from "react";

type HoverHintProps = {
  title: string;
  detail?: string;
  /** 툴팁이 버튼 위/아래 중 어디에 뜰지 */
  placement?: "top" | "bottom";
  className?: string;
  children: ReactElement;
};

export function HoverHint({
  title,
  detail,
  placement = "top",
  className = "",
  children,
}: HoverHintProps) {
  const positionClass =
    placement === "top"
      ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
      : "top-full left-1/2 mt-2 -translate-x-1/2";

  return (
    <span className={`group/hint relative inline-flex max-w-full ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} z-[90] w-max max-w-[min(88vw,300px)] scale-[0.97] whitespace-normal rounded-xl border border-sky-300/30 bg-[#0a1830]/96 px-3 py-2 text-left opacity-0 shadow-2xl backdrop-blur-md transition-all duration-150 group-hover/hint:scale-100 group-hover/hint:opacity-100`}
      >
        <span className="block text-xs font-semibold leading-snug text-sky-50">{title}</span>
        {detail ? (
          <span className="mt-1 block text-[11px] leading-5 text-sky-100/78">{detail}</span>
        ) : null}
      </span>
    </span>
  );
}
