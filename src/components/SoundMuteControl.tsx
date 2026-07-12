"use client";

import { useSoundEnabled } from "@/hooks/useSoundEnabled";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type SoundMuteControlProps = {
  lang: LabelLanguage;
  /** panel: 전체 너비 버튼 / fab: 둥근 플로팅 / inline: 주의 창용 */
  variant?: "panel" | "fab" | "inline";
  className?: string;
};

function BellIcon({ muted, className = "h-5 w-5" }: { muted: boolean; className?: string }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6.5 9.5a5.5 5.5 0 0 1 11 0v2.2l1.4 2.8H5.1l1.4-2.8V9.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 5l16 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0v2.2l1.4 2.8H5.1l1.4-2.8V9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4v1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SoundMuteControl({
  lang,
  variant = "panel",
  className = "",
}: SoundMuteControlProps) {
  const { soundEnabled, setSoundEnabled } = useSoundEnabled();
  const label = soundEnabled ? t("soundOn", lang) : t("soundOff", lang);
  const aria = soundEnabled ? t("soundMuteAria", lang) : t("soundUnmuteAria", lang);

  if (variant === "fab") {
    return (
      <button
        type="button"
        aria-label={aria}
        aria-pressed={!soundEnabled}
        title={label}
        onClick={() => setSoundEnabled(!soundEnabled)}
        className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/25 bg-[#0a1428]/90 text-sky-100 shadow-lg backdrop-blur-md transition hover:border-sky-200/40 hover:bg-[#0f1c38]/95 ${
          soundEnabled ? "" : "text-slate-400"
        } ${className}`}
      >
        <BellIcon muted={!soundEnabled} />
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        aria-label={aria}
        aria-pressed={!soundEnabled}
        onClick={() => setSoundEnabled(!soundEnabled)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
          soundEnabled
            ? "border-amber-300/35 bg-amber-400/10 hover:border-amber-200/50"
            : "border-slate-500/40 bg-slate-800/50 hover:border-slate-400/50"
        } ${className}`}
      >
        <span className="flex items-center gap-3 text-slate-100">
          <BellIcon muted={!soundEnabled} className="h-6 w-6 shrink-0" />
          <span className="text-sm font-medium">{label}</span>
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider ${
            soundEnabled
              ? "bg-amber-300/20 text-amber-100"
              : "bg-slate-600/50 text-slate-300"
          }`}
        >
          {soundEnabled ? "ON" : "OFF"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={aria}
      aria-pressed={!soundEnabled}
      onClick={() => setSoundEnabled(!soundEnabled)}
      className={`mt-2 flex w-full items-center justify-between rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100 ${className}`}
    >
      <span className="flex items-center gap-2">
        <BellIcon muted={!soundEnabled} className="h-4 w-4" />
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">
        {soundEnabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
