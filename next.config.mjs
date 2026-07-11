/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["maplibre-gl"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        // MapLibre 최초 컴파일이 길어질 수 있어 청크 타임아웃 여유
        chunkLoadTimeout: 600000,
      };

      // Downloads·OneDrive 등 동기화 폴더에서 filesystem 캐시 손상 → HMR 중 청크 404 방지
      config.cache = { type: "memory" };

      // 상위 폴더(System Volume Information 등) 감시로 인한 Watchpack EINVAL 방지
      // ignored는 단일 RegExp 또는 문자열 glob 배열만 허용 — RegExp가 섞인 배열은 스키마 오류
      config.watchOptions = {
        aggregateTimeout: config.watchOptions?.aggregateTimeout ?? 5,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/System Volume Information/**",
        ],
      };
    } else {
      // production build도 OneDrive 경로에서 filesystem 캐시가 멈춘 것처럼 보일 수 있음
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
