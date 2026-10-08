"use client";

// 5년 타임라인(디자인가이드 7장, 바람 판정 v3): 2027→2031 별 다섯 개를 선으로 잇는다.
// 별 크기·밝기 = 이루어짐(활짝 열리는 해 큼 · 내 손에 달린 해 중간 · 기반을 다지는 해 작음 — 흐리게 지우지 않고 테두리 또렷이),
// 별 둘레 고리 = 움직임(움직이는 해만, 3~4초 주기로 반짝임 / '동작 줄이기'면 점선 고리),
// 바라는 것이 처음 열리는 해 = 별 안을 펄골드로 채움. 색만으로 구분하지 않도록 판정 이름(두 말)을 글자로 함께 단다.
import type { TimelineStar } from "@/lib/report/paidSkeleton";

const SIZE: Record<TimelineStar["level"], number> = { 순풍: 30, 보통: 22, 역풍: 15 };

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export default function FiveYearStars({ stars }: { stars: TimelineStar[] }) {
  if (!stars.length) return null;
  return (
    <figure className="rounded-2xl border border-gold/40 px-2 py-4" aria-label="앞으로 5년 타임라인">
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${stars.length}, minmax(0, 1fr))` }}>
        {/* 별자리 선 — 별 가운데 높이(36px)에 맞춘다 */}
        <div aria-hidden className="absolute left-[10%] right-[10%] top-[36px] h-px bg-gold/50" />
        {stars.map((s) => {
          const r = SIZE[s.level];
          return (
            <div key={s.year} className="relative flex flex-col items-center gap-1 px-0.5 text-center">
              <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
                {s.movement === "움직이는 해" && (
                  <circle cx="36" cy="36" r={r + 6} fill="none" stroke="var(--astro-gold)" strokeWidth="1.5" className="astro-ring" />
                )}
                <path
                  d={starPath(36, 36, r)}
                  fill={s.firstOpen ? "var(--astro-gold)" : s.level === "역풍" ? "var(--astro-midnight)" : "var(--astro-cream)"}
                  stroke="var(--astro-gold)"
                  strokeWidth={s.level === "역풍" ? 1.8 : 1.2}
                />
              </svg>
              <p className="text-sm font-bold text-cream">{s.year}년</p>
              <p className="text-[11px] leading-snug text-cream/90">{s.display}</p>
              {s.edgeBadge && <p className="text-[10px] leading-snug text-gold">{s.edgeBadge}</p>}
              {s.movement && <p className="text-[10px] leading-snug text-cream/70">{s.movement}</p>}
              {s.theme && <p className="text-[10px] leading-snug text-cream/70">{s.theme}</p>}
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 px-2 text-center text-[11px] leading-relaxed text-cream/70">
        별이 클수록 바라는 일이 열리기 쉬운 해예요. ✦ 고리 = 삶이 크게 움직이는 해(좋고 나쁨이 아니라 바뀌는 정도).
        {stars.some((s) => s.firstOpen) && " 안이 채워진 별 = 바라는 것이 처음 열리는 해."}
      </figcaption>
    </figure>
  );
}
