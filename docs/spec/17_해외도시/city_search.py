"""해외 출생 도시 검색 + 현지 출생시각 → UTC 변환 도우미.

- search(q, limit=10): name_ko / name_en / search_aliases 에서 대소문자·악센트·공백 무시 검색.
  정렬 = (정확 일치, 앞부분 일치, 인구 많은 순).
- to_utc(local_iso, timezone, fold=0): IANA 시간대로 UTC 변환.
  서머타임 전환 때문에 없는 시각이면 warning='gap', 두 번 있는 시각이면 warning='ambiguous'.

데이터: 같은 폴더의 해외도시_목록.json (GeoNames, CC BY 4.0).
"""
import json
import os
import unicodedata
from datetime import datetime, timezone as _tz
from zoneinfo import ZoneInfo

_HERE = os.path.dirname(os.path.abspath(__file__))
_DATA = os.path.join(_HERE, "해외도시_목록.json")
_CITIES = None


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = unicodedata.normalize("NFC", s)  # 한글 음절 다시 결합
    return "".join(s.lower().replace("’", "'").split())


def _load():
    global _CITIES
    if _CITIES is None:
        with open(_DATA, encoding="utf-8") as f:
            data = json.load(f)
        _CITIES = data["cities"]
        for c in _CITIES:
            keys = [c["name_ko"], c["name_en"]] + c["search_aliases"].split("|")
            c["_keys"] = [k for k in (_norm(x) for x in keys) if k]
    return _CITIES


def search(q, limit=10):
    """도시 검색. 결과는 원본 dict 목록(내부 키 제외)."""
    nq = _norm(q)
    if not nq:
        return []
    hits = []
    for c in _load():
        ks = c["_keys"]
        exact = any(k == nq for k in ks)
        prefix = exact or any(k.startswith(nq) for k in ks)
        if prefix or any(nq in k for k in ks):
            hits.append((not exact, not prefix, -c["population"], c))
    hits.sort(key=lambda t: t[:3])
    return [{k: v for k, v in h[3].items() if k != "_keys"} for h in hits[:limit]]


def _fmt_off(td):
    m = int(td.total_seconds() // 60)
    sign = "+" if m >= 0 else "-"
    m = abs(m)
    return f"{sign}{m // 60:02d}:{m % 60:02d}"


def to_utc(local_iso, timezone, fold=0):
    """현지 벽시계 시각(오프셋 없는 ISO 문자열) → UTC.

    fold=0: 두 번 있는 시각이면 첫 번째(서머타임 쪽), 없는 시각이면 앞으로 밀어 해석.
    fold=1: 두 번 있는 시각의 두 번째(표준시 쪽).
    반환: utc(ISO), utc_offset, dst(bool), warning(None/'gap'/'ambiguous'), local_used(실제 해석된 현지 시각)
    """
    naive = datetime.fromisoformat(local_iso)
    if naive.tzinfo is not None:
        raise ValueError("local_iso 에는 오프셋을 넣지 마세요 (현지 벽시계 시각만)")
    z = ZoneInfo(timezone)
    d0 = naive.replace(tzinfo=z, fold=0)
    d1 = naive.replace(tzinfo=z, fold=1)
    o0, o1 = d0.utcoffset(), d1.utcoffset()
    warning = None
    if o0 != o1:
        warning = "gap" if o0 < o1 else "ambiguous"
    d = naive.replace(tzinfo=z, fold=fold)
    u = d.astimezone(_tz.utc)
    back = u.astimezone(z)  # gap이면 앞으로 밀린 시각이 나온다
    return {
        "utc": u.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "utc_offset": _fmt_off(back.utcoffset()),
        "dst": bool(back.dst()),
        "warning": warning,
        "local_used": back.strftime("%Y-%m-%dT%H:%M"),
    }


if __name__ == "__main__":
    print("== search ==")
    for q in ["뉴욕", "도쿄", "sydney", "호찌민"]:
        res = search(q, limit=3)
        print(f"[{q}]", "; ".join(f"{c['name_ko'] or '-'} / {c['name_en']} ({c['country_ko']}, {c['timezone']})" for c in res))
    assert search("뉴욕")[0]["name_en"] == "New York City"
    assert search("도쿄")[0]["name_en"] == "Tokyo"
    assert search("sydney")[0]["timezone"] == "Australia/Sydney"
    assert search("호찌민")[0]["name_en"] == "Ho Chi Minh City"

    print("== to_utc ==")
    cases = [
        ("1990-07-15T10:00", "America/New_York", 0),
        ("1988-06-01T10:00", "Asia/Seoul", 0),
        ("1989-08-01T12:00", "Asia/Shanghai", 0),
        ("2000-01-10T09:00", "Australia/Sydney", 0),
        ("2021-11-07T01:30", "America/New_York", 0),
        ("2021-11-07T01:30", "America/New_York", 1),
        ("2021-03-14T02:30", "America/New_York", 0),
    ]
    for iso, tzname, f in cases:
        print(iso, tzname, f"fold={f}", "->", to_utc(iso, tzname, f))
    assert to_utc("1990-07-15T10:00", "America/New_York")["utc"] == "1990-07-15T14:00:00Z"
    assert to_utc("1988-06-01T10:00", "Asia/Seoul")["utc"] == "1988-06-01T00:00:00Z"
    assert to_utc("1989-08-01T12:00", "Asia/Shanghai")["utc"] == "1989-08-01T03:00:00Z"
    assert to_utc("2000-01-10T09:00", "Australia/Sydney")["utc"] == "2000-01-09T22:00:00Z"
    assert to_utc("2021-11-07T01:30", "America/New_York")["warning"] == "ambiguous"
    assert to_utc("2021-03-14T02:30", "America/New_York")["warning"] == "gap"
    print("자가 점검 통과")
