"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

import {
  VIINA_ATTRIBUTION_EN,
  VIINA_ATTRIBUTION_KO,
  VIINA_POLICY,
} from "@/lib/licensing/viinaPolicy";
import {
  SIPRI_ATTRIBUTION_EN,
  SIPRI_ATTRIBUTION_KO,
  SIPRI_POLICY,
} from "@/lib/licensing/sipriPolicy";
import {
  VDEM_ATTRIBUTION_EN,
  VDEM_ATTRIBUTION_KO,
  VDEM_POLICY,
} from "@/lib/licensing/vdemPolicy";
import {
  IRONSIGHT_ATTRIBUTION_EN,
  IRONSIGHT_ATTRIBUTION_KO,
  IRONSIGHT_POLICY,
  IRONSIGHT_USAGE,
} from "@/lib/licensing/ironsightPolicy";
import {
  TELEGRAM_OSINT_ABSOLUTE_RULE_KO,
  TELEGRAM_OSINT_CHECKLIST,
} from "@/lib/licensing/telegramOsintPolicy";
import {
  NEWS_LAYER_SOURCE_CATALOG,
  PRIMARY_LIVE_SOURCES,
} from "@/data/sourceCatalog";

type MethodologySourcesPanelProps = {
  open: boolean;
  onClose: () => void;
};

const VIINA_CHECKLIST = [
  "지도에 폴리곤·전선·지역명만 렌더링 (Produced Work)",
  "출처 표기: VIINA + ODbL v1.0 링크",
  "공개 API로 VIINA 원본/가공 데이터 제공 금지",
  "GeoJSON·CSV 등 사용자 export 기능 금지",
  "서버 내부 캐시만 허용, 클라이언트 bulk 응답 금지",
  "유료 SaaS 전 법률 자문 권장",
] as const;

export function MethodologySourcesPanel({ open, onClose }: MethodologySourcesPanelProps) {
  if (!open) return null;

  const shipped = NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "shipped");
  const planned = NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "planned");

  return (
    <>
      <button
        type="button"
        aria-label="데이터 출처 패널 닫기"
        className="absolute inset-0 z-[58] bg-[#0a1528]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="intel-panel absolute right-3 top-14 z-[62] flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),400px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label="데이터 출처 및 라이선스"
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/70">Sources</p>
            <h2 className="mt-1 text-lg font-semibold text-sky-50">데이터 출처 · 라이선스</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/80 transition hover:border-sky-200/30 hover:text-sky-50"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
            <h3 className="text-sm font-medium text-emerald-100">주요 출처</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-sky-100/65">
              실시간 관측 레이어의 1차 출처입니다. 지도·패널에 NASA FIRMS · ADS-B ·
              MarineTraffic을 명시합니다.
            </p>
            <ul className="mt-3 space-y-3">
              {PRIMARY_LIVE_SOURCES.map((src) => (
                <li
                  key={src.id}
                  className="rounded-lg border border-emerald-800/30 bg-black/20 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[12px] font-semibold text-emerald-50">{src.nameKo}</span>
                    <span className="text-[10px] text-emerald-200/55">{src.product}</span>
                  </div>
                  <p className="mt-1 text-[10px] italic text-sky-100/50">{src.nameEn}</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-sky-100/75">{src.noteKo}</p>
                  <p className="mt-1 text-[10px] text-sky-100/45">{src.layers}</p>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-[10px] text-emerald-200/80 underline decoration-emerald-400/35 underline-offset-2 hover:text-emerald-100"
                  >
                    {src.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-3">
            <h3 className="text-sm font-medium text-amber-100">VIINA — 렌더링 전용 (ODbL)</h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{VIINA_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-[11px] italic leading-5 text-sky-100/60">{VIINA_ATTRIBUTION_EN}</p>
            <div className="mt-3 space-y-2 text-[11px]">
              <p className="leading-5 text-sky-100/75">
                <span className="text-sky-200/55">GitHub · </span>
                <a
                  href={VIINA_POLICY.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-sky-200 underline decoration-sky-400/35 underline-offset-2 transition hover:text-sky-50 hover:decoration-sky-200/60"
                >
                  {VIINA_POLICY.sourceUrl}
                </a>
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={VIINA_POLICY.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
                >
                  VIINA GitHub
                </a>
                <a
                  href={VIINA_POLICY.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
                >
                  ODbL v1.0
                </a>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-amber-200/75">
              ODbL 4.5(b): 데이터베이스 조회로 만든 <strong>제작물(지도 렌더)</strong>은 파생 DB가
              아닙니다. Share-Alike 의무는 가볍지만,{" "}
              <strong>원본·가공 DB를 API/export로 유저에게 주면 안 됩니다.</strong>
            </p>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-[11px] leading-5 text-sky-100/70">
              {VIINA_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-orange-900/35 bg-orange-950/15 p-3">
            <h3 className="text-sm font-medium text-orange-100">
              SIPRI — 재래식 무기이전 ({SIPRI_POLICY.product})
            </h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{SIPRI_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-[11px] italic leading-5 text-sky-100/60">{SIPRI_ATTRIBUTION_EN}</p>
            <p className="mt-3 text-[11px] leading-5 text-orange-200/75">
              {SIPRI_POLICY.fullName} · {SIPRI_POLICY.licenseNote}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-sky-100/65">
              별도 공식 딥링크를 UI에 고정하지 않습니다. SIPRI 웹사이트에서 Arms Transfers
              Database / Trade Register 문서를 직접 검색·인용해 주십시오. 화면의 호·목록은
              축 허브 필터가 적용된 요약이며, 연구·보도 인용 시 원자료를 확인하십시오.
            </p>
          </section>

          <section className="rounded-xl border border-fuchsia-900/35 bg-fuchsia-950/15 p-3">
            <h3 className="text-sm font-medium text-fuchsia-100">
              V-Dem — 체제·권위주의 프레임 ({VDEM_POLICY.product})
            </h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{VDEM_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-[11px] italic leading-5 text-sky-100/60">{VDEM_ATTRIBUTION_EN}</p>
            <p className="mt-3 text-[11px] leading-5 text-fuchsia-200/75">
              {VDEM_POLICY.fullName} · {VDEM_POLICY.licenseNote}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-sky-100/65">
              별도 공식 딥링크를 UI에 고정하지 않습니다. V-Dem Institute(예: University of
              Gothenburg) 공개 데이터·문서를 검색해 인용하십시오. 분쟁 외교사 카드는 큐레이션
              에피소드이며 V-Dem 변수 전체를 시각화하지 않습니다.
            </p>
          </section>

          <section className="rounded-xl border border-violet-900/35 bg-violet-950/15 p-3">
            <h3 className="text-sm font-medium text-violet-100">
              IRONSIGHT — Telegram 채널 카탈로그 (MIT)
            </h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{IRONSIGHT_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-[11px] italic leading-5 text-sky-100/60">
              {IRONSIGHT_ATTRIBUTION_EN}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-violet-200/75">
              {IRONSIGHT_POLICY.copyright} · {IRONSIGHT_POLICY.license} License
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <a
                href={IRONSIGHT_POLICY.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                IRONSIGHT
              </a>
              <a
                href={IRONSIGHT_POLICY.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                MIT
              </a>
              <a
                href={IRONSIGHT_POLICY.licenseFilePath}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                MIT (bundled)
              </a>
            </div>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-[11px] leading-5 text-sky-100/70">
              {IRONSIGHT_USAGE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-cyan-900/35 bg-cyan-950/15 p-3">
            <h3 className="text-sm font-medium text-cyan-100">Telegram OSINT — LLM 분리</h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{TELEGRAM_OSINT_ABSOLUTE_RULE_KO}</p>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-[11px] leading-5 text-sky-100/70">
              {TELEGRAM_OSINT_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-sky-300/12 bg-black/20 p-3">
            <h3 className="text-sm font-medium text-sky-50/95">연동 중인 레이어</h3>
            <ul className="mt-2 space-y-2">
              {shipped.map((note) => (
                <li key={note.layerId} className="text-[11px] leading-5 text-sky-100/75">
                  <span className="font-medium text-sky-50/90">{note.source}</span>
                  <span className="text-sky-100/50"> · {note.attribution}</span>
                  {note.notes ? (
                    <p className="mt-0.5 text-sky-100/55">{note.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {planned.length > 0 ? (
            <section className="rounded-xl border border-slate-700/80 bg-black/15 p-3">
              <h3 className="text-sm font-medium text-slate-300">계획 · 정책만 확정</h3>
              <ul className="mt-2 space-y-2">
                {planned.map((note) => (
                  <li key={note.layerId} className="text-[11px] leading-5 text-slate-400">
                    <span className="font-medium text-slate-300">{note.source}</span>
                    <span> · {note.attribution}</span>
                    {note.notes ? <p className="mt-0.5">{note.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-[10px] leading-4 text-slate-500">
            상세 체크리스트: 저장소 <code className="text-slate-400">docs/copyright-checklist.md</code>
            . 본 안내는 법률 자문이 아닙니다.
          </p>
        </div>
      </aside>
    </>
  );
}

export function SourcesLinkButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <HoverHint placement="bottom" title={t("hoverSources")} detail={t("hoverSourcesHint")}>
      <button
        type="button"
        aria-label={t("hoverSourcesAria")}
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-[11px] font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        자료출처
      </button>
    </HoverHint>
  );
}
