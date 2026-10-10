"""해외 출생지 검색용 도시 목록 생성 — 2026-10-10 패키지 17_해외도시/해외도시_목록.json(4,565개) 기준.

원본: docs/spec/17_해외도시/해외도시_목록.json (GeoNames cities15000 수록본, CC BY 4.0, 한글 이름·IANA 시간대·서머타임 정보).
다시 만들기:  python3 -I scripts/build_overseas_cities.py docs/spec/17_해외도시/해외도시_목록.json data/astro/cities.json
- 한국(KR)은 원본에서 이미 빠져 있다(17개 시·도 드롭다운).
- 한글 이름이 없는 도시는 영문 이름으로 보여 준다.
- 검색키: 한글 이름·영문 이름·search_aliases(한글은 띄어쓰기 제거, 영문은 소문자·기호 제거).
- 시간 변환은 이 파일의 시간대(IANA) 그대로 서버가 한다(dst_now·dst_years는 문서용이라 넣지 않는다).
행: [geonameid, 영문이름, 한글이름("" 가능), 국가코드, 위도, 경도, 시간대, 인구, 검색키("|" 구분), 한글 국가명]
"""
import json
import sys
import unicodedata


def has_hangul(s):
    return any('가' <= c <= '힣' for c in s)


def norm(s):
    if has_hangul(s):
        return ''.join(c for c in s if c not in ' -·')
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return ''.join(c for c in s.lower() if c.isalnum())


def main(src, out):
    data = json.load(open(src, encoding='utf-8'))
    rows = []
    for c in data['cities']:
        if c['country_code'] == 'KR':
            continue
        keys = []
        for k in [c.get('name_ko') or '', c['name_en'], *(c.get('search_aliases') or '').split('|')]:
            k = norm(k.strip())
            if k and k not in keys:
                keys.append(k)
        rows.append([
            int(c['geoname_id']), c['name_en'], c.get('name_ko') or '', c['country_code'],
            round(float(c['lat']), 4), round(float(c['lng']), 4), c['timezone'], int(c.get('population') or 0),
            '|'.join(keys), c.get('country_ko') or '',
        ])
    rows.sort(key=lambda r: -r[7])
    json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(rows)} cities, {sum(1 for r in rows if r[2])} with Korean names → {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
