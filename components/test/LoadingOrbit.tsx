"use client";
// 계산 중 화면의 도는 별(owner 2026-11-04 '좀 더 화려하게 막 돌아가도록', 한국어·영문 같은 그림).
// 바깥 12별자리 고리(천천히) · 점선 고리(거꾸로) · 금빛 별똥별 · 크림 별 · 작은 행성 셋(속도·방향 다름) · 가운데 숨 쉬는 빛 · 반짝이는 점들.
// 동작 줄이기(prefers-reduced-motion)면 모두 멈춘다.
export default function LoadingOrbit() {
  return (
    <div className="lo-orbit" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <radialGradient id="lo-glow">
            <stop offset="0" stopColor="#F3DFA6" stopOpacity=".95" />
            <stop offset=".5" stopColor="#CBB27A" stopOpacity=".35" />
            <stop offset="1" stopColor="#CBB27A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lo-tail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F3DFA6" stopOpacity="0" />
            <stop offset="1" stopColor="#F3DFA6" stopOpacity=".95" />
          </linearGradient>
        </defs>
        <circle className="tw" cx="59.9" cy="180.2" r="1.6" fill="#FDF6E9" style={{ animationDelay: "0.1s" }} />
        <circle className="tw" cx="10.3" cy="79.4" r="1.0" fill="#FDF6E9" style={{ animationDelay: "1.0s" }} />
        <circle className="tw" cx="190.2" cy="121.7" r="1.0" fill="#FDF6E9" style={{ animationDelay: "0.2s" }} />
        <circle className="tw" cx="13.6" cy="144.3" r="1.0" fill="#FDF6E9" style={{ animationDelay: "0.4s" }} />
        <circle className="tw" cx="31.5" cy="29.3" r="1.5" fill="#FDF6E9" style={{ animationDelay: "0.8s" }} />
        <circle className="tw" cx="187.5" cy="86.8" r="1.8" fill="#FDF6E9" style={{ animationDelay: "0.6s" }} />
        <circle className="tw" cx="155.1" cy="170.3" r="1.2" fill="#FDF6E9" style={{ animationDelay: "1.6s" }} />
        <circle className="tw" cx="139.8" cy="185.6" r="1.6" fill="#FDF6E9" style={{ animationDelay: "0.7s" }} />
        <circle className="tw" cx="15.3" cy="73.8" r="1.0" fill="#FDF6E9" style={{ animationDelay: "0.4s" }} />
        <circle className="tw" cx="60.7" cy="16.0" r="1.2" fill="#FDF6E9" style={{ animationDelay: "1.2s" }} />
        <circle className="tw" cx="12.6" cy="126.5" r="1.8" fill="#FDF6E9" style={{ animationDelay: "1.4s" }} />
        <circle className="tw" cx="103.5" cy="194.3" r="1.5" fill="#FDF6E9" style={{ animationDelay: "1.8s" }} />
        <circle className="tw" cx="88.3" cy="9.6" r="2.0" fill="#FDF6E9" style={{ animationDelay: "0.2s" }} />
        <circle className="tw" cx="16.1" cy="147.4" r="1.1" fill="#FDF6E9" style={{ animationDelay: "1.0s" }} />
        <g className="lo-zodiac">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(203,178,122,.25)" strokeWidth="14" />
          <text x="100.0" y="24.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♈︎</text>
          <text x="140.0" y="34.7" textAnchor="middle" fontSize="11" fill="#CBB27A">♉︎</text>
          <text x="169.3" y="64.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♊︎</text>
          <text x="180.0" y="104.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♋︎</text>
          <text x="169.3" y="144.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♌︎</text>
          <text x="140.0" y="173.3" textAnchor="middle" fontSize="11" fill="#CBB27A">♍︎</text>
          <text x="100.0" y="184.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♎︎</text>
          <text x="60.0" y="173.3" textAnchor="middle" fontSize="11" fill="#CBB27A">♏︎</text>
          <text x="30.7" y="144.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♐︎</text>
          <text x="20.0" y="104.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♑︎</text>
          <text x="30.7" y="64.0" textAnchor="middle" fontSize="11" fill="#CBB27A">♒︎</text>
          <text x="60.0" y="34.7" textAnchor="middle" fontSize="11" fill="#CBB27A">♓︎</text>
        </g>
        <g className="lo-ring-rev">
          <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(203,178,122,.6)" strokeWidth="1.2" strokeDasharray="1.5 6" />
        </g>
        <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(253,246,233,.22)" strokeWidth="1" />
        <circle cx="100" cy="100" r="28" fill="none" stroke="rgba(203,178,122,.4)" strokeWidth="1" />
        <circle className="lo-core" cx="100" cy="100" r="26" fill="url(#lo-glow)" />
        <circle cx="100" cy="100" r="9" fill="#013566" stroke="#CBB27A" strokeWidth="1.6" />
        <g className="lo-orb lo-a">
          <path d="M124 41 A64 64 0 0 1 164 100" fill="none" stroke="url(#lo-tail)" strokeWidth="4" strokeLinecap="round" />
          <path d="M164.0 91.0L166.2 96.9L172.6 97.2L167.6 101.2L169.3 107.3L164.0 103.8L158.7 107.3L160.4 101.2L155.4 97.2L161.8 96.9z" fill="#E8C878" stroke="#FDF6E9" strokeWidth=".8" />
        </g>
        <g className="lo-orb lo-b">
          <path d="M100.0 48.5L101.4 52.1L105.2 52.3L102.2 54.7L103.2 58.4L100.0 56.3L96.8 58.4L97.8 54.7L94.8 52.3L98.6 52.1z" fill="#FDF6E9" />
        </g>
        <g className="lo-orb lo-c">
          <circle cx="128" cy="100" r="3.6" fill="#CBB27A" />
        </g>
        <g className="lo-orb lo-d">
          <circle cx="100" cy="172" r="2.6" fill="#9FC3E8" />
        </g>
        <g className="lo-orb lo-e">
          <circle cx="30" cy="100" r="2.2" fill="#F3DFA6" />
        </g>
      </svg>
    </div>
  );
}
