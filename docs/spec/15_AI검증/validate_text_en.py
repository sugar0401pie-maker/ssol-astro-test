#!/usr/bin/env python3
"""SSOL Astro House — English banned-word / style validator (C1_EN).

    from validate_text_en import validate
    hits = validate(text, scope='DB')   # or scope='AI'

CLI: python3 validate_text_en.py file.json [...]   (file = {"key": {"en": ...}} or [{"key":..,"en":..}])
Tokens such as {닉네임} and {{근거}} are removed before checking.
"""
import json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
C1_PATH = os.path.join(BASE, '..', '11_해석DB', 'C1_EN.json')
TOKEN_RE = re.compile(r'\{\{[^{}]*\}\}|\{[^{}]*\}')
_rules = None


def load_rules(path=C1_PATH):
    global _rules
    if _rules is None:
        rows = json.load(open(path, encoding='utf-8'))['rows']
        _rules = []
        for r in rows:
            p = r['pattern']
            rx = re.compile(p[3:], re.M) if p.startswith('re:') else re.compile(re.escape(p))
            _rules.append((r, rx))
    return _rules


def validate(text, scope='DB'):
    scope = scope.upper()
    clean = TOKEN_RE.sub(' ', text or '')
    hits = []
    for r, rx in load_rules():
        if r['scope'] == 'AI만' and scope != 'AI':
            continue
        m = rx.search(clean)
        if m:
            hits.append({'id': r['id'], 'category': r['category'], 'severity': r['severity'],
                         'match': m.group(0), 'replacement': r['replacement'], 'note': r['note']})
    return hits


if __name__ == '__main__':
    fail = 0
    for path in sys.argv[1:]:
        data = json.load(open(path, encoding='utf-8'))
        items = data.items() if isinstance(data, dict) else ((d['key'], d) for d in data)
        for key, v in items:
            for h in validate(v.get('en', '') if isinstance(v, dict) else str(v)):
                print(f"{h['severity']}\t{key}\t{h['id']}\t{h['match']!r}\t{h['note']}")
                fail += h['severity'] == '실패'
    print('실패', fail)
