"use client";

import { useEffect, useRef } from "react";
import {
  AUDIO_MANIFEST,
  type AudioEventId,
} from "@/data/audioManifest";
import { useSoundStream, type PlaySoundOptions } from "@/hooks/useSoundStream";

/** 공습경보 버튼 전용 버스 — 그 외 UI 클릭 사운드는 사용하지 않음 */
export const CV_SOUND_EVENT = "cv-sound";

/** 버튼/칩으로만 재생 허용 */
const AIR_RAID_EVENT_IDS = new Set<AudioEventId>([
  "tzeva-red-alert",
  "tzeva-all-clear",
  "neptun-air-alert",
]);

export type DashboardSoundDetail = {
  eventId: AudioEventId;
} & PlaySoundOptions;

export function emitDashboardSound(
  eventId: AudioEventId,
  playOpts?: PlaySoundOptions,
) {
  if (typeof window === "undefined") return;
  // 공습경보만 — 티커·UI 등 클릭성 사운드 차단
  if (!AIR_RAID_EVENT_IDS.has(eventId)) return;
  window.dispatchEvent(
    new CustomEvent(CV_SOUND_EVENT, {
      detail: { eventId, ...playOpts } satisfies DashboardSoundDetail,
    }),
  );
}

/** 전선 간헐 교전음 — 총격·포격·폭격·폭발·다련장 */
const FRONTLINE_COMBAT_ONESHOTS: AudioEventId[] = [
  "frontline-gunfire",
  "frontline-gunfire",
  "frontline-artillery-shot",
  "frontline-artillery-shot",
  "frontline-bombing",
  "neptun-impact",
  "frontline-mlrs",
];

export type EconomyAmbientKind = "port" | "construction" | "datacenter" | "pipeline" | null;
export type ConflictAmbientKind = "frontline" | "tension" | "carrier" | null;

type SoundEffectsBridgeProps = {
  viewerMode?: "conflict" | "economy";
  /** 뷰포트 안 NEPTUN 탄착이 있으면 true — 진입 시 폭발음 */
  neptunImpactInView?: boolean;
  /** 뷰포트 안 FIRMS 전투(폭격 추정) 화재가 있으면 true */
  firmsCombatInView?: boolean;
  /**
   * 지정학 앰비언스 우선순위: frontline > tension > carrier
   * (전선 교전음 윈도우는 frontline일 때만)
   */
  conflictAmbient?: ConflictAmbientKind;
  /** 경제 허브/항만/파이프 등 해당 레이어 */
  economyAmbient?: EconomyAmbientKind;
  cameraAltitude?: number;
};

/**
 * 사운드 규칙
 * - 공습경보: 칩/버튼 fly 시에만 (emitDashboardSound)
 * - 그 외: 카메라가 해당 지역·레이어 위에 있을 때 자동 재생 (클릭 없음)
 */
export function SoundEffectsBridge({
  viewerMode,
  neptunImpactInView = false,
  firmsCombatInView = false,
  conflictAmbient = null,
  economyAmbient = null,
  cameraAltitude,
}: SoundEffectsBridgeProps) {
  const { play, setAmbient, stopAmbient, setCameraAltitude, canPlay } = useSoundStream();

  const primedRef = useRef(false);
  const neptunInViewRef = useRef(false);
  const firmsInViewRef = useRef(false);
  const frontlineAmbient = conflictAmbient === "frontline";

  useEffect(() => {
    setCameraAltitude(cameraAltitude);
  }, [cameraAltitude, setCameraAltitude]);

  useEffect(() => {
    if (!canPlay || primedRef.current) return;
    primedRef.current = true;
    // 현재 이미 보고 있는 구역은 "진입"으로 치지 않음 — 다음 진입부터
    neptunInViewRef.current = neptunImpactInView;
    firmsInViewRef.current = firmsCombatInView;
  }, [canPlay, firmsCombatInView, neptunImpactInView]);

  // 공습경보 버튼만
  useEffect(() => {
    const onBus = (event: Event) => {
      const detail = (event as CustomEvent<DashboardSoundDetail>).detail;
      const eventId = detail?.eventId;
      if (!eventId || !AIR_RAID_EVENT_IDS.has(eventId)) return;
      if (!(eventId in AUDIO_MANIFEST)) return;
      void play(eventId, {
        altitude: detail.altitude ?? cameraAltitude,
        volumeScale: detail.volumeScale,
        durationMs: detail.durationMs,
        force: detail.force,
      });
    };
    window.addEventListener(CV_SOUND_EVENT, onBus);
    return () => window.removeEventListener(CV_SOUND_EVENT, onBus);
  }, [cameraAltitude, play]);

  // NEPTUN 탄착 지역 진입
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    const entered = neptunImpactInView && !neptunInViewRef.current;
    neptunInViewRef.current = neptunImpactInView;
    if (!entered) return;
    void play("neptun-impact", {
      altitude: cameraAltitude,
      volumeScale: 1.2,
      force: true,
    });
  }, [cameraAltitude, canPlay, neptunImpactInView, play]);

  // FIRMS 폭격 추정 지역 진입 + 머무는 동안 간헐
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    const entered = firmsCombatInView && !firmsInViewRef.current;
    firmsInViewRef.current = firmsCombatInView;
    if (entered) {
      void play("firms-combat-burst", {
        altitude: cameraAltitude,
        volumeScale: 1.15,
        force: true,
      });
    }
    if (!firmsCombatInView) return;

    let cancelled = false;
    let timer: number | null = null;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        void play("firms-combat-burst", {
          altitude: cameraAltitude,
          volumeScale: 1.05,
          force: true,
        });
        schedule();
      }, 7000 + Math.floor(Math.random() * 8000));
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [cameraAltitude, canPlay, firmsCombatInView, play]);

  // 지정학 / 경제 지역 앰비언스
  useEffect(() => {
    if (!canPlay) {
      stopAmbient();
      return;
    }

    let ambient: AudioEventId | null = null;
    if (viewerMode === "conflict") {
      if (conflictAmbient === "frontline") ambient = "frontline-artillery-ambient";
      else if (conflictAmbient === "tension") ambient = "dispute-tension-high";
      else if (conflictAmbient === "carrier") ambient = "carrier-deck-ambient";
    } else if (viewerMode === "economy") {
      if (economyAmbient === "pipeline") ambient = "pipeline-hum";
      else if (economyAmbient === "datacenter") ambient = "datacenter-hum";
      else if (economyAmbient === "port") ambient = "port-ambient";
      else if (economyAmbient === "construction") ambient = "construction-ambient";
    }

    if (ambient) setAmbient(ambient);
    else stopAmbient();
  }, [canPlay, conflictAmbient, economyAmbient, setAmbient, stopAmbient, viewerMode]);

  // 전선 위 — ~20초 교전 윈도우(번갈이·겹침), 우크라·중동·대만·한반도 공통
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    if (viewerMode !== "conflict" || !frontlineAmbient) return;

    let cancelled = false;
    let burstTimer: number | null = null;
    let windowTimer: number | null = null;
    const WINDOW_MS = 20_000;
    const PAUSE_MS = 6_000;

    const fireOne = () => {
      const pick =
        FRONTLINE_COMBAT_ONESHOTS[
          Math.floor(Math.random() * FRONTLINE_COMBAT_ONESHOTS.length)
        ]!;
      void play(pick, {
        altitude: cameraAltitude,
        volumeScale: pick === "frontline-mlrs" ? 1.3 : 1.1,
        force: true,
        overlap: true,
      });
    };

    const runWindow = () => {
      if (cancelled) return;
      const windowEnd = Date.now() + WINDOW_MS;

      const tick = () => {
        if (cancelled) return;
        if (Date.now() >= windowEnd) {
          windowTimer = window.setTimeout(runWindow, PAUSE_MS);
          return;
        }
        fireOne();
        const delay = 700 + Math.floor(Math.random() * 1100);
        burstTimer = window.setTimeout(tick, delay);
      };

      fireOne();
      burstTimer = window.setTimeout(() => {
        if (cancelled) return;
        fireOne();
        tick();
      }, 450);
    };

    runWindow();

    return () => {
      cancelled = true;
      if (burstTimer != null) window.clearTimeout(burstTimer);
      if (windowTimer != null) window.clearTimeout(windowTimer);
    };
  }, [cameraAltitude, canPlay, frontlineAmbient, play, viewerMode]);

  return null;
}
