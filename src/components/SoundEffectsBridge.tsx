"use client";

import { useEffect, useRef } from "react";
import {
  AUDIO_MANIFEST,
  type AudioEventId,
} from "@/data/audioManifest";
import { useSoundStream } from "@/hooks/useSoundStream";

/** 깊은 prop drilling 없이 원샷 사운드 발사 (StockTickerStrip 등) */
export const CV_SOUND_EVENT = "cv-sound";

export function emitDashboardSound(eventId: AudioEventId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CV_SOUND_EVENT, { detail: { eventId } }));
}

type SoundEffectsBridgeProps = {
  /** 부트 완료 순간 */
  bootReady?: boolean;
  /** 지정학/지경학 모드 */
  viewerMode?: "conflict" | "economy";
  /** load 치명 오류 메시지 */
  loadError?: string | null;
  /** NEPTUN impact flash id 목록 — 신규 id만 재생 */
  neptunImpactIds?: string[];
  /** NEPTUN 공습 경보 건수 — 증가 시 */
  neptunAlertCount?: number;
  /** Tzeva 활성 경보 건수 — 0→N 증가 시 사이렌 */
  tzevaActiveCount?: number;
  /**
   * FIRMS 전투/훈련 미구분 교차 id — classify === "combat"
   * 신규 id만 firms-combat-burst. exercise/산불은 자동 무음.
   */
  firmsCombatFireIds?: string[];
  /** 우크라 전선 근접 뷰면 전선 앰비언스 */
  frontlineAmbient?: boolean;
  /** 경제 허브/항만 앰비언스 */
  economyAmbient?: "port" | "construction" | "datacenter" | null;
};

/**
 * 매니페스트 이벤트를 대시보드 신호에 최소 배선.
 * 실제 재생은 useSoundStream → /api/sound-stream.
 */
export function SoundEffectsBridge({
  bootReady,
  viewerMode,
  loadError,
  neptunImpactIds = [],
  neptunAlertCount = 0,
  tzevaActiveCount = 0,
  firmsCombatFireIds = [],
  frontlineAmbient = false,
  economyAmbient = null,
}: SoundEffectsBridgeProps) {
  const { play, setAmbient, stopAmbient, canPlay } = useSoundStream();

  const bootPlayedRef = useRef(false);
  const modeRef = useRef(viewerMode);
  const loadErrorPlayedRef = useRef(false);
  const seenImpactsRef = useRef<Set<string>>(new Set());
  const seenFirmsCombatRef = useRef<Set<string>>(new Set());
  const neptunAlertRef = useRef(neptunAlertCount);
  const tzevaRef = useRef(tzevaActiveCount);
  const primedRef = useRef(false);

  // 첫 unlock 이후 시드 — 이미 떠 있는 flash/alert에 사이렌 폭주 방지
  useEffect(() => {
    if (!canPlay || primedRef.current) return;
    primedRef.current = true;
    for (const id of neptunImpactIds) seenImpactsRef.current.add(id);
    for (const id of firmsCombatFireIds) seenFirmsCombatRef.current.add(id);
    neptunAlertRef.current = neptunAlertCount;
    tzevaRef.current = tzevaActiveCount;
  }, [canPlay, firmsCombatFireIds, neptunAlertCount, neptunImpactIds, tzevaActiveCount]);

  useEffect(() => {
    const onBus = (event: Event) => {
      const detail = (event as CustomEvent<{ eventId?: string }>).detail;
      const eventId = detail?.eventId;
      if (!eventId || !(eventId in AUDIO_MANIFEST)) return;
      void play(eventId as AudioEventId);
    };
    window.addEventListener(CV_SOUND_EVENT, onBus);
    return () => window.removeEventListener(CV_SOUND_EVENT, onBus);
  }, [play]);

  useEffect(() => {
    if (!canPlay || !bootReady || bootPlayedRef.current) return;
    bootPlayedRef.current = true;
    void play("boot-ready");
  }, [bootReady, canPlay, play]);

  useEffect(() => {
    if (!canPlay || !viewerMode) return;
    if (modeRef.current === undefined) {
      modeRef.current = viewerMode;
      return;
    }
    if (modeRef.current === viewerMode) return;
    modeRef.current = viewerMode;
    void play("mode-switch");
    if (viewerMode === "economy") {
      void play("econ-hub-arrive");
    }
  }, [canPlay, play, viewerMode]);

  useEffect(() => {
    if (!canPlay || !loadError || loadErrorPlayedRef.current) return;
    loadErrorPlayedRef.current = true;
    void play("load-error");
  }, [canPlay, loadError, play]);

  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    for (const id of neptunImpactIds) {
      if (seenImpactsRef.current.has(id)) continue;
      seenImpactsRef.current.add(id);
      void play("neptun-impact");
      break; // 한 틱에 한 번
    }
  }, [canPlay, neptunImpactIds, play]);

  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    if (neptunAlertCount > neptunAlertRef.current) {
      void play("neptun-air-alert");
    }
    neptunAlertRef.current = neptunAlertCount;
  }, [canPlay, neptunAlertCount, play]);

  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    if (tzevaActiveCount > 0 && tzevaRef.current === 0) {
      void play("tzeva-red-alert");
    } else if (tzevaActiveCount === 0 && tzevaRef.current > 0) {
      void play("tzeva-all-clear");
    }
    tzevaRef.current = tzevaActiveCount;
  }, [canPlay, play, tzevaActiveCount]);

  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    for (const id of firmsCombatFireIds) {
      if (seenFirmsCombatRef.current.has(id)) continue;
      seenFirmsCombatRef.current.add(id);
      void play("firms-combat-burst");
      break;
    }
  }, [canPlay, firmsCombatFireIds, play]);

  useEffect(() => {
    if (!canPlay) {
      stopAmbient();
      return;
    }

    let ambient: AudioEventId | null = null;
    if (viewerMode === "conflict" && frontlineAmbient) {
      ambient = "frontline-artillery-ambient";
    } else if (viewerMode === "economy") {
      if (economyAmbient === "port") ambient = "port-ambient";
      else if (economyAmbient === "construction") ambient = "construction-ambient";
      else if (economyAmbient === "datacenter") ambient = "datacenter-hum";
    }

    if (ambient) setAmbient(ambient);
    else stopAmbient();
  }, [canPlay, economyAmbient, frontlineAmbient, setAmbient, stopAmbient, viewerMode]);

  return null;
}
