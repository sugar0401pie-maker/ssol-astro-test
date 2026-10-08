// 유료 리포트 AI 입력 조립(마스터스펙 7-2). 숫자·날짜는 모두 토큰으로 바꿔 넣고, 실제 값은 tokenValues에만 둔다.
// AI는 계산하지 않는다 — 판정·연도·근거는 여기서 정해져 넘어가고 AI는 바꾸지 않는다(5-3).
// DB 문장(db_sentences)은 owner가 준비 중인 DB가 오면 채운다(지금은 빈 배열).
import { SIGNS } from "../astro/constants.ts";
import { isSoftTone, type Answers } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import type { Accuracy, NatalChart } from "../astro/natal.ts";
import type { PeriodKey, PeriodResult, ScoredEvent } from "../astro/timeline.ts";
import { EDGE_LABEL, WISH_LEVEL_DISPLAY, type WishResult } from "../astro/wish.ts";
import { flowSteps } from "./movement.ts";
import { formatMonths, formatRanges, formatYear, josa } from "./format.ts";
import { POINT_KO, eventLabel, eventNames } from "./labels.ts";

export interface TokenInfo {
  value: string;
  meaning: string;
}

export interface ReportEventInput {
  token: string;
  event: string;
  score: number;
  domain_relevant: boolean;
}

export interface ReportInput {
  user: { nickname: string; accuracy: Accuracy };
  chart: { sun: string; moon: string; asc: string | null; element: string };
  /** 캐릭터(동물) 이름은 넣지 않는다 — 당분간 화면 비노출(show_character=false). name 자리에 유형 한 줄(A5 type_line). */
  character: { name: string; competency: string; style: string };
  answers: { q1_domain: string; q2_word_2026: string; q3_wish_2027: string };
  events_eoy: ReportEventInput[];
  events_2027: ReportEventInput[];
  events_5y: ReportEventInput[];
  domain_quiet: Partial<Record<PeriodKey, boolean>>;
  /** 연도 토큰 → "활짝 열리는 해(순풍)"처럼 두 말 함께 */
  wish_support: Record<string, string>;
  /** 연도 토큰 → 경계 표시(B10, 예: 활짝 열리는 해에 가까움). 없으면 빠짐 */
  wish_edge: Record<string, string>;
  /** 연도 토큰 → 움직이는 해 / 잔잔한 해 / ''(좋고 나쁨 없음) */
  movement: Record<string, string>;
  /** 활동 / 고정 / 변통 (B9 문장 버전) */
  temperament: string;
  /** 2027 '흐름 한눈에' 단계 토큰(서버가 단계로 묶음) */
  flow_2027: string[];
  /** 연도 토큰 → 근거 목록(라벨 + 기간 토큰) */
  wish_reason: Record<string, Array<{ token: string; reason: string }>>;
  first_open_year: string | null;
  closest_year: string | null;
  headwind_years: string[];
  houses_excluded: boolean;
  soft_tone: boolean;
  db_sentences: string[];
}

export interface BuiltReportInput {
  input: ReportInput;
  /** 토큰 이름 → 실제 값·뜻(프롬프트의 {tokens}와 출력 치환에 함께 쓴다) */
  tokens: Record<string, TokenInfo>;
  /** 검증용: AI가 언급해도 되는 행성·별자리 이름 */
  allowedNames: string[];
  /** 검증용: 문장에 써도 되는 하우스 번호 */
  allowedHouses: number[];
  headwind2027: boolean;
}

const placed = (chart: NatalChart, k: "sun" | "moon" | "asc") => {
  const p = chart.planets[k];
  if (!p) return null;
  return p.house ? `${p.sign}/${p.house}H` : p.sign;
};

export function buildReportInput(args: {
  nickname: string;
  chart: NatalChart;
  character: CharacterResult;
  answers: Answers;
  periods: Record<PeriodKey, PeriodResult>;
  wish: WishResult;
  /** A5 type_line — 캐릭터 이름 대신 쓰는 유형 한 줄 */
  typeLine: string;
}): BuiltReportInput {
  const { nickname, chart, character, answers, periods, wish } = args;
  const tokens: Record<string, TokenInfo> = {};
  const names = new Set<string>();
  const houses = new Set<number>();
  const addHouses = (...hs: Array<number | null | undefined>) => hs.forEach((x) => typeof x === "number" && houses.add(x));
  for (const p of Object.values(chart.planets)) addHouses(p?.house);
  for (const k of ["sun", "moon", "asc"] as const) {
    const p = chart.planets[k];
    if (p) names.add(p.sign);
  }
  names.add("태양").add("달");
  if (chart.planets.asc) names.add("상승궁");

  const events = (key: PeriodKey, prefix: string, withYear: boolean): ReportEventInput[] =>
    periods[key].top.map((s: ScoredEvent, i) => {
      const token = `${prefix}${i + 1}_기간`;
      tokens[token] = { value: formatRanges(s.intervalsInWindow, withYear), meaning: `${eventLabel(s.event)}의 기간` };
      eventNames(s.event).forEach((n) => names.add(n));
      const e = s.event;
      if (e.kind === "transit") addHouses(e.targetHouse, e.transitHouse);
      else addHouses(e.house);
      return { token, event: eventLabel(s.event), score: s.score, domain_relevant: s.domainRelevant };
    });

  const wish_support: Record<string, string> = {};
  const wish_reason: ReportInput["wish_reason"] = {};
  const wish_edge: Record<string, string> = {};
  const movement: Record<string, string> = {};
  const headwind_years: string[] = [];
  let r = 0;
  for (const y of wish.years) {
    const yt = `Y${y.year}`;
    tokens[yt] = { value: formatYear(y.year), meaning: `${y.year}년(연도)` };
    wish_support[yt] = WISH_LEVEL_DISPLAY[y.level];
    if (y.edge) wish_edge[yt] = EDGE_LABEL[y.edge];
    movement[yt] = y.movementLabel;
    if (y.level === "역풍") headwind_years.push(yt);
    if (y.reasons.length) {
      wish_reason[yt] = y.reasons.map((f) => {
        const token = `R${++r}_시기`;
        tokens[token] = { value: formatMonths(f.intervals), meaning: "근거가 되는 달" };
        const reason =
          f.kind === "house"
            ? `${josa(POINT_KO[f.transit], "이/가")} ${f.house}하우스를 지남`
            : `${POINT_KO[f.transit]} ${f.aspect} 출생 ${f.target.startsWith("H") ? f.target : POINT_KO[f.target as keyof typeof POINT_KO]}`;
        names.add(POINT_KO[f.transit]);
        if (f.kind === "house") addHouses(f.house);
        if (f.kind === "aspect" && !f.target.startsWith("H")) names.add(POINT_KO[f.target as keyof typeof POINT_KO]);
        return { token, reason };
      });
    }
  }
  const yearToken = (y: number | null, name: string) => {
    if (y === null) return null;
    tokens[name] = { value: formatYear(y), meaning: name === "열리는해" ? "바라는 것이 열리는 해" : "바라는 것에 가장 가까워지는 해" };
    return `{{${name}}}`;
  };
  if (headwind_years.length) tokens["역풍해"] = { value: tokens[headwind_years[0]].value, meaning: "첫 역풍 해" };

  const input: ReportInput = {
    user: { nickname, accuracy: chart.accuracy },
    chart: {
      sun: placed(chart, "sun")!,
      moon: placed(chart, "moon")!,
      asc: placed(chart, "asc"),
      element: (Object.entries(chart.elements).sort((a, b) => b[1] - a[1])[0] ?? ["", 0])[0],
    },
    character: { name: args.typeLine, competency: character.competency, style: character.style },
    answers: { q1_domain: answers.q1, q2_word_2026: answers.q2, q3_wish_2027: answers.q3 },
    events_eoy: events("eoy", "E", false),
    events_2027: events("year2027", "T", false),
    events_5y: events("fiveYears", "F", true),
    domain_quiet: { eoy: periods.eoy.domainQuiet, year2027: periods.year2027.domainQuiet, fiveYears: periods.fiveYears.domainQuiet },
    wish_support,
    wish_edge,
    movement,
    temperament: wish.temperament,
    flow_2027: flowSteps(periods.eoy, periods.year2027).map((text, i) => {
      const name = `흐름${i + 1}`;
      tokens[name] = { value: text, meaning: "2027년 흐름의 한 단계(시기 + 단계 이름)" };
      return `{{${name}}}`;
    }),
    wish_reason,
    first_open_year: yearToken(wish.firstOpenYear, "열리는해"),
    closest_year: yearToken(wish.closestYear, "가까워지는해"),
    headwind_years,
    houses_excluded: wish.housesExcluded,
    soft_tone: isSoftTone(answers.q2),
    db_sentences: [],
  };

  return {
    input,
    tokens,
    allowedHouses: [...houses].sort((a, b) => a - b),
    allowedNames: [...names].filter((n) => n.length > 0 && (SIGNS as readonly string[]).concat(Object.values(POINT_KO)).includes(n)),
    headwind2027: wish.years[0]?.level === "역풍",
  };
}

export function tokenValues(tokens: Record<string, TokenInfo>): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v.value]));
}
