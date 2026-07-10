"use client";

import { HoverHint } from "@/components/HoverHint";

import {
  VIINA_ATTRIBUTION_EN,
  VIINA_ATTRIBUTION_KO,
  VIINA_POLICY,
} from "@/lib/licensing/viinaPolicy";
import {
  IRONSIGHT_ATTRIBUTION_EN,
  IRONSIGHT_ATTRIBUTION_KO,
  IRONSIGHT_POLICY,
} from "@/lib/licensing/ironsightPolicy";
import { NEWS_LAYER_SOURCE_CATALOG } from "@/data/sourceCatalog";

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
          <section className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-3">
            <h3 className="text-sm font-medium text-amber-100">VIINA — 렌더링 전용 (ODbL)</h3>
            <p className="mt-2 text-[12px] leading-5 text-sky-100/80">{VIINA_ATTRIBUTION_KO}</p>
            <p className="mt-2 text-[11px] italic leading-5 text-sky-100/60">{VIINA_ATTRIBUTION_EN}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <a
                href={VIINA_POLICY.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-sky-300/25 px-2 py-1 text-sky-200 transition hover:border-sky-200/40"
              >
                VIINA
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
            </div>
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
  return (
    <HoverHint
      placement="bottom"
      title="데이터 출처"
      detail="GDELT, VIINA, FIRMS 등 데이터 라이선스·출처·면책 안내를 봅니다."
    >
      <button
        type="button"
        aria-label="데이터 출처 및 라이선스"
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-[11px] font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        출처
      </button>
    </HoverHint>
  );
}
