import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/** 환영 편지지 — 펜글씨 대신 읽기 좋은 한글 명조 */
const letterSerif = Noto_Serif_KR({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-letter-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Conflict View",
  description: "지정학 갈등·전쟁 이벤트를 3D 지구본에서 탐색하는 로컬 프로토타입",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning style={{ background: "#02040a" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${letterSerif.variable} antialiased`}
        style={{
          background: "#02040a",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
