/** localStorage key — useSoundStream / 주의 창 / 음소거 토글 공유 */
export const SOUND_PREF_KEY = "cv-sound-enabled";

/** 같은 탭 내 여러 훅 인스턴스 동기화 */
export const CV_SOUND_PREF_EVENT = "cv-sound-pref";

export function readSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

export function writeSoundEnabled(next: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CV_SOUND_PREF_EVENT, { detail: { enabled: next } }),
  );
}
