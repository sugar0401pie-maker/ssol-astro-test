"""
엔진(07_엔진_프로토타입.py, astronomy-engine) vs 정답(skyfield/DE421) 비교
실행:  python compare_engine.py            → 정답세트.json·xlsx에 '엔진비교' 결과를 써 넣고, FAIL이 있으면 종료코드 1
       python compare_engine.py --strict-tz → 한국 시간대 규칙 불일치도 FAIL로 계산
엔진 파일은 읽기만 한다(수정하지 않음). UTC를 직접 넣으므로 엔진의 현지시→UTC 변환은 여기서 시험하지 않고,
시간대는 프로토타입 규칙(13_프로토타입/index.html koreaOffset)을 그대로 옮겨 zoneinfo와 따로 비교한다.
"""
import datetime as dt
import importlib.util
import json
import os
import sys

sys.dont_write_bytecode = True  # 상위 폴더(엔진 옆)에 __pycache__를 만들지 않음

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE_PATH = os.path.join(HERE, '..', '07_엔진_프로토타입.py')
TOL = {'moon': 120, 'asc': 360, 'mc': 360}  # 나머지 행성 60″
STATION_SPEED = 0.05  # °/일 — 이보다 느리면 '정류 근처'로 역행 불일치를 경고(WARN) 처리


def load_engine():
    spec = importlib.util.spec_from_file_location('engine07', ENGINE_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def wrap180(x):
    return (x + 180) % 360 - 180


def korea_offset_prototype(y, m, d, h=0):
    """13_프로토타입/index.html koreaOffset()을 그대로 옮김(날짜 단위 규칙)."""
    key = y * 10000 + m * 100 + d
    base = 8.5 if 19540321 <= key < 19610810 else 9
    if 19870510 <= key < 19871011 or 19880508 <= key < 19881009:
        base += 1
    return base


def tz_row(kind, bid, local, zi_off, flag):
    d = dt.datetime.strptime(local, '%Y-%m-%d %H:%M')
    p = korea_offset_prototype(d.year, d.month, d.day, d.hour)
    diff = round((p - zi_off) * 60)
    return {'kind': kind, 'id': bid, 'local': local, 'zoneinfo_offset_hours': zi_off,
            'prototype_offset_hours': p, 'diff_minutes': diff, 'match': diff == 0, 'tz_flag': flag}


def run(data=None, strict_tz=False):
    sys.path.insert(0, HERE)
    import make_reference as mr
    if data is None:
        with open(mr.JSON_PATH, encoding='utf-8') as f:
            data = json.load(f)
    eng = load_engine()
    import astronomy
    rows = []
    for b in data['births']:
        utc = dt.datetime.strptime(b['utc'], '%Y-%m-%dT%H:%M:%SZ')
        _, L = eng.natal(utc, b['lat'], b['lng'])
        t = eng.t_of(utc)
        asc_sign = int(L['asc'] // 30)
        ref = b['reference']['bodies']
        for k, rv in ref.items():
            e_lon = L[k] % 360
            diff = wrap180(e_lon - rv['lon']) * 3600
            tol = TOL.get(k, 60)
            e_sign = mr.SIGNS[int(e_lon // 30)]
            e_house = (int(e_lon // 30) - asc_sign) % 12 + 1
            if k in eng.BODIES:
                a, c = eng.lon(eng.BODIES[k], t.AddDays(-1)), eng.lon(eng.BODIES[k], t.AddDays(1))
                e_retro = wrap180(c - a) < 0  # 엔진 stations_and_ingress와 같은 ±1일 규칙
                retro_match = e_retro == rv['retro']
            else:
                e_retro, retro_match = None, None
            sign_match, house_match = e_sign == rv['sign'], e_house == rv['house']
            note = []
            result = 'PASS'
            if abs(diff) > tol:
                result = 'FAIL'; note.append('허용오차 초과')
            if not sign_match:
                result = 'FAIL'; note.append('별자리 불일치')
            if not house_match:
                result = 'FAIL'; note.append('하우스 불일치')
            if retro_match is False:
                if abs(rv['speed_deg_per_day']) < STATION_SPEED:
                    note.append('역행 불일치(정류 근처, WARN)')
                    if result == 'PASS':
                        result = 'WARN'
                else:
                    result = 'FAIL'; note.append('역행 불일치')
            rows.append({'id': b['id'], 'body': k, 'ref_lon': rv['lon'], 'engine_lon': round(e_lon, 6),
                         'diff_arcsec': round(diff, 2), 'tol_arcsec': tol,
                         'ref_sign': rv['sign'], 'engine_sign': e_sign, 'sign_match': sign_match,
                         'ref_house': rv['house'], 'engine_house': e_house, 'house_match': house_match,
                         'ref_retro': rv.get('retro'), 'engine_retro': e_retro, 'retro_match': retro_match,
                         'result': result, 'note': ', '.join(note)})
    tz_rows = [tz_row('출생(T)', b['id'], b['local'], b['utc_offset_hours'], b['tz_flag'])
               for b in data['births'] if b['tz'] == 'Asia/Seoul']
    tz_rows += [tz_row('추가 점검', '', p['local'], p['zoneinfo_offset_hours'], p['tz_flag']) for p in data['tz_probes']]

    bodies = list(data['births'][0]['reference']['bodies'])
    mx = {k: round(max(abs(r['diff_arcsec']) for r in rows if r['body'] == k), 2) for k in bodies}
    tz_bad_b = [r for r in tz_rows if not r['match'] and r['kind'] == '출생(T)']
    tz_bad_p = [r for r in tz_rows if not r['match'] and r['kind'] == '추가 점검']
    fails = [r for r in rows if r['result'] == 'FAIL']
    summary = {
        'engine': f'07_엔진_프로토타입.py (astronomy-engine {getattr(astronomy, "__version__", "2.1.x")})',
        'run_date': dt.date.today().isoformat(),
        'rows': len(rows),
        'max_abs_diff_arcsec': mx,
        'tol_arcsec': {k: TOL.get(k, 60) for k in bodies},
        'fail_count': len(fails),
        'warn_count': sum(r['result'] == 'WARN' for r in rows),
        'sign_mismatch': sum(not r['sign_match'] for r in rows),
        'house_mismatch': sum(not r['house_match'] for r in rows),
        'retro_mismatch': sum(r['retro_match'] is False for r in rows),
        'tz_mismatch_births': [f"{r['id']} {r['local']} zoneinfo {r['zoneinfo_offset_hours']} / 규칙 {r['prototype_offset_hours']}" for r in tz_bad_b],
        'tz_mismatch_probes': [f"{r['local']} zoneinfo {r['zoneinfo_offset_hours']} / 규칙 {r['prototype_offset_hours']}" for r in tz_bad_p],
    }
    data['engine_comparison'] = {'summary': summary, 'rows': rows, 'tz_rows': tz_rows}
    mr.save_json(data)
    mr.write_xlsx(data)

    print('천체별 최대 |차이| (″, 허용):')
    for k in bodies:
        print(f'  {k:8s} {mx[k]:9.2f}  (≤{TOL.get(k, 60)})')
    print(f"FAIL {summary['fail_count']} / WARN {summary['warn_count']} / 전체 {len(rows)}행 · "
          f"별자리 불일치 {summary['sign_mismatch']} · 하우스 불일치 {summary['house_mismatch']} · 역행 불일치 {summary['retro_mismatch']}")
    for r in fails:
        print('  FAIL', r['id'], r['body'], r['diff_arcsec'], r['note'])
    print(f'한국 시간대 규칙 불일치: 출생 {len(tz_bad_b)}건, 추가 점검 {len(tz_bad_p)}건')
    for s in summary['tz_mismatch_births'] + summary['tz_mismatch_probes']:
        print('  ', s)
    bad = bool(fails) or (strict_tz and (tz_bad_b or tz_bad_p))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(run(strict_tz='--strict-tz' in sys.argv))
