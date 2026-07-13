export type DataProfile = "lite" | "full";

/** 서버에서만 읽고 클라이언트에는 props로 주입 — NEXT_PUBLIC 사용 금지 (dataCdnBase 제외) */
export type RuntimeConfig = {
  dataProfile: DataProfile;
  apiStubMode: boolean;
  neptunEnabled: boolean;
  tzevaAdomEnabled: boolean;
  telegramOsintEnabled: boolean;
  syncPollMs: number;
  /**
   * R2/CDN public base (예: https://data.example.com).
   * 설정 시 dataPath()가 /data/... 대신 CDN을 씀. 비우면 로컬 public.
   */
  dataCdnBase: string | null;
};

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  dataProfile: "lite",
  apiStubMode: true,
  neptunEnabled: false,
  tzevaAdomEnabled: false,
  telegramOsintEnabled: false,
  syncPollMs: 5 * 60 * 1000,
  dataCdnBase: null,
};
