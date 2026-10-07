// 4원소 막대 — docs/spec/02_디자인가이드.md 8장.
// 색만으로 구분하지 않도록 원소 이름·점수를 글자로 함께 쓰고, 가장 강한 원소는 금색 점 + 글자로 표시한다.
import type { Element } from "@/lib/astro/constants";

const ORDER: readonly Element[] = ["불", "흙", "공기", "물"];

// navy 계열 명도 차(크림을 섞는 비율). 원소마다 다른 밝기 — 정보는 글자가 전달하고 색은 보조.
const MIX: Record<Element, number> = { 불: 62, 흙: 46, 공기: 32, 물: 20 };

export interface ElementBarsProps {
  elements: Record<Element, number>;
  className?: string;
}

/** 가장 강한 원소. 동점이면 여러 개를 돌려준다(점은 단독 1위일 때만 찍는다). */
export function strongestElements(elements: Record<Element, number>): Element[] {
  const max = Math.max(...ORDER.map((e) => elements[e] ?? 0));
  if (!(max > 0)) return [];
  return ORDER.filter((e) => (elements[e] ?? 0) === max);
}

export default function ElementBars({ elements, className }: ElementBarsProps) {
  const max = Math.max(...ORDER.map((e) => elements[e] ?? 0), 0);
  const top = strongestElements(elements);
  const marked = top.length === 1 ? top[0] : null;

  return (
    <div className={className}>
      <ul className="flex flex-col gap-2.5" aria-label="4원소 점수">
        {ORDER.map((el) => {
          const score = elements[el] ?? 0;
          const pct = max > 0 ? (score / max) * 100 : 0;
          return (
            <li key={el} className="flex items-center gap-3 text-sm text-cream">
              <span className="w-8 shrink-0">{el}</span>
              <span
                className="relative h-3 flex-1 overflow-hidden rounded-full border border-cream/20 bg-cream/5"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `color-mix(in oklab, var(--astro-navy), var(--astro-cream) ${MIX[el]}%)`,
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums">{score}점</span>
              <span className="flex w-3 shrink-0 justify-center">
                {marked === el ? (
                  <>
                    <span className="block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                    <span className="sr-only">가장 강한 원소</span>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {top.length > 0 && (
        <p className="mt-2 text-xs text-cream/75">
          가장 강한 원소: {top.join("·")}
          {top.length > 1 ? " (같은 점수)" : ""}
        </p>
      )}
    </div>
  );
}
