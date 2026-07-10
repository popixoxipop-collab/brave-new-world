import type { Metadata } from "next";
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
        <link
          rel="preload"
          as="image"
          href="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#02040a", minHeight: "100vh" }}
      >
        {children}
      </body>
    </html>
  );
}
