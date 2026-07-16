import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 118,
            height: 118,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 35% 30%, #45f3ff 0%, #0ea5e9 28%, #0c4a6e 62%, #02040a 100%)",
            boxShadow: "0 0 24px rgba(69, 243, 255, 0.35)",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
