"use client";

// GA4 설치(owner 요청 2026-10-15). 측정 ID가 있을 때만 gtag.js를 불러온다.
// 자동 페이지 보기는 끄고(send_page_view:false) 주소를 정리한 페이지 보기를 직접 보낸다 —
// 결제 완료 주소의 paymentKey·orderId, 결과 id 같은 값이 GA로 가지 않게.
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GA_ID, gaPageView } from "@/lib/analytics/gaClient";
import { useConsentAllowed } from "@/lib/i18n/useCookieConsent";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  // 영문 화면은 분석 쿠키 동의가 있어야 스크립트를 부른다(한국어 화면은 그대로)
  const allowed = useConsentAllowed("analytics");
  useEffect(() => {
    if (allowed) gaPageView();
  }, [pathname, allowed]);
  if (!GA_ID || !allowed) return null;
  // 초기화(config)는 gaClient가 첫 페이지 보기 때 한 번 한다 — 스크립트보다 먼저 쌓인 이벤트도 순서대로 나간다
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />;
}
