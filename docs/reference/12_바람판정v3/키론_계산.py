"""
키론(2060 Chiron) 위치 계산 — astronomy-engine(MIT) + 수치적분
- 초기값: 키론 오스큘레이팅 궤도요소 (epoch JD 2456000.5 = 2012-03-14, J2000 황도 기준 — JPL 소천체 DB 공개값)
- 태양 + 목성·토성·천왕성·해왕성 중력 섭동을 넣어 1900~2045년을 적분(DOP853)
- 출력: 날짜별 지구 중심 황경(진춘분점 기준) 테이블
"""
import math, json, datetime
import numpy as np
from scipy.integrate import solve_ivp
import astronomy as A

AU_KM = 149597870.7
K = 0.01720209895            # 가우스 중력상수 (AU^1.5 / day)
GM_SUN = K * K               # AU^3/day^2
# 행성 질량비 (태양=1) — 위성 포함 계 질량
MASS = {'Jupiter': 1/1047.3486, 'Saturn': 1/3497.898, 'Uranus': 1/22902.98, 'Neptune': 1/19412.24}
BODY = {'Jupiter': A.Body.Jupiter, 'Saturn': A.Body.Saturn, 'Uranus': A.Body.Uranus, 'Neptune': A.Body.Neptune}

EL = dict(epoch=2456000.5, i=6.926651533484328, node=209.3851130617651, peri=339.4595737215378,
          e=0.3792037887546262, M=114.8798253094007, q=8.486494269138399)
OBL = math.radians(23.4392911)  # J2000 황도경사


def jd_to_time(jd):
    return A.Time(jd - 2451545.0)  # astronomy-engine: days since J2000 (UT 근사)


def elements_to_state(el):
    a = el['q'] / (1 - el['e'])
    n = math.sqrt(GM_SUN / a ** 3)
    M = math.radians(el['M']); e = el['e']
    E = M
    for _ in range(50):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    x_ = a * (math.cos(E) - e); y_ = a * math.sqrt(1 - e * e) * math.sin(E)
    r = math.hypot(x_, y_)
    vx_ = -a * n * a / r * math.sin(E); vy_ = a * n * a / r * math.sqrt(1 - e * e) * math.cos(E)
    O, w, i = map(math.radians, (el['node'], el['peri'], el['i']))
    def rot(x, y):
        X = (math.cos(O) * math.cos(w) - math.sin(O) * math.sin(w) * math.cos(i)) * x + (-math.cos(O) * math.sin(w) - math.sin(O) * math.cos(w) * math.cos(i)) * y
        Y = (math.sin(O) * math.cos(w) + math.cos(O) * math.sin(w) * math.cos(i)) * x + (-math.sin(O) * math.sin(w) + math.cos(O) * math.cos(w) * math.cos(i)) * y
        Z = (math.sin(w) * math.sin(i)) * x + (math.cos(w) * math.sin(i)) * y
        return X, Y, Z
    def ecl_to_eq(X, Y, Z):
        return X, Y * math.cos(OBL) - Z * math.sin(OBL), Y * math.sin(OBL) + Z * math.cos(OBL)
    p = ecl_to_eq(*rot(x_, y_)); v = ecl_to_eq(*rot(vx_, vy_))
    return np.array(p + v)


def planet_pos(name, jd):
    v = A.HelioVector(BODY[name], jd_to_time(jd))
    return np.array([v.x, v.y, v.z])


def deriv(t, s):
    r = s[:3]
    acc = -GM_SUN * r / np.linalg.norm(r) ** 3
    for name, m in MASS.items():
        rp = planet_pos(name, t)
        d = rp - r
        acc += GM_SUN * m * (d / np.linalg.norm(d) ** 3 - rp / np.linalg.norm(rp) ** 3)
    return np.concatenate([s[3:], acc])


def integrate(jd0, jd1, step=5.0):
    s0 = elements_to_state(EL)
    out = {}
    for a, b in ((EL['epoch'], jd0), (EL['epoch'], jd1)):
        ts = np.arange(a, b + (step if b > a else -step), step if b > a else -step)
        sol = solve_ivp(deriv, (a, ts[-1]), s0, t_eval=ts, method='DOP853', rtol=1e-11, atol=1e-13)
        for t, x, y, z in zip(sol.t, *sol.y[:3]):
            out[round(t, 3)] = (x, y, z)
    return dict(sorted(out.items()))


def geo_lon(jd, helio):
    t = jd_to_time(jd)
    e = A.HelioVector(A.Body.Earth, t)
    x, y, z = helio[0] - e.x, helio[1] - e.y, helio[2] - e.z
    vec = A.Vector(x, y, z, t)
    return A.Ecliptic(vec).elon


if __name__ == '__main__':
    jd0 = 2415020.5   # 1900-01-01
    jd1 = 2467616.5   # 2044-01-01
    states = integrate(jd0, jd1, step=5.0)
    table = []
    for jd, h in states.items():
        table.append((jd, round(geo_lon(jd, h), 3)))
    json.dump({'source': 'astronomy-engine + DOP853 integration from JPL osculating elements (epoch 2012-03-14)',
               'step_days': 5, 'jd_lon': table}, open('chiron_table.json', 'w'))
    print(len(table))
