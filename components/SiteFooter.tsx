// 하단 사업자 정보(2026-10-09 프로토타입 FOOTER 그대로 — .site-foot, 왼쪽 정렬). 프로토타입처럼 인트로 아래와 결과 화면에만 둔다.
// 약관·개인정보처리방침은 이 사이트의 /legal(owner 2026-10-08 요청). 문의 메일 contact@ssolwellness.com(owner 지정).
import Link from "next/link";
import { PRIVACY_URL, TERMS_URL } from "@/lib/results/consent";

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <p className="ln">
        <a href="https://ssolwellnesshouse.com" target="_blank" rel="noopener">
          by 쏠 웰니스 하우스
        </a>
      </p>
      <p className="ln">
        {/* 미리 불러오기 끔(2026-10-18 첫 화면 속도): 법적 고지 페이지가 길어 화면에 보이기만 해도 약 85KB를 미리 받았다 */}
        <Link href={PRIVACY_URL} prefetch={false}>개인정보처리방침</Link> · <Link href={TERMS_URL} prefetch={false}>이용약관</Link>
      </p>
      <p>쏠 웰니스 하우스 · 대표 김준석 · 사업자등록번호 572-07-03549</p>
      <p>서울시 마포구 독막로 100 4층 408호</p>
      <p>010-2835-2263 · contact@ssolwellness.com</p>
    </footer>
  );
}
