"use client";

// 5년 타임라인 — 2026-10-09 프로토타입 timelineSVG() 그대로: 세로 지그재그 별 5개(크림 상자 안).
// 별 크기·진하기 = 이루어짐(순풍 > 보통 > 역풍), 처음 열리는 해 = 펄골드, 움직이는 해 = 반짝이는 고리(.ring-move, 동작 줄이기면 점선),
// 오른쪽 글자: 연도(+ ✦) · 판정 이름 · 한 해의 테마 · (처음 열리는 해 / 경계 표시).
import type { TimelineStar } from "@/lib/report/paidSkeleton";

function star(cx: number, cy: number, r: number, fill: string, stroke: string) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />;
}

export default function FiveYearStars({ stars }: { stars: TimelineStar[] }) {
  const H = 88, top = 26;
  const pts = stars.map((_, i) => [i % 2 ? 46 : 30, top + i * H] as const);
  return (
    <>
      <div className="timeline" id="timeline" style={{ marginTop: 16 }}>
        <svg viewBox={`0 0 320 ${top * 2 + H * (stars.length - 1)}`} role="img" aria-label="앞으로 5년 별 타임라인">
          <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#013566" strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="2 3" />
          {stars.map((s, i) => {
            const [x, y] = pts[i];
            const r = s.level === "순풍" ? 13 : s.level === "보통" ? 9.5 : 6.5;
            const op = s.level === "순풍" ? 1 : s.level === "보통" ? 0.7 : 0.45;
            const tx = 78, ty = y - 14;
            const extra = s.firstOpen ? "바라는 것이 처음 열리는 해" : s.edgeBadge ?? "";
            return (
              <g key={s.year}>
                {s.movement === "움직이는 해" && <circle className="ring-move" cx={x} cy={y} r={r + 6} fill="none" stroke="#CBB27A" strokeWidth="1.4" />}
                {star(x, y, r, s.firstOpen ? "#CBB27A" : `rgba(1,53,102,${op})`, s.firstOpen ? "#9E8550" : "#013566")}
                <text x={tx} y={ty} fontSize="13" fontWeight="700" fill="#013566">
                  {s.year}
                  {s.movement === "움직이는 해" ? " ✦" : ""}
                </text>
                <text x={tx} y={ty + 17} fontSize="12.5" fill="#0B2A4F">
                  {s.display}
                </text>
                <text x={tx} y={ty + 33} fontSize="11.5" fill="rgba(1,53,102,.72)">
                  {s.theme}
                </text>
                {extra && (
                  <text x={tx} y={ty + 49} fontSize="11" fontWeight="700" fill="#8A6F35">
                    {extra}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="legend">✦ 고리 = 삶이 크게 움직이는 해. 좋고 나쁨이 아니라 바뀌는 정도를 뜻해요.</p>
    </>
  );
}
