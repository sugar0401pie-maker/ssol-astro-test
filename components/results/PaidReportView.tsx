"use client";

// 유료 섹션(4~7) 표시. 본문 문단(AI 또는 DB 뼈대) → 표(모바일 2열) → 섹션 맨 끝 '왜 그럴까' 행마다 접힌 근거
// (디자인가이드 6장). 질문·실천은 DB 문장 그대로. ** 같은 강조 표기는 쓰지 않는다.
import type { PaidReport } from "@/lib/report/aiReport";
import FiveYearStars from "./FiveYearStars";

const FLOW_HEAD = "• 2027년 흐름 한눈에";
const SOWELLA_CHAT_URL = "https://app.ssolwellnesshouse.com/chat";

/** '흐름 한눈에': 넓은 화면은 화살표 한 줄, 모바일은 세로 단계 칩(디자인가이드 3장 5번). */
function FlowSteps({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-gold/40 px-4 py-3 text-cream">
      <p className="text-sm font-bold">2027년 흐름 한눈에</p>
      <ol className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {steps.map((t, i) => (
          <li key={t} className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-cream/10 px-3 py-1">{t}</span>
            {i < steps.length - 1 && <span aria-hidden className="hidden text-gold sm:inline">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-2xl bg-cream px-4 py-4 text-[15px] leading-relaxed text-navy">{children}</div>;
}

export default function PaidReportView({ report }: { report: PaidReport }) {
  return (
    <div className="flex flex-col gap-10">
      {report.sections.map((s) => (
        <section key={s.no} className="flex flex-col gap-3" aria-labelledby={`paid-${s.no}`}>
          <h2 id={`paid-${s.no}`} className="flex items-center gap-2 text-lg font-bold text-cream">
            {s.title}
            <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[11px] font-medium text-navy">유료</span>
          </h2>
          {s.paragraphs.length > 0 && (
            <Card>
              {/* AI가 쓴 '흐름 한눈에' 줄은 아래 단계 칩으로 대신 보여 준다(같은 내용이 두 번 나오지 않게). */}
              {s.paragraphs.filter((p) => !p.startsWith(FLOW_HEAD)).map((p, i) => (
                <p key={i} className={i === 0 ? "font-bold" : ""}>{p}</p>
              ))}
            </Card>
          )}
          {s.flow && s.flow.length > 0 && <FlowSteps steps={s.flow} />}
          {s.stars && s.stars.length > 0 && <FiveYearStars stars={s.stars} />}
          {s.commonSky && s.commonSky.length > 0 && (
            <details className="rounded-2xl border border-cream/20 px-4 py-3 text-sm text-cream">
              <summary className="cursor-pointer">모두에게 부는 하늘의 흐름</summary>
              <ul className="mt-2 flex flex-col gap-3">
                {s.commonSky.map((c) => (
                  <li key={c.period + c.event}>
                    <p className="font-bold">{c.period} · {c.event}</p>
                    <p className="mt-0.5 text-cream/90">{c.line}</p>
                    {c.meaning && <p className="mt-0.5 text-xs text-cream/70">{c.meaning}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {s.no === 7 && (
            <>
              {report.questions.items.length > 0 && (
                <Card>
                  <p className="font-bold">• 별이 주는 질문 3가지</p>
                  <ol className="list-decimal pl-5">
                    {report.questions.items.map((q) => (
                      <li key={q} className="mt-1">{q}</li>
                    ))}
                  </ol>
                </Card>
              )}
              {report.practices.length > 0 && (
                <Card>
                  <p className="font-bold">• 작은 실천 3가지</p>
                  <ol className="list-decimal pl-5">
                    {report.practices.map((p) => (
                      <li key={p.title} className="mt-2">
                        <p className="font-medium">{p.title}{p.minutes ? ` (${p.minutes}분)` : ""}{p.condition ? ` · ${p.condition}` : ""}</p>
                        <p>{p.how}</p>
                        <p className="text-navy/80">{p.why}</p>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
              <Card>
                <p>{report.closing}</p>
                {/* 7번 섹션 끝 '쏘웰라 대화 시작'(마스터스펙 6-2). 같은 계정이라 로그인이 이어진다. */}
                <a href={SOWELLA_CHAT_URL} className="mt-2 block w-full rounded-full bg-navy px-6 py-3 text-center font-bold text-cream">
                  쏘웰라와 대화 시작하기
                </a>
              </Card>
            </>
          )}
          {s.table && (
            <>
              <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
                <thead>
                  <tr className="border-b border-navy/10">
                    {s.table.columns.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r) => (
                    <tr key={r.label} className="border-b border-navy/10 align-top last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{r.label}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="px-3 py-2">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-cream/80">▸ 왜 그럴까 — 하늘에서 일어나는 일</p>
                {s.table.rows.map((r) => (
                  <details key={r.label} className="rounded-xl border border-cream/20 px-3 py-2 text-sm text-cream">
                    <summary className="cursor-pointer">{r.label}</summary>
                    {r.reasons.length === 0 ? (
                      <p className="mt-1 text-cream/70">—</p>
                    ) : (
                      <ul className="mt-1 flex flex-col gap-1.5 text-cream/90">
                        {r.reasons.map((x) => (
                          <li key={x.title + x.when}>{x.title}({x.when}){x.meaning ? ` — ${x.meaning}` : ""}</li>
                        ))}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
