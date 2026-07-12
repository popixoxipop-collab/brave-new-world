"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AMBIENT_EVENT_IDS,
  AUDIO_MANIFEST,
  type AudioEventId,
} from "@/data/audioManifest";

const SOUND_PREF_KEY = "cv-sound-enabled";

function readSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(SOUND_PREF_KEY);
  if (raw === null) return true;
  return raw === "1" || raw === "true";
}

export type UseSoundStreamOptions = {
  /** false면 완전 무음 (환경설정 등) */
  enabled?: boolean;
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
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientIdRef = useRef<AudioEventId | null>(null);
  const lastOneShotAtRef = useRef(0);

  useEffect(() => {
    setSoundEnabledState(readSoundPref());
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
    try {
      localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!next) {
      oneShotRef.current?.pause();
      ambientRef.current?.pause();
      ambientIdRef.current = null;
    }
  }, []);

  const canPlay = enabledOpt && soundEnabled && unlocked;

  const play = useCallback(
    async (eventId: AudioEventId) => {
      if (!canPlay) return;
      const def = AUDIO_MANIFEST[eventId];
      if (!def) return;

      // 원샷 스로틀 — 연속 이벤트 폭주 방지
      if (!def.loop) {
        const now = Date.now();
        if (now - lastOneShotAtRef.current < 280) return;
        lastOneShotAtRef.current = now;
      }

      if (def.loop) {
        if (ambientIdRef.current === eventId && ambientRef.current && !ambientRef.current.paused) {
          return;
        }
        ambientRef.current?.pause();
        const audio = new Audio(`/api/sound-stream?eventId=${encodeURIComponent(eventId)}`);
        audio.loop = true;
        audio.volume = Math.min(1, Math.max(0, def.volume));
        ambientRef.current = audio;
        ambientIdRef.current = eventId;
        try {
          await audio.play();
        } catch {
          /* autoplay / network */
        }
        return;
      }

      oneShotRef.current?.pause();
      const audio = new Audio(`/api/sound-stream?eventId=${encodeURIComponent(eventId)}`);
      audio.loop = false;
      audio.volume = Math.min(1, Math.max(0, def.volume));
      oneShotRef.current = audio;
      try {
        await audio.play();
      } catch {
        /* autoplay / network */
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
    unlocked,
    soundEnabled,
    setSoundEnabled,
    canPlay,
  };
}
