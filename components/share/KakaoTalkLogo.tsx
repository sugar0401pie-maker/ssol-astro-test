// 카카오톡 로고(owner 2026-10-11 '실제 카카오톡 로고'): 노란 바탕 위 짙은 갈색 말풍선 + 'TALK' 글자.
// 카카오 브랜드 색(#FEE500 바탕, #3C1E1E 말풍선). 바탕은 버튼·타일 쪽에서 칠한다.
export default function KakaoTalkLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.07 1.07.11 1.61.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
      <text x="12" y="12.9" textAnchor="middle" fontSize="5.4" fontWeight="900" fill="#FEE500" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="-0.1">
        TALK
      </text>
    </svg>
  );
}
