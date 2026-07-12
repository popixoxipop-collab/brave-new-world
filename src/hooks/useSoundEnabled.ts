"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CV_SOUND_PREF_EVENT,
  SOUND_PREF_KEY,
  readSoundEnabled,
  writeSoundEnabled,
} from "@/lib/soundPrefs";

/** 오디오 엔진 없이 음소거 선호만 읽고/쓰는 훅 */
export function useSoundEnabled() {
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    setSoundEnabledState(readSoundEnabled());

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setSoundEnabledState(detail.enabled);
        return;
      }
      setSoundEnabledState(readSoundEnabled());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== SOUND_PREF_KEY) return;
      setSoundEnabledState(readSoundEnabled());
    };

    window.addEventListener(CV_SOUND_PREF_EVENT, onPref);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CV_SOUND_PREF_EVENT, onPref);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setSoundEnabled = useCallback((next: boolean) => {
    setSoundEnabledState(next);
    writeSoundEnabled(next);
  }, []);

  return { soundEnabled, setSoundEnabled };
}
