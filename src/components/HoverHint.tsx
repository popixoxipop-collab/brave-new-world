"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { t } = useLocale();
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [pinned, setPinned] = useState(false);

  const dismiss = useCallback(() => setPinned(false), []);

  useEffect(() => {
    if (!pinned) return;
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
  }, [pinned, dismiss]);

  const positionClass =
    placement === "top"
      ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
      : "top-full left-1/2 mt-2 -translate-x-1/2";

  const visibleClass = pinned
    ? "scale-100 opacity-100"
    : "scale-[0.97] opacity-0 group-hover/hint:scale-100 group-hover/hint:opacity-100 group-focus-within/hint:scale-100 group-focus-within/hint:opacity-100";

  const child = cloneElement(children, {
    "aria-describedby": pinned ? tooltipId : children.props["aria-describedby"],
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
    },
    onPointerUp: (event: React.PointerEvent) => {
      children.props.onPointerUp?.(event);
      if (event.pointerType === "touch") {
        setPinned((open) => !open);
      }
    },
  });

  return (
    <span ref={rootRef} className={`group/hint relative inline-flex max-w-full ${className}`}>
      {child}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute ${positionClass} z-[90] w-max max-w-[min(88vw,300px)] whitespace-normal rounded-xl border border-sky-300/30 bg-[#0a1830]/96 px-3 py-2 text-left shadow-2xl backdrop-blur-md transition-all duration-150 ${visibleClass}`}
      >
        <span className="block text-xs font-semibold leading-snug text-sky-50">{title}</span>
        {detail ? (
          <span className="mt-1 block text-[11px] leading-5 text-sky-100/78">{detail}</span>
        ) : null}
        <span className="mt-1.5 block text-[10px] text-sky-200/45 sm:hidden">{t("hoverTapToPin")}</span>
      </span>
    </span>
  );
}
