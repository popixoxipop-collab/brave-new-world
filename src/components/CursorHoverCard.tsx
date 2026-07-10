"use client";

import { useLayoutEffect, useRef, useState } from "react";

const CURSOR_OFFSET = 14;
const EDGE_PADDING = 10;

type CursorHoverCardProps = {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  detail: string;
  badge?: string;
  meta?: string;
  body?: string;
  hint?: string;
};

export function CursorHoverCard({
  visible,
  x,
  y,
  title,
  detail,
  badge,
  meta,
  body,
  hint,
}: CursorHoverCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x + CURSOR_OFFSET, top: y + CURSOR_OFFSET });

  useLayoutEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;

    const parent = el.offsetParent as HTMLElement | null;
    const boundsW = parent?.clientWidth ?? window.innerWidth;
    const boundsH = parent?.clientHeight ?? window.innerHeight;
    const cardW = el.offsetWidth;
    const cardH = el.offsetHeight;

    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;

    if (left + cardW + EDGE_PADDING > boundsW) {
      left = x - cardW - CURSOR_OFFSET;
    }
    if (top + cardH + EDGE_PADDING > boundsH) {
      top = y - cardH - CURSOR_OFFSET;
    }

    setPosition({
      left: Math.max(EDGE_PADDING, left),
      top: Math.max(EDGE_PADDING, top),
    });
  }, [visible, x, y, title, detail, badge, meta, body, hint]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-[70] max-w-[min(88vw,340px)] rounded-xl border border-sky-300/25 bg-[#0a1830]/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
      style={{ left: position.left, top: position.top }}
    >
      <p className="font-medium text-sky-100">{title}</p>
      {badge ? (
        <p className="mt-1">
          <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-[10px] font-medium text-orange-100">
            {badge}
          </span>
        </p>
      ) : null}
      <p className={badge ? "mt-1.5 text-sky-100/85" : "mt-1 text-sky-100/85"}>{detail}</p>
      {body && <p className="mt-1.5 line-clamp-4 text-sky-100/70 leading-5">{body}</p>}
      {meta && <p className="mt-1 text-sky-200/70">{meta}</p>}
      {hint && <p className="mt-1.5 text-[10px] text-sky-300/55">{hint}</p>}
    </div>
  );
}
