"use client";

import { useEffect, useRef, useState } from "react";
import {
  NAV_MENU_GROUPS,
  toNavSelection,
  type NavMenuGroup,
  type NavMenuItem,
  type NavSelection,
  type NavSubItem,
} from "@/data/navRegions";
import type { SearchPlace } from "@/data/geoTypes";

type HoverNavProps = {
  onNavigate: (selection: NavSelection) => void;
  lastUpdated: string | null;
  liveStatus: "idle" | "loading" | "ok" | "error";
  query: string;
  onQueryChange: (value: string) => void;
  searchResults: SearchPlace[];
  onSearchSelect: (place: SearchPlace) => void;
};

export function HoverNav({
  onNavigate,
  lastUpdated,
  liveStatus,
  query,
  onQueryChange,
  searchResults,
  onSearchSelect,
}: HoverNavProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setNavOpen(false);
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(
    group: NavMenuGroup,
    item: NavMenuItem | NavSubItem,
    parentLabel?: string,
  ) {
    onNavigate(toNavSelection(item, group.id, parentLabel));
    setOpenKey(null);
    setNavOpen(false);
  }

  function handleSearchPick(place: SearchPlace) {
    onSearchSelect(place);
    setNavOpen(false);
    setOpenKey(null);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <nav
        ref={navRef}
        className={`pointer-events-auto w-full max-w-2xl transition-all duration-300 ease-out ${
          navOpen ? "max-w-6xl" : ""
        }`}
      >
        {/* 검색창 — 항상 반투명 노출 */}
        <div
          className={`relative rounded-2xl border border-sky-200/10 bg-[#162a48]/45 shadow-lg backdrop-blur-xl transition-all duration-300 ${
            navOpen ? "rounded-b-none border-b-0" : ""
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <SearchIcon className="shrink-0 text-sky-200/50" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => setNavOpen(true)}
              onClick={() => setNavOpen(true)}
              placeholder="지명 · 국가 · 분쟁 검색"
              className="w-full bg-transparent text-sm text-sky-50/90 outline-none placeholder:text-sky-100/35"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-sky-100/40 transition hover:text-sky-50"
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 max-h-72 overflow-y-auto rounded-b-2xl border border-t-0 border-sky-200/10 bg-[#0f1d35]/92 shadow-2xl backdrop-blur-xl">
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSearchPick(place)}
                  className="flex w-full items-center justify-between border-b border-sky-200/8 px-4 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-sky-400/10"
                >
                  <span>
                    <span className="block text-sky-50/95">{place.name}</span>
                    <span className="text-xs text-sky-100/40">{place.country}</span>
                  </span>
                  <span className="rounded-full border border-sky-200/15 px-2 py-0.5 text-[10px] uppercase text-sky-100/45">
                    {place.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 네비 메뉴 — 클릭/포커스 시 등장 */}
        <div
          className={`overflow-hidden rounded-b-2xl border border-sky-200/10 border-t-0 bg-[#162a48]/75 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
            navOpen
              ? "max-h-[80vh] opacity-100"
              : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/80">Conflict View</p>
              <p className="text-[10px] text-sky-100/45">
                {liveStatus === "loading" && "로컬 데이터 로딩 중…"}
                {liveStatus === "ok" && lastUpdated && `로컬 갱신 ${formatShortTime(lastUpdated)}`}
                {liveStatus === "error" && "로컬 데이터 로드 실패"}
                {liveStatus === "idle" && "로컬 데이터"}
              </p>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
              {NAV_MENU_GROUPS.map((group) => (
                <div key={group.id} className="min-w-[260px]">
                  <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.22em] text-sky-100/55">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const key = `${group.id}:${item.id}`;
                      const isOpen = openKey === key;
                      const hasSubs = item.subItems.length > 0;

                      return (
                        <li
                          key={item.id}
                          className="relative"
                          onMouseEnter={() => hasSubs && setOpenKey(key)}
                          onMouseLeave={() => isOpen && setOpenKey(null)}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(group, item)}
                            className={`flex w-full items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-xs transition-all duration-200 ${
                              isOpen
                                ? "bg-sky-400/15 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.25)]"
                                : "text-sky-100/85 hover:bg-white/8 hover:text-white"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {hasSubs && (
                              <ChevronDown
                                className={`shrink-0 opacity-45 transition-transform duration-200 ${isOpen ? "rotate-180 opacity-70" : ""}`}
                              />
                            )}
                          </button>

                          {hasSubs && (
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-out ${
                                isOpen ? "mt-1 max-h-56 opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="space-y-0.5 rounded-xl bg-[#0f1d35]/60 py-1 pl-2 pr-1">
                                {item.subItems.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => handleSelect(group, sub, item.label)}
                                    className="block w-full rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-sky-400/10"
                                  >
                                    <span className="block text-sky-50/95">{sub.label}</span>
                                    <span className="mt-0.5 block text-[10px] leading-4 text-sky-100/40">
                                      {sub.description}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
