// 영문판 하단((나) 영문 전용, owner 2026-11-04). 문구는 영문 정책 패키지 08_on-screen-texts §6 그대로.
// 'Cookie settings'·'Do Not Sell or Share' 링크는 쿠키 동의 창·그 페이지를 만들 때 더한다(아직 없음).
// 한국어 푸터(SiteFooter.tsx)를 고쳐도 이 파일은 따라 바뀌지 않는다 — 사업자 정보가 바뀌면 둘 다 고친다.
import Link from "next/link";
import { enLegalUrl, type EnLegalSlug } from "@/lib/legal/en/blocks";

// 워싱턴주 건강정보법: Consumer Health Data Privacy Policy 링크가 홈 화면에서 눈에 띄게 보여야 해서 모든 화면 푸터에 둔다.
const LINKS: [EnLegalSlug, string][] = [
  ["terms", "Terms of Use"],
  ["privacy", "Privacy Policy"],
  ["cookies", "Cookie Policy"],
  ["refund", "Refund Policy"],
  ["disclaimer", "Disclaimer"],
  ["consumer-health-data", "Consumer Health Data Privacy Policy"],
];

export default function SiteFooterEn() {
  return (
    <footer className="site-foot" lang="en">
      <p className="ln">
        <a href="https://ssolwellnesshouse.com" target="_blank" rel="noopener">
          by SSOL Wellness House
        </a>
      </p>
      <p className="ln">
        {LINKS.map(([slug, label], i) => (
          <span key={slug}>
            {i > 0 && " · "}
            <Link href={enLegalUrl(slug)} prefetch={false}>{label}</Link>
          </span>
        ))}
      </p>
      <p>SSOL Wellness House · Representative: Junseok Kim · Business registration no. 572-07-03549 · Mail-order business registration no. 2026-Seoul Mapo-2770</p>
      <p>Room 408, 4F, 100 Dongmak-ro, Mapo-gu, Seoul, Republic of Korea</p>
      <p>Contact number: +82-10-2835-2263 · contact@ssolwellness.com</p>
      <p>© 2026 SSOL Wellness House</p>
    </footer>
  );
}
