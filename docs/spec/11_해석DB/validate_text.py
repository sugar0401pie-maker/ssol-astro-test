#!/usr/bin/env python3
"""쏠 아스트로 하우스 — 금지어·형식 검증기 (C1 사전 기반).

    from validate_text import validate
    hits = validate(text, scope='DB')   # 또는 scope='AI'

CLI: python3 validate_text.py [파일.json ...]
     인자가 없으면 /home/claude/db_work/out/*.json 의 화면 문장 칸을 모두 검사한다.
"""
import glob
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
C1_PATH = os.path.join(BASE, 'out', 'C1.json')

TOKEN_RE = re.compile(r'\{\{[^{}]*\}\}|\{[^{}]*\}')
DIGIT_RE = re.compile(r'[0-9０-９]')

# 화면에 나가지 않거나 데이터인 칸
SKIP_KEYS = {
    'id', 'review_note', 'dates', 'image_file', 'house', 'house_label',
    'period_label', 'event', 'name', 'minutes', 'houses', 'planets',
    'scene_hint', 'in_service_range',
    'section', 'note', 'slot', 'variant', 'level', 'wish', 'word',
}
SKIP_KEY_RE = re.compile(r'(_theory|^p\d+_id$)')
DIGIT_OK_ROWS = {'FIX_PAYWALL_BOX', 'FIX_SOWELLA_3DAY'}
SKIP_FILES = {'C1.json', 'C2.json', 'B11.json'}  # 사전 자체(데이터)

_rules = None


def load_rules(path=C1_PATH):
    global _rules
    if _rules is None:
        with open(path, encoding='utf-8') as f:
            rows = json.load(f)['rows']
        rules = []
        for r in rows:
            p = r['pattern']
            if p.startswith('re:'):
                rx = re.compile(p[3:], re.M)
            else:
                rx = re.compile(re.escape(p))
            rules.append((r, rx))
        _rules = rules
    return _rules


def validate(text, scope='DB', allow_digits=False):
    """text를 검사해 hit 목록을 돌려준다.

    scope='DB' : scope가 'DB+AI'인 규칙 + GUIDE 9(문장 칸 숫자 금지)
    scope='AI' : 모든 규칙('DB+AI', 'AI만'). 숫자 규칙은 토큰을 지운 뒤 검사.
    hit = {id, category, severity, pattern, match, replacement, note}
    """
    scope = scope.upper()
    if scope not in ('DB', 'AI'):
        raise ValueError("scope must be 'DB' or 'AI'")
    hits = []
    if not isinstance(text, str) or not text:
        return hits
    stripped = TOKEN_RE.sub(' ', text)
    for r, rx in load_rules():
        if scope == 'DB' and r['scope'] != 'DB+AI':
            continue
        is_digit_rule = r['pattern'] in ('re:\\d', 're:[0-9]')
        if is_digit_rule and allow_digits:
            continue
        target = stripped if is_digit_rule else text
        for m in rx.finditer(target):
            hits.append({
                'id': r['id'], 'category': r['category'], 'severity': r['severity'],
                'pattern': r['pattern'], 'match': m.group(0),
                'replacement': r['replacement'], 'note': r['note'],
            })
    if scope == 'DB' and not allow_digits:
        for m in DIGIT_RE.finditer(stripped):
            hits.append({
                'id': 'GUIDE_9', 'category': '형식', 'severity': '실패',
                'pattern': '토큰 밖 숫자(DB)', 'match': m.group(0),
                'replacement': '말로 쓰거나 {{기간}} 등 토큰', 'note': 'GUIDE 9',
            })
    return hits


def screen_cells(row):
    for k, v in row.items():
        if k in SKIP_KEYS or SKIP_KEY_RE.search(k):
            continue
        if isinstance(v, str) and v:
            yield k, v


def scan_files(paths):
    total = {'실패': 0, '경고': 0}
    per_file = {}
    out = []
    for path in paths:
        fn = os.path.basename(path)
        if fn in SKIP_FILES:
            continue
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        n = 0
        for row in d.get('rows', []):
            rid = row.get('id', '?')
            for k, v in screen_cells(row):
                for h in validate(v, 'DB', allow_digits=rid in DIGIT_OK_ROWS):
                    n += 1
                    total[h['severity']] = total.get(h['severity'], 0) + 1
                    out.append(f"[{h['severity']}] {fn} {rid}.{k} — {h['id']} {h['category']} "
                               f"'{h['match']}'" + (f" → {h['replacement']}" if h['replacement'] else ''))
        per_file[fn] = n
    return out, per_file, total


def main(argv):
    paths = argv[1:] or sorted(glob.glob(os.path.join(BASE, 'out', '*.json')))
    lines, per_file, total = scan_files(paths)
    for line in lines:
        print(line)
    print('\n== 파일별 hit ==')
    for fn, n in per_file.items():
        print(f'{fn}: {n}')
    print(f"\n합계: 실패 {total.get('실패', 0)} · 경고 {total.get('경고', 0)}")
    return 1 if total.get('실패', 0) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
