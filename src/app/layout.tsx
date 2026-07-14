import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
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

/** 환영 편지지 — Griun PolSensibility 필체 */
const letterHand = localFont({
  src: "./fonts/Griun_PolSensibility-Rg.ttf",
  variable: "--font-letter-hand",
  display: "swap",
});

/** 영문·서명 — 유려한 고전 가로체 */
const letterScript = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-letter-script",
  display: "swap",
});

/** 지경학 nav — Pretendard Variable */
const pretendard = localFont({
  src: "./fonts/PretendardVariable.ttf",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

/** 뉴스·속보 헤드라인 — Gmarket Sans */
const gmarket = localFont({
  src: [
    {
      path: "./fonts/GmarketSansLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/GmarketSansMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/GmarketSansBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gmarket",
  display: "swap",
});

/** 영문 UI — IBM Plex (IBM/plex · OFL) */
const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

/** 지경학 양피지 — Space Grotesk */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "멋진 신세계",
  description:
    "Aldous Huxley 《Brave New World》를 모티브로—전쟁과 이익이 같은 지도를 공유하는 3D 지구본 관측대",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning style={{ background: "#02040a" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${letterHand.variable} ${letterScript.variable} ${pretendard.variable} ${gmarket.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} antialiased`}
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
