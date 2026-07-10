"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { GlobeMethods } from "react-globe.gl";

type GlobeViewProps = Record<string, unknown>;

type GlobeComponent = ComponentType<
  GlobeViewProps & { ref?: React.Ref<GlobeMethods> }
>;

function loadGlobeModule(retries = 3, delayMs = 3000): Promise<{ default: GlobeComponent }> {
  return import("react-globe.gl").catch((error: unknown) => {
    const isChunkError =
      error instanceof Error &&
      (error.name === "ChunkLoadError" || error.message.includes("Loading chunk"));

    if (!isChunkError || retries <= 0) {
      throw error;
    }

    return new Promise<{ default: GlobeComponent }>((resolve) => {
      setTimeout(resolve, delayMs);
    }).then(() => loadGlobeModule(retries - 1, delayMs * 1.5));
  }) as Promise<{ default: GlobeComponent }>;
}

export const GlobeView = forwardRef<GlobeMethods, GlobeViewProps>(function GlobeView(
  props,
  ref,
) {
  const [ReactGlobe, setReactGlobe] = useState<GlobeComponent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const backgroundColor =
    typeof props.backgroundColor === "string" ? props.backgroundColor : "#02040a";

  useEffect(() => {
    let mounted = true;

    loadGlobeModule()
      .then((module) => {
        if (mounted) {
          setReactGlobe(() => module.default);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        const message =
          error instanceof Error ? error.message : "지구본 엔진을 불러오지 못했습니다.";
        setLoadError(message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root || !ReactGlobe) return;

    let boundCanvas: HTMLCanvasElement | null = null;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };

    const unbind = () => {
      if (!boundCanvas) return;
      boundCanvas.removeEventListener("webglcontextlost", onContextLost, false);
      boundCanvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      boundCanvas = null;
    };

    const bind = (canvas: HTMLCanvasElement) => {
      if (boundCanvas === canvas) return;
      unbind();
      boundCanvas = canvas;
      canvas.addEventListener("webglcontextlost", onContextLost, false);
      canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    };

    const existing = root.querySelector("canvas");
    if (existing) bind(existing);

    const observer = new MutationObserver(() => {
      const canvas = root.querySelector("canvas");
      if (canvas) bind(canvas);
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      unbind();
    };
  }, [ReactGlobe]);

  if (loadError) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400"
        style={{ backgroundColor }}
      >
        <p>지구본 엔진 로딩 실패</p>
        <p className="text-xs text-slate-500">
          대용량 3D 라이브러리 컴파일 중 타임아웃이 발생했습니다. 페이지를 새로고침하거나{" "}
          <code className="text-slate-400">npm run dev:clean</code>으로 다시 시작해 보세요.
        </p>
        <button
          type="button"
          className="mt-1 rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          onClick={() => window.location.reload()}
        >
          새로고침
        </button>
      </div>
    );
  }

  if (!ReactGlobe) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm text-slate-400"
        style={{ backgroundColor }}
      >
        지구본 엔진 준비 중…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full" style={{ backgroundColor }}>
      <ReactGlobe {...props} ref={ref} />
      {contextLost ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#02040a]/95 px-4 text-center text-sm text-slate-300">
          <p>그래픽 메모리가 부족해 지구본이 잠시 중단되었습니다.</p>
          <p className="text-xs text-slate-500">레이어를 줄이거나 새로고침 후 다시 확대해 보세요.</p>
          <button
            type="button"
            className="mt-1 rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      ) : null}
    </div>
  );
});
