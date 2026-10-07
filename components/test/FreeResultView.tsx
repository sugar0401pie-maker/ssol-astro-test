"use client";

// 결과 화면(02_디자인가이드 3장 순서, 샘플 리포트 10번 파일의 배치). 1~3번은 무료(AI 0회, 문장은 서버가 해석 DB에서 골라 보냄),
// 4~7번은 제목만 보이고 본문은 결제 후 서버가 채운다.
import { useState } from "react";
import BirthChartWheel from "@/components/chart/BirthChartWheel";
import ElementBars from "@/components/chart/ElementBars";
import type { WheelSelection } from "@/components/chart/labels";
import type { FreeResult, WheelSheet } from "@/lib/report/freeResult";

const SOWELLA_URL = "https://app.ssolwellnesshouse.com/chat";
const SESSION_URL = "https://app.ssolwellnesshouse.com/session-reserve";

function Section({ no, title, free, children }: { no: number; title: string; free: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`sec-${no}`}>
      <h2 id={`sec-${no}`} className="flex items-center gap-2 text-lg font-bold text-cream">
        {title}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${free ? "bg-cream/15 text-cream" : "bg-gold text-navy"}`}>
          {free ? "무료" : "유료"}
        </span>
      </h2>
      {children}
    </section>
  );
}

/** 긴 글은 크림 상자 위 남색 글자(어두운 배경 위 흰 긴 글 금지, 디자인가이드 2장). */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-2xl bg-cream px-4 py-4 text-[15px] leading-relaxed text-navy">{children}</div>;
}

function Sheet({ sheet }: { sheet: WheelSheet }) {
  return (
    <div className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-navy" role="status">
      <p className="font-bold">{sheet.title}</p>
      {sheet.lines.map((l) => (
        <p key={l} className="mt-1">{l}</p>
      ))}
      {sheet.partial && (
        <div className="mt-2">
          <div aria-hidden className="h-8 rounded-lg bg-navy/10 blur-[2px]" />
          <p className="mt-1 text-xs text-navy/60">나머지 해석은 전체 리포트에서 볼 수 있어요.</p>
        </div>
      )}
    </div>
  );
}

export default function FreeResultView({ result, nickname, firstTime }: { result: FreeResult; nickname: string; firstTime: boolean }) {
  const [selected, setSelected] = useState<WheelSelection | null>(null);
  const { chart, character, year2026 } = result;
  const sheet = selected ? (selected.kind === "planet" ? result.wheelSheets.planets[selected.key] : result.wheelSheets.signs[selected.key]) : null;

  return (
    <div className="flex flex-col gap-10">
      <Section no={1} title={`${nickname}님이 태어난 순간의 하늘`} free>
        <p className="text-xs text-cream/70">정확도 {result.accuracy} · {result.gradeNote}</p>
        {result.addTimeNote && <p className="rounded-xl border border-cream/30 px-3 py-2 text-xs text-cream/80">{result.addTimeNote}</p>}
        <BirthChartWheel chart={chart} characterName={character.name} onSelect={setSelected} selected={selected} className="mx-auto" />
        {sheet && <Sheet sheet={sheet} />}
        <ElementBars elements={chart.elements} />
        {(result.elements.strong || result.elements.weak.length > 0) && (
          <Card>
            {result.elements.strong && (
              <>
                <p>{result.elements.strong.text}</p>
                <p>{result.elements.strong.styleLink}</p>
              </>
            )}
            {result.elements.weak.map((w) => (
              <p key={w.element}>{w.text}</p>
            ))}
          </Card>
        )}
      </Section>

      <Section no={2} title="별이 본 나의 캐릭터" free>
        <p className="text-base font-bold text-cream">
          {result.sunSign} · 별이 본 {nickname}님은 {character.name}({character.competency} × {character.style})입니다.
        </p>
        <Card>
          <p>{character.intro}</p>
          <p>{character.why}</p>
          {character.sunMoonLine && <p>{character.sunMoonLine}</p>}
          <p>• {character.strength}</p>
          <p>• {character.energyMoment}</p>
          <p>• {character.careTip}</p>
        </Card>
        <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="px-3 py-2 font-medium">카드</th>
              <th className="px-3 py-2 font-medium">별자리 · 하우스</th>
            </tr>
          </thead>
          <tbody>
            {result.big3.map((b) => (
              <tr key={b.key} className="border-b border-navy/10 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{b.label}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{b.sign}{b.house ? ` · ${b.house}하우스` : ""}</p>
                  <p className="mt-1 text-navy/80">{b.line}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {firstTime && (
          <ul className="flex flex-col gap-1 text-xs text-cream/80">
            {result.terms.map((t) => (
              <li key={t.name}>{t.name} — {t.line}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section no={3} title={`2026년, ${nickname}님의 한 해는 이랬어요`} free>
        <Card>
          {year2026.intro && <p>{year2026.intro}</p>}
          <p className="font-bold">• 올해의 전환점</p>
          {year2026.turningPoints.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </Card>
        <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="px-3 py-2 font-medium">시기</th>
              <th className="px-3 py-2 font-medium">{nickname}님에게는</th>
            </tr>
          </thead>
          <tbody>
            {year2026.quarters.map((q) => (
              <tr key={q.label} className="border-b border-navy/10 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{q.label}</td>
                <td className="px-3 py-2">{q.cell}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {year2026.closing && <Card><p>{year2026.closing}</p></Card>}
        {/* 접힌 근거는 섹션 맨 끝, 행마다 따로(디자인가이드 6장) */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-cream/80">▸ 왜 그럴까 — 하늘에서 일어난 일</p>
          {year2026.quarters.map((q) => (
            <details key={q.label} className="rounded-xl border border-cream/20 px-3 py-2 text-sm text-cream">
              <summary className="cursor-pointer">{q.label}</summary>
              {q.reasons.length === 0 ? (
                <p className="mt-1 text-cream/70">—</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1.5 text-cream/90">
                  {q.reasons.map((r) => (
                    <li key={r.title + r.when}>
                      {r.title}({r.when}){r.meaning ? ` — ${r.meaning}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </Section>

      {result.paidSections.map((s) => (
        <Section key={s.no} no={s.no} title={s.title.replace("{닉네임}", nickname)} free={false}>
          {/* 본문은 결제 후 서버가 만든다 — 여기에는 실제 내용을 넣지 않는다. */}
          <div aria-hidden className="h-24 rounded-2xl bg-cream/80 blur-sm" />
        </Section>
      ))}

      <div className="rounded-2xl border border-gold px-4 py-4 text-center text-cream">
        <p className="text-sm leading-relaxed text-cream/90">{result.paywallBox}</p>
        <button className="mt-3 w-full rounded-full bg-gold px-6 py-3 font-bold text-navy" disabled>
          결제는 준비 중이에요
        </button>
      </div>

      {result.care && (
        // 2026 한 단어가 '그만하자·이별·고생'이면 함께 보여준다(진행은 막지 않음, 마스터스펙 4장).
        <div className="rounded-2xl bg-cream px-4 py-4 text-sm leading-relaxed text-navy">
          {result.care.note && <p>{result.care.note}</p>}
          <p className={result.care.note ? "mt-2" : ""}>{result.care.card}</p>
          <div className="mt-3 flex gap-2">
            <a className="flex-1 rounded-full bg-navy px-4 py-2 text-center text-cream" href={SOWELLA_URL}>쏘웰라와 이야기 나누기</a>
            <a className="flex-1 rounded-full border border-navy px-4 py-2 text-center" href={SESSION_URL}>웰니스 상담 알아보기</a>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-cream/70">{result.disclaimer}</p>
      {result.dbDraft && <p className="text-[10px] text-cream/40">해석 {result.dbVersion} · 상담사 검수 전 초안</p>}
    </div>
  );
}
