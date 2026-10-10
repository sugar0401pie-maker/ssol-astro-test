import type { Metadata, Viewport } from "next";
import NetworkNotice from "@/components/ui/NetworkNotice";
import { Gowun_Batang, Noto_Sans_KR, Noto_Sans_Symbols, Noto_Sans_Symbols_2 } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// 제목·요약 글꼴(프로토타입 --f-head). owner 결정 2026-10-10: HTML과 같게 명조 제목.
const gowunBatang = Gowun_Batang({ variable: "--font-gowun-batang", weight: ["400", "700"], subsets: ["latin"] });
// 휠의 행성·별자리 기호(프로토타입 --f-sym)
const notoSymbols = Noto_Sans_Symbols({ variable: "--font-noto-symbols", subsets: ["symbols"] });
const notoSymbols2 = Noto_Sans_Symbols_2({ variable: "--font-noto-symbols-2", weight: "400", subsets: ["symbols"] });

export const metadata: Metadata = {
  title: "쏠 아스트로 하우스",
  description: "출생차트로 나를 돌아보는 쏠 웰니스 하우스의 자기성찰 콘텐츠. 예측 도구가 아니며 진단·상담을 대신하지 않습니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1e3f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${gowunBatang.variable} ${notoSymbols.variable} ${notoSymbols2.variable} antialiased`}>
      <body>
        {/* 프로토타입과 같은 두 겹 별 입자 + 가운데 480px 기둥(.app) */}
        <div className="sky-dust" aria-hidden="true" />
        <div className="sky-dust b" aria-hidden="true" />
        <NetworkNotice />
        <div className="app flex flex-col">{children}</div>
      </body>
    </html>
  );
}
