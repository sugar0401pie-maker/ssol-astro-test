"""
쏠 아스트로 하우스 — 계산 엔진 프로토타입 v2 (2026-10-07)
pip install astronomy-engine   (MIT)

하는 일
1) 출생차트: 10행성 경도·별자리·홀사인 하우스, ASC·MC, 주요 각도, 4원소 점수
2) 캐릭터: 가장 긴장받는 행성(역량, 행성별 백분위) × 가장 강한 원소(방식)
3) 트랜짓: 목성·토성·천왕성·해왕성·명왕성 × 출생 태양·달·수성·금성·화성·ASC·MC·토성(리턴)
   합/육분/사각/삼분/충 → 시작·정확·종료일 (하루 간격, 정오 KST)
4) 역행 시작/종료일(수성·금성·화성), 목성·토성 별자리(하우스) 이동일
출력: JSON (날짜는 ISO 문자열 — 화면·AI 토큰은 이 값을 서버 포맷 함수로 변환)

주의: 하루 간격이라 정확일은 ±1일. 서비스에서는 이분법으로 시간 단위까지 좁힌다.
      시간대는 IANA ID로 UTC 변환 후 입력한다(이 파일은 UTC datetime을 받는다).
"""
import astronomy, math, datetime, json, bisect, random, collections, sys

B = astronomy.Body
BODIES = {'sun': B.Sun, 'moon': B.Moon, 'mercury': B.Mercury, 'venus': B.Venus, 'mars': B.Mars,
          'jupiter': B.Jupiter, 'saturn': B.Saturn, 'uranus': B.Uranus, 'neptune': B.Neptune, 'pluto': B.Pluto}
SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리',
         '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리']
ELEM = ['불', '흙', '공기', '물']
STYLE = {'불': '다가가기', '물': '맞춰주기', '공기': '거리두기', '흙': '조율하기'}
COMP = {'moon': '기대기', 'saturn': '믿기', 'mars': '선 지키기', 'mercury': '말하기', 'venus': '회복하기'}
GRID = {'기대기': ['수달', '해달', '물범', '비버'], '믿기': ['원앙', '펭귄', '왜가리', '백조'],
        '선 지키기': ['복어', '소라게', '거북', '조개'], '말하기': ['물개', '돌고래', '혹등고래', '개구리'],
        '회복하기': ['문어', '해파리', '가오리', '불가사리']}
COLS = ['다가가기', '맞춰주기', '거리두기', '조율하기']
MAL = {'mars', 'saturn', 'uranus', 'neptune', 'pluto'}
BEN = {'jupiter', 'venus'}
EW = {'sun': 3, 'moon': 3, 'mercury': 2, 'venus': 2, 'mars': 2, 'jupiter': 1, 'saturn': 1}
ASPECTS = {0: '합', 60: '육분', 90: '사각', 120: '삼분', 180: '충'}
TRANSIT = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
TRANSIT_ORB = {'jupiter': 2, 'saturn': 2, 'uranus': 1.5, 'neptune': 1.5, 'pluto': 1.5}
TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'asc', 'mc', 'saturn']


def t_of(dt):
    return astronomy.Time.Make(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)


def lon(body, t):
    return astronomy.Ecliptic(astronomy.GeoVector(body, t, True)).elon


def sep(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def natal(dt_utc, lat, lng, with_time=True):
    t = t_of(dt_utc)
    L = {k: lon(b, t) for k, b in BODIES.items()}
    out = {'planets': {}, 'accuracy': 'A' if with_time else 'C'}
    if with_time:
        lst = (astronomy.SiderealTime(t) + lng / 15) % 24
        ramc = math.radians(lst * 15)
        eps = math.radians(23.4393 - 0.013 * ((dt_utc.year - 2000) / 100))
        phi = math.radians(lat)
        asc = math.degrees(math.atan2(math.cos(ramc), -(math.sin(ramc) * math.cos(eps) + math.tan(phi) * math.sin(eps)))) % 360
        mc = math.degrees(math.atan2(math.sin(ramc), math.cos(ramc) * math.cos(eps))) % 360
        L['asc'], L['mc'] = asc, mc
    asc_sign = int(L['asc'] // 30) if with_time else None
    for k, v in L.items():
        p = {'lon': round(v, 2), 'sign': SIGNS[int(v // 30)], 'deg': round(v % 30, 1)}
        if asc_sign is not None:
            p['house'] = (int(v // 30) - asc_sign) % 12 + 1  # 홀사인
        out['planets'][k] = p
    names = [n for n in L]
    asp = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if {a, b} == {'asc', 'mc'}:
                continue
            d = sep(L[a], L[b])
            for ang, nm in ASPECTS.items():
                if abs(d - ang) < 6:
                    asp.append({'a': a, 'b': b, 'aspect': nm, 'orb': round(abs(d - ang), 1)})
    out['aspects'] = asp
    c = collections.Counter()
    for k, w in EW.items():
        c[ELEM[int(L[k] // 30) % 4]] += w
    out['elements'] = {e: c.get(e, 0) for e in ELEM}
    return out, L


def stress(p, L):
    sc = 0.0
    for q in BODIES:
        if q == p:
            continue
        d = sep(L[p], L[q])
        if q in MAL:
            for a in (0, 90, 180):
                o = abs(d - a)
                if o < 6:
                    sc -= 1 - o / 6
        if q in BEN:
            for a in (0, 60, 120):
                o = abs(d - a)
                if o < 6:
                    sc += 1 - o / 6
    return sc


def calibration(n=3000, seed=1):
    """행성별 긴장 점수 분포(백분위 보정표). 서비스에서는 미리 계산해 파일로 저장한다."""
    random.seed(seed)
    start = datetime.datetime(1965, 1, 1)
    span = (datetime.datetime(2006, 1, 1) - start).total_seconds()
    ref = {p: [] for p in COMP}
    for _ in range(n):
        dt = start + datetime.timedelta(seconds=random.random() * span)
        t = t_of(dt)
        L = {k: lon(b, t) for k, b in BODIES.items()}
        for p in COMP:
            ref[p].append(stress(p, L))
    return {p: sorted(v) for p, v in ref.items()}


def character(L, elements, ref):
    pct = {p: bisect.bisect_left(ref[p], stress(p, L)) / len(ref[p]) for p in COMP}
    order = sorted(pct, key=pct.get)
    comp = COMP[order[0]]
    best = max(elements.values())
    tops = [e for e, v in elements.items() if v == best]
    elem = tops[0]
    if len(tops) > 1:
        for k in ('moon', 'sun'):
            e = ELEM[int(L[k] // 30) % 4]
            if e in tops:
                elem = e
                break
    style = STYLE[elem]
    return {'name': GRID[comp][COLS.index(style)], 'competency': comp, 'style': style,
            'percentiles': {COMP[p]: round(v, 2) for p, v in pct.items()},
            'needs_confirm': pct[order[1]] - pct[order[0]] < 0.03,
            'element_tie': len(tops) > 1}


def daily(start, end):
    d = start
    while d <= end:
        yield d
        d += datetime.timedelta(days=1)


def transits(L, start, end, tz_hour_utc=3):
    days = list(daily(start, end))
    pos = {k: [lon(BODIES[k], astronomy.Time.Make(d.year, d.month, d.day, tz_hour_utc, 0, 0)) for d in days] for k in TRANSIT}
    ev = []
    for k in TRANSIT:
        for g in TARGETS:
            if g not in L:
                continue
            for ang, nm in ASPECTS.items():
                if g == 'saturn' and not (k == 'saturn' and ang == 0):
                    continue  # 출생 토성은 토성 리턴(합)만
                run = None
                for i, d in enumerate(days):
                    o = abs(sep(pos[k][i], L[g]) - ang)
                    if o <= TRANSIT_ORB[k]:
                        if run is None:
                            run = {'from': d, 'to': d, 'exact': d, 'orb': o}
                        run['to'] = d
                        if o < run['orb']:
                            run['orb'], run['exact'] = o, d
                    elif run:
                        ev.append((k, g, nm, run)); run = None
                if run:
                    ev.append((k, g, nm, run))
    out = [{'transit': k, 'target': g, 'aspect': nm, 'from': r['from'].isoformat(), 'to': r['to'].isoformat(),
            'exact': r['exact'].isoformat(), 'saturn_return': g == 'saturn'} for k, g, nm, r in ev]
    return sorted(out, key=lambda e: e['from'])


def stations_and_ingress(L, start, end, tz_hour_utc=3):
    asc_sign = int(L['asc'] // 30) if 'asc' in L else None
    res = {'stations': [], 'ingress': []}
    for name in ('mercury', 'venus', 'mars'):
        prev = None
        for d in daily(start, end):
            t = astronomy.Time.Make(d.year, d.month, d.day, tz_hour_utc, 0, 0)
            a, c = lon(BODIES[name], t.AddDays(-1)), lon(BODIES[name], t.AddDays(1))
            direct = ((c - a + 540) % 360 - 180) > 0
            if prev is not None and direct != prev:
                x = lon(BODIES[name], t)
                res['stations'].append({'planet': name, 'type': '순행 시작' if direct else '역행 시작', 'date': d.isoformat(),
                                        'sign': SIGNS[int(x // 30)], 'house': None if asc_sign is None else (int(x // 30) - asc_sign) % 12 + 1})
            prev = direct
    for name in ('jupiter', 'saturn', 'uranus'):
        prev = None
        for d in daily(start, end):
            x = lon(BODIES[name], astronomy.Time.Make(d.year, d.month, d.day, tz_hour_utc, 0, 0))
            s = int(x // 30)
            if s != prev:
                res['ingress'].append({'planet': name, 'date': d.isoformat(), 'sign': SIGNS[s],
                                       'house': None if asc_sign is None else (s - asc_sign) % 12 + 1})
                prev = s
    return res


if __name__ == '__main__':
    # 샘플: 1996-04-01 10:17 KST(= 01:17 UTC), 경기도청 좌표
    dt = datetime.datetime(1996, 4, 1, 1, 17)
    chart, L = natal(dt, 37.2893, 127.0535)
    ref = calibration()
    chart['character'] = character(L, chart['elements'], ref)
    chart['transits'] = transits(L, datetime.date(2026, 1, 1), datetime.date(2031, 12, 31))
    chart.update(stations_and_ingress(L, datetime.date(2026, 1, 1), datetime.date(2031, 12, 31)))
    json.dump(chart, sys.stdout, ensure_ascii=False, indent=1)
