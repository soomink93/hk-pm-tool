import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HK 운영 대시보드",
  description: "HK 사내 운영 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
