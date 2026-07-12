"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AMBIENT_EVENT_IDS,
  AUDIO_MANIFEST,
  type AudioEventDef,
  type AudioEventId,
} from "@/data/audioManifest";
import {
  CV_SOUND_PREF_EVENT,
  SOUND_PREF_KEY,
  readSoundEnabled,
  writeSoundEnabled,
} from "@/lib/soundPrefs";
import { isZoomScaledSound, scaledSoundVolume } from "@/lib/soundDistanceScale";

/** 로컬/스트림 URL — 캐시 버스팅으로 예전 개짖음 MP3 무효화 */
const AUDIO_URL_BUST = "v9-front-callouts";

function audioUrlForEvent(eventId: AudioEventId, def: AudioEventDef): string {
  if (def.localSrc) {
    const sep = def.localSrc.includes("?") ? "&" : "?";
    return `${def.localSrc}${sep}v=${AUDIO_URL_BUST}`;
  }
  return `/api/sound-stream?eventId=${encodeURIComponent(eventId)}&v=${AUDIO_URL_BUST}`;
}

export type UseSoundStreamOptions = {
  /** false면 완전 무음 (환경설정 등) */
  enabled?: boolean;
};

export type PlaySoundOptions = {
  /** 카메라 altitude — 폭음/총격/포격 줌 연동 */
  altitude?: number | null;
  /** 매니페스트 볼륨에 곱함 (클릭 사이렌 등) */
  volumeScale?: number;
  /** 지정 시 루프로 재생 후 이 시간(ms)에 정지 */
  durationMs?: number;
  /** 원샷 스로틀 무시 */
  force?: boolean;
  /** true면 기존 원샷을 끊지 않고 겹쳐 재생 (전장 교전음) */
  overlap?: boolean;
};

/**
 * Freesound HQ mp3를 `/api/sound-stream`으로 스트리밍 재생.
 * 브라우저 자동재생 정책: 첫 pointerdown에서 unlock.
 */
export function useSoundStream(options?: UseSoundStreamOptions) {
  const enabledOpt = options?.enabled !== false;
  const [unlocked, setUnlocked] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const oneShotRef = useRef<HTMLAudioElement | null>(null);
  const overlapPoolRef = useRef<HTMLAudioElement[]>([]);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientIdRef = useRef<AudioEventId | null>(null);
  const ambientBaseVolumeRef = useRef(0);
  const lastOneShotAtRef = useRef(0);
  const altitudeRef = useRef<number | null>(null);

  useEffect(() => {
    setSoundEnabledState(readSoundEnabled());

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      const next =
        typeof detail?.enabled === "boolean" ? detail.enabled : readSoundEnabled();
      setSoundEnabledState(next);
      if (!next) {
        oneShotRef.current?.pause();
        for (const a of overlapPoolRef.current) a.pause();
        overlapPoolRef.current = [];
        ambientRef.current?.pause();
        ambientIdRef.current = null;
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== SOUND_PREF_KEY) return;
      const next = readSoundEnabled();
      setSoundEnabledState(next);
      if (!next) {
        oneShotRef.current?.pause();
        for (const a of overlapPoolRef.current) a.pause();
        overlapPoolRef.current = [];
        ambientRef.current?.pause();
        ambientIdRef.current = null;
      }
    };

    window.addEventListener(CV_SOUND_PREF_EVENT, onPref);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CV_SOUND_PREF_EVENT, onPref);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!enabledOpt || unlocked) return;
    const unlock = () => setUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabledOpt, unlocked]);

  const setSoundEnabled = useCallback((next: boolean) => {
    setSoundEnabledState(next);
    writeSoundEnabled(next);
    if (!next) {
      oneShotRef.current?.pause();
      for (const a of overlapPoolRef.current) a.pause();
      overlapPoolRef.current = [];
      ambientRef.current?.pause();
      ambientIdRef.current = null;
    }
  }, []);

  const canPlay = enabledOpt && soundEnabled && unlocked;

  const setCameraAltitude = useCallback((altitude: number | null | undefined) => {
    if (typeof altitude === "number" && Number.isFinite(altitude)) {
      altitudeRef.current = altitude;
    }
    const ambient = ambientRef.current;
    const ambientId = ambientIdRef.current;
    if (!ambient || !ambientId || !isZoomScaledSound(ambientId)) return;
    ambient.volume = scaledSoundVolume(
      ambientId,
      ambientBaseVolumeRef.current,
      altitudeRef.current,
    );
  }, []);

  const play = useCallback(
    async (eventId: AudioEventId, playOpts?: PlaySoundOptions) => {
      if (!canPlay) return;
      const def = AUDIO_MANIFEST[eventId] as AudioEventDef | undefined;
      if (!def) return;

      if (typeof playOpts?.altitude === "number" && Number.isFinite(playOpts.altitude)) {
        altitudeRef.current = playOpts.altitude;
      }

      const timedBurst =
        typeof playOpts?.durationMs === "number" &&
        Number.isFinite(playOpts.durationMs) &&
        playOpts.durationMs > 0;

      // 원샷 스로틀 — 연속 이벤트 폭주 방지 (강제·타임드 버스트는 예외)
      if (!def.loop && !timedBurst && !playOpts?.force) {
        const now = Date.now();
        if (now - lastOneShotAtRef.current < 280) return;
        lastOneShotAtRef.current = now;
      }

      const volumeScale =
        typeof playOpts?.volumeScale === "number" && Number.isFinite(playOpts.volumeScale)
          ? Math.min(1.6, Math.max(0.2, playOpts.volumeScale))
          : 1;
      const volume = Math.min(
        1,
        scaledSoundVolume(eventId, def.volume, altitudeRef.current) * volumeScale,
      );

      if (def.loop && !timedBurst) {
        if (ambientIdRef.current === eventId && ambientRef.current && !ambientRef.current.paused) {
          ambientRef.current.volume = volume;
          return;
        }
        ambientRef.current?.pause();
        const audio = new Audio(audioUrlForEvent(eventId, def));
        audio.loop = true;
        audio.volume = volume;
        ambientRef.current = audio;
        ambientIdRef.current = eventId;
        ambientBaseVolumeRef.current = def.volume;
        try {
          await audio.play();
        } catch {
          /* autoplay / network */
        }
        return;
      }

      const audio = new Audio(audioUrlForEvent(eventId, def));
      audio.loop = Boolean(timedBurst);
      audio.volume = volume;

      if (playOpts?.overlap) {
        // 끝난 트랙 정리 · 최대 4개 겹침
        overlapPoolRef.current = overlapPoolRef.current.filter((a) => !a.paused && !a.ended);
        if (overlapPoolRef.current.length >= 4) {
          const oldest = overlapPoolRef.current.shift();
          oldest?.pause();
        }
        overlapPoolRef.current.push(audio);
        audio.addEventListener(
          "ended",
          () => {
            overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
          },
          { once: true },
        );
      } else {
        oneShotRef.current?.pause();
        oneShotRef.current = audio;
      }

      try {
        await audio.play();
      } catch {
        /* autoplay / network */
      }
      if (timedBurst) {
        const ms = playOpts!.durationMs!;
        window.setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          if (oneShotRef.current === audio) oneShotRef.current = null;
          overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
        }, ms);
      }
    },
    [canPlay],
  );

  const stopAmbient = useCallback(() => {
    ambientRef.current?.pause();
    ambientRef.current = null;
    ambientIdRef.current = null;
  }, []);

  const setAmbient = useCallback(
    (eventId: AudioEventId | null) => {
      if (!eventId) {
        stopAmbient();
        return;
      }
      if (!AMBIENT_EVENT_IDS.includes(eventId)) {
        void play(eventId);
        return;
      }
      void play(eventId);
    },
    [play, stopAmbient],
  );

  useEffect(() => {
    return () => {
      oneShotRef.current?.pause();
      ambientRef.current?.pause();
    };
  }, []);

  return {
    play,
    setAmbient,
    stopAmbient,
    setCameraAltitude,
    unlocked,
    soundEnabled,
    setSoundEnabled,
    canPlay,
  };
}
