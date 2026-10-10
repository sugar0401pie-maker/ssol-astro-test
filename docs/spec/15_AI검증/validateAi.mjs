// 쏠 아스트로 하우스 — 유료 리포트 AI 출력 검증기 (JS 판, validate_ai.py와 같은 규칙)
// Next.js 서버 라우트에서: import { validatePart, validateBridge, finalizePart, setC1 } from './validateAi.mjs'
// setC1(astroDb.dbs.C1.rows) 로 금지어 규칙을 먼저 넣어 주세요(11_해석DB/astro_db_v1.2.json).

const TOKEN_RE = /\{\{([^{}:]+)(?::([^{}]+))?\}\}/g;
const BRIDGE_RE = /<잇기>([\s\S]*?)<\/잇기>/g;
const DIGIT_RE = /[0-9０-９]/;
const LABEL_PARTS = ['활짝 열리는 해', '내 손에 달린 해', '기반을 다지는 해'];
const BODIES = ['태양', '수성', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성', '키론', '상승궁', '천정'];
const SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
const MOON_RE = /(?<![가-힣])달(?=[이의과와을를은는에도]|\s)/g;
const MOON_NOT_BEFORE = new Set(['이번', '한', '다음', '지난', '매', '몇', '두', '세', '네', '그', '이', '첫', '올', '한두']);
const MONEY_BAN = /수입|수익|연봉|월급|돈이 들어|재물운|부자|큰돈을 벌/;
const HEAD_POSITIVE_BAN = /순조로운|순조롭|좋은 해|술술/;
const DATE_TOKEN_HINT = /기간|날짜|월|해|년|흐름근거|시기/;

let C1 = [];
export function setC1(rows) {
  C1 = rows
    .filter((r) => r.pattern !== 're:\\d' && r.pattern !== 're:[0-9]')
    .map((r) => ({ r, rx: r.pattern.startsWith('re:') ? new RegExp(r.pattern.slice(3), 'm') : new RegExp(r.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
}

export const tokensIn = (t) => [...t.matchAll(TOKEN_RE)].map((m) => [m[1], m[2]]);
export const render = (t, values = {}, ph = '○○○○○') => t.replace(TOKEN_RE, (m, k) => (values[k] ?? ph));
const stripTokens = (t) => t.replace(TOKEN_RE, ' ');

export function splitSentences(text) {
  const t = text.trim().replace(TOKEN_RE, (m) => '⟦' + m.slice(2, -2).replace(/\./g, '·') + '⟧');
  return t.split(/(?<=[.!?。])\s+/).map((s) => s.trim()).filter(Boolean);
}
export function endingFamily(sentence) {
  let s = sentence.replace(/[”’"')]+$/, '').trim();
  const m = s.match(/⟦[^⟧]*:([^⟧]*)⟧[.!]?$/);
  if (m) s = m[1].split('/').pop();
  if (/(니다|니까)[.!]?$/.test(s)) return '합니다';
  if (/요[.!]?$/.test(s)) return '해요';
  return '기타';
}
export function bigramContainment(a, b) {
  const norm = (s) => s.replace(TOKEN_RE, '').replace(/[\s.,!?·‘’“”"'()]/g, '');
  a = norm(a); b = norm(b);
  if (a.length < 2 || b.length < 2) return 0;
  const gb = new Set(); for (let i = 0; i < b.length - 1; i++) gb.add(b.slice(i, i + 2));
  let hit = 0; for (let i = 0; i < a.length - 1; i++) if (gb.has(a.slice(i, i + 2))) hit++;
  return hit / (a.length - 1);
}
export function findNames(text) {
  const t = stripTokens(text);
  const found = new Set([...BODIES, ...SIGNS].filter((n) => t.includes(n)));
  for (const m of t.matchAll(MOON_RE)) {
    const before = t.slice(0, m.index).trimEnd().split(' ').pop() || '';
    if (!MOON_NOT_BEFORE.has(before)) found.add('달');
  }
  return found;
}
const err = (arr, code, msg) => arr.push({ code, msg });

function checkCommon(text, ctx, errors, warnings) {
  const known = new Set(Object.keys(ctx.tokens || {}));
  for (const [name, josa] of tokensIn(text)) {
    if (known.size && !known.has(name)) err(errors, 'TOKEN_UNKNOWN', `입력에 없는 토큰 {{${name}}}`);
    if (josa && !josa.includes('/')) err(errors, 'TOKEN_JOSA', `조사 토큰 형식 오류 {{${name}:${josa}}}`);
  }
  const d = stripTokens(text).match(DIGIT_RE);
  if (d) err(errors, 'DIGIT', `토큰 밖 숫자 '${d[0]}'`);
  if (text.includes('**')) err(errors, 'MARKDOWN', '** 사용');
  if (/^\s*\|/m.test(text)) err(errors, 'TABLE', '표를 만들었음(표는 서버가 그림)');
  const allowed = new Set(ctx.allowed_names || []);
  if (allowed.size) {
    const extra = [...findNames(text)].filter((n) => !allowed.has(n));
    if (extra.length) err(errors, 'NAME_NOT_IN_INPUT', '입력에 없는 행성·별자리: ' + extra.sort().join(', '));
  }
  for (const { r, rx } of C1) {
    const m = text.match(rx);
    if (m) (r.severity === '실패' ? errors : warnings).push({ code: r.id, msg: `${r.category} '${m[0]}' → ${r.replacement}` });
  }
  for (const part of LABEL_PARTS) {
    const i = text.indexOf(part);
    if (i >= 0) {
      const tail = text.slice(i + part.length, i + part.length + 6);
      if (!tail.startsWith('(') && !/^에 가까/.test(tail)) err(errors, 'LABEL_SINGLE', `판정 이름을 두 말로 함께 쓰지 않음 '${part}'`);
    }
  }
  if (ctx.wish === '경제적 여유' && MONEY_BAN.test(text)) err(errors, 'MONEY_PREDICT', '경제적 여유에서 수입·수익 예측 표현');
}

function checkEndings(sentences, errors, maxRun = 3, maxRatio = 0.65, minN = 5) {
  const fam = sentences.map(endingFamily);
  let run = 0, prev = null;
  for (const f of fam) {
    run = f === prev && f !== '기타' ? run + 1 : 1; prev = f;
    if (run >= maxRun) { err(errors, 'ENDING_RUN', `같은 계열 어미(${f})가 ${maxRun}문장 이상 이어짐`); break; }
  }
  const known = fam.filter((f) => f !== '기타');
  if (known.length >= minN) {
    const top = Math.max(known.filter((f) => f === '해요').length, known.filter((f) => f === '합니다').length) / known.length;
    if (top > maxRatio) err(errors, 'ENDING_RATIO', `한쪽 어미가 ${Math.round(top * 100)}% (기준 ${maxRatio * 100}% 이하)`);
  }
}

export function validateBridge(text, ctx) {
  const errors = [], warnings = [];
  text = text.trim();
  const sents = splitSentences(text);
  if (sents.length !== 4) err(errors, 'BRIDGE_SENTENCES', `4문장이어야 함(지금 ${sents.length}문장)`);
  const n = [...render(text, ctx.tokens)].length;
  if (n < 150 || n > 320) err(errors, 'BRIDGE_LENGTH', `150~320자여야 함(지금 ${n}자)`);
  if (ctx.wish && !text.includes(ctx.wish)) err(errors, 'BRIDGE_WISH', `바람 단어 '${ctx.wish}'가 없음`);
  const dateTokens = new Set(ctx.date_tokens || Object.keys(ctx.tokens || {}).filter((k) => DATE_TOKEN_HINT.test(k)));
  if (!tokensIn(text).some(([k]) => dateTokens.has(k))) err(errors, 'BRIDGE_DATE', '날짜 토큰이 하나도 없음');
  if (text.trimEnd().endsWith('?')) err(errors, 'BRIDGE_QUESTION', '질문으로 끝남');
  for (const db of ctx.db_sentences || []) {
    const r = bigramContainment(text, db);
    if (r >= 0.6) { err(errors, 'BRIDGE_OVERLAP', `DB 문장과 ${Math.round(r * 100)}% 겹침(60% 미만이어야 함)`); break; }
  }
  if (ctx.section === 5 && ctx.level_2027 === '역풍' && HEAD_POSITIVE_BAN.test(text)) err(errors, 'BRIDGE_HEAD_POSITIVE', '기반을 다지는 해(역풍)인데 좋게 포장하는 표현');
  checkCommon(text, ctx, errors, warnings);
  checkEndings(sents, errors);
  return { ok: !errors.length, errors, warnings, text };
}

export function validatePart(output, ctx) {
  const errors = [], warnings = [];
  const bridges = [...output.matchAll(BRIDGE_RE)].map((m) => validateBridge(m[1], ctx));
  const body = output.replace(BRIDGE_RE, (m, b) => b.trim());
  const sec = ctx.section;
  if ((sec === 5 || sec === 6) && !bridges.length) err(errors, 'BRIDGE_MISSING', `섹션 ${sec}에 <잇기> 블록이 없음`);
  if ((sec === 5 || sec === 6) && bridges.length > 1) err(errors, 'BRIDGE_MANY', '<잇기> 블록이 두 개 이상');
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith('#'));
  if (paras.length && splitSentences(paras[0]).length !== 1) err(errors, 'LEAD', '첫 문단이 두괄식 한 문장이 아님');
  const flat = (s) => s.replace(/\s+/g, '');
  for (const db of ctx.db_sentences || []) {
    if (!flat(body).includes(flat(db)) && !flat(render(body, ctx.tokens, '')).includes(flat(db))) err(errors, 'DB_MISSING', 'DB 문장이 빠짐: ' + db.slice(0, 30) + '…');
  }
  if (sec === 7 && !body.includes('3일 동안 쏘웰라 이용권')) err(errors, 'SOWELLA_3DAY', "마지막 안내에 '3일 동안 쏘웰라 이용권' 문장이 없음");
  if (sec === 5 && ctx.level_2027 === '역풍' && HEAD_POSITIVE_BAN.test(output.replace(BRIDGE_RE, ''))) err(errors, 'HEAD_POSITIVE', '역풍 해를 좋게 포장하는 표현');
  checkCommon(body, ctx, errors, warnings);
  checkEndings(paras.flatMap((p) => splitSentences(p)).filter((s) => !/^[•-]/.test(s)), errors);
  return { ok: !errors.length && bridges.every((b) => b.ok), errors, warnings, bridges, text: body };
}

// generate(retry) => Promise<string>. 최대 2번 시도 → 잇기만 실패면 B12로 교체 → 섹션 실패면 DB 문장만.
export async function finalizePart(generate, ctx, fallbackSection, fallbackBridge) {
  const attempts = [];
  for (let retry = 0; retry < 2; retry++) {
    const out = await generate(retry);
    const res = validatePart(out, ctx);
    attempts.push(res);
    if (res.ok) return { text: res.text, source: 'ai', attempts };
    if (!res.errors.length && fallbackBridge && retry === 1) {
      let i = 0;
      const text = out.replace(BRIDGE_RE, (m, b) => (res.bridges[i++].ok ? b.trim() : fallbackBridge));
      return { text, source: 'ai+b12', attempts };
    }
  }
  return { text: fallbackSection, source: 'db', attempts };
}
