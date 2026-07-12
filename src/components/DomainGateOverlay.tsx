"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/uiStrings";
import type { ViewerMode } from "@/lib/viewerChrome";

type DomainGateOverlayProps = {
  onSelect: (mode: ViewerMode) => void;
};

export function DomainGateOverlay({ onSelect }: DomainGateOverlayProps) {
  const { lang } = useLocale();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#02040a]/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-gate-title"
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-sky-400/20 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.42em] text-sky-200/70">
          Conflict View
        </p>
        <h1
          id="domain-gate-title"
          className="mt-2 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          {t("domainGateTitle", lang)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">{t("domainGateSubtitle", lang)}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("conflict")}
            className="flex flex-col rounded-2xl border border-orange-400/35 bg-orange-500/10 px-5 py-8 text-left transition hover:border-orange-300/55 hover:bg-orange-500/15"
          >
            <span className="text-lg font-semibold text-orange-50">{t("domainConflictTitle", lang)}</span>
            <span className="mt-3 text-sm leading-relaxed text-orange-100/75">
              {t("domainConflictHint", lang)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelect("economy")}
            className="flex flex-col rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-5 py-8 text-left transition hover:border-emerald-300/55 hover:bg-emerald-500/15"
          >
            <span className="text-lg font-semibold text-emerald-50">{t("domainEconomyTitle", lang)}</span>
            <span className="mt-3 text-sm leading-relaxed text-emerald-100/75">
              {t("domainEconomyHint", lang)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
