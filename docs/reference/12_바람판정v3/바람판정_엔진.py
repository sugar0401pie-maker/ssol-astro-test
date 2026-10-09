"""
쏠 점성술 하우스 — 바람 판정 엔진 v3 (2026-10-08)
07_엔진_프로토타입.py 의 natal()·lon()·sep() 위에 얹는다.

전통 점성술 공통 관행을 따른 규칙
1) 바람이 걸린 자리(significator) = 그 하우스 + 하우스 지배 행성(전통 7행성 지배) + 하우스 안 행성(7행성)
   + 주제 행성(natural significator) + 달(모든 바람의 보조 지표)
2) 이루어짐(지원도): 목성 = 가점, 토성 = 감점(섹트 보정). 화성·금성은 해마다 고르게 지나 연 단위 판정에서 제외(연말 파트에서만 사용), 천왕성·해왕성·명왕성은 넣지 않음
   목성·토성이 그 하우스를 지나는 기간도 반영. 그해의 주인 행성(연간 프로펙션)이 걸린 트랜짓 ×1.5
3) 움직임: 천왕성·해왕성·명왕성이 개인 지점에 닿는 각도 + 토성 리턴 + 토성이 각(1·4·7·10) 하우스로 이동
   → 좋고 나쁨이 없는 값. '움직이는 해' / (표시 없음) / '잔잔한 해'
3-b) 경계 구간: 판정 기준선 ±1 안의 해는 '활짝 열리는 해에 가까움' 등 경계 표시 + B10 문장(기준선 위아래를 오가는 해)
4) 변화를 바라는 바람(도약·나다움·새로운 시작)은 움직이는 해에 이루어짐 가점
5) 기질(활동·고정·변통 + 불 원소) → 움직임 문장 버전 선택
"""
import astronomy, datetime, math, collections

B = astronomy.Body
SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리',
         '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리']
RULER = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter']
MODALITY = ['활동', '고정', '변통'] * 4  # 양=활동, 황소=고정, 쌍둥이=변통 …
ELEM = ['불', '흙', '공기', '물']
TRAD7 = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']
KO = {'sun': '태양', 'moon': '달', 'mercury': '수성', 'venus': '금성', 'mars': '화성', 'jupiter': '목성', 'saturn': '토성',
      'uranus': '천왕성', 'neptune': '해왕성', 'pluto': '명왕성', 'asc': '상승궁', 'mc': '천정'}
ASPECT_W = {0: ('합', 1.0), 60: ('육분', 0.5), 90: ('사각', 0.9), 120: ('삼분', 0.7), 180: ('충', 0.9)}
ORB = {'jupiter': 2, 'saturn': 2, 'mars': 1.5, 'uranus': 1.5, 'neptune': 1.5, 'pluto': 1.5}
BODY = {'jupiter': B.Jupiter, 'saturn': B.Saturn, 'mars': B.Mars, 'uranus': B.Uranus, 'neptune': B.Neptune, 'pluto': B.Pluto}

# 바람 → (하우스, 주제 행성). 하우스는 지배 행성·안의 행성·통과 기간으로 풀린다.
WISH = {
    '안정':        ([4, 2], ['moon', 'saturn']),
    '도약':        ([10], ['mc', 'sun', 'jupiter']),
    '인정':        ([10], ['mc', 'sun']),
    '사랑':        ([5, 7], ['venus']),
    '좋은 사람들': ([11], ['jupiter']),
    '경제적 여유': ([2], ['jupiter', 'venus']),
    '나다움':      ([1], ['asc', 'sun']),
    '회복':        ([1, 12], ['moon']),
    '여유':        ([12, 5], ['moon', 'venus']),
    '건강한 생활': ([1, 6], ['moon']),
    '새로운 시작': ([1, 9], ['asc', 'sun', 'jupiter']),   # Q3 추가 후보(확정 전)
}
CHANGE_WISHES = {'도약', '나다움', '새로운 시작'}

# 가중치 (C2와 같은 값)
W = dict(jup_good=2.0, jup_hard=0.5, sat_good=1.5, sat_bad=-3.0, mars_bad=-1.0,
         jup_house=3.0, sat_house=-1.5, profection=1.5, extra_pass=0.3,
         sect_in=0.7, sect_out=1.3, moon_aux=0.6, change_bonus=1.0)
MOVE = dict(conj=1.0, hard=0.9, soft=0.4, saturn_return=1.0, saturn_angular_ingress=0.8, chiron_return=1.0)


def sign_of(x):
    return int(x // 30) % 12


def is_day_chart(dt_utc, lat, lng):
    t = astronomy.Time.Make(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, 0)
    obs = astronomy.Observer(lat, lng, 0)
    eq = astronomy.Equator(B.Sun, t, obs, True, True)
    hor = astronomy.Horizon(t, obs, eq.ra, eq.dec, astronomy.Refraction.Normal)
    return hor.altitude > 0


def temperament(L, with_time=True):
    w = {'sun': 3, 'moon': 3, 'mercury': 2, 'venus': 2, 'mars': 2, 'jupiter': 1, 'saturn': 1}
    if with_time:
        w['asc'] = 2
    m = collections.Counter()
    e = collections.Counter()
    for k, v in w.items():
        m[MODALITY[sign_of(L[k])]] += v
        if k != 'asc':
            e[ELEM[sign_of(L[k]) % 4]] += v
    top = max(m, key=m.get)
    fire_strong = e['불'] == max(e.values())
    # 활동궁 우세 또는 불 원소 최강 → 변화가 익숙한 기질
    variant = '활동' if (top == '활동' or fire_strong) else top
    return {'modality': dict(m), 'dominant': top, 'fire_strong': fire_strong, 'variant': variant}


def significators(L, wish, with_time=True):
    """{point: weight} — point는 출생 경도를 가진 키."""
    houses, natural = WISH[wish]
    pts = {}
    def add(p, w):
        if p in L:
            pts[p] = max(pts.get(p, 0), w)
    if with_time:
        asc_s = sign_of(L['asc'])
        for h in houses:
            s = (asc_s + h - 1) % 12
            add(RULER[s], 1.0)                      # 하우스 지배 행성
            for p in TRAD7:                          # 하우스 안 행성
                if sign_of(L[p]) == s:
                    add(p, 0.8)
    for p in natural:
        if p in ('asc', 'mc') and not with_time:
            continue
        add(p, 1.0)
    add('moon', W['moon_aux'])
    return pts


def profection_lord(L, birth, d):
    age = d.year - birth.year - ((d.month, d.day) < (birth.month, birth.day))
    return RULER[(sign_of(L['asc']) + age) % 12]


class Sky:
    """하늘 위치는 사용자와 무관 — 서비스에서는 한 번 계산해 캐시."""
    def __init__(self, start, end):
        self.days = []
        d = start
        while d <= end:
            self.days.append(d)
            d += datetime.timedelta(days=1)
        self.pos = {k: [astronomy.Ecliptic(astronomy.GeoVector(b, astronomy.Time.Make(x.year, x.month, x.day, 3, 0, 0), True)).elon
                        for x in self.days] for k, b in BODY.items()}


def sep(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def passes(sky, planet, target_lon, ang):
    """같은 각도의 각 통과(오브 안 연속 구간) → [(from, to, exact)]"""
    out, run = [], None
    for i, d in enumerate(sky.days):
        o = abs(sep(sky.pos[planet][i], target_lon) - ang)
        if o <= ORB[planet]:
            if run is None:
                run = [d, d, d, o]
            run[1] = d
            if o < run[3]:
                run[2], run[3] = d, o
        elif run:
            out.append(tuple(run[:3])); run = None
    if run:
        out.append(tuple(run[:3]))
    return out


def judge_years(L, birth, wish, sky, years, with_time=True, day_chart=True):
    sig = significators(L, wish, with_time)
    sect = {'saturn': W['sect_in'] if day_chart else W['sect_out'],
            'mars': W['sect_out'] if day_chart else W['sect_in']}
    res = {y: {'support': 0.0, 'movement': 0.0, 'plus': [], 'minus': [], 'move': []} for y in years}

    # 1) 이루어짐 — 각도
    for planet in ('jupiter', 'saturn'):  # 화성은 2년 주기로 해마다 고르게 닿아 연 단위 구분이 안 됨 → 연말 파트에서만
        for p, w in sig.items():
            for ang, (nm, aw) in ASPECT_W.items():
                if planet == 'jupiter':
                    base = W['jup_good'] if ang in (0, 60, 120) else W['jup_hard']
                elif planet == 'saturn':
                    base = W['sat_good'] if ang in (60, 120) else W['sat_bad'] * sect['saturn']
                else:
                    if ang in (60, 120):
                        continue
                    base = W['mars_bad'] * sect['mars']
                seen = collections.Counter()
                for f, t, ex in passes(sky, planet, L[p], ang):
                    if ex.year not in res:
                        continue
                    k = 1.0 if seen[ex.year] == 0 else W['extra_pass']
                    seen[ex.year] += 1
                    lord = profection_lord(L, birth, ex) if with_time else None
                    pf = W['profection'] if lord in (p, planet) else 1.0
                    sc = base * aw * w * k * pf
                    item = {'event': f'{KO[planet]}-{KO[p]} {nm}', 'from': f.isoformat(), 'to': t.isoformat(),
                            'exact': ex.isoformat(), 'score': round(sc, 2), 'profection': pf > 1}
                    res[ex.year]['support'] += sc
                    (res[ex.year]['plus'] if sc > 0 else res[ex.year]['minus']).append(item)

    # 1-b) 목성·토성이 바람 하우스를 지나는 기간
    if with_time:
        asc_s = sign_of(L['asc'])
        hs = {(asc_s + h - 1) % 12: h for h in WISH[wish][0]}
        for planet, wt in (('jupiter', W['jup_house']), ('saturn', W['sat_house'])):
            for y in years:
                idx = [i for i, d in enumerate(sky.days) if d.year == y]
                for s, h in hs.items():
                    n = sum(1 for i in idx if sign_of(sky.pos[planet][i]) == s)
                    if n:
                        sc = (wt * (W['sect_in'] if (planet == 'saturn' and day_chart) else (W['sect_out'] if planet == 'saturn' else 1))) * n / len(idx)
                        res[y]['support'] += sc
                        (res[y]['plus'] if sc > 0 else res[y]['minus']).append(
                            {'event': f'{KO[planet]} {h}하우스 통과', 'days': n, 'score': round(sc, 2)})

    # 2) 움직임
    personal = ['sun', 'moon', 'mercury', 'venus', 'mars'] + (['asc', 'mc'] if with_time else [])
    for planet in ('uranus', 'neptune', 'pluto'):
        for p in personal:
            for ang, (nm, _) in ASPECT_W.items():
                mw = MOVE['conj'] if ang == 0 else (MOVE['hard'] if ang in (90, 180) else MOVE['soft'])
                seen = set()
                for f, t, ex in passes(sky, planet, L[p], ang):
                    if ex.year in res and ex.year not in seen:
                        seen.add(ex.year)
                        res[ex.year]['movement'] += mw
                        res[ex.year]['move'].append({'event': f'{KO[planet]}-{KO[p]} {nm}', 'exact': ex.isoformat(), 'score': mw})
    for f, t, ex in passes(sky, 'saturn', L['saturn'], 0):
        if ex.year in res:
            res[ex.year]['movement'] += MOVE['saturn_return']
            res[ex.year]['move'].append({'event': '토성 리턴', 'exact': ex.isoformat(), 'score': MOVE['saturn_return']})
    _n, _cr = chiron_return(birth, years)
    for y, ex in _cr.items():
        res[y]['movement'] += MOVE['chiron_return']
        res[y]['move'].append({'event': '키론 리턴', 'exact': ex, 'score': MOVE['chiron_return']})
    if with_time:
        asc_s = sign_of(L['asc'])
        prev = None
        for i, d in enumerate(sky.days):
            s = sign_of(sky.pos['saturn'][i])
            if prev is not None and s != prev and d.year in res:
                h = (s - asc_s) % 12 + 1
                if h in (1, 4, 7, 10):
                    res[d.year]['movement'] += MOVE['saturn_angular_ingress']
                    res[d.year]['move'].append({'event': f'토성 {SIGNS[s]}({h}하우스) 이동', 'exact': d.isoformat(),
                                                'score': MOVE['saturn_angular_ingress']})
            prev = s
    return res, sig


def label(res, wish, th_support, th_move):
    """th_support=(low, high), th_move=(low, high) — 모의 출생 보정값"""
    out = {}
    for y, r in res.items():
        mv = r['movement']
        mlab = '움직이는 해' if mv >= th_move[1] else ('잔잔한 해' if mv <= th_move[0] else '')
        s = r['support'] + (W['change_bonus'] if (wish in CHANGE_WISHES and mlab == '움직이는 해') else 0)
        lv = '순풍' if s >= th_support[1] else ('역풍' if s <= th_support[0] else '보통')
        edge, edge_key = '', ''
        no_minus = not r['minus']
        if lv == '보통' and s >= th_support[1] - 1:
            edge, edge_key = '활짝 열리는 해에 가까움', 'EDGE_UP_CLEAR' if no_minus else 'EDGE_UP_MIXED'
        elif lv == '보통' and s < th_support[0] + 1:
            edge, edge_key = '기반을 다지는 해와 경계', 'EDGE_MID_LOW'
        elif lv == '역풍' and s >= th_support[0] - 1:
            edge, edge_key = '내 손에 달린 해와 경계', 'EDGE_LOW_HIGH'
        out[y] = {'level': lv, 'edge': edge, 'edge_db': edge_key, 'no_minus': no_minus, 'display': {'순풍': '활짝 열리는 해(순풍)', '보통': '내 손에 달린 해(보통)',
                                           '역풍': '기반을 다지는 해(역풍)'}[lv],
                  'support': round(s, 2), 'movement': round(mv, 2), 'movement_label': mlab}
    return out


# ---- 키론(Chiron) — 13_키론/chiron_lon_5d.json (5일 간격 표, 선형 보간) ----
import json as _json, os as _os
_CH = None
def chiron_lon_jd(jd, path=_os.path.join(_os.path.dirname(__file__), 'chiron_lon_5d.json')):
    global _CH
    if _CH is None:
        _CH = _json.load(open(path))
    i = (jd - _CH['jd0']) / _CH['step']
    k = int(i); f = i - k
    a, b = _CH['lon'][k], _CH['lon'][k + 1]
    d = (b - a + 540) % 360 - 180
    return (a + d * f) % 360

def _jd(d):
    return (d - datetime.date(2000, 1, 1)).days + 2451544.5 + 0.125  # 03:00 UTC

def chiron_return(birth_date, years, orb=1.5):
    """출생 키론 위치로 돌아오는 날(정확일) — 연도별 목록"""
    natal = chiron_lon_jd(_jd(birth_date) - 0.125 + 0.5)
    out = {}
    for y in years:
        best = None
        d = datetime.date(y, 1, 1)
        while d.year == y:
            o = abs((chiron_lon_jd(_jd(d)) - natal + 540) % 360 - 180)
            if o <= orb and (best is None or o < best[1]):
                best = (d, o)
            d += datetime.timedelta(days=1)
        if best:
            out[y] = best[0].isoformat()
    return natal, out
