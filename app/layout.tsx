import type { Metadata, Viewport } from "next";
import NetworkNotice from "@/components/ui/NetworkNotice";
import AttributionCapture from "@/components/attribution/AttributionCapture";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import XPixel from "@/components/analytics/XPixel";
import { Gowun_Batang, Noto_Sans_KR, Noto_Sans_Symbols, Noto_Sans_Symbols_2 } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  // 굵기 하나짜리 가변 글꼴(2026-10-18): 굵기 3개(400·500·700)를 따로 두면 글꼴 선언이 372개(압축해도 약 80KB)라
  // 화면을 그리기 전에 읽어야 하는 스타일이 커졌다. 가변 글꼴 하나로 모든 굵기를 낸다.
  // 미리 받기 끔(2026-10-18 첫 화면 속도): 한글 글꼴은 글자 범위별로 100개 가까운 조각이라, 미리 받기를 켜 두면
  // 첫 화면에서 쓰지 않는 조각까지 약 2MB를 먼저 받았다. 끄면 브라우저가 화면에 실제로 나온 글자 조각만 받는다.
  preload: false,
});

// 제목·요약 글꼴(프로토타입 --f-head). owner 결정 2026-10-10: HTML과 같게 명조 제목.
const gowunBatang = Gowun_Batang({ variable: "--font-gowun-batang", weight: ["400", "700"], subsets: ["latin"], preload: false });
// 휠의 행성·별자리 기호(프로토타입 --f-sym)
const notoSymbols = Noto_Sans_Symbols({ variable: "--font-noto-symbols", subsets: ["symbols"], preload: false });
const notoSymbols2 = Noto_Sans_Symbols_2({ variable: "--font-noto-symbols-2", weight: "400", subsets: ["symbols"], preload: false });

const DESCRIPTION = "출생차트로 나를 돌아보는 쏠 웰니스 하우스의 자기성찰 콘텐츠. 예측 도구가 아니며 진단·상담을 대신하지 않습니다.";
// 공유 미리보기(카카오톡·X 등): 사이트 첫 화면 정보만. 결과 주소는 본인 전용이라 결과별 미리보기는 만들지 않는다.
// 미리보기 그림은 전용 이미지를 받기 전까지 인트로 그림(관측소)을 쓴다.
export const metadata: Metadata = {
  metadataBase: new URL("https://astro.ssolwellnesshouse.com"),
  title: "쏠 아스트로 하우스",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "쏠 아스트로 하우스",
    title: "쏠 아스트로 하우스",
    description: DESCRIPTION,
    url: "/",
    locale: "ko_KR",
    // 공유 썸네일(owner 2026-10-22 지정 그림, 원본 크기 그대로 jpg — 카카오톡·X가 webp를 잘 못 읽어서)
    images: [{ url: "/og/share.jpg", width: 1774, height: 887, alt: "밤하늘 별자리 원을 가리키는 양" }],
  },
  twitter: { card: "summary_large_image", title: "쏠 아스트로 하우스", description: DESCRIPTION, images: ["/og/share.jpg"] },
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
        <AttributionCapture />
        <GoogleAnalytics />
        <XPixel />
        <div className="app flex flex-col">{children}</div>
      </body>
    </html>
  );
}
