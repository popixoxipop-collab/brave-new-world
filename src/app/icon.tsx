import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** 홈 화면·PWA 아이콘 — 어두운 지구본 모티브 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #02040a 0%, #0a1830 55%, #061018 100%)",
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 35% 30%, #45f3ff 0%, #0ea5e9 28%, #0c4a6e 62%, #02040a 100%)",
            boxShadow: "0 0 48px rgba(69, 243, 255, 0.35)",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
