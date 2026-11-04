"use client";

// 유료 섹션(4~7) — 2026-10-09 프로토타입 sec(…, true)·renderEOY·render2027·render5y·renderQuestion 마크업 그대로.
// 굵은 한 줄 요약(.lead.summary) → 본문(AI 또는 DB 뼈대) → 서버가 붙이는 부분 → 표·타임라인 → 접힌 근거(details.why), 모두 크림 상자 안.
// 질문·실천은 DB 문장 그대로. ** 같은 강조 표기는 쓰지 않고, '유료' 표시도 하지 않는다(2026-10-09).
import type { PaidReport } from "@/lib/report/aiReport";
import type { Block, WhyGroup } from "@/lib/report/paidSkeleton";
import FiveYearStars from "./FiveYearStars";
import SowellaButton from "./SowellaButton";
import PageArt from "./PageArt";
import { SOWELLA_USE_URL } from "@/lib/results/consent";
import { KeyText } from "@/components/en/KeyParagraph";
import { isKeyParagraph } from "@/lib/en/emphasis";


export function BlockView({ b, emph = false }: { b: Block; emph?: boolean }) {
  switch (b.t) {
    case "head":
      return <p className="bul">{b.text}</p>;
    case "sub":
      return <p className="mo-h">{b.text}</p>;
    case "items":
      return (
        <ol className="items">
          {b.items.map((it) => (
            <li key={it.title}>
              <b>{it.title}</b>
              {it.text}
              {it.note && (
                <>
                  <br />
                  <small>{it.note}</small>
                </>
              )}
            </li>
          ))}
        </ol>
      );
    case "step":
      return (
        <p className="flow-p">
          <b>{b.label}</b> {b.text}
        </p>
      );
    case "note":
      return (
        <p className="muted" style={{ fontSize: ".9rem" }}>
          {b.text}
        </p>
      );
    default:
      return (
        <p className="whitespace-pre-line">
          <KeyText text={b.text} emph={emph} />
        </p>
      );
  }
}

/** 접힌 근거(프로토타입 whyList): 제목 줄 + 그룹마다 details.why, 항목은 "<b>이름</b> · 날짜 — 뜻" */
export function WhyList({ groups, head = "▸ 왜 그럴까 — 하늘에서 일어나는 일" }: { groups: WhyGroup[]; head?: string }) {
  const shown = groups.filter((g) => g.items.length);
  if (!shown.length) return null;
  return (
    <>
      <p className="why-head">{head}</p>
      {shown.map((g) => (
        <details key={g.label} className="why">
          <summary>{g.label}</summary>
          <ul>
            {g.items.map((x, i) => (
              <li key={x.title + x.when + i}>
                <b>{x.title}</b>
                {x.when ? ` · ${x.when}` : ""}
                {x.meaning ? ` — ${x.meaning}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

/** 패키지 v3 웹툰식 결과: only = 지금 페이지의 섹션 번호(4~7)만 그린다 */
export default function PaidReportView({ report, signIndex, resultId, only, lang = "ko" }: { report: PaidReport; signIndex?: number; resultId?: string; only?: number; lang?: "ko" | "en" }) {
  // 영문판(2026-11-04): 화면 고정 문구만 영어. 영문 쏘웰라 AI 채팅이 아직 없어 7장 끝 쏘웰라 안내·버튼은 영문판에서 숨긴다
  // (맺음말이 '3일 이용권으로 대화를 시작해 보세요'라 채팅이 열리기 전에 보이면 사실과 다르다).
  const en = lang === "en";
  return (
    <div className="locked-zone">
      {report.sections.filter((s) => only === undefined || s.no === only).map((s) => (
        <section key={s.no} className="rsec paid unlock-anim" id={`sec-${s.no}`} aria-labelledby={`sec-${s.no}-t`}>
          <h2 className="rsec-title" id={`sec-${s.no}-t`}>
            <span>{s.title}</span>
          </h2>
          <PageArt page={s.no} signIndex={signIndex} />
          <div className="box">
            {s.summary && <p className="lead summary">{s.summary}</p>}
            {/* AI 대신 DB 문장으로 채운 섹션 안내(B14 ERR_AI_FALLBACK)는 owner 2026-10-11 결정으로 보여 주지 않는다 */}
            <div className="locked-body">
              {(() => {
                // 영문판: 본문 문단 두 개마다 첫 문장 하나를 굵게(owner 2026-11-04)
                let n = 0;
                return [...s.body, ...s.tail].map((b, i) => {
                  const plain = !["head", "sub", "items", "step", "note"].includes(b.t);
                  const emph = en && plain && isKeyParagraph(n);
                  if (plain) n++;
                  return <BlockView key={i} b={b} emph={emph} />;
                });
              })()}
              {s.no === 7 && (
                <>
                  {report.questions.items.length > 0 && (
                    <>
                      <p className="bul">{en ? "• Three questions from the stars" : "• 별이 주는 질문 3가지"}</p>
                      <ol className="items">
                        {report.questions.items.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ol>
                    </>
                  )}
                  {report.practices.length > 0 && (
                    <>
                      <p className="bul">{en ? "• Three small practices" : "• 작은 실천 3가지"}</p>
                      <ol className="items">
                        {report.practices.map((p) => (
                          <li key={p.title}>
                            <b>{p.title}</b>
                            {p.condition && (
                              <>
                                <span className="tag">{p.condition}</span>
                                <br />
                              </>
                            )}
                            {p.how} <span className="muted">{p.why}</span>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                  {!en && (
                  <div style={{ borderTop: "1px solid var(--box-line)", paddingTop: 14, marginTop: 6 }}>
                    <p>{report.closing}</p>
                    {/* 7번 섹션 끝 '쏘웰라 대화 시작'(마스터스펙 6-2). 같은 계정이라 로그인이 이어진다. */}
                    <SowellaButton label="쏘웰라와 대화 시작하기" className="btn block" resultId={resultId} page={7} />
                    {/* 동의 문구 초안 ③(2026-10-10, 법률 검토 전): 넘어가는 순간 다시 알린다 */}
                    <p className="sowella-note">
                      대화를 시작하면 리포트 요약이 쏘웰라에게 전달돼요. 출생 시각·장소는 전달되지 않아요.{" "}
                      <a href={SOWELLA_USE_URL} target="_blank" rel="noopener" className="underline">
                        자세히
                      </a>
                    </p>
                  </div>
                  )}
                </>
              )}
              {s.table && (
                <table className={`tbl${s.table.columns.length === 3 ? " t3" : ""}`} style={s.no === 6 ? { marginTop: 12 } : undefined}>
                  <thead>
                    <tr>
                      {s.table.columns.map((c) => (
                        <th key={c} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        {r.cells.map((c, i) => (
                          <td key={i}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.stars && s.stars.length > 0 && <FiveYearStars stars={s.stars} lang={lang} />}
              {s.commonSky && s.commonSky.length > 0 && (
                // owner 2026-10-10: 프로토타입에 없지만 유지(A11 하늘의 공통 흐름)
                <details className="why">
                  <summary>{en ? "The sky’s currents for everyone" : "모두에게 부는 하늘의 흐름"}</summary>
                  <ul>
                    {s.commonSky.map((c) => (
                      <li key={c.period + c.event}>
                        <b>
                          {c.period} · {c.event}
                        </b>{" "}
                        — {c.line}
                        {c.meaning ? ` ${c.meaning}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <WhyList groups={s.why} head={en ? "▸ Why? — What’s happening in the sky" : undefined} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
