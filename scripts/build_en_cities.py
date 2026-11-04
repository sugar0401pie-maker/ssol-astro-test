# 영문판 출생 도시 목록(패키지 17_해외도시/영문판_출생도시_목록.json, 해외 4,565 + 한국 147) → data/astro/cities_en.json
# 한국어판 cities.json과 같은 줄 모양(CityRow)이라 같은 검색 함수(lib/astro/cities.ts)를 그대로 쓴다:
# [geonameid, 영문이름, 표시이름(=영문), 국가코드, 위도, 경도, 시간대, 인구, 검색키("|"), 표시 국가명(영문)]
# 사용: python3 -I scripts/build_en_cities.py <영문판_출생도시_목록.json> data/astro/cities_en.json
import json, sys, unicodedata, re
src, out = sys.argv[1], sys.argv[2]
rows = json.load(open(src, encoding="utf-8"))["cities"]
def norm(s):
    if re.search(r"[가-힣]", s): return re.sub(r"[\s\-·]", "", s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]", "", s)
res = []
for r in rows:
    keys = []
    for k in [r["name_en"], r.get("name_ko") or ""] + (r.get("search_aliases") or "").split("|"):
        n = norm(k)
        if n and n not in keys: keys.append(n)
    res.append([r["geoname_id"], r["name_en"], r["name_en"], r["country_code"], round(r["lat"], 4), round(r["lng"], 4), r["timezone"], r["population"], "|".join(keys), r["country_en"]])
res.sort(key=lambda x: -x[7])
json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(res), "rows", sum(1 for x in res if x[3] == "KR"), "KR")
