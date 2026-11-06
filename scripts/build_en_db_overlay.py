"""영문 해석 DB 덮어쓰기 파일 만들기(영문판, 2026-11-04).

번역 묶음(docs/spec/20_영문번역/상담사검수_1차·2차_*_KO-EN_*.json)의 en 칸을
data/astro/db/astro_db_en_overlay.json = {표: {행 id: {칸: 영문}}} 로 모은다.
- 서버는 한국어 DB(astro_db_v1.4.json)를 복사한 뒤 이 값으로 바꿔 영문 DB를 만든다(lib/report/dbDataEn.ts).
- 코드가 행을 찾을 때 쓰는 칸(LOOKUP)은 한국어 그대로 두고, 영문은 '<칸>_en'으로 따로 둔다.
- en_site: "exclude"(한국어판 전용) 행·en이 빈 칸은 넣지 않는다.
- 문장은 고치지 않는다. 번역을 고치려면 번역 엑셀/JSON을 고쳐 이 스크립트를 다시 돌린다.

사용: python3 -I scripts/build_en_db_overlay.py <1차 json> <2차 json> <출력 json> [번역 요청 xlsx ...]
- 2026-11-06부터: 기획이 채워 보낸 번역 요청 엑셀('번역' 시트: 구분·표·ID·칸·한국어·영어·메모)도 받는다.
  같은 칸이 JSON에도 있으면 엑셀 값을 쓴다(나중에 온 번역).
"""
import json
import sys

LOOKUP = {
    "character", "place", "name", "word", "wish", "competency", "kind", "domain", "level", "section", "slot",
    "area", "theme", "sun_element", "moon_element", "movement", "temperament", "wish_group", "edge", "condition",
    "planet_a", "planet_b", "state", "fit_words", "rule", "source",
}


# 번역이 영문 금지어 검사(C1_EN)에 걸려 기획에 고쳐 달라고 한 칸 — 고친 번역이 오면 이 목록에서 뺀다.
# (표, ID, 칸): 이유
# (2026-11-06 A12b Q2_11_CL_3은 owner 승인 표현으로 엑셀을 고쳐 목록에서 뺌)
HOLD: dict = {}


def main(free_path, paid_path, out_path, *extra):
    out = {}
    n = 0
    for p in (free_path, paid_path):
        with open(p, encoding="utf-8") as f:
            dbs = json.load(f)["dbs"]
        for table, t in dbs.items():
            for r in t["rows"]:
                if r.get("en_site") == "exclude":
                    continue
                en = r.get("en")
                if not isinstance(en, str) or not en.strip():
                    continue
                field = r["field"] + "_en" if r["field"] in LOOKUP else r["field"]
                out.setdefault(table, {}).setdefault(r["id"], {})[field] = en
                n += 1
    for xp in extra:
        import openpyxl
        ws = openpyxl.load_workbook(xp, read_only=True)["번역"]
        for r in ws.iter_rows(min_row=2, values_only=True):
            table, rid, col, en = r[1], r[2], r[3], r[5]
            if not (table and rid and col) or not isinstance(en, str) or not en.strip():
                continue
            if (table, rid, col) in HOLD:
                print("보류:", table, rid, col, "—", HOLD[(table, rid, col)])
                continue
            field = col + "_en" if col in LOOKUP else col
            out.setdefault(table, {}).setdefault(rid, {})[field] = en.strip()
            n += 1
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(out_path, n, "cells")


if __name__ == "__main__":
    main(*sys.argv[1:])
