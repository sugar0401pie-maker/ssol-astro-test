"use client";

// 출생차트 휠 — docs/spec/02_디자인가이드.md 4장. 배치 계산은 lib/astro/wheelLayout.ts(테스트 있음),
// 여기서는 그리기와 탭 처리만 한다. 해석 문장은 부모가 DB에서 가져와 보여준다(onSelect).
// 움직임(애니메이션)은 넣지 않는다 — '동작 줄이기' 설정과 충돌할 일이 없게.
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { PointKey } from "@/lib/astro/constants";
import type { NatalChart } from "@/lib/astro/natal";
import {
  WHEEL_SIGNS, layoutPlanets, lonToAngle, normDeg, pickAspectLines, polar, rotationLonFor, showsHouses,
} from "@/lib/astro/wheelLayout";
import { PLANET_GLYPHS, PLANET_ORDER, POINT_NAMES, SIGN_GLYPHS, type WheelSelection } from "./labels";

export type { WheelSelection } from "./labels";

export interface BirthChartWheelProps {
  chart: NatalChart;
  /** 가운데 캐릭터 얼굴 이미지 주소(원형으로 잘라 44px). 없으면 작은 빈 원. */
  characterFace?: string;
  /** 캐릭터 이름(얼굴 이미지의 대체 글자). */
  characterName?: string;
  /** 행성·별자리 칸을 누르면 호출. 해석 시트는 부모가 띄운다. */
  onSelect?: (sel: WheelSelection) => void;
  /** 지금 선택된 항목(테두리로 표시). */
  selected?: WheelSelection | null;
  /** C등급일 때 "시간 추가" 버튼을 보여 줄지 — 주면 버튼이 생긴다. */
  onAddTime?: () => void;
  className?: string;
}

// 좌표는 360×360 viewBox 기준(최대 지름 360px일 때 1단위 = 1px).
const SIZE = 360;
const C = SIZE / 2;
const R_OUT = 178;
const R_ZODIAC_IN = R_OUT - 28; // ① 별자리 고리 폭 28px
const R_HOUSE_IN = 130; // ② 하우스 고리 안쪽
const R_HOUSE_TEXT = (R_ZODIAC_IN + R_HOUSE_IN) / 2;
const R_PLANET = 92; // ④ 행성 기본 줄
const R_PLANET_OUTER = R_PLANET + 22; // 겹칠 때 바깥으로 민 줄
const R_INNER = 70; // ⑤ 각도 선이 닿는 안쪽 원
const FACE_R = 22; // ⑥ 가운데 44px
const TICK_LEN = 5;
// 26px 원이 R_PLANET에서 차지하는 각도를 기준으로 정했다: 번갈아 놓인 이웃(9° + 22px)과
// 같은 줄 이웃(17°)이 모두 26px 이상 떨어진다. rowSep ≤ 2 × minSep이어야 번갈아 놓기가 성립한다.
const LAYOUT = { minSepDeg: 9, rowSepDeg: 17 };

const GOLD = "var(--astro-gold)";
const CREAM = "var(--astro-cream)";
const NAVY = "var(--astro-navy)";
const MIDNIGHT = "var(--astro-midnight)";

const fmt = (n: number) => n.toFixed(2);

function sectorPath(a1: number, a2: number, rIn: number, rOut: number): string {
  const p1 = polar(C, C, rOut, a1);
  const p2 = polar(C, C, rOut, a2);
  const p3 = polar(C, C, rIn, a2);
  const p4 = polar(C, C, rIn, a1);
  // 화면 각도가 커지는 방향 = 반시계 → SVG에서는 sweep-flag 0.
  return [
    `M${fmt(p1.x)} ${fmt(p1.y)}`,
    `A${rOut} ${rOut} 0 0 0 ${fmt(p2.x)} ${fmt(p2.y)}`,
    `L${fmt(p3.x)} ${fmt(p3.y)}`,
    `A${rIn} ${rIn} 0 0 1 ${fmt(p4.x)} ${fmt(p4.y)}`,
    "Z",
  ].join(" ");
}

function activateOnKey(e: KeyboardEvent, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
}

const isSame = (a: WheelSelection | null | undefined, b: WheelSelection) =>
  a != null && a.kind === b.kind && a.key === b.key;

export default function BirthChartWheel({
  chart, characterFace, characterName, onSelect, selected, onAddTime, className,
}: BirthChartWheelProps) {
  const [showAllLines, setShowAllLines] = useState(false);
  const clipId = useId();
  const houses = showsHouses(chart);
  const rot = rotationLonFor(chart);
  const angle = (lon: number) => lonToAngle(lon, rot);
  const sunSign = chart.planets.sun ? Math.floor(normDeg(chart.planets.sun.lon) / 30) : -1;
  const ascSign = houses ? Math.floor(normDeg(chart.planets.asc!.lon) / 30) : -1;
  const tickOuter = houses ? R_HOUSE_IN : R_ZODIAC_IN;
  // C등급은 하우스 고리가 없으니 행성 줄을 바깥으로 옮겨 눈금까지의 선을 짧게 한다.
  const planetShift = houses ? 0 : R_ZODIAC_IN - R_HOUSE_IN;

  const placed = useMemo(() => {
    const pts = PLANET_ORDER.flatMap((key) => {
      const p = chart.planets[key];
      return p ? [{ key, lon: p.lon }] : [];
    });
    return layoutPlanets(pts, LAYOUT);
  }, [chart]);

  const lines = useMemo(() => pickAspectLines(chart.aspects, showAllLines), [chart, showAllLines]);
  const totalLines = useMemo(() => pickAspectLines(chart.aspects, true).length, [chart]);

  const select = (sel: WheelSelection) => onSelect?.(sel);
  const interactive = onSelect != null;

  const tableRows: PointKey[] = [...PLANET_ORDER, ...(houses ? (["asc", "mc"] as PointKey[]) : [])];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block h-auto w-[calc(100%-32px)] max-w-[360px] select-none"
        role="group"
        aria-label="출생차트 휠. 같은 정보는 아래 표에서 글로 볼 수 있어요."
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={C} cy={C} r={FACE_R} />
          </clipPath>
        </defs>

        {/* ① 별자리 고리 */}
        <g>
          {WHEEL_SIGNS.map((name, i) => {
            const a1 = angle(i * 30);
            const a2 = a1 + 30;
            const mid = polar(C, C, (R_OUT + R_ZODIAC_IN) / 2, a1 + 15);
            const sel: WheelSelection = { kind: "sign", key: name };
            const isSun = i === sunSign;
            const isSel = isSame(selected, sel);
            return (
              <g
                key={name}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={`${name}${isSun ? ", 내 태양 별자리" : ""}`}
                onClick={interactive ? () => select(sel) : undefined}
                onKeyDown={interactive ? (e) => activateOnKey(e, () => select(sel)) : undefined}
                className={interactive ? "cursor-pointer" : undefined}
              >
                <path
                  d={sectorPath(a1, a2, R_ZODIAC_IN, R_OUT)}
                  fill={GOLD}
                  fillOpacity={isSun ? 0.12 : 0}
                  stroke={GOLD}
                  strokeWidth={isSel ? 1.5 : 0.75}
                />
                <text
                  x={mid.x}
                  y={mid.y}
                  fill={CREAM}
                  fontSize={14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {SIGN_GLYPHS[i]}
                </text>
              </g>
            );
          })}
        </g>

        {/* ② 하우스 고리(홀사인이라 경계는 ①과 같다) — C등급은 숨김 */}
        {houses && (
          <g aria-hidden="true">
            <circle cx={C} cy={C} r={R_HOUSE_IN} fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={0.75} />
            {WHEEL_SIGNS.map((_, i) => {
              const a = angle(i * 30);
              const p1 = polar(C, C, R_ZODIAC_IN, a);
              const p2 = polar(C, C, R_HOUSE_IN, a);
              return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={GOLD} strokeOpacity={0.35} strokeWidth={0.5} />;
            })}
            {Array.from({ length: 12 }, (_, h) => {
              const signIdx = (ascSign + h) % 12;
              const p = polar(C, C, R_HOUSE_TEXT, angle(signIdx * 30 + 15));
              return (
                <text
                  key={h}
                  x={p.x}
                  y={p.y}
                  fill={CREAM}
                  fillOpacity={0.6}
                  fontSize={9}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {h + 1}
                </text>
              );
            })}
          </g>
        )}

        {/* 각도 선이 닿는 안쪽 원 */}
        <circle cx={C} cy={C} r={R_INNER} fill="none" stroke={GOLD} strokeOpacity={0.3} strokeWidth={0.5} aria-hidden="true" />

        {/* ⑤ 각도 선: 조화 = 금색 실선, 긴장 = 크림 점선(색만으로 구분하지 않게 선 모양도 다르다) */}
        <g>
          {lines.map((l) => {
            const pa = chart.planets[l.a];
            const pb = chart.planets[l.b];
            if (!pa || !pb) return null;
            const p1 = polar(C, C, R_INNER, angle(pa.lon));
            const p2 = polar(C, C, R_INNER, angle(pb.lon));
            const harmony = l.tone === "harmony";
            return (
              <line
                key={`${l.a}-${l.b}-${l.aspect}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={harmony ? GOLD : CREAM}
                strokeOpacity={harmony ? 0.9 : 0.75}
                strokeWidth={harmony ? 1 : 0.9}
                strokeDasharray={harmony ? undefined : "3 3"}
              >
                <title>{`${POINT_NAMES[l.a]}–${POINT_NAMES[l.b]} ${l.aspect}`}</title>
              </line>
            );
          })}
        </g>

        {/* ③ ASC·MC 축 — C등급은 숨김 */}
        {houses && chart.planets.asc && (
          <g aria-hidden="true">
            {(() => {
              const a = angle(chart.planets.asc.lon);
              const out = polar(C, C, R_ZODIAC_IN, a);
              const inn = polar(C, C, R_INNER, a);
              const dOut = polar(C, C, R_ZODIAC_IN, a + 180);
              const dIn = polar(C, C, R_INNER, a + 180);
              const label = polar(C, C, R_INNER - 14, a);
              return (
                <>
                  <line x1={inn.x} y1={inn.y} x2={out.x} y2={out.y} stroke={GOLD} strokeWidth={2.25} />
                  <line x1={dIn.x} y1={dIn.y} x2={dOut.x} y2={dOut.y} stroke={GOLD} strokeOpacity={0.5} strokeWidth={0.75} />
                  <text x={label.x} y={label.y - 6} fill={GOLD} fontSize={8} fontWeight={700} textAnchor="middle">
                    ASC
                  </text>
                </>
              );
            })()}
            {chart.planets.mc &&
              (() => {
                const a = angle(chart.planets.mc.lon);
                const out = polar(C, C, R_ZODIAC_IN, a);
                const inn = polar(C, C, R_INNER, a);
                const icOut = polar(C, C, R_ZODIAC_IN, a + 180);
                const icIn = polar(C, C, R_INNER, a + 180);
                const label = polar(C, C, R_INNER - 12, a);
                return (
                  <>
                    <line x1={inn.x} y1={inn.y} x2={out.x} y2={out.y} stroke={GOLD} strokeWidth={1.25} />
                    <line x1={icIn.x} y1={icIn.y} x2={icOut.x} y2={icOut.y} stroke={GOLD} strokeOpacity={0.4} strokeWidth={0.5} />
                    <text
                      x={label.x}
                      y={label.y}
                      fill={GOLD}
                      fontSize={8}
                      fontWeight={700}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      MC
                    </text>
                  </>
                );
              })()}
          </g>
        )}

        {/* ④ 행성: 실제 위치에 짧은 눈금, 옮겨진 행성은 눈금에서 원까지 가는 선 */}
        <g>
          {placed.map((p) => {
            const trueA = angle(p.lon);
            const shownA = angle(p.displayLon);
            const r = (p.level === 1 ? R_PLANET_OUTER : R_PLANET) + planetShift;
            const big = p.key === "sun" || p.key === "moon";
            const radius = big ? 13 : 11;
            const center = polar(C, C, r, shownA);
            const t1 = polar(C, C, tickOuter, trueA);
            const t2 = polar(C, C, tickOuter - TICK_LEN, trueA);
            const sel: WheelSelection = { kind: "planet", key: p.key };
            const isSel = isSame(selected, sel);
            const placedPoint = chart.planets[p.key];
            const where = placedPoint
              ? `${placedPoint.sign}${placedPoint.house ? ` ${placedPoint.house}하우스` : ""}`
              : "";
            return (
              <g key={p.key}>
                <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={CREAM} strokeWidth={1} aria-hidden="true" />
                {p.displaced && (
                  <line
                    x1={t2.x}
                    y1={t2.y}
                    x2={center.x}
                    y2={center.y}
                    stroke={CREAM}
                    strokeOpacity={0.5}
                    strokeWidth={0.5}
                    aria-hidden="true"
                  />
                )}
                <g
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={`${POINT_NAMES[p.key]}, ${where}`}
                  onClick={interactive ? () => select(sel) : undefined}
                  onKeyDown={interactive ? (e) => activateOnKey(e, () => select(sel)) : undefined}
                  className={interactive ? "cursor-pointer" : undefined}
                >
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={radius}
                    fill={MIDNIGHT}
                    stroke={GOLD}
                    strokeWidth={isSel ? 1.75 : 0.75}
                  />
                  <text
                    x={center.x}
                    y={center.y}
                    fill={CREAM}
                    fontSize={big ? 15 : 13}
                    textAnchor="middle"
                    dominantBaseline="central"
                    aria-hidden="true"
                  >
                    {PLANET_GLYPHS[p.key]}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ⑥ 가운데 캐릭터 얼굴 */}
        {characterFace ? (
          <g>
            <image
              href={characterFace}
              x={C - FACE_R}
              y={C - FACE_R}
              width={FACE_R * 2}
              height={FACE_R * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            >
              {characterName && <title>{characterName}</title>}
            </image>
            <circle cx={C} cy={C} r={FACE_R} fill="none" stroke={NAVY} strokeWidth={2.5} />
          </g>
        ) : (
          <circle cx={C} cy={C} r={10} fill={NAVY} stroke={GOLD} strokeOpacity={0.6} strokeWidth={0.75} aria-hidden="true" />
        )}
      </svg>

      {totalLines > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-cream/80">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="20" y2="3" stroke={GOLD} strokeWidth="1.5" />
            </svg>
            잘 어울리는 각도
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="20" y2="3" stroke={CREAM} strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            긴장이 있는 각도
          </span>
          {totalLines > lines.length || showAllLines ? (
            <button
              type="button"
              onClick={() => setShowAllLines((v) => !v)}
              aria-pressed={showAllLines}
              className="rounded-full border border-cream/70 px-3 py-1 text-cream"
            >
              {showAllLines ? "주요 선만 보기" : "모든 선 보기"}
            </button>
          ) : null}
        </div>
      )}

      {chart.accuracy === "C" && (
        <div className="mt-3 flex flex-col items-center gap-2 px-4 text-center text-sm text-cream/85">
          <p>태어난 시간을 알면 더 정확해져요</p>
          {onAddTime && (
            <button
              type="button"
              onClick={onAddTime}
              className="rounded-full border border-cream/70 px-4 py-1.5 text-cream"
            >
              태어난 시간 추가하기
            </button>
          )}
        </div>
      )}

      <details className="mx-4 mt-4 rounded-xl border border-cream/25 px-4 py-2 text-sm text-cream">
        <summary className="cursor-pointer py-1">표로 보기</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">출생차트의 행성별 별자리와 하우스</caption>
          <thead>
            <tr className="text-cream/70">
              <th scope="col" className="py-1 font-medium">행성</th>
              <th scope="col" className="py-1 font-medium">별자리</th>
              <th scope="col" className="py-1 font-medium">하우스</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((key) => {
              const p = chart.planets[key];
              if (!p) return null;
              return (
                <tr key={key} className="border-t border-cream/10">
                  <th scope="row" className="py-1 font-normal">{POINT_NAMES[key]}</th>
                  <td className="py-1">
                    {p.sign} {Math.floor(p.deg)}°
                  </td>
                  <td className="py-1">{houses && p.house ? `${p.house}하우스` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!houses && <p className="mt-2 text-xs text-cream/70">출생시간을 모르면 하우스와 상승궁은 계산하지 않아요.</p>}
      </details>
    </div>
  );
}
