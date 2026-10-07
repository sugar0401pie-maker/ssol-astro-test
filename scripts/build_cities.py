"""해외 출생지 검색용 도시 목록 생성 (마스터스펙 6-1 '태어난 곳 처리').

원본: GeoNames cities15000 (인구 1.5만 명 이상 도시) — https://download.geonames.org/export/dump/
라이선스: CC BY 4.0 — 화면 어딘가에 "도시 데이터: GeoNames (CC BY 4.0)" 표기가 필요하다(lib/astro/cities.ts).

다시 만들기:  python3 -I scripts/build_cities.py <cities15000.txt 경로> data/astro/cities.json
- 한국(KR)은 17개 시·도 드롭다운을 쓰므로 뺀다.
- 검색어는 한글 대체명 전부 + 영문 이름(대문자로 시작하는 ASCII 대체명)만 남겨 크기를 줄인다.
- 한글 표시 이름은 처음 나오는 한글 대체명, 끝의 ' 시'는 뗀다('청두 시' → '청두').
- 사용자 입력은 외부로 나가지 않는다: 이 파일을 서버가 직접 읽어 검색한다.
행: [geonameid, 영문이름, 한글이름("" 가능), 국가코드, 위도, 경도, 시간대, 인구, 검색키("|" 구분)]
"""
import json
import sys
import unicodedata


def is_hangul(s):
    return any('가' <= c <= '힣' for c in s) and all('가' <= c <= '힣' or c in ' -·' for c in s)


def display_ko(names):
    if not names:
        return ''
    n = names[0]
    return n[:-2] if n.endswith(' 시') else n


def norm_latin(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return ''.join(c for c in s.lower() if c.isalnum())


def main(src, out):
    rows = []
    for line in open(src, encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        gid, name, ascii_name, alts, lat, lng = f[0], f[1], f[2], f[3], f[4], f[5]
        cc, pop, tz = f[8], f[14], f[17]
        if cc == 'KR' or not tz:
            continue
        alt_list = [a for a in alts.split(',') if a] if alts else []
        ko_names = [a.strip() for a in alt_list if is_hangul(a.strip())]
        keys = set()
        # 영문 대체명은 'Saigon'처럼 대문자로 시작하는 이름만 — 소문자 로마자 표기(다른 언어 음역)는 크기만 키운다.
        latin_alts = [a for a in alt_list if a.isascii() and a[:1].isupper() and all(c.isalpha() or c in " -'." for c in a)]
        for a in [name, ascii_name] + latin_alts:
            if a.isascii() and 1 < len(a) <= 40:
                k = norm_latin(a)
                if k:
                    keys.add(k)
        k = norm_latin(name)
        if k:
            keys.add(k)
        for ko in ko_names:
            keys.add(ko.replace(' ', '').replace('-', '').replace('·', ''))
        rows.append([
            int(gid), ascii_name or name, display_ko(ko_names), cc,
            round(float(lat), 4), round(float(lng), 4), tz, int(pop or 0), '|'.join(sorted(keys)),
        ])
    rows.sort(key=lambda r: -r[7])
    with open(out, 'w', encoding='utf-8') as fp:
        json.dump(rows, fp, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(rows)} rows -> {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
