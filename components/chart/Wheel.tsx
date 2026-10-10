"use client";

// 출생차트 휠 — 2026-10-09 프로토타입 wheelSVG()를 그대로 옮긴 것(owner 2026-10-10 "html과 완전히 동일하게").
// 360×360, 바깥 별자리 고리(R0 176 / R1 148), 하우스 번호(R2 128, 시간 앎), 행성 줄(RP 106), 각도 선 원(RA 84).
// 상승궁이 왼쪽(시간 모름이면 양자리 0°가 왼쪽). 각도 선은 합을 뺀 행성끼리 점수순 — 앞 8개만 처음에 보이고 '모든 선 보기'로 전부.
// 계산은 서버가 하고 여기서는 받은 경도만 그린다(계산 엔진은 브라우저 번들에 들어가지 않는다).
import type { KeyboardEvent } from "react";
import type { PointKey } from "@/lib/astro/constants";
import type { NatalChart } from "@/lib/astro/natal";
import type { WheelAspect } from "@/lib/report/freeResult";
import { PLANET_GLYPHS, PLANET_ORDER, POINT_NAMES, SIGN_GLYPHS } from "./labels";

const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const f = (n: number) => n.toFixed(2);

export default function Wheel({
  chart,
  aspects,
  retro,
  showAll,
  tipStep,
  onSelect,
}: {
  chart: NatalChart;
  aspects: WheelAspect[];
  retro: PointKey[];
  showAll: boolean;
  /** 휠 읽는 법 안내 단계(1 = 별자리 칸, 2 = 행성, 3 = 선을 강조) */
  tipStep: number;
  /** "sign:3" | "asp:0" | "asc" | "mc" | 행성 키 */
  onSelect: (key: string) => void;
}) {
  const P = chart.planets;
  const withTime = !!P.asc;
  const lonOf = (k: PointKey) => P[k]!.lon;
  const c = 180, R0 = 176, R1 = 148, R2 = 128, RP = 106, RA = 84;
  const rot = withTime ? lonOf("asc") : 0;
  const pt = (lon: number, r: number): [number, number] => {
    const t = ((180 + lon - rot) * Math.PI) / 180;
    return [c + r * Math.cos(t), c - r * Math.sin(t)];
  };
  const signIdx = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);
  const sunS = signIdx(lonOf("sun"));
  const hb = withTime ? signIdx(lonOf("asc")) : 0;
  const key = (e: KeyboardEvent, k: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(k);
    }
  };
  const hit = (k: string, label: string) => ({ role: "button", tabIndex: 0, "aria-label": label, onClick: () => onSelect(k), onKeyDown: (e: KeyboardEvent) => key(e, k) });

  // 행성 배치(겹침 해소 — 프로토타입 minSep 13.5°)
  const arr = PLANET_ORDER.filter((k) => P[k]).map((k) => ({ k, real: lonOf(k), d: lonOf(k) })).sort((x, y) => x.real - y.real);
  const minSep = 13.5;
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i], q = arr[(i + 1) % arr.length];
      const diff = (((q.d - p.d) % 360) + 360) % 360;
      if (diff < minSep) {
        const push = (minSep - diff) / 2;
        p.d -= push;
        q.d += push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return (
    <svg viewBox="0 0 360 360" className={`wheel${tipStep ? ` tip-${tipStep}` : ""}`} id="wheel" role="group" aria-label="출생차트 휠. 바깥 고리는 별자리, 동그라미는 행성이에요.">
      <circle cx="180" cy="180" r="176" fill="rgba(11,30,63,.55)" stroke="#CBB27A" strokeWidth=".75" />
      {SIGN_NAMES.map((sign, i) => {
        const a0 = pt(i * 30, R0), a1 = pt(i * 30 + 30, R0), b1 = pt(i * 30 + 30, R1), b0 = pt(i * 30, R1);
        const l0 = pt(i * 30, withTime ? R2 : R1), l1 = pt(i * 30, R0);
        const g = pt(i * 30 + 15, 162);
        const hn = ((((i - hb) % 12) + 12) % 12) + 1;
        const hp = pt(i * 30 + 15, 138);
        return (
          <g key={sign}>
            <path
              className="sector hit"
              {...hit(`sign:${i}`, sign + (withTime ? `, ${hn}하우스` : ""))}
              fill={i === sunS ? "rgba(203,178,122,.14)" : "rgba(0,0,0,0)"}
              d={`M${f(a0[0])} ${f(a0[1])} A${R0} ${R0} 0 0 0 ${f(a1[0])} ${f(a1[1])} L${f(b1[0])} ${f(b1[1])} A${R1} ${R1} 0 0 1 ${f(b0[0])} ${f(b0[1])} Z`}
            />
            <line x1={f(l0[0])} y1={f(l0[1])} x2={f(l1[0])} y2={f(l1[1])} stroke="#CBB27A" strokeWidth=".75" strokeOpacity={withTime ? ".8" : "1"} pointerEvents="none" />
            <text className="sym" x={f(g[0])} y={f(g[1])} textAnchor="middle" dominantBaseline="central" fontSize="15" fill="#FDF6E9" pointerEvents="none">
              {SIGN_GLYPHS[i]}
            </text>
            {withTime && (
              <text x={f(hp[0])} y={f(hp[1])} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="rgba(253,246,233,.6)" pointerEvents="none">
                {hn}
              </text>
            )}
          </g>
        );
      })}
      <circle cx="180" cy="180" r={R1} fill="none" stroke="#CBB27A" strokeWidth=".75" pointerEvents="none" />
      {withTime && <circle cx="180" cy="180" r={R2} fill="none" stroke="#CBB27A" strokeWidth=".5" strokeOpacity=".6" pointerEvents="none" />}
      <circle cx="180" cy="180" r={RA} fill="none" stroke="rgba(253,246,233,.14)" strokeWidth=".75" pointerEvents="none" />
      {aspects.map((a, idx) => {
        const p1 = pt(lonOf(a.a), RA), p2 = pt(lonOf(a.b), RA);
        const extra = idx >= 8;
        const co = { x1: f(p1[0]), y1: f(p1[1]), x2: f(p2[0]), y2: f(p2[1]) };
        return (
          <g key={idx} className={`asp hit${extra ? " extra" : ""}`} style={extra && !showAll ? { display: "none" } : undefined} {...hit(`asp:${idx}`, `${POINT_NAMES[a.a]}와 ${POINT_NAMES[a.b]} ${a.aspect} 선`)}>
            <line
              className="vis"
              {...co}
              stroke={a.harm ? "#CBB27A" : "#FDF6E9"}
              strokeWidth={a.harm ? 1.3 : 1}
              strokeDasharray={a.harm ? undefined : "4 3"}
              strokeOpacity={a.harm ? undefined : ".85"}
              pointerEvents="none"
            />
            <line className="hitl" {...co} stroke="rgba(0,0,0,0)" strokeWidth="14" pointerEvents="stroke" />
          </g>
        );
      })}
      {withTime &&
        (() => {
          const asc = lonOf("asc"), mc = lonOf("mc");
          const as0 = pt(asc, R1), as1 = pt(asc, RA), ds0 = pt(asc + 180, R1), ds1 = pt(asc + 180, RA);
          const al = pt(asc - 6, RA + 10);
          const m0 = pt(mc, R2 - 6), m1 = pt(mc, R1), ml = pt(mc, RA + 10);
          return (
            <>
              <line x1={f(as0[0])} y1={f(as0[1])} x2={f(as1[0])} y2={f(as1[1])} stroke="#CBB27A" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
              <line x1={f(ds0[0])} y1={f(ds0[1])} x2={f(ds1[0])} y2={f(ds1[1])} stroke="#CBB27A" strokeWidth="1" strokeOpacity=".6" pointerEvents="none" />
              <g className="hit" {...hit("asc", `상승궁 ${P.asc!.sign} ${P.asc!.deg.toFixed(1)}도`)}>
                <rect x={f(al[0] - 4)} y={f(al[1] - 9)} width="30" height="17" rx="4" fill="rgba(11,30,63,.85)" className="ring-focus" stroke="none" />
                <text x={f(al[0])} y={f(al[1])} dominantBaseline="central" fontSize="9.5" fontWeight="700" fill="#CBB27A">
                  ASC
                </text>
              </g>
              <line x1={f(m0[0])} y1={f(m0[1])} x2={f(m1[0])} y2={f(m1[1])} stroke="#CBB27A" strokeWidth="2.2" pointerEvents="none" />
              <g className="hit" {...hit("mc", `천정 ${P.mc!.sign}`)}>
                <rect x={f(ml[0] - 12)} y={f(ml[1] - 8)} width="24" height="16" rx="4" fill="rgba(11,30,63,.85)" className="ring-focus" />
                <text x={f(ml[0])} y={f(ml[1])} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="#CBB27A">
                  MC
                </text>
              </g>
            </>
          );
        })()}
      {arr.map((o) => {
        const k = o.k, big = k === "sun" || k === "moon", r = big ? 13 : 11;
        const base = withTime ? R2 : R1;
        const tk0 = pt(o.real, base), tk1 = pt(o.real, base - 6);
        const cp = pt(o.d, RP);
        const cc = pt(o.d, RP + r);
        const pp = P[k]!;
        return (
          <g key={k}>
            <line x1={f(tk0[0])} y1={f(tk0[1])} x2={f(tk1[0])} y2={f(tk1[1])} stroke="#FDF6E9" strokeWidth="1.2" pointerEvents="none" />
            {Math.abs(o.d - o.real) > 0.8 && <line x1={f(tk1[0])} y1={f(tk1[1])} x2={f(cc[0])} y2={f(cc[1])} stroke="rgba(253,246,233,.5)" strokeWidth=".8" pointerEvents="none" />}
            <g className="pl hit" {...hit(k, `${POINT_NAMES[k]}, ${pp.sign} ${pp.deg.toFixed(1)}도${withTime ? `, ${pp.house}하우스` : ""}${retro.includes(k) ? ", 역행" : ""}`)}>
              <circle className="body ring-focus" cx={f(cp[0])} cy={f(cp[1])} r={r} fill="#013566" stroke="#CBB27A" strokeWidth="1" />
              <text className="sym" x={f(cp[0])} y={f(cp[1] + 0.5)} textAnchor="middle" dominantBaseline="central" fontSize={big ? 15 : 13} fill="#FDF6E9">
                {PLANET_GLYPHS[k]}
              </text>
            </g>
          </g>
        );
      })}
      <circle cx="180" cy="180" r="22" fill="#013566" stroke="#CBB27A" strokeWidth="1.2" />
      <text className="sym" x="180" y="181" textAnchor="middle" dominantBaseline="central" fontSize="22" fill="#FDF6E9" aria-hidden="true">
        {SIGN_GLYPHS[sunS]}
      </text>
    </svg>
  );
}
