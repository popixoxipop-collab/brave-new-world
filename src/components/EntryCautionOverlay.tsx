"use client";

import { SoundMuteControl } from "@/components/SoundMuteControl";
import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { ACTIVE_LAYER_CAP_DEFAULT, ACTIVE_LAYER_CAP_ULTRA } from "@/lib/layerExclusiveCap";
import { t } from "@/lib/uiStrings";
import { MAX_ON_LAYERS, MAX_ON_LAYERS_ECONOMY } from "@/lib/viewPackages";

type EntryCautionOverlayProps = {
  lang: LabelLanguage;
  onLangChange: (lang: LabelLanguage) => void;
  onContinue: () => void;
  /** 경고·편지 스킵 → 지정학/지경학 선택 */
  onSkipToDomain: () => void;
};

export function EntryCautionOverlay({
  lang,
  onLangChange,
  onContinue,
  onSkipToDomain,
}: EntryCautionOverlayProps) {
  const soundWhenLines = t("entryCautionSoundWhen", lang).split("\n").filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center overflow-y-auto bg-[#02040a]/96 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-caution-title"
    >
      <div className="relative my-auto w-full max-w-lg rounded-2xl border border-amber-400/30 bg-[#0c1018]/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2" role="group" aria-label="Language mode">
            <button
              type="button"
              onClick={() => onLangChange("en")}
              aria-pressed={lang === "en"}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide transition font-en ${
                lang === "en"
                  ? "border-sky-300/50 bg-sky-400/20 text-sky-50"
                  : "border-slate-500/35 bg-slate-900/40 text-slate-400 hover:border-sky-300/30 hover:text-sky-100/85"
              }`}
            >
              English mode
            </button>
            <button
              type="button"
              onClick={() => onLangChange("ko")}
              aria-pressed={lang === "ko"}
              className={`font-news-headline rounded-full border px-3 py-1.5 text-[12px] font-medium tracking-wide transition ${
                lang === "ko"
                  ? "border-amber-300/50 bg-amber-400/20 text-amber-50"
                  : "border-slate-500/35 bg-slate-900/40 text-slate-400 hover:border-amber-300/30 hover:text-amber-100/90"
              }`}
            >
              한글모드
            </button>
          </div>
          <button
            type="button"
            onClick={onSkipToDomain}
            title={t("entryCautionSkipHint", lang)}
            className="shrink-0 rounded-full border border-slate-500/35 bg-slate-900/50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-slate-400 transition hover:border-amber-300/35 hover:bg-amber-500/10 hover:text-amber-100/90"
          >
            {t("entryCautionSkip", lang)}
          </button>
        </div>

        <p className="text-center text-sm font-bold tracking-wide text-amber-200 sm:text-base">
          {t("entryCautionMustRead", lang)}
        </p>
        <p className="mt-3 text-center text-[11px] font-medium tracking-[0.28em] text-amber-200/70 sm:tracking-[0.36em]">
          {brandName(lang)}
        </p>
        <h1
          id="entry-caution-title"
          className="mt-2 text-center text-xl font-semibold text-amber-50 sm:text-2xl"
        >
          {t("entryCautionTitle", lang)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          {t("entryCautionSubtitle", lang)}
        </p>

        <ol className="mt-7 space-y-4">
          <li className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
              1 · {t("entryCautionLagLabel", lang)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {t("entryCautionLagBody", lang)
                .replace("{uiCap}", String(ACTIVE_LAYER_CAP_DEFAULT))
                .replace("{ultraCap}", String(ACTIVE_LAYER_CAP_ULTRA))
                .replace("{conflictCap}", String(MAX_ON_LAYERS))
                .replace("{economyCap}", String(MAX_ON_LAYERS_ECONOMY))}
            </p>
          </li>
          <li className="rounded-xl border border-sky-400/20 bg-sky-500/5 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/80">
              2 · {t("entryCautionSoundLabel", lang)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {t("entryCautionSoundBody", lang)}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/70">
              {t("entryCautionSoundWhenTitle", lang)}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-300">
              {soundWhenLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-slate-300">
                {t("soundToggleLabel", lang)}
              </p>
              <SoundMuteControl lang={lang} variant="inline" />
            </div>
          </li>
        </ol>

        <button
          type="button"
          onClick={onContinue}
          className="mt-7 w-full rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-sm font-medium text-amber-50 transition hover:border-amber-200/55 hover:bg-amber-400/25"
        >
          {t("entryCautionCta", lang)}
        </button>
      </div>
    </div>
  );
}
