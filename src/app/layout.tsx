import type { Metadata } from "next";
import { Caveat } from "next/font/google";
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

const letterEn = Caveat({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-letter-en",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${letterEn.variable} antialiased`}
        style={{
          background: "#02040a",
          minHeight: "100vh",
          ["--font-letter-ko" as string]: '"Nanum Pen Script", cursive',
        }}
      >
        {children}
      </body>
    </html>
  );
}
