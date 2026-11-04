// 영문판 하단 사업자 정보((나) 영문 전용, owner 2026-11-04). 문구는 패키지 20_영문번역 화면문구 UI|0141 그대로,
// 통신판매업신고번호·국가 표기·국제 전화번호만 더함(표기 확인 필요 — 21_영문판 개발메모 9장).
// 한국어 푸터(SiteFooter.tsx)를 고쳐도 이 파일은 따라 바뀌지 않는다 — 사업자 정보가 바뀌면 둘 다 고친다.
import Link from "next/link";

export const EN_PRIVACY_URL = "/en/legal/privacy";
export const EN_TERMS_URL = "/en/legal/terms";

export default function SiteFooterEn() {
  return (
    <footer className="site-foot" lang="en">
      <p className="ln">
        <a href="https://ssolwellnesshouse.com" target="_blank" rel="noopener">
          by SSOL Wellness House
        </a>
      </p>
      <p className="ln">
        <Link href={EN_PRIVACY_URL} prefetch={false}>Privacy Policy</Link> · <Link href={EN_TERMS_URL} prefetch={false}>Terms of Service</Link>
      </p>
      <p>SSOL Wellness House · CEO Kim Junseok · Business Registration No. 572-07-03549 · Mail-order Business Report No. 2026-Seoul Mapo-2770</p>
      <p>4F, Room 408, 100 Dongmak-ro, Mapo-gu, Seoul, Republic of Korea</p>
      <p>+82 10-2835-2263 · contact@ssolwellness.com</p>
    </footer>
  );
}
