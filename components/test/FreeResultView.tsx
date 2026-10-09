"use client";

// 결과 화면(02_디자인가이드 3장 순서, 샘플 리포트 10번 파일의 배치). 1~3번은 무료(AI 0회, 문장은 서버가 해석 DB에서 골라 보냄),
// 4~7번은 제목만 보이고 본문은 결제 후 서버가 채운다.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPORT_PRICE } from "@/lib/billing/pricing";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import BirthChartWheel from "@/components/chart/BirthChartWheel";
import ElementBars from "@/components/chart/ElementBars";
import ActionRow from "@/components/share/ActionRow";
import type { WheelSelection } from "@/components/chart/labels";
import type { FreeResult, WheelSheet } from "@/lib/report/freeResult";

const SOWELLA_URL = "https://app.ssolwellnesshouse.com/chat";
const SESSION_URL = "https://app.ssolwellnesshouse.com/session-reserve";

// '무료'/'유료' 뱃지는 쓰지 않는다(2026-10-09, 디자인가이드 2장). free는 구조 표시용으로만 남긴다.
export function Section({ no, title, children }: { no: number; title: string; free?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`sec-${no}`} id={`section-${no}`}>
      <h2 id={`sec-${no}`} className="text-lg font-bold text-cream">{title}</h2>
      {children}
    </section>
  );
}

/** 섹션 2~7의 굵은 한 줄 요약(B11 SUM_*, 700·남색·본문보다 한 단계 크게) */
export function Summary({ text }: { text: string | null | undefined }) {
  return text ? <p className="text-[17px] font-bold leading-relaxed text-navy">{text}</p> : null;
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

const TIPS_SEEN_KEY = "astro_wheel_tips_seen";

/** 처음인 사용자: 휠 첫 진입 때 3단계 안내(바깥 고리 = 별자리 → 동그라미 = 행성 → 선 = 관계). 한 번 닫으면 다시 안 띄운다. */
// 말풍선 단계별로 휠에서 반짝일 층(디자인가이드 4장: 바깥 고리 = 별자리, 동그라미 = 행성, 선 = 관계)
const TIP_TARGETS = ["signs", "planets", "lines"] as const;
const tipTarget = (i: number) => (i >= 0 && i < TIP_TARGETS.length ? TIP_TARGETS[i] : null);

function initialTipIndex(): number {
  try {
    return localStorage.getItem(TIPS_SEEN_KEY) ? -1 : 0;
  } catch {
    return 0;
  }
}

function WheelTips({ tips, i, setI }: { tips: string[]; i: number; setI: (i: number) => void }) {
  if (i < 0 || i >= tips.length) return null;
  const close = () => {
    setI(-1);
    try {
      localStorage.setItem(TIPS_SEEN_KEY, "1");
    } catch {
      /* 저장소를 못 쓰면 다음에 다시 보여도 괜찮다 */
    }
  };
  return (
    <div className="relative rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-navy" role="dialog" aria-label="출생차트 휠 안내">
      <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-cream" />
      <p>{tips[i]}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-navy/60">{i + 1} / {tips.length}</span>
        <span className="flex gap-3">
          <button type="button" className="underline" onClick={close}>닫기</button>
          {i < tips.length - 1 ? (
            <button type="button" className="font-bold" onClick={() => setI(i + 1)}>다음</button>
          ) : (
            <button type="button" className="font-bold" onClick={close}>알겠어요</button>
          )}
        </span>
      </div>
    </div>
  );
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
}: {
  result: FreeResult;
  nickname: string;
  firstTime: boolean;
  /** 저장된 결과 id — 있으면 결제 버튼이 결제 화면으로 간다 */
  resultId?: string | null;
  /** 결제 후 유료 섹션(있으면 블러 미리보기·결제 상자 대신 보여 준다) */
  paidContent?: React.ReactNode;
  /** C등급: '태어난 시간 추가하기'를 누르면(주면 버튼이 생긴다) */
  onAddTime?: () => void;
  /** 결제는 끝났고 리포트를 쓰는 중 — 유료 섹션 제목·첫 문장·블러 자리를 그대로 두고 안내만 바꾼다(디자인가이드 2장 '같은 자리에서 채워진다') */
  paidPending?: string;
  /** 저장하기 → 가입할 때 미리 채울 값 */
  savePrefill?: { birthDate?: string; nickname?: string };
}) {
  const [selected, setSelected] = useState<WheelSelection | null>(null);
  const [tipIndex, setTipIndex] = useState(() => (firstTime ? initialTipIndex() : -1));
  // 결제 전: 유료 섹션의 두괄식 첫 문장(서버가 DB 뼈대에서 한 문장씩만 보냄). 못 받아 오면 제목만.
  const [preview, setPreview] = useState<Record<number, { first: string; lines: string[] }>>({});
  // 결제 팝업(2026-10-09): 잠긴 섹션이 화면에 있을 때만 화면 아래에 따라다니는 팝업 하나. 별도 하단 바 없음.
  const lockedRef = useRef<HTMLDivElement>(null);
  const [lockedVisible, setLockedVisible] = useState(false);
  const unpaid = !paidContent && !paidPending && !!resultId;
  const wantPreview = !paidContent && !!resultId;
  useEffect(() => {
    if (!wantPreview) return;
    let alive = true;
    void getRealSession().then(async (session) => {
      const res = await fetch(`/api/results/${resultId}/preview`, { headers: apiHeaders(session) });
      if (!res.ok || !alive) return;
      const data = (await res.json()) as { sections: Array<{ no: number; first: string; lines?: string[] }> };
      setPreview(Object.fromEntries(data.sections.map((x) => [x.no, { first: x.first, lines: x.lines ?? [] }])));
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [wantPreview, resultId]);
  useEffect(() => {
    const el = lockedRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLockedVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [unpaid]);
  const { chart, character, year2026 } = result;
  const popup = splitPayPopup(result.payPopup ?? "");
  const share = {
    chart,
    sunSign: result.sunSign,
    sunSignIndex: result.sunSignIndex,
    typeLine: character.name ?? character.typeLine,
    competency: character.competency,
    style: character.style,
    nickname,
  };
  const sheet = !selected
    ? null
    : selected.kind === "planet"
      ? result.wheelSheets.planets[selected.key]
      : selected.kind === "line"
        ? result.wheelSheets.lines?.[selected.key]
        : result.wheelSheets.signs[selected.key];

  return (
    <div className={`flex flex-col gap-10 ${unpaid ? "pb-40" : ""}`}>
      <Section no={1} title={`${nickname}님이 태어난 순간의 하늘`} free>
        <p className="text-xs text-cream/70">정확도 {result.accuracy} · {result.gradeNote}</p>
        {result.addTimeNote && <p className="rounded-xl border border-cream/30 px-3 py-2 text-xs text-cream/80">{result.addTimeNote}</p>}
        <BirthChartWheel
          chart={chart}
          centerSign={{ index: result.sunSignIndex, name: result.sunSign }}
          onSelect={setSelected}
          selected={selected}
          onAddTime={onAddTime}
          highlight={(result.wheelTips?.length ?? 0) > tipIndex ? tipTarget(tipIndex) : null}
          tip={firstTime ? <WheelTips tips={result.wheelTips ?? []} i={tipIndex} setI={setTipIndex} /> : null}
          className="mx-auto"
        />
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
        {/* 나의 행성 읽기·행성끼리의 관계 — 소제목은 카드 라벨보다 크게(18px vs 15px), 외행성 꼬리표 없음(마스터스펙 6-1-1) */}
        <Card>
          <h3 className="text-lg font-bold">{result.planetReading.head}</h3>
          {result.planetReading.planets.map((p) => (
            <div key={p.key} className="flex flex-col gap-1 border-t border-navy/10 pt-3 first-of-type:border-0">
              <p className="text-[15px] font-bold">{p.title}</p>
              {(p.shortLine || p.text) && (
                <p>
                  {p.shortLine && <span className="font-bold">{p.shortLine} </span>}
                  {p.text}
                </p>
              )}
              {p.houseLine && <p className="text-navy/80">{p.houseLine}</p>}
            </div>
          ))}
          {result.planetReading.aspects.length > 0 && (
            <>
              <h3 className="mt-3 text-lg font-bold">{result.planetReading.aspectsHead}</h3>
              {result.planetReading.aspects.map((a) => (
                <div key={a.title} className="flex flex-col gap-1 border-t border-navy/10 pt-3">
                  <p className="text-[15px] font-bold">
                    {a.title} <small className="font-normal text-navy/60">{a.sub}</small>
                  </p>
                  <p>
                    <span className="font-bold">{a.lineMeaning} </span>
                    {a.text}
                  </p>
                </div>
              ))}
            </>
          )}
        </Card>
      </Section>

      <Section no={2} title={character.name ? "별이 본 나의 캐릭터" : "별이 본 나의 유형"} free>
        <Card>
          <Summary text={character.name ? `${result.sunSign} · 별이 본 ${nickname}님은 ${character.name}(${character.competency} × ${character.style})입니다.` : character.summary} />
          {character.intro && <p>{character.intro}</p>}
          <p>{character.why}</p>
          {character.competencyLine && <p>• {character.competency} — {character.competencyLine}</p>}
          {character.styleLine && <p>• {character.style} — {character.styleLine}</p>}
          {character.sunMoonLine && <p>{character.sunMoonLine}</p>}
          {character.strength && <p>• {character.strength}</p>}
          {character.energyMoment && <p>• {character.energyMoment}</p>}
          {character.careTip && <p>• {character.careTip}</p>}
        </Card>
        <table className="w-full overflow-hidden rounded-2xl bg-cream text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="px-3 py-2 font-medium">구분</th>
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
          <Summary text={year2026.summary} />
          {year2026.intro && <p>{year2026.intro}</p>}
          <p className="font-bold">• 올해의 전환점</p>
          {year2026.turningPoints.map((t) => (
            <p key={t}>{t}</p>
          ))}
          {/* 마무리 문장은 표 위에 — 표 아래에는 접힌 근거만(마스터스펙 6-1-1) */}
          {year2026.quarterHead && <p className="font-bold">{year2026.quarterHead}</p>}
          {year2026.closing && <p>{year2026.closing}</p>}
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

      {/* 무료 구간 끝: [SNS 공유하기] + [저장하기](마스터스펙 6-1 화면 9) */}
      <ActionRow share={share} copy={result.saveCopy} resultId={resultId ?? null} prefill={savePrefill} />

      {paidContent ?? (
        <div ref={lockedRef} className="flex flex-col gap-10">
          {result.paidSections.map((s) => {
            const pv = preview[s.no];
            return (
              <Section key={s.no} no={s.no} title={s.title.replace("{닉네임}", nickname)} free={false}>
                {/* 제목과 굵은 요약, 본문 앞 2줄만 선명하게, 나머지는 블러(2026-10-09 페이월). 본문은 결제 후 서버가 만든다. */}
                <div className="relative overflow-hidden rounded-2xl bg-cream px-4 py-4 text-[15px] leading-relaxed text-navy">
                  {pv?.first && <p className="font-bold">{pv.first}</p>}
                  {pv && pv.lines.length > 0 && <p className="mt-2">{pv.lines.join(" ")}</p>}
                  <div aria-hidden className={`mt-2 h-20 rounded-xl bg-navy/10 blur-sm ${paidPending ? "animate-pulse motion-reduce:animate-none" : ""}`} />
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-cream" />
                </div>
              </Section>
            );
          })}
          {paidPending ? (
            <p role="status" className="rounded-2xl border border-gold px-4 py-4 text-center text-sm leading-relaxed text-cream">{paidPending}</p>
          ) : (
            !resultId && <p className="text-center text-xs text-cream/70">결과를 저장하면 전체 리포트를 볼 수 있어요.</p>
          )}
        </div>
      )}

      {paidContent && (
        // 리포트 끝에도 같은 줄
        <ActionRow share={share} copy={result.saveCopy} resultId={resultId ?? null} prefill={savePrefill} />
      )}

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
      {unpaid && lockedVisible && (
        // 결제 팝업 하나(마스터스펙 6-1-1): 잠긴 섹션이 보일 때만, 화면 높이 30% 이하. 가짜 카운트다운·'지금만 할인' 없음.
        <div className="fixed inset-x-0 bottom-3 z-20 px-4">
          <div className="mx-auto flex max-h-[30vh] w-full max-w-md flex-col gap-2 rounded-2xl border border-gold bg-midnight/95 px-4 py-3 text-center text-cream shadow-lg backdrop-blur">
            {popup.message && <p className="text-sm font-bold">{popup.message}</p>}
            {popup.sub && <p className="text-xs text-cream/80">{popup.sub}</p>}
            <Link href={`/checkout/${resultId}`} className="block w-full rounded-full bg-gold px-6 py-3 font-bold text-navy">
              {popup.button || `${REPORT_PRICE.toLocaleString("ko-KR")}원 결제하기`}
            </Link>
          </div>
        </div>
      )}
      {result.dbDraft && <p className="text-[10px] text-cream/40">해석 {result.dbVersion} · 상담사 검수 전 초안</p>}
    </div>
  );
}
