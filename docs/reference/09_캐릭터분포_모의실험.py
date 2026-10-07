"""
쏠 점성술 하우스 — 캐릭터 분포 모의실험 (v1, 2026-10-07)
pip install astronomy-engine
무작위 출생 시각(1965~2005)으로 출생차트를 계산해 캐릭터 20종이 고르게 나오는지 확인한다.
결과(2026-10-07, 5,000건): 캐릭터별 3.5%~5.9%, 방식 24~26%, 1·2위 근접 17%, 원소 동점 13.5%
"""
import astronomy, random, collections, datetime, bisect

B = astronomy.Body
BODIES = {'sun': B.Sun, 'moon': B.Moon, 'mercury': B.Mercury, 'venus': B.Venus, 'mars': B.Mars,
          'jupiter': B.Jupiter, 'saturn': B.Saturn, 'uranus': B.Uranus, 'neptune': B.Neptune, 'pluto': B.Pluto}
COMP = {'moon': '기대기', 'saturn': '믿기', 'mars': '선 지키기', 'mercury': '말하기', 'venus': '회복하기'}
ELEM = ['불', '흙', '공기', '물']  # 양자리부터 순환
STYLE = {'불': '다가가기', '물': '맞춰주기', '공기': '거리두기', '흙': '조율하기'}
GRID = {'기대기': ['수달', '해달', '물범', '비버'], '믿기': ['원앙', '펭귄', '왜가리', '백조'],
        '선 지키기': ['복어', '소라게', '거북', '조개'], '말하기': ['물개', '돌고래', '혹등고래', '개구리'],
        '회복하기': ['문어', '해파리', '가오리', '불가사리']}
COLS = ['다가가기', '맞춰주기', '거리두기', '조율하기']
MAL = {'mars', 'saturn', 'uranus', 'neptune', 'pluto'}
BEN = {'jupiter', 'venus'}
W = {'sun': 3, 'moon': 3, 'mercury': 2, 'venus': 2, 'mars': 2, 'jupiter': 1, 'saturn': 1}
ORB = 6.0


def longitudes(dt):
    t = astronomy.Time.Make(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)  # UTC
    return {k: astronomy.Ecliptic(astronomy.GeoVector(b, t, True)).elon for k, b in BODIES.items()}


def sep(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def stress_score(p, L):
    """높을수록 편안, 낮을수록 긴장. 품위(도메인 등)는 출생년도 편중 때문에 쓰지 않는다."""
    sc = 0.0
    for q in L:
        if q == p:
            continue
        d = sep(L[p], L[q])
        if q in MAL:
            for a in (0, 90, 180):
                o = abs(d - a)
                if o < ORB:
                    sc -= 1 - o / ORB
        if q in BEN:
            for a in (0, 60, 120):
                o = abs(d - a)
                if o < ORB:
                    sc += 1 - o / ORB
    return sc


def dominant_element(L):
    c = collections.Counter()
    for k, w in W.items():
        c[ELEM[int(L[k] // 30) % 4]] += w
    best = max(c.values())
    tops = [e for e in c if c[e] == best]
    if len(tops) == 1:
        return tops[0]
    for k in ('moon', 'sun'):
        e = ELEM[int(L[k] // 30) % 4]
        if e in tops:
            return e
    return tops[0]


def build_calibration(samples):
    return {p: sorted(stress_score(p, L) for L in samples) for p in COMP}


def character(L, ref):
    pct = {p: bisect.bisect_left(ref[p], stress_score(p, L)) / len(ref[p]) for p in COMP}
    order = sorted(pct, key=pct.get)
    comp = COMP[order[0]]
    style = STYLE[dominant_element(L)]
    near_tie = pct[order[1]] - pct[order[0]] < 0.03
    return GRID[comp][COLS.index(style)], comp, style, near_tie


def random_births(n, seed):
    random.seed(seed)
    start = datetime.datetime(1965, 1, 1)
    span = (datetime.datetime(2006, 1, 1) - start).total_seconds()
    return [start + datetime.timedelta(seconds=random.random() * span) for _ in range(n)]


if __name__ == '__main__':
    ref = build_calibration([longitudes(d) for d in random_births(3000, 1)])
    cnt = collections.Counter(); ties = 0
    test = random_births(5000, 2)
    for d in test:
        name, _, _, t = character(longitudes(d), ref)
        cnt[name] += 1; ties += t
    n = len(test)
    for k, v in cnt.most_common():
        print(f'{k}\t{v / n:.1%}')
    print(f'1·2위 근접(확인 화면 대상): {ties / n:.1%}')
