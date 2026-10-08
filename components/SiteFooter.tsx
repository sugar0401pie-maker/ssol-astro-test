// 모든 화면 하단의 사업자 정보(쏘웰라 components/SiteFooter.tsx와 같은 내용 — owner가 준 문구 그대로).
// 약관·개인정보처리방침은 같은 사업자의 쏘웰라 법적 고지 페이지로 연결한다. 문의 메일은 개인정보처리방침에 적힌 주소.
import { PRIVACY_URL, TERMS_URL } from "@/lib/results/consent";

export default function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-8 pt-4 text-center text-[11px] leading-5 text-cream/50">
      <p>
        <a href="https://ssolwellness.com" target="_blank" rel="noreferrer" className="underline">
          by 쏠 웰니스 하우스
        </a>
      </p>
      <p className="mt-1">
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="underline">개인정보처리방침</a>
        {" · "}
        <a href={TERMS_URL} target="_blank" rel="noreferrer" className="underline">이용약관</a>
      </p>
      <p className="mt-2">쏠 웰니스 하우스 · 대표 김준석 · 사업자등록번호 572-07-03549</p>
      <p>서울시 마포구 독막로 100 4층 408호 · 연락처 010-2835-2263</p>
      <p>문의 junseok@ssolcare.com</p>
    </footer>
  );
}
