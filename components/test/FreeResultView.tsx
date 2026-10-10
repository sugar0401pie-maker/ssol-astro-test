"use client";

// 결과 화면 — 2026-10-09 프로토타입 renderResult() 마크업·문구 그대로(owner 2026-10-10 "html과 완전히 동일하게").
// 머리 → 1. 태어난 순간의 하늘(정확도·시간 추가·휠·표·4원소·나의 행성 읽기) → 2. 별이 본 나의 유형(동점이면 고르기) →
// 3. 2026 회고 → [SNS 공유하기][저장하기] → 4~7(잠김: 요약 + 앞부분만, 결제 후 전체) → 부드러운 톤 카드 → 공유·저장 → 고지.
// 1~3번 문장은 서버가 해석 DB에서 골라 보낸다(AI 0회). 4~7번 본문은 결제 전에는 브라우저로 보내지 않는다.
import GuideArt, { LOCKED_ART } from "./GuideArt";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPORT_PRICE } from "@/lib/billing/pricing";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import Wheel from "@/components/chart/Wheel";
import { PLANET_GLYPHS, POINT_NAMES } from "@/components/chart/labels";
import ActionRow from "@/components/share/ActionRow";
import BottomSheet from "@/components/ui/BottomSheet";
import Toast, { useToast } from "@/components/ui/Toast";
import { WhyList } from "@/components/results/PaidReportView";
import type { PointKey } from "@/lib/astro/constants";
import type { FreeResult, WheelSheet } from "@/lib/report/freeResult";

const SOWELLA_URL = "https://app.ssolwellnesshouse.com/chat";
const SESSION_URL = "https://app.ssolwellnesshouse.com/session-reserve";
const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const ELEM_ORDER = ["불", "흙", "공기", "물"] as const;
const ELEM_SHADE: Record<string, string> = { 불: "#013566", 흙: "#2B5486", 공기: "#5878A3", 물: "#8AA0C2" };
const TABLE_KEYS: PointKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

/** 섹션 틀(프로토타입 sec): '무료'/'유료' 표시는 하지 않는다(2026-10-09) */
export function Section({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rsec" id={`sec-${no}`} aria-labelledby={`sec-${no}-t`}>
      <h2 className="rsec-title" id={`sec-${no}-t`}>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** 굵은 한 줄 요약(.lead.summary, B11 SUM_*) */
export function Summary({ text }: { text: string | null | undefined }) {
  return text ? <p className="lead summary">{text}</p> : null;
}

function SheetBody({ sheet }: { sheet: WheelSheet }) {
  return (
    <>
      <h3 id="sheet-title">
        {sheet.glyph && <span className="sym">{sheet.glyph}︎ </span>}
        {sheet.title}
      </h3>
      {sheet.kicker && <p className="kicker">{sheet.kicker}</p>}
      {sheet.paras.map((p, i) => (
        <p key={i}>
          {p.b && <b>{p.b}</b>} {p.t}
        </p>
      ))}
      {sheet.muted && <p className="muted">{sheet.muted}</p>}
    </>
  );
}

// 휠 읽는 법(프로토타입 showTip): 아직 안 본 사람 모두에게, 이 탭에서 한 번(sessionStorage)
const TIPS_KEY = "sol_wheel_tips";
const TIP_STEP = ["", "바깥 고리 = 별자리", "동그라미 = 행성", "선 = 행성끼리의 관계"];
const TIP_TOP = ["", "-4px", "30%", "58%"];
function tipsSeen(): boolean {
  try {
    return sessionStorage.getItem(TIPS_KEY) === "1";
  } catch {
    return false;
  }
}

/** B11 PAY_POPUP "안내 · 덧붙임 · [버튼]" → 조각 */
function splitPayPopup(text: string): { message: string; sub: string; button: string } {
  const button = text.match(/\[([^\]]+)\]/)?.[1] ?? "";
  const parts = text.replace(/\s*·?\s*\[[^\]]+\]\s*$/, "").split(" · ").map((x) => x.trim()).filter(Boolean);
  return { message: parts[0] ?? "", sub: parts.slice(1).join(" · "), button };
}

export default function FreeResultView({
  result,
  nickname,
  firstTime,
  resultId,
  paidContent,
  onAddTime,
  paidPending,
  savePrefill,
  onResult,
}: {
  result: FreeResult;
  nickname: string;
  firstTime: boolean;
  /** 저장된 결과 id — 있으면 결제 버튼이 결제 화면으로 간다 */
  resultId?: string | null;
  /** 결제 후 유료 섹션(있으면 잠긴 미리보기 대신 보여 준다) */
  paidContent?: React.ReactNode;
  /** B·C등급 '태어난 시간 추가하기' */
  onAddTime?: () => void;
  /** 결제는 끝났고 리포트를 쓰는 중 — 잠긴 자리를 그대로 두고 안내만 바꾼다 */
  paidPending?: string;
  /** 저장하기 → 가입할 때 미리 채울 값 */
  savePrefill?: { birthDate?: string; nickname?: string };
  /** 2번 섹션에서 유형을 바꿨을 때 새 결과 */
  onResult?: (r: FreeResult) => void;
}) {
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [tip, setTip] = useState(() => (tipsSeen() ? 0 : 1));
  const [toast, setToast] = useToast();
  const [switching, setSwitching] = useState(false);
  // 결제 전: 유료 섹션의 요약 + 앞부분(서버가 DB 뼈대에서 일부만 보냄)
  const [preview, setPreview] = useState<Record<number, { first: string; parts: Array<{ head?: string; text?: string }>; filler?: string }>>({});
  const lockedRef = useRef<HTMLDivElement>(null);
  const [lockedVisible, setLockedVisible] = useState(false);
  const unpaid = !paidContent && !paidPending && !!resultId;
  // 로그인하지 않은(임시 계정) 사람에게만 결제 팝업 아래 B11 PAY_TEMP_NOTE
  const [loggedIn, setLoggedIn] = useState(true);
  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);
  const wantPreview = !paidContent && !!resultId;
  useEffect(() => {
    if (!wantPreview) return;
    let alive = true;
    void getRealSession()
      .then(async (session) => {
        const res = await fetch(`/api/results/${resultId}/preview`, { headers: apiHeaders(session) });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { sections: Array<{ no: number; first: string; parts?: Array<{ head?: string; text?: string }>; filler?: string }> };
        setPreview(Object.fromEntries(data.sections.map((x) => [x.no, { first: x.first, parts: x.parts ?? [], filler: x.filler }])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wantPreview, resultId]);
  useEffect(() => {
    // 결제 팝업은 잠긴 섹션이 화면에 있을 때만(프로토타입 watchLocked)
    const el = lockedRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLockedVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [unpaid]);

  const { chart, character, year2026 } = result;
  const P = chart.planets;
  const withTime = !!P.asc;
  const popup = splitPayPopup(result.payPopup ?? "");
  const share = { chart, sunSign: result.sunSign, sunSignIndex: result.sunSignIndex, typeLine: character.name ?? character.typeLine, competency: character.competency, style: character.style, nickname };

  const sheet: WheelSheet | null = !sheetKey
    ? null
    : sheetKey.startsWith("sign:")
      ? result.wheelSheets.signs[SIGN_NAMES[Number(sheetKey.slice(5))]] ?? null
      : sheetKey.startsWith("asp:")
        ? result.wheelSheets.lines[sheetKey.slice(4)] ?? null
        : result.wheelSheets.planets[sheetKey as PointKey] ?? null;

  function endTips() {
    setTip(0);
    try {
      sessionStorage.setItem(TIPS_KEY, "1");
    } catch {
      /* 저장소를 못 쓰면 다음에 다시 보여도 괜찮다 */
    }
  }

  async function chooseType(comp: string) {
    if (!resultId || switching) return;
    setSwitching(true);
    try {
      const session = await getRealSession();
      const res = await fetch(`/api/results/${resultId}`, { method: "PATCH", headers: apiHeaders(session, { "content-type": "application/json" }), body: JSON.stringify({ competencyPick: comp }) });
      const data = await res.json();
      if (!res.ok || !data.result) throw new Error(data.error ?? "바꾸지 못했어요.");
      const y = (document.getElementById("sec-2")?.getBoundingClientRect().top ?? 0) + window.scrollY;
      onResult?.(data.result);
      requestAnimationFrame(() => window.scrollTo(0, y - 10));
      setToast("고르신 유형으로 리포트를 다시 맞췄어요");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "바꾸지 못했어요.");
    } finally {
      setSwitching(false);
    }
  }

  const maxEl = Math.max(...ELEM_ORDER.map((e) => chart.elements[e]));
  void maxEl;

  return (
    <div className={unpaid ? "pb-24" : ""}>
      <header className="res-head">
        <p className="eyebrow">쏠 아스트로 하우스 · 별 리포트</p>
        <h1 className="big" id="res-title">
          {result.header.title}
        </h1>
        {result.header.line && <p className="small">{result.header.line}</p>}
      </header>

      {/* ===== 1. 태어난 순간의 하늘 ===== */}
      <Section no={1} title={`${nickname}님이 태어난 순간의 하늘`}>
        <div className="grade" id="grade-badge">
          <b aria-label={`정확도 ${result.accuracy}등급`}>{result.accuracy}</b>
          <div>
            <strong style={{ color: "var(--cream)" }}>정확도 {result.accuracy}등급</strong>
            <br />
            {result.gradeNote}
          </div>
        </div>
        {result.addTimeNote && (
          <div className="grade" style={{ alignItems: "center" }}>
            <div>{result.addTimeNote}</div>
            {onAddTime && (
              <button className="btn ghost small-btn" type="button" onClick={onAddTime}>
                태어난 시간 추가하기
              </button>
            )}
          </div>
        )}
        <GuideArt id="09-1" signIndex={result.sunSignIndex} />
        <div className="wheel-wrap" id="wheel-wrap">
          <Wheel chart={chart} aspects={result.wheelAspects} retro={result.retro} showAll={showAll} tipStep={tip} onSelect={setSheetKey} />
          {tip > 0 && result.wheelTips[tip - 1] && (
            <div className="tip" id="wheel-tip" role="dialog" aria-label={`휠 읽는 법 ${tip}/3`} style={{ top: TIP_TOP[tip] }}>
              <p className="tip-step">
                휠 읽는 법 {tip}/3 · {TIP_STEP[tip]}
              </p>
              <p>{result.wheelTips[tip - 1]}</p>
              <div className="tip-btns">
                <button className="btn ghost" type="button" onClick={endTips}>
                  닫기
                </button>
                <button className="btn" type="button" onClick={() => (tip < 3 ? setTip(tip + 1) : endTips())}>
                  {tip < 3 ? "다음" : "확인"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="wheel-tools">
          <span className="hint" style={{ margin: 0 }}>
            행성이나 별자리 칸을 눌러 보세요.
          </span>
          <button className="btn ghost small-btn" type="button" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "주요 선만 보기" : "모든 선 보기"}
          </button>
        </div>
        <details className="night-details" id="chart-table">
          <summary>표로 보기 (행성 / 별자리 / 하우스)</summary>
          <table className="tbl t3">
            <caption className="sr-only">출생차트 행성 위치</caption>
            <thead>
              <tr>
                <th scope="col">행성</th>
                <th scope="col">별자리</th>
                <th scope="col">하우스</th>
              </tr>
            </thead>
            <tbody>
              {[...TABLE_KEYS, ...(withTime ? (["asc", "mc"] as PointKey[]) : [])].map((k) => {
                const p = P[k];
                if (!p) return null;
                return (
                  <tr key={k}>
                    <td>
                      {POINT_NAMES[k]}
                      {k === "asc" ? " (ASC)" : k === "mc" ? " (MC)" : ""}
                    </td>
                    <td>
                      {p.sign} {p.deg.toFixed(1)}°{result.retro.includes(k) && <span className="sub">역행</span>}
                    </td>
                    <td>{withTime ? `${p.house}하우스` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {result.wheelAspects.length > 0 && (
            <table className="tbl t3" style={{ marginTop: 14 }}>
              <caption className="sr-only">행성 사이의 각도</caption>
              <thead>
                <tr>
                  <th scope="col">행성</th>
                  <th scope="col">각도</th>
                  <th scope="col">뜻</th>
                </tr>
              </thead>
              <tbody>
                {result.wheelAspects.map((a, i) => (
                  <tr key={i}>
                    <td>
                      {POINT_NAMES[a.a]}–{POINT_NAMES[a.b]}
                    </td>
                    <td>
                      {a.aspect} <span className="sub">오차 {a.orb.toFixed(1)}°</span>
                    </td>
                    <td>{a.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint" style={{ marginBottom: 12 }}>
            하우스는 홀사인 기준이에요. 출생 시각은 {result.utcLabel}로 계산했어요.
          </p>
        </details>

        <div className="box" id="elements">
          <h3>4원소의 균형</h3>
          {ELEM_ORDER.map((e) => {
            const v = chart.elements[e];
            const w = Math.round((v / 14) * 100);
            const strong = e === result.elements.strongest;
            return (
              <div key={e} className="elem-row">
                <span>{e}</span>
                <div className="elem-bar" role="img" aria-label={`${e} ${v}점${strong ? ", 가장 강함" : ""}`}>
                  <i style={{ width: `${w}%`, background: ELEM_SHADE[e] }} />
                  {strong && <span className="dot" style={{ left: `${w}%` }} />}
                </div>
                <span className="elem-n">{v}</span>
              </div>
            );
          })}
          <p className="hint" style={{ color: "var(--navy-70)" }}>
            태양·달 3점, 수성·금성·화성 2점, 목성·토성 1점
          </p>
          {result.elements.texts.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>

        <div className="box" id="planet-reading">
          <h3 className="sub-h" style={{ marginTop: 0 }}>
            {result.planetReading.head || "• 나의 행성 읽기"}
          </h3>
          {result.planetReading.planets.map((p) => (
            <div key={p.key} className="pcard">
              <p className="pc-h">
                <span className="pc-g sym" aria-hidden="true">
                  {PLANET_GLYPHS[p.key]}
                </span>
                {p.title}
              </p>
              {p.shortLine && (
                <p>
                  <b>{p.shortLine}</b> {p.text}
                </p>
              )}
              {p.houseLine && <p className="pc-house">{p.houseLine}</p>}
            </div>
          ))}
          {result.planetReading.aspects.length > 0 && (
            <>
              <h3 className="sub-h">{result.planetReading.aspectsHead || "• 행성끼리의 관계"}</h3>
              {result.planetReading.aspects.map((a) => (
                <div key={a.title + a.sub} className="pcard">
                  <p className="pc-h">
                    {a.title} <small className="muted">{a.sub}</small>
                  </p>
                  <p>
                    <b>{a.lineMeaning}</b> {a.text}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </Section>

      {/* ===== 2. 별이 본 나의 유형 ===== */}
      <Section no={2} title="별이 본 나의 유형">
        <div className="box">
          <Summary text={character.summary} />
          <GuideArt id="09-2" signIndex={result.sunSignIndex} />
          {result.tie && (
            <>
              <h3>요즘의 나와 더 가까운 건?</h3>
              <p className="muted" style={{ fontSize: ".9rem" }}>
                출생차트에서 두 유형이 거의 같은 무게로 나왔어요. 마음이 가는 쪽을 골라 주세요.
              </p>
              <div className="choice">
                {result.tie.options.map((o, i) => (
                  <button key={o.competency} type="button" id={`choice-${i}`} aria-pressed={o.selected} disabled={switching} onClick={() => !o.selected && void chooseType(o.competency)}>
                    <b>
                      {o.competency} × {o.style}
                    </b>
                    {o.card}
                  </button>
                ))}
              </div>
            </>
          )}
          <p style={{ marginTop: 14 }}>{character.why}</p>
          {character.sunMoonLine && <p>{character.sunMoonLine}</p>}
          {/* A6 역량·방식 쉬운 정의(owner 2026-10-10: 프로토타입에 없지만 유지) */}
          {character.competencyLine && <p>• 역량 — {character.competencyLine}</p>}
          {character.styleLine && <p>• 방식 — {character.styleLine}</p>}
          <table className="tbl">
            <caption className="sr-only">태양·달·상승궁 한 줄 해석</caption>
            <thead>
              <tr>
                <th scope="col">카드</th>
                <th scope="col">한 줄 해석</th>
              </tr>
            </thead>
            <tbody>
              {result.big3.map((b, i) => {
                const p = P[b.key]!;
                const sub = b.key === "asc" ? `${b.sign} ${p.deg.toFixed(1)}°` : `${b.sign}${withTime ? ` · ${p.house}하우스` : ""}`;
                return (
                  <tr key={b.key}>
                    <td>
                      {b.label}
                      <span className="sub">{sub}</span>
                      {firstTime && result.terms[i] && <span className="sub">{result.terms[i].line}</span>}
                    </td>
                    <td>{b.line}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ===== 3. 2026 회고 ===== */}
      <Section no={3} title={`2026년, ${nickname}님의 한 해는 이랬어요`}>
        <div className="box">
          <Summary text={year2026.summary} />
          <GuideArt id="09-3" signIndex={result.sunSignIndex} />
          {year2026.intro && <p>{year2026.intro}</p>}
          <p className="bul">• 올해의 전환점</p>
          {year2026.turningPoints.map((t) => (
            <p key={t}>{t}</p>
          ))}
          {/* 해석 DB v1.3 RULE_ORDER: 전환점 뒤에 단어 × 고민 영역(A12d) */}
          {year2026.areaLine && <p>{year2026.areaLine}</p>}
          <p className="bul">{year2026.quarterHead || "• 분기별로 돌아보면"}</p>
          {year2026.closing && <p>{year2026.closing}</p>}
          <table className="tbl" id="tbl-2026">
            <caption className="sr-only">2026년 분기별 회고</caption>
            <thead>
              <tr>
                <th scope="col">시기</th>
                <th scope="col">{nickname}님에게는</th>
              </tr>
            </thead>
            <tbody>
              {year2026.quarters.map((q) => (
                <tr key={q.label}>
                  <td>{q.label}</td>
                  <td>{q.cell}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <WhyList head="▸ 하늘에서 일어난 일" groups={year2026.quarters.map((q) => ({ label: q.label, items: q.reasons }))} />
        </div>
      </Section>

      {/* 무료 구간 끝: [SNS 공유하기] + [저장하기](마스터스펙 6-1 화면 9) */}
      <ActionRow share={share} copy={result.saveCopy} resultId={resultId ?? null} prefill={savePrefill} />

      {paidContent ?? (
        <div className="locked-zone" id="locked-zone" ref={lockedRef}>
          {result.paidSections.map((s) => {
            const pv = preview[s.no];
            return (
              <section key={s.no} className="rsec paid locked" id={`sec-${s.no}`} aria-labelledby={`sec-${s.no}-t`}>
                <h2 className="rsec-title" id={`sec-${s.no}-t`}>
                  <span>{s.title.replace("{닉네임}", nickname)}</span>
                </h2>
                <div className="box">
                  {/* 요약은 선명하게, 각 부분은 앞 2줄 정도만 보이고 흐려진다(프로토타입 .locked .lp) */}
                  {pv?.first && <p className="lead summary">{pv.first}</p>}
                  {LOCKED_ART[s.no] && <GuideArt id={LOCKED_ART[s.no]} signIndex={result.sunSignIndex} />}
                  <div className="locked-body" inert>
                    {(pv?.parts.length ? pv.parts : [{ text: "　" }, { text: "　" }]).map((x, i) =>
                      x.head ? (
                        <p key={i} className="bul">
                          {x.head}
                        </p>
                      ) : (
                        <p key={i} className={`lp${paidPending ? " animate-pulse motion-reduce:animate-none" : ""}`}>
                          {x.text}{" "}
                          {/* 흐려지는 자리: 실제 본문이 아니라 해석 DB B13 가짜 문장(결제 전에는 실제 유료 본문을 보내지 않는다) */}
                          {pv?.filler ? pv.filler.slice((i * 37) % Math.max(1, pv.filler.length - 80)) : "　".repeat(40)}
                        </p>
                      ),
                    )}
                    {/* 4번 섹션(유료 경계 통합): 앞 2줄 아래는 처음부터 흐린 가짜 문장(B13) — 실제 본문 아님 */}
                    {s.no === 4 &&
                      !!pv?.filler &&
                      [0, 1, 2].map((k) => {
                        const f = pv.filler ?? "";
                        return (
                          <p key={`f${k}`} className="lp full">
                            {f.slice((k * 53) % Math.max(1, f.length - 120))}
                          </p>
                        );
                      })}
                  </div>
                </div>
              </section>
            );
          })}
          {paidPending && (
            <p role="status" className="paybox" style={{ textAlign: "center" }}>
              {paidPending}
            </p>
          )}
          {!resultId && <p className="hint text-center">결과를 저장하면 전체 리포트를 볼 수 있어요.</p>}
        </div>
      )}

      {result.care && (
        // 2026 한 단어가 '그만하자·이별·고생'이면 함께 보여준다(진행은 막지 않음, 마스터스펙 4장)
        <div className="care">
          {result.care.note && <p>{result.care.note}</p>}
          <p>{result.care.card}</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn ghost small-btn" href={SOWELLA_URL}>
              쏘웰라와 이야기 나누기
            </a>
            {/* owner 2026-10-10: 프로토타입에 없지만 유지 */}
            <a className="btn ghost small-btn" href={SESSION_URL}>
              웰니스 상담 알아보기
            </a>
          </div>
        </div>
      )}

      {/* 리포트 끝(프로토타입 actRow('end') — 잠겨 있어도 보인다) */}
      <ActionRow share={share} copy={result.saveCopy} resultId={resultId ?? null} prefill={savePrefill} />

      <p className="disclaimer">{result.disclaimer}</p>
      {result.dbDraft && <p className="mt-2 text-[10px] text-cream/40">해석 {result.dbVersion} · 상담사 검수 전 초안</p>}
      {paidContent && (
        <p className="mt-4 text-center">
          <Link href="/results" className="linkish">
            내 결과 모아 보기
          </Link>
        </p>
      )}

      {unpaid && lockedVisible && (
        // 결제 팝업 하나(마스터스펙 6-1-1, 프로토타입 .pay-float): 잠긴 섹션이 보일 때만. 가짜 카운트다운·'지금만 할인' 없음.
        <div className="paybar pay-float" role="region" aria-label="결제 안내">
          <div className="pf-in">
            <div className="pf-txt">
              <p className="pp-t">{popup.message}</p>
              {popup.sub && <p className="pp-s">{popup.sub}</p>}
              {!loggedIn && result.tempPay?.note && <p className="pp-temp">{result.tempPay.note}</p>}
            </div>
            <Link href={`/checkout/${resultId}`} className="btn block">
              {popup.button || `${REPORT_PRICE.toLocaleString("ko-KR")}원 결제하기`}
            </Link>
          </div>
        </div>
      )}

      <BottomSheet open={!!sheet} onClose={() => setSheetKey(null)} labelledBy="sheet-title">
        {sheet && <SheetBody sheet={sheet} />}
      </BottomSheet>
      <Toast msg={toast} />
    </div>
  );
}
