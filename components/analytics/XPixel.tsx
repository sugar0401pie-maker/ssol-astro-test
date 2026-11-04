"use client";

// X(트위터) 전환 추적 기본 코드(owner 요청 2026-10-16, 픽셀 rh4ou). X가 준 코드 그대로 한 번 불러온다.
// 영문 화면은 광고 측정 쿠키에 동의했고 Global Privacy Control이 꺼져 있을 때만(owner 2026-11-04). 한국어 화면은 그대로.
import Script from "next/script";
import { useConsentAllowed } from "@/lib/i18n/useCookieConsent";

export default function XPixel() {
  const allowed = useConsentAllowed("ads");
  if (!allowed) return null;
  return (
    <Script id="x-pixel-base" strategy="afterInteractive">
      {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','rh4ou');`}
    </Script>
  );
}
