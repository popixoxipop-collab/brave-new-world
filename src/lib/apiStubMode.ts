/**
 * 프로젝트 기본 정책: stub ON + viewport LOD.
 * 라이브 API가 필요할 때만 API_STUB_MODE / NEXT_PUBLIC_API_STUB_MODE 를 false 로 설정.
 */
/** 서버 API 라우트 — 기본 stub (외부 API 호출 차단) */
export function isApiStubMode(): boolean {
  return process.env.API_STUB_MODE !== "false";
}

/** FIRMS — MAP_KEY 있으면 글로벌 stub과 무관하게 라이브 허용 */
export function isFirmsLiveEnabled(): boolean {
  return Boolean(process.env.FIRMS_MAP_KEY?.trim());
}

/** 클라이언트 — 기본 stub (라이브 fetch·sync 비활성) */
export function isClientApiStubMode(): boolean {
  return process.env.NEXT_PUBLIC_API_STUB_MODE !== "false";
}
