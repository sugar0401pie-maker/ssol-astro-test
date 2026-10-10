#!/usr/bin/env python3
"""쏠 아스트로 하우스 — 유료 리포트 AI 출력 검증기 (v1, 2026-10-09)

06_리포트프롬프트_점성술.md 의 규칙을 코드로 옮긴 것. 같은 규칙의 JS 판은 validateAi.mjs.

    from validate_ai import validate_part, validate_bridge, finalize_part

    ctx = {
        'section': 5,                       # 4·5·6·7
        'wish': '안정',                      # Q3 바람
        'level_2027': '역풍',                # 순풍/보통/역풍 (섹션 5의 2027 판정)
        'tokens': {'흐름근거': '7월 말 목성이 집·뿌리의 자리로 들어오는', 'S_기간': '3~10월'},
        'date_tokens': ['흐름근거', 'S_기간'],   # 생략하면 이름으로 추정
        'allowed_names': ['목성', '토성', '달'],   # 입력에 나온 행성·별자리 이름
        'db_sentences': ['다가오는 해는 안정을 바로 얻기는 ...'],  # 이 섹션에 꼭 들어갈 DB 문장(토큰 채운 뒤)
        'soft_tone': False,
    }
    result = validate_part(ai_text, ctx)    # {'ok', 'errors', 'warnings', 'bridges', 'text'}

검사 순서: (1) <잇기> 블록 꺼내 4문장 규칙 검사 (2) 섹션 전체 공통 규칙 (3) 섹션별 규칙.
실패하면 finalize_part()가 1회 재생성 → 그래도 실패면 B12 대체 문장(잇기) / DB 문장만(섹션)으로 바꾼다.
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
DB_BUNDLE = os.path.join(BASE, '..', '11_해석DB', 'astro_db_v1.2.json')

TOKEN_RE = re.compile(r'\{\{([^{}:]+)(?::([^{}]+))?\}\}')
BRIDGE_RE = re.compile(r'<잇기>(.*?)</잇기>', re.S)
DIGIT_RE = re.compile(r'[0-9０-９]')

LABELS = {'순풍': '활짝 열리는 해(순풍)', '보통': '내 손에 달린 해(보통)', '역풍': '기반을 다지는 해(역풍)'}
LABEL_PARTS = ['활짝 열리는 해', '내 손에 달린 해', '기반을 다지는 해']
BODIES = ['태양', '수성', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성', '키론', '상승궁', '천정']
SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리',
         '사수자리', '염소자리', '물병자리', '물고기자리']
# '달'은 일상어(이번 달·한 달)와 겹쳐 따로 판별
MOON_RE = re.compile(r'(?<![가-힣])달(?=[이의과와을를은는에도]|\s)')
MOON_NOT_BEFORE = ('이번', '한', '다음', '지난', '매', '몇', '두', '세', '네', '그', '이', '첫', '올', '한두', '이번 한')
MONEY_BAN = re.compile(r'수입|수익|연봉|월급|돈이 들어|재물운|부자|큰돈을 벌')
HEAD_POSITIVE_BAN = re.compile(r'순조로운|순조롭|좋은 해|술술')
DATE_TOKEN_HINT = re.compile(r'기간|날짜|월|해|년|흐름근거|시기')
END_YO = re.compile(r'요[.!]?$')
END_NIDA = re.compile(r'(니다|니까)[.!]?$')

_rules = None


def load_c1(path=None):
    """C1 금지어 규칙. 기본은 11_해석DB/astro_db_v1.2.json 안의 C1."""
    global _rules
    if _rules is not None:
        return _rules
    path = path or DB_BUNDLE
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    rows = d['dbs']['C1']['rows'] if 'dbs' in d else d['rows']
    rules = []
    for r in rows:
        p = r['pattern']
        if p in ('re:\\d', 're:[0-9]'):
            continue  # 숫자는 아래에서 토큰을 지운 뒤 따로 검사
        rx = re.compile(p[3:], re.M) if p.startswith('re:') else re.compile(re.escape(p))
        rules.append((r, rx))
    _rules = rules
    return rules


# ---------------- 도우미 ----------------

def tokens_in(text):
    return [(m.group(1), m.group(2)) for m in TOKEN_RE.finditer(text)]


def render(text, values=None, placeholder='○○○○○'):
    """토큰을 실제 값(없으면 자리 글자)으로 바꾼 글. 길이 계산용."""
    values = values or {}
    return TOKEN_RE.sub(lambda m: str(values.get(m.group(1), placeholder)), text)


def split_sentences(text):
    t = TOKEN_RE.sub(lambda m: '⟦' + m.group(0)[2:-2].replace('.', '·') + '⟧', text.strip())
    parts = re.split(r'(?<=[.!?。])\s+', t)
    return [p.strip() for p in parts if p.strip()]


def ending_family(sentence):
    s = sentence.rstrip('”’"\')').strip()
    m = re.search(r'⟦[^⟧]*:([^⟧]*)⟧[.!]?$', s)
    if m:  # 문장이 조사 토큰으로 끝나면 조사 후보의 마지막 것으로 판단
        s = m.group(1).split('/')[-1]
    if END_NIDA.search(s):
        return '합니다'
    if END_YO.search(s):
        return '해요'
    return '기타'


def bigram_containment(a, b):
    """a의 글자 2개 묶음 가운데 b에도 있는 비율(공백·문장부호 제외)."""
    norm = lambda s: re.sub(r'[\s.,!?·‘’“”"\'()]', '', TOKEN_RE.sub('', s))
    a, b = norm(a), norm(b)
    if len(a) < 2 or len(b) < 2:
        return 0.0
    ga = [a[i:i + 2] for i in range(len(a) - 1)]
    gb = set(b[i:i + 2] for i in range(len(b) - 1))
    return sum(1 for g in ga if g in gb) / len(ga)


def find_names(text):
    """글에 나온 행성·별자리 이름(토큰 안은 제외)."""
    t = TOKEN_RE.sub(' ', text)
    found = set(n for n in BODIES + SIGNS if n in t)
    for m in MOON_RE.finditer(t):
        before = t[:m.start()].rstrip().split(' ')[-1] if t[:m.start()].strip() else ''
        if before not in MOON_NOT_BEFORE:
            found.add('달')
    return found


def _err(errors, code, msg):
    errors.append({'code': code, 'msg': msg})


# ---------------- 공통 규칙 ----------------

def check_common(text, ctx, errors, warnings):
    known = set(ctx.get('tokens', {}).keys())
    for name, josa in tokens_in(text):
        if known and name not in known:
            _err(errors, 'TOKEN_UNKNOWN', f'입력에 없는 토큰 {{{{{name}}}}}')
        if josa and '/' not in josa:
            _err(errors, 'TOKEN_JOSA', f'조사 토큰 형식 오류 {{{{{name}:{josa}}}}}')
    stripped = TOKEN_RE.sub(' ', text)
    for m in DIGIT_RE.finditer(stripped):
        _err(errors, 'DIGIT', f"토큰 밖 숫자 '{m.group(0)}'")
        break
    if '**' in text:
        _err(errors, 'MARKDOWN', '** 사용')
    if re.search(r'^\s*\|', text, re.M):
        _err(errors, 'TABLE', '표를 만들었음(표는 서버가 그림)')
    allowed = set(ctx.get('allowed_names', []))
    if allowed:
        extra = find_names(text) - allowed
        if extra:
            _err(errors, 'NAME_NOT_IN_INPUT', '입력에 없는 행성·별자리: ' + ', '.join(sorted(extra)))
    for r, rx in load_c1():
        m = rx.search(text)
        if m:
            (errors if r['severity'] == '실패' else warnings).append(
                {'code': r['id'], 'msg': f"{r['category']} '{m.group(0)}' → {r['replacement']}"})
    # 판정 이름: 앞부분만 쓰고 괄호 이름을 빼먹으면 실패
    for part in LABEL_PARTS:
        for m in re.finditer(re.escape(part), text):
            tail = text[m.end():m.end() + 4]
            if not tail.startswith('('):
                nxt = text[m.end():m.end() + 6]
                if not re.match(r'에 가까', nxt):  # '활짝 열리는 해에 가까움' 경계 표시는 허용
                    _err(errors, 'LABEL_SINGLE', f"판정 이름을 두 말로 함께 쓰지 않음 '{part}'")
                break
    if MONEY_BAN.search(text) and ctx.get('wish') == '경제적 여유':
        _err(errors, 'MONEY_PREDICT', '경제적 여유에서 수입·수익 예측 표현')


def check_endings(sentences, errors, warnings, max_run=3, max_ratio=0.65, min_n=5):
    fam = [ending_family(s) for s in sentences]
    run, prev = 0, None
    for f in fam:
        run = run + 1 if (f == prev and f != '기타') else 1
        prev = f
        if run >= max_run:
            _err(errors, 'ENDING_RUN', f"같은 계열 어미({f})가 {max_run}문장 이상 이어짐")
            break
    known = [f for f in fam if f != '기타']
    if len(known) >= min_n:
        top = max(known.count('해요'), known.count('합니다')) / len(known)
        if top > max_ratio:
            _err(errors, 'ENDING_RATIO', f'한쪽 어미가 {top:.0%} (기준 {max_ratio:.0%} 이하)')


# ---------------- 바람과 흐름 잇기(4문장) ----------------

def validate_bridge(text, ctx):
    errors, warnings = [], []
    text = text.strip()
    sents = split_sentences(text)
    if len(sents) != 4:
        _err(errors, 'BRIDGE_SENTENCES', f'4문장이어야 함(지금 {len(sents)}문장)')
    n = len(render(text, ctx.get('tokens')))
    if not 150 <= n <= 320:
        _err(errors, 'BRIDGE_LENGTH', f'150~320자여야 함(지금 {n}자)')
    wish = ctx.get('wish')
    if wish and wish not in text:
        _err(errors, 'BRIDGE_WISH', f"바람 단어 '{wish}'가 없음")
    date_tokens = set(ctx.get('date_tokens') or [k for k in ctx.get('tokens', {}) if DATE_TOKEN_HINT.search(k)])
    if not any(name in date_tokens for name, _ in tokens_in(text)):
        _err(errors, 'BRIDGE_DATE', '날짜 토큰이 하나도 없음')
    if text.rstrip().endswith('?'):
        _err(errors, 'BRIDGE_QUESTION', '질문으로 끝남')
    for db in ctx.get('db_sentences', []):
        r = bigram_containment(text, db)
        if r >= 0.6:
            _err(errors, 'BRIDGE_OVERLAP', f'DB 문장과 {r:.0%} 겹침(60% 미만이어야 함)')
            break
    if ctx.get('section') == 5 and ctx.get('level_2027') == '역풍' and HEAD_POSITIVE_BAN.search(text):
        _err(errors, 'BRIDGE_HEAD_POSITIVE', '기반을 다지는 해(역풍)인데 좋게 포장하는 표현')
    check_common(text, ctx, errors, warnings)
    check_endings(sents, errors, warnings)
    return {'ok': not errors, 'errors': errors, 'warnings': warnings, 'text': text}


# ---------------- 섹션 전체 ----------------

def validate_part(output, ctx):
    """AI가 쓴 섹션 하나(또는 6+7 묶음)를 검사. <잇기> 블록은 따로 꺼내 검사한다."""
    errors, warnings, bridges = [], [], []
    for m in BRIDGE_RE.finditer(output):
        bridges.append(validate_bridge(m.group(1), ctx))
    body = BRIDGE_RE.sub(lambda m: m.group(1).strip(), output)
    sec = ctx.get('section')
    if sec in (5, 6) and not bridges:
        _err(errors, 'BRIDGE_MISSING', f'섹션 {sec}에 <잇기> 블록이 없음')
    if len(bridges) > 1 and sec in (5, 6):
        _err(errors, 'BRIDGE_MANY', '<잇기> 블록이 두 개 이상')
    paras = [p.strip() for p in re.split(r'\n\s*\n', body) if p.strip() and not p.strip().startswith('#')]
    if paras and len(split_sentences(paras[0])) != 1:
        _err(errors, 'LEAD', '첫 문단이 두괄식 한 문장이 아님')
    for db in ctx.get('db_sentences', []):
        if re.sub(r'\s+', '', db) not in re.sub(r'\s+', '', render(body, ctx.get('tokens'), placeholder='')) \
                and re.sub(r'\s+', '', db) not in re.sub(r'\s+', '', body):
            _err(errors, 'DB_MISSING', 'DB 문장이 빠짐: ' + db[:30] + '…')
    if sec == 7 and '3일 동안 쏘웰라 이용권' not in body:
        _err(errors, 'SOWELLA_3DAY', "마지막 안내에 '3일 동안 쏘웰라 이용권' 문장이 없음")
    if ctx.get('level_2027') == '역풍' and sec == 5:
        if HEAD_POSITIVE_BAN.search(BRIDGE_RE.sub('', output)):
            _err(errors, 'HEAD_POSITIVE', '역풍 해를 좋게 포장하는 표현')
    check_common(body, ctx, errors, warnings)
    check_endings([s for p in paras for s in split_sentences(p) if not s.startswith(('•', '-'))], errors, warnings)
    ok = not errors and all(b['ok'] for b in bridges)
    return {'ok': ok, 'errors': errors, 'warnings': warnings, 'bridges': bridges, 'text': body}


# ---------------- 재생성·대체 ----------------

def finalize_part(generate, ctx, fallback_section, fallback_bridge=None):
    """generate(retry:int) -> str 를 받아 최대 2번 시도.
    - 섹션은 통과했는데 잇기만 떨어지면: 잇기만 B12 대체 문장으로 바꿔 끼움
    - 2번 다 섹션이 떨어지면: fallback_section(DB 문장만 조립한 판)을 씀
    반환: {'text', 'source': 'ai'|'ai+b12'|'db', 'attempts': [...결과]}
    """
    attempts = []
    for retry in range(2):
        out = generate(retry)
        res = validate_part(out, ctx)
        attempts.append(res)
        if res['ok']:
            return {'text': res['text'], 'source': 'ai', 'attempts': attempts}
        if not res['errors'] and fallback_bridge and retry == 1:
            text = out
            for m, b in zip(list(BRIDGE_RE.finditer(out)), res['bridges']):
                if not b['ok']:
                    text = text.replace(m.group(0), fallback_bridge)
            return {'text': BRIDGE_RE.sub(lambda m: m.group(1).strip(), text), 'source': 'ai+b12', 'attempts': attempts}
    return {'text': fallback_section, 'source': 'db', 'attempts': attempts}


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print('사용법: python3 validate_ai.py ai_output.txt ctx.json')
        sys.exit(2)
    out = open(sys.argv[1], encoding='utf-8').read()
    ctx = json.load(open(sys.argv[2], encoding='utf-8'))
    r = validate_part(out, ctx)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    sys.exit(0 if r['ok'] else 1)
