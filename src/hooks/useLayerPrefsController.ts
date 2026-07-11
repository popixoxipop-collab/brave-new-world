"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  saveLayerPrefs,
  type LayerPrefs,
} from "@/lib/layerPrefs";

export type LayerRenderIntent = "immediate" | "deferred";

const BATCH_WINDOW_MS = 400;
const BATCH_DEBOUNCE_MS = 400;
/** 단일 토글 직후 쓰로틀·카메라 동결 우회 유지 시간 */
export const LAYER_IMMEDIATE_RENDER_MS = 900;

const INSTANT_KEYS = new Set<keyof LayerPrefs>(["labelLanguage"]);

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export function useLayerPrefsController() {
  const [layerPrefs, setLayerPrefs] = useState<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [draftPrefs, setDraftPrefs] = useState<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [batchPending, setBatchPending] = useState(false);
  const [applyGeneration, setApplyGeneration] = useState(0);

  const draftRef = useRef<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const lastToggleAtRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const immediateUntilRef = useRef(0);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushPrefs = useCallback((next: LayerPrefs, intent: LayerRenderIntent) => {
    draftRef.current = next;
    setLayerPrefs(next);
    setDraftPrefs(next);
    saveLayerPrefs(next);
    if (intent === "immediate") {
      immediateUntilRef.current = Date.now() + LAYER_IMMEDIATE_RENDER_MS;
    }
    setApplyGeneration((n) => n + 1);
  }, []);

  const scheduleBatchFlush = useCallback(() => {
    clearDebounce();
    setBatchPending(true);
    debounceTimerRef.current = setTimeout(() => {
      flushPrefs(draftRef.current, "deferred");
      setBatchPending(false);
      debounceTimerRef.current = null;
    }, BATCH_DEBOUNCE_MS);
  }, [clearDebounce, flushPrefs]);

  useEffect(() => {
    const loaded = loadLayerPrefs();
    draftRef.current = loaded;
    setLayerPrefs(loaded);
    setDraftPrefs(loaded);
    return () => clearDebounce();
  }, [clearDebounce]);

  const togglePref = useCallback(
    <K extends keyof LayerPrefs>(key: K, value: LayerPrefs[K]) => {
      const next = { ...draftRef.current, [key]: value };
      draftRef.current = next;
      setDraftPrefs(next);

      if (INSTANT_KEYS.has(key)) {
        clearDebounce();
        setBatchPending(false);
        flushPrefs(next, "immediate");
        return;
      }

      const now = Date.now();
      const isBurst = now - lastToggleAtRef.current < BATCH_WINDOW_MS;
      lastToggleAtRef.current = now;

      if (isBurst) {
        scheduleBatchFlush();
      } else {
        clearDebounce();
        setBatchPending(false);
        flushPrefs(next, "immediate");
      }
    },
    [clearDebounce, flushPrefs, scheduleBatchFlush],
  );

  /** 카테고리 전체 켜기/끄기 — 항상 배치 모드 */
  const toggleCategoryPrefs = useCallback(
    (updates: Partial<Record<BooleanLayerKey, boolean>>) => {
      const next = { ...draftRef.current, ...updates };
      draftRef.current = next;
      setDraftPrefs(next);
      lastToggleAtRef.current = Date.now();
      scheduleBatchFlush();
    },
    [scheduleBatchFlush],
  );

  const isLayerRenderImmediate = useCallback(() => {
    return Date.now() < immediateUntilRef.current;
  }, []);

  return {
    layerPrefs,
    draftPrefs,
    togglePref,
    toggleCategoryPrefs,
    batchPending,
    applyGeneration,
    immediateUntilRef,
    isLayerRenderImmediate,
  };
}
