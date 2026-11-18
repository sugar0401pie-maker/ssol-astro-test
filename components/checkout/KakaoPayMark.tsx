// 카카오페이 표시(검정 말풍선 + pay) — 카카오페이 노란 버튼 가운데에 넣는다(쏠 타로 하우스와 같은 모양, owner 2026-11-18)
export default function KakaoPayMark() {
  return (
    <span className="kpmark" aria-label="카카오페이">
      <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true">
        <path d="M10 0C4.48 0 0 3.52 0 7.86c0 2.8 1.86 5.26 4.66 6.65l-.95 3.5a.3.3 0 0 0 .46.33l4.1-2.72c.57.08 1.14.12 1.73.12 5.52 0 10-3.52 10-7.88S15.52 0 10 0Z" fill="#191919" />
      </svg>
      <b>pay</b>
    </span>
  );
}
