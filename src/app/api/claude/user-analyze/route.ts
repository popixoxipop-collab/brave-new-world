import { NextRequest, NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { hasNvidiaKeys, callNvidiaMessages } from "@/lib/llm/nvidiaMessages";
import {
  buildUserAnalyzeSystem,
  buildUserAnalyzeUserMessage,
  stubUserAnalyzeText,
  type UserAnalyzeArticleInput,
} from "@/lib/llm/userAnalyzePrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 프로세스 메모리 IP 레이트 리밋 — 워커 재시작 시 초기화 */
const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MINUTE = 3;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now >= row.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (row.count >= MAX_PER_MINUTE) return false;
  row.count += 1;
  return true;
}

/**
 * POST /api/claude/user-analyze
 *
 * D-NV1: 서버 NVIDIA Build 키 7개 풀 + step-3.5-flash로 분석(유저 키 불필요).
 * body: { title, source?, link?, theater?, excerpt?, lang? }
 */
export async function POST(request: NextRequest) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json(
      {
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (IP당 분당 3회)",
        rateLimited: true,
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body 필요" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title 필요" }, { status: 400 });
  }

  const lang = body.lang === "en" ? "en" : "ko";
  const input: UserAnalyzeArticleInput = {
    title,
    source: typeof body.source === "string" ? body.source : null,
    link: typeof body.link === "string" ? body.link : null,
    theater: typeof body.theater === "string" ? body.theater : null,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
    lang,
  };

  // stub: 키 없어도 데모 텍스트 (실 Anthropic 호출 없음)
  if (isApiStubMode()) {
    return NextResponse.json({
      ok: true,
      stub: true,
      text: stubUserAnalyzeText(input),
      model: "stub",
      billing: "none",
    });
  }

  // D-NV1: BYOK Anthropic → 서버 NVIDIA 키 7개 풀 + step-3.5-flash. 유저 키 불필요
  // (rate limit은 키 수만큼 스케일, 429면 다음 키 로테이션). 유저 분석 비용은 서버 NVIDIA
  // 계정에서 나간다(더 이상 유저 Anthropic 크레딧 안 씀).
  if (!hasNvidiaKeys()) {
    return NextResponse.json(
      { error: "NVIDIA 분석 키가 서버에 설정되지 않았습니다 (NVIDIA_API_KEY_1..N)." },
      { status: 503 },
    );
  }

  const result = await callNvidiaMessages({
    system: buildUserAnalyzeSystem(lang),
    user: buildUserAnalyzeUserMessage(input),
    maxTokens: 600,
  });

  if (!result.ok) {
    const userMessage = result.rateLimited
      ? lang === "en"
        ? "Analysis backend is busy (all NVIDIA keys rate-limited). Try again shortly."
        : "분석 서버가 바쁩니다 (NVIDIA 키 전부 rate-limit). 잠시 후 다시 시도해 주세요."
      : result.error;

    return NextResponse.json(
      { error: userMessage, rateLimited: result.rateLimited },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    stub: false,
    text: result.text,
    model: result.model, // stepfun-ai/step-3.5-flash
    billing: "server-nvidia",
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  });
}
