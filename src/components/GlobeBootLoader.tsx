"use client";

import dynamic from "next/dynamic";
import type { ViinaRenderMeta } from "@/data/geoTypes";

function GlobeBootSkeleton() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#02040a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.12) 0%, transparent 52%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-4 px-6 text-center">
        <div className="h-28 w-28 animate-pulse rounded-full border border-cyan-400/20 bg-cyan-950/30 shadow-[0_0_48px_rgba(34,211,238,0.12)]" />
        <div>
          <p className="text-sm font-medium tracking-wide text-slate-200">Conflict View</p>
          <p className="mt-1 text-xs text-slate-500">3D 지구본 엔진 불러오는 중…</p>
        </div>
      </div>
    </div>
  );
}

const GlobeDashboard = dynamic(
  () => import("@/components/GlobeDashboard").then((mod) => mod.GlobeDashboard),
  {
    ssr: false,
    loading: () => <GlobeBootSkeleton />,
  },
);

export function GlobeBootLoader({ viinaMeta }: { viinaMeta: ViinaRenderMeta }) {
  return <GlobeDashboard viinaMeta={viinaMeta} />;
}
