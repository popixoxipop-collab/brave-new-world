/**
 * 지정학 — 전쟁구역 사상자 HTML 오버레이 (사망/부상 + 호버 타입라이터 애도).
 * 우크라·중동 등 전장 공통. 숫자 출처는 전장별로 주입.
 */

export type WarCasualtyOverlayInput = {
  theaterId: string;
  lat: number;
  lng: number;
  killed: number;
  wounded: number;
  killedLabel: string;
  woundedLabel: string;
  elegyLines?: readonly [string, string];
  /** 부상 줄 호버 시 짧은 설명 (고정 추정치 등). 없으면 부상 전용 팁 없음 */
  woundedNote?: string;
  altitude?: number;
};

/** 우크라 부상(CSIS)용 기본 짧은 안내 */
export const WOUNDED_FIXED_NOTE = {
  ko: "부상은 특정 고정 추정치입니다. (명의 확인 목록 없음 · CSIS)",
  en: "Wounded is a fixed estimate (no named list · CSIS).",
} as const;

/** 전장 공통 애도 문장 — 호버 타입라이터 */
export const CASUALTY_ELEGY_LINES = {
  ko: [
    "단순한 숫자가 아닙니다.",
    "그 숫자만큼의 세계들이 사라진 것입니다.",
  ],
  en: [
    "These are not mere numbers.",
    "As many worlds as that number have vanished.",
  ],
} as const;

function elegyTypedKey(theaterId: string) {
  return `cv-casualty-elegy-typed:${theaterId}`;
}

export function casualtyElegyAlreadyTyped(theaterId: string): boolean {
  try {
    return sessionStorage.getItem(elegyTypedKey(theaterId)) === "1";
  } catch {
    return false;
  }
}

export function markCasualtyElegyTyped(theaterId: string): void {
  try {
    sessionStorage.setItem(elegyTypedKey(theaterId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * 화면 비율 유지용 배율.
 * 전역(고고도)에서 한눈에 보이게 크게, LOD 줌인 시 작아짐.
 */
export function getCasualtyOverlayScale(altitude: number): number {
  const a = Math.max(0.02, Number.isFinite(altitude) ? altitude : 1.8);
  const raw = Math.sqrt(a / 0.28);
  return Math.min(3.35, Math.max(0.4, raw));
}

export function formatCasualtyCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SKULL_SVG = `<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0">
  <path fill="#ffffff" d="M12 2C7.6 2 4.2 5.1 4.2 9.1c0 2.4 1.1 4.5 2.8 5.9L6 20.2c0 .4.3.8.8.8h1.6c.3 0 .6-.2.7-.5L10 18h4l.9 2.5c.1.3.4.5.7.5h1.6c.4 0 .8-.4.8-.8l-1-5.2c1.7-1.4 2.8-3.5 2.8-5.9C19.8 5.1 16.4 2 12 2zm-3.2 7.2c-.7 0-1.3-.6-1.3-1.3S8.1 6.6 8.8 6.6s1.3.6 1.3 1.3-.6 1.3-1.3 1.3zm6.4 0c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3zM9.5 14.2c.7.5 1.6.8 2.5.8s1.8-.3 2.5-.8c.2-.1.2-.4 0-.5-.7-.4-1.6-.7-2.5-.7s-1.8.3-2.5.7c-.2.1-.2.4 0-.5z"/>
</svg>`;

const WOUNDED_SVG = `<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0">
  <path fill="#ffffff" d="M12 2.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm-1.1 5.6h2.2c1.3 0 2.3 1.1 2.1 2.4l-.5 4.1c-.1.7-.7 1.2-1.4 1.2h-.2v5.2c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-5.2h-.2c-.7 0-1.3-.5-1.4-1.2l-.5-4.1c-.2-1.3.8-2.4 2.1-2.4z"/>
  <path fill="#ffffff" d="M7.2 10.2c.4-.5 1.1-.5 1.5 0l1.1 1.3v2.1L8.4 12.3l-.8 6.2c-.1.6-.6 1-1.2.9-.6-.1-1-.6-.9-1.2l.9-6.6c.05-.3.2-.55.4-.7z"/>
  <path fill="#ffffff" d="M16.8 10.2c-.4-.5-1.1-.5-1.5 0l-1.1 1.3v2.1l1.4-1.3.8 6.2c.1.6.6 1 1.2.9.6-.1 1-.6.9-1.2l-.9-6.6c-.05-.3-.2-.55-.4-.7z"/>
  <path fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" d="M8.6 8.4h6.8"/>
  <circle cx="18.2" cy="7.2" r="2.1" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <path fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" d="M18.2 5.6v3.2M16.6 7.2h3.2"/>
</svg>`;

/**
 * 전쟁구역 공통 사상자 마커.
 * 사망 호버 → 애도 타입라이터 / 부상 호버 → 고정값 짧은 설명창
 */
export function createWarCasualtyOverlayElement(
  input: WarCasualtyOverlayInput,
): HTMLElement {
  const scale = getCasualtyOverlayScale(input.altitude ?? 1.8);
  const lines = input.elegyLines ?? CASUALTY_ELEGY_LINES.ko;
  const theaterId = input.theaterId;
  const woundedNote = input.woundedNote?.trim() || "";

  const el = document.createElement("div");
  el.className = "casualty-skull-marker war-casualty-overlay";
  el.dataset.theaterId = theaterId;
  el.style.display = "flex";
  el.style.flexDirection = "row";
  el.style.alignItems = "center";
  el.style.gap = "16px";
  el.style.transform = `translate(-50%, -100%) scale(${scale})`;
  el.style.transformOrigin = "center bottom";
  el.style.pointerEvents = "auto";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.style.zIndex = "7";
  el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.9))";

  const gothic =
    '"Arial Black","Impact","Haettenschweiler","Franklin Gothic Heavy","Pretendard",sans-serif';
  const elegyFont = '"Pretendard","IBM Plex Sans","Noto Sans KR",sans-serif';

  const counts = document.createElement("div");
  counts.className = "casualty-skull-counts";
  counts.style.display = "flex";
  counts.style.flexDirection = "column";
  counts.style.gap = "10px";
  counts.style.transition = "opacity 0.35s ease";

  const row = (iconSvg: string, count: number, label: string, kind: "killed" | "wounded") => {
    const wrap = document.createElement("div");
    wrap.className = `casualty-row casualty-row-${kind}`;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "10px";
    wrap.style.whiteSpace = "nowrap";
    wrap.style.cursor = "default";
    wrap.innerHTML = `
      ${iconSvg}
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;line-height:1">
        <div style="color:#ffffff;font-family:${gothic};font-weight:900;font-size:34px;letter-spacing:0.01em;font-variant-numeric:tabular-nums;-webkit-text-stroke:0.4px rgba(0,0,0,0.35)">${escapeHtml(
          formatCasualtyCount(count),
        )}</div>
        <div style="color:rgba(255,255,255,0.92);font-family:${gothic};font-weight:800;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">${escapeHtml(
          label,
        )}</div>
      </div>`;
    return wrap;
  };

  const killedRow = row(SKULL_SVG, input.killed, input.killedLabel, "killed");
  const woundedRow = row(WOUNDED_SVG, input.wounded, input.woundedLabel, "wounded");
  counts.append(killedRow, woundedRow);

  const sidePane = document.createElement("div");
  sidePane.className = "casualty-side-pane";
  sidePane.style.position = "relative";
  sidePane.style.minWidth = "11em";
  sidePane.style.maxWidth = "16em";
  sidePane.style.minHeight = "2.8em";

  const elegy = document.createElement("div");
  elegy.className = "casualty-elegy";
  elegy.setAttribute("aria-live", "polite");
  elegy.style.color = "#ffffff";
  elegy.style.fontFamily = elegyFont;
  elegy.style.fontWeight = "600";
  elegy.style.fontSize = "13px";
  elegy.style.lineHeight = "1.45";
  elegy.style.letterSpacing = "0.01em";
  elegy.style.opacity = "0";
  elegy.style.transition = "opacity 0.35s ease";
  elegy.style.pointerEvents = "none";
  elegy.style.textShadow = "0 1px 4px rgba(0,0,0,0.85)";

  const line1 = document.createElement("div");
  const line2 = document.createElement("div");
  line2.style.marginTop = "0.35em";
  elegy.append(line1, line2);

  const noteTip = document.createElement("div");
  noteTip.className = "casualty-wounded-note";
  noteTip.setAttribute("role", "status");
  noteTip.style.position = "absolute";
  noteTip.style.left = "0";
  noteTip.style.top = "50%";
  noteTip.style.transform = "translateY(-50%)";
  noteTip.style.padding = "6px 9px";
  noteTip.style.borderRadius = "4px";
  noteTip.style.border = "1px solid rgba(255,255,255,0.28)";
  noteTip.style.background = "rgba(8,12,20,0.82)";
  noteTip.style.color = "rgba(255,255,255,0.95)";
  noteTip.style.fontFamily = elegyFont;
  noteTip.style.fontWeight = "600";
  noteTip.style.fontSize = "11px";
  noteTip.style.lineHeight = "1.4";
  noteTip.style.letterSpacing = "0.01em";
  noteTip.style.maxWidth = "15em";
  noteTip.style.opacity = "0";
  noteTip.style.transition = "opacity 0.2s ease";
  noteTip.style.pointerEvents = "none";
  noteTip.style.whiteSpace = "normal";
  noteTip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.45)";
  noteTip.textContent = woundedNote;

  sidePane.append(elegy, noteTip);
  el.append(counts, sidePane);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let noteHideTimer: ReturnType<typeof setTimeout> | null = null;
  let elegyActive = false;

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const hideNote = () => {
    if (noteHideTimer != null) {
      clearTimeout(noteHideTimer);
      noteHideTimer = null;
    }
    noteTip.style.opacity = "0";
  };

  const showNote = () => {
    if (!woundedNote) return;
    hideElegy(true);
    noteTip.style.opacity = "1";
    if (noteHideTimer != null) clearTimeout(noteHideTimer);
    // 짧게 보여 주고 (호버 유지 중에도 2.4초 후 자동 희미해짐은 하지 않음 — leave에서만 숨김)
  };

  const showFullElegy = () => {
    hideNote();
    line1.textContent = lines[0];
    line2.textContent = lines[1];
    elegy.style.opacity = "1";
    counts.style.opacity = "0.45";
  };

  const hideElegy = (immediate = false) => {
    clearTimer();
    elegyActive = false;
    elegy.style.opacity = "0";
    counts.style.opacity = "1";
    const clearText = () => {
      if (!elegyActive) {
        line1.textContent = "";
        line2.textContent = "";
      }
    };
    if (immediate) {
      clearText();
      return;
    }
    timer = setTimeout(() => {
      clearText();
      timer = null;
    }, 320);
  };

  const typewrite = () => {
    hideNote();
    clearTimer();
    elegyActive = true;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skipType = reduced || casualtyElegyAlreadyTyped(theaterId);

    if (skipType) {
      showFullElegy();
      return;
    }

    line1.textContent = "";
    line2.textContent = "";
    elegy.style.opacity = "1";
    counts.style.opacity = "0.45";

    const msPerChar = 48;
    const pauseBetweenLines = 420;
    let lineIdx = 0;
    let charIdx = 0;

    const tick = () => {
      if (!elegyActive) return;
      const current = lines[lineIdx] ?? "";
      const target = lineIdx === 0 ? line1 : line2;
      if (charIdx < current.length) {
        target.textContent = current.slice(0, charIdx + 1);
        charIdx += 1;
        timer = setTimeout(tick, msPerChar);
        return;
      }
      if (lineIdx === 0) {
        lineIdx = 1;
        charIdx = 0;
        timer = setTimeout(tick, pauseBetweenLines);
        return;
      }
      markCasualtyElegyTyped(theaterId);
      timer = null;
    };

    timer = setTimeout(tick, 280);
  };

  killedRow.addEventListener("mouseenter", typewrite);
  killedRow.addEventListener("mouseleave", () => hideElegy(false));

  if (woundedNote) {
    woundedRow.addEventListener("mouseenter", showNote);
    woundedRow.addEventListener("mouseleave", hideNote);
  }

  // 루트 leave — 잔여 패널 정리
  el.addEventListener("mouseleave", () => {
    hideElegy(false);
    hideNote();
  });

  killedRow.addEventListener(
    "touchend",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      hideNote();
      if (elegy.style.opacity === "1" && (line1.textContent || line2.textContent)) {
        hideElegy(false);
      } else {
        typewrite();
      }
    },
    { passive: false },
  );

  if (woundedNote) {
    woundedRow.addEventListener(
      "touchend",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        hideElegy(true);
        if (noteTip.style.opacity === "1") {
          hideNote();
        } else {
          showNote();
          noteHideTimer = setTimeout(hideNote, 2200);
        }
      },
      { passive: false },
    );
  }

  return el;
}
