"use client";

// 결과 화면(02_디자인가이드 3장 순서). 1~3번은 무료(AI 0회), 4~7번은 제목만 보이고 본문은 결제 후 서버가 채운다.
// 해석 문장(DB 05_DB목록 A1~A18)은 owner가 준비 중 — 들어갈 자리는 "준비 중" 표시로 비워 둔다(지어내지 않음).
import { useState } from "react";
import BirthChartWheel from "@/components/chart/BirthChartWheel";
import ElementBars from "@/components/chart/ElementBars";
import { POINT_NAMES } from "@/components/chart/labels";
import type { WheelSelection } from "@/components/chart/labels";
import { ACCURACY_NOTE, DISCLAIMER, type FreeResult } from "@/lib/report/freeResult";

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

function Pending({ what }: { what: string }) {
  return <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-navy/70">{what} 해석 문장은 준비 중이에요.</p>;
}

export default function FreeResultView({ result, nickname, firstTime }: { result: FreeResult; nickname: string; firstTime: boolean }) {
  const [selected, setSelected] = useState<WheelSelection | null>(null);
  const { chart, character } = result;
  const big3 = (["sun", "moon", "asc"] as const).filter((k) => chart.planets[k]);

  return (
    <div className="flex flex-col gap-10">
      <Section no={1} title={`${nickname}님이 태어난 순간의 하늘`} free>
        <BirthChartWheel chart={chart} characterName={character.name} onSelect={setSelected} selected={selected} className="mx-auto" />
        {selected && (
          <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-navy" role="status">
            {selected.kind === "planet" ? (
              <p className="font-bold">
                {POINT_NAMES[selected.key]} · {chart.planets[selected.key]?.sign}
                {chart.planets[selected.key]?.house ? ` · ${chart.planets[selected.key]?.house}하우스` : ""}
              </p>
            ) : (
              <p className="font-bold">{selected.key}</p>
            )}
            <p className="mt-1 text-navy/70">해석 문장은 준비 중이에요.</p>
          </div>
        )}
        <ElementBars elements={chart.elements} />
        <p className="text-xs text-cream/70">정확도 {result.accuracy} · {ACCURACY_NOTE[result.accuracy]}</p>
      </Section>

      <Section no={2} title="별이 본 나의 캐릭터" free>
        <p className="text-base text-cream">
          {result.sunSign} · 별이 본 {nickname}님은 {character.name}({character.competency} × {character.style})입니다.
        </p>
        <Pending what="캐릭터 설명과 태양·달 대비" />
        <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="px-3 py-2 font-medium"> </th>
              <th className="px-3 py-2 font-medium">별자리</th>
              <th className="px-3 py-2 font-medium">하우스</th>
            </tr>
          </thead>
          <tbody>
            {big3.map((k) => (
              <tr key={k} className="border-b border-navy/10 last:border-0">
                <td className="px-3 py-2 font-medium">{POINT_NAMES[k]}</td>
                <td className="px-3 py-2">{chart.planets[k]!.sign}</td>
                <td className="px-3 py-2">{chart.planets[k]!.house ? `${chart.planets[k]!.house}하우스` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {firstTime && <p className="text-xs text-cream/70">처음 보시는 분을 위한 태양·달·상승궁 용어 설명은 준비 중이에요.</p>}
      </Section>

      <Section no={3} title={`2026년, ${nickname}님의 한 해는 이랬어요`} free>
        <Pending what="2026년 한 단어 공감 도입" />
        {result.year2026.turningPoints.length > 0 && (
          <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-navy">
            <p className="font-bold">• 올해의 전환점</p>
            <ul className="mt-1 flex flex-col gap-1">
              {result.year2026.turningPoints.map((t) => (
                <li key={`${t.date}${t.label}`}>{t.date} — {t.label}</li>
              ))}
            </ul>
          </div>
        )}
        <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="px-3 py-2 font-medium">시기</th>
              <th className="px-3 py-2 font-medium">{nickname}님에게는</th>
            </tr>
          </thead>
          <tbody>
            {result.year2026.quarters.map((q) => (
              <tr key={q.label} className="border-b border-navy/10 last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{q.label}</td>
                <td className="px-3 py-2 text-navy/70">준비 중</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 접힌 근거는 섹션 맨 끝, 행마다 따로(디자인가이드 6장) */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-cream/80">▸ 왜 그럴까 — 하늘에서 일어난 일</p>
          {result.year2026.quarters.map((q) => (
            <details key={q.label} className="rounded-xl border border-cream/20 px-3 py-2 text-sm text-cream">
              <summary className="cursor-pointer">{q.label}</summary>
              {q.items.length === 0 ? (
                <p className="mt-1 text-cream/70">이 시기에는 큰 움직임이 없었어요.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-cream/90">
                  {q.items.map((i) => (
                    <li key={i.label + i.when}>{i.label} · {i.when}</li>
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
        <p className="font-bold">전체 리포트 1,900원</p>
        <p className="mt-1 text-sm text-cream/80">이 리포트와 함께 3일 동안 쏘웰라 이용권이 제공됩니다.</p>
        <button className="mt-3 w-full rounded-full bg-gold px-6 py-3 font-bold text-navy" disabled>
          결제는 준비 중이에요
        </button>
      </div>

      {result.softTone && (
        // 2026 한 단어가 '그만하자·이별·고생'이면 함께 보여준다(진행은 막지 않음, 마스터스펙 4장). 문구는 초안.
        <div className="rounded-2xl bg-cream px-4 py-4 text-sm text-navy">
          <p>올 한 해 많이 버거우셨다면, 쏘웰라와 편하게 이야기 나눠보는 건 어떨까요?</p>
          <p className="mt-1">전문 상담이 필요하다면 쏠 웰니스 하우스의 웰니스 상담도 함께 살펴볼 수 있어요.</p>
          <div className="mt-3 flex gap-2">
            <a className="flex-1 rounded-full bg-navy px-4 py-2 text-center text-cream" href={SOWELLA_URL}>쏘웰라와 이야기하기</a>
            <a className="flex-1 rounded-full border border-navy px-4 py-2 text-center" href={SESSION_URL}>웰니스 상담 알아보기</a>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-cream/70">{DISCLAIMER}</p>
    </div>
  );
}
