"use client";

// 유료 섹션(4~7) 표시(마스터스펙 6-1-1). 굵은 한 문장 요약 → 본문(AI 또는 DB 뼈대) → 서버가 붙이는 부분(연말 '달마다 살펴볼 것')
// → 표(모바일 2열)·타임라인 → 섹션 맨 끝 '왜 그럴까' 접힌 근거(디자인가이드 6장). 질문·실천은 DB 문장 그대로.
// ** 같은 강조 표기는 쓰지 않고, '유료' 표시도 하지 않는다(2026-10-09).
import type { PaidReport } from "@/lib/report/aiReport";
import type { Block, WhyGroup } from "@/lib/report/paidSkeleton";
import FiveYearStars from "./FiveYearStars";

const SOWELLA_CHAT_URL = "https://app.ssolwellnesshouse.com/chat";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-2xl bg-cream px-4 py-4 text-[15px] leading-relaxed text-navy">{children}</div>;
}

export function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "head":
      return <p className="mt-2 text-[17px] font-bold">{b.text}</p>;
    case "sub":
      return <p className="mt-1 font-bold">{b.text}</p>;
    case "items":
      return (
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          {b.items.map((it) => (
            <li key={it.title}>
              <p className="font-bold">{it.title}</p>
              <p>{it.text}</p>
              {it.note && <p className="text-xs text-navy/70">{it.note}</p>}
            </li>
          ))}
        </ol>
      );
    case "step":
      return (
        <p>
          <span className="font-bold">{b.label}</span> {b.text}
        </p>
      );
    case "bridge":
      return <p className="border-l-2 border-gold pl-3">{b.text}</p>;
    case "note":
      return <p className="text-sm text-navy/70">{b.text}</p>;
    default:
      return <p className="whitespace-pre-line">{b.text}</p>;
  }
}

export function WhyList({ groups, head = "▸ 왜 그럴까 — 하늘에서 일어나는 일" }: { groups: WhyGroup[]; head?: string }) {
  const shown = groups.filter((g) => g.items.length);
  if (!shown.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-cream/80">{head}</p>
      {shown.map((g) => (
        <details key={g.label} className="rounded-xl border border-cream/20 px-3 py-2 text-sm text-cream">
          <summary className="cursor-pointer">{g.label}</summary>
          <ul className="mt-1 flex flex-col gap-1.5 text-cream/90">
            {g.items.map((x, i) => (
              <li key={x.title + x.when + i}>
                <span className="font-bold">{x.title}</span>
                {x.when ? ` · ${x.when}` : ""}
                {x.meaning ? ` — ${x.meaning}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export default function PaidReportView({ report }: { report: PaidReport }) {
  return (
    <div className="flex flex-col gap-10">
      {report.sections.map((s) => (
        <section key={s.no} className="flex flex-col gap-3" aria-labelledby={`paid-${s.no}`}>
          <h2 id={`paid-${s.no}`} className="text-lg font-bold text-cream">
            {s.title}
          </h2>
          <Card>
            {s.summary && <p className="font-bold text-navy">{s.summary}</p>}
            {[...s.body, ...s.tail].map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
            {s.no === 7 && (
              <>
                {report.questions.items.length > 0 && (
                  <>
                    <p className="mt-2 text-[17px] font-bold">• 별이 주는 질문 3가지</p>
                    <ol className="list-decimal pl-5">
                      {report.questions.items.map((q) => (
                        <li key={q} className="mt-1">{q}</li>
                      ))}
                    </ol>
                  </>
                )}
                {report.practices.length > 0 && (
                  <>
                    <p className="mt-2 text-[17px] font-bold">• 작은 실천 3가지</p>
                    <ol className="list-decimal pl-5">
                      {report.practices.map((p) => (
                        <li key={p.title} className="mt-2">
                          <p className="font-bold">
                            {p.title}
                            {p.minutes ? ` (${p.minutes}분)` : ""}
                            {p.condition && <span className="ml-1 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium">{p.condition}</span>}
                          </p>
                          <p>{p.how} <span className="text-navy/70">{p.why}</span></p>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <div className="mt-2 border-t border-navy/10 pt-3">
                  <p>{report.closing}</p>
                  {/* 7번 섹션 끝 '쏘웰라 대화 시작'(마스터스펙 6-2). 같은 계정이라 로그인이 이어진다. */}
                  <a href={SOWELLA_CHAT_URL} className="mt-3 block w-full rounded-full bg-navy px-6 py-3 text-center font-bold text-cream">
                    쏘웰라와 대화 시작하기
                  </a>
                </div>
              </>
            )}
          </Card>
          {s.table && (
            <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
              <thead>
                <tr className="border-b border-navy/10">
                  {s.table.columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.table.rows.map((r) => (
                  <tr key={r.label} className="border-b border-navy/10 align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{r.label}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="whitespace-pre-line px-3 py-2">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
          <WhyList groups={s.why} />
        </section>
      ))}
    </div>
  );
}
