/**
 * NVIDIA Build (OpenAI-호환) Messages 클라이언트 — callClaudeMessages와 동일 인터페이스.
 *
 * D-NV1: 유저 분석/geo-risk 분석을 Anthropic BYOK 대신 서버 NVIDIA 키 7개 풀 + step-3.5-flash로.
 *   유저가 키 없이 분석, rate limit은 키 수(7)만큼 스케일. 429면 다음 키로 로테이션.
 * D-NV2: callClaudeMessages와 시그니처 동일({apiKey,system,user,model?,maxTokens?} → {ok,text,model})
 *   이라 user-analyze route와 geo-risk analyze를 impl만 바꿔 스위치. apiKey 인자는 인터페이스
 *   호환용으로 받되 무시(서버 키풀 사용).
 * 패턴 출처: Code_reviewer/feedback/nvidia_client.py (429 로테이션, integrate.api.nvidia.com).
 *   fetch 기반이라 Cloudflare Worker/Edge 호환(Anthropic SDK 불필요).
 */

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const DEFAULT_NVIDIA_MODEL = "stepfun-ai/step-3.5-flash";

export type ClaudeResult =
  | { ok: true; text: string; model: string; inputTokens?: number; outputTokens?: number }
  | { ok: false; status: number; error: string; insufficientFunds?: boolean; rateLimited?: boolean };

/** process.env NVIDIA_API_KEY_1..N 을 풀로. 값 노출 안 함. */
export function getNvidiaKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 16; i++) {
    const k = process.env[`NVIDIA_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  // 단일 폴백
  const single = process.env.NVIDIA_API_KEY?.trim();
  if (keys.length === 0 && single) keys.push(single);
  return keys;
}

export function getNvidiaModel(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

export function hasNvidiaKeys(): boolean {
  return getNvidiaKeys().length > 0;
}

/**
 * callClaudeMessages 호환. NVIDIA 키풀에서 로테이션하며 OpenAI-호환 chat/completions 호출.
 * @param options.apiKey 인터페이스 호환용 — 무시됨(서버 NVIDIA 키풀 사용).
 */
export async function callNvidiaMessages(options: {
  apiKey?: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<ClaudeResult> {
  const keys = getNvidiaKeys();
  if (keys.length === 0) {
    return { ok: false, status: 500, error: "NVIDIA_API_KEY_1..N 미설정 (.env.local / wrangler secret)" };
  }
  const model = options.model || getNvidiaModel();
  // step-3.5-flash는 reasoning 모델 — reasoning_content가 max_tokens를 먼저 소진하고 content가
  // 그 다음이라, 요청한 답 토큰에 reasoning 버퍼를 더한다(관측: reasoning ~1500tok). 안 더하면
  // content가 빈 채로 잘린다(out=900에서 content="" 재현). content만 사용(reasoning_content 무시).
  const REASONING_BUFFER = 2048;
  const answerTokens = options.maxTokens ?? 1024;
  const maxTokens = answerTokens + REASONING_BUFFER;
  const bodyObj = {
    model,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  };
  const body = JSON.stringify(bodyObj);

  // 랜덤 시작 인덱스로 키 부하 분산 + 429/네트워크 실패 시 다음 키 (nvidia_client.py 패턴)
  const start = Math.floor(Math.random() * keys.length);
  let lastStatus = 0;
  let lastError = "NVIDIA 호출 실패";
  const maxAttempts = Math.min(keys.length, 3);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = keys[(start + attempt) % keys.length];
    try {
      const resp = await fetch(NVIDIA_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body,
        signal: options.signal,
      });
      if (resp.status === 429) {
        lastStatus = 429;
        lastError = "NVIDIA rate limit (429)";
        continue; // 다음 키로 — 이 429는 다른 키 예산에 안 쌓임
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        return {
          ok: false,
          status: resp.status,
          error: `NVIDIA ${resp.status}: ${errText.slice(0, 200)}`,
          insufficientFunds: resp.status === 402,
          rateLimited: resp.status === 429,
        };
      }
      const json = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      return {
        ok: true,
        text,
        model,
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "NVIDIA 네트워크 오류";
      lastStatus = 0;
      // 서버 미도달 — 다음 키 시도
    }
  }
  return { ok: false, status: lastStatus || 502, error: lastError, rateLimited: lastStatus === 429 };
}
