"use client";

import { useCallback, useEffect, useState } from "react";

export type LayerToggleAccent = "emerald" | "red" | "orange" | "fuchsia" | "blue" | "white" | "green";

export type LayerToggleItem = {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
  /** checkbox(기본) | tag(위치 태그 칩) */
  presentation?: "checkbox" | "tag";
  disabled?: boolean;
};

export type LayerCategory = {
  id: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  items: LayerToggleItem[];
  footer?: React.ReactNode;
  /** 카테고리 내 boolean 레이어 전체 켜기/끄기 (배치 모드) */
  onToggleAll?: (enabled: boolean) => void;
};

const OPEN_STATE_KEY = "geowatch-layer-categories-open-v1";

function accentClass(accent: LayerToggleAccent) {
  switch (accent) {
    case "red":
      return "accent-red-400";
    case "orange":
      return "accent-orange-400";
    case "fuchsia":
      return "accent-fuchsia-400";
    case "blue":
      return "accent-blue-400";
    case "white":
      return "accent-slate-200";
    case "green":
      return "accent-green-400";
    default:
      return "accent-emerald-300";
  }
}

function tagAccentClasses(accent: LayerToggleAccent, checked: boolean) {
  if (!checked) {
    return "border-slate-700/90 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-300";
  }
  switch (accent) {
    case "red":
      return "border-red-400/45 bg-red-500/15 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.12)]";
    case "orange":
      return "border-orange-400/45 bg-orange-500/15 text-orange-100 shadow-[0_0_12px_rgba(251,146,60,0.12)]";
    case "fuchsia":
      return "border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-100";
    case "blue":
      return "border-blue-400/45 bg-blue-500/15 text-blue-100";
    default:
      return "border-sky-400/45 bg-sky-500/15 text-sky-100";
  }
}

export function LayerTagToggle({
  label,
  detail,
  checked,
  onChange,
  accent = "emerald",
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`min-w-0 rounded-full border px-3 py-2 text-left text-xs transition ${tagAccentClasses(accent, checked)}`}
    >
      <span className="block font-medium">{label}</span>
      <span className="mt-0.5 block truncate text-[10px] opacity-75">{detail}</span>
    </button>
  );
}

export function LayerToggle({
  label,
  detail,
  checked,
  onChange,
  accent = "emerald",
  disabled = false,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 transition ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-900/40"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-slate-200">{label}</span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 shrink-0 ${accentClass(accent)}`}
      />
    </label>
  );
}

export function LayerCategoryPanel({
  categories,
  batchStatus,
  autoExpandCategoryId,
  autoExpandWhen,
  expandActiveCategories = false,
}: {
  categories: LayerCategory[];
  batchStatus?: string | null;
  /** 조건이 true일 때 해당 카테고리를 자동 펼침 */
  autoExpandCategoryId?: string;
  autoExpandWhen?: boolean;
  /** 켜진 레이어가 있는 카테고리를 자동 펼침 (저장된 접기 상태는 존중) */
  expandActiveCategories?: boolean;
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_STATE_KEY);
      if (raw) {
        setOpenMap(JSON.parse(raw) as Record<string, boolean>);
      }
    } catch {
      // ignore — default collapsed
    }
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!autoExpandCategoryId || !autoExpandWhen) return;
    setOpenMap((prev) => {
      if (prev[autoExpandCategoryId]) return prev;
      const next = { ...prev, [autoExpandCategoryId]: true };
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [autoExpandCategoryId, autoExpandWhen]);

  useEffect(() => {
    if (!expandActiveCategories || !storageLoaded) return;
    setOpenMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const category of categories) {
        const hasActive = category.items.some((item) => item.checked);
        if (hasActive && prev[category.id] !== false && !next[category.id]) {
          next[category.id] = true;
          changed = true;
        }
      }
      if (!changed) return prev;
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [categories, expandActiveCategories, storageLoaded]);

  const toggleCategory = useCallback((id: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-2">
      {batchStatus ? (
        <p className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-2 text-[11px] leading-4 text-sky-100/90">
          {batchStatus}
        </p>
      ) : null}
      {categories.map((category) => {
        const activeCount = category.items.filter((item) => item.checked).length;
        const isOpen = openMap[category.id] ?? false;

        return (
          <div
            key={category.id}
            className="overflow-hidden rounded-lg border border-slate-800/90 bg-slate-950/30"
          >
            <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="min-w-0 flex-1 text-left transition hover:opacity-90"
                aria-expanded={isOpen}
              >
                <span className="block text-sm font-medium text-slate-100">{category.title}</span>
                {category.hint ? (
                  <span className="block text-[11px] text-slate-500">{category.hint}</span>
                ) : null}
              </button>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                {category.onToggleAll ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => category.onToggleAll?.(true)}
                      className="rounded border border-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-sky-400/40 hover:text-sky-200"
                    >
                      전체
                    </button>
                    <button
                      type="button"
                      onClick={() => category.onToggleAll?.(false)}
                      className="rounded border border-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
                    >
                      끔
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-2 transition hover:text-slate-300"
                  aria-expanded={isOpen}
                  aria-label={`${category.title} ${isOpen ? "접기" : "펼치기"}`}
                >
                  <span
                    className={
                      activeCount > 0 ? "rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-200" : ""
                    }
                  >
                    {activeCount}/{category.items.length}
                  </span>
                  <span className="text-slate-400" aria-hidden>
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
              </div>
            </div>

            {isOpen ? (
              <div className="space-y-0.5 border-t border-slate-800/80 px-2 py-2">
                {category.items.some((item) => item.presentation === "tag") ? (
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {category.items
                      .filter((item) => item.presentation === "tag")
                      .map((item) => (
                        <LayerTagToggle
                          key={item.id}
                          label={item.label}
                          detail={item.detail}
                          checked={item.checked}
                          onChange={item.onChange}
                          accent={item.accent}
                        />
                      ))}
                  </div>
                ) : null}
                {category.items
                  .filter((item) => item.presentation !== "tag")
                  .map((item) => (
                    <LayerToggle
                      key={item.id}
                      label={item.label}
                      detail={item.detail}
                      checked={item.checked}
                      onChange={item.onChange}
                      accent={item.accent}
                      disabled={item.disabled}
                    />
                  ))}
                {category.footer ? (
                  <div className="mt-2 border-t border-slate-800/60 pt-2">{category.footer}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
