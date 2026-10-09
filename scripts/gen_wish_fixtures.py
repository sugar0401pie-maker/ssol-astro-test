"""바람 판정 v3 테스트 기준값: docs/reference/12_바람판정v3/바람판정_엔진.py(owner 전달 원본)를 그대로 돌려
test/fixtures/wish-v3.json을 만든다. lib/astro/wish.ts가 같은 값을 내는지 lib/astro/wish.test.ts가 검사한다.
사용(astronomy-engine 파이썬판 필요):  python3 scripts/gen_wish_fixtures.py
원본 파일 이름이 한글이라 임시 폴더에 natal_core.py / wish_engine.py로 복사해 불러온다(원본의 보정 스크립트와 같은 방식)."""
import datetime, json, os, random, shutil, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tmp = tempfile.mkdtemp()
shutil.copy(os.path.join(ROOT, 'docs/reference/07_엔진_프로토타입.py'), os.path.join(tmp, 'natal_core.py'))
shutil.copy(os.path.join(ROOT, 'docs/reference/12_바람판정v3/바람판정_엔진.py'), os.path.join(tmp, 'wish_engine.py'))
shutil.copy(os.path.join(ROOT, 'docs/reference/12_바람판정v3/chiron_lon_5d.json'), os.path.join(tmp, 'chiron_lon_5d.json'))  # 키론 표(엔진이 같은 폴더에서 읽음)
sys.path.insert(0, tmp)
import natal_core as N, wish_engine as E

years = range(2027, 2032)
sky = E.Sky(datetime.date(2027, 1, 1), datetime.date(2031, 12, 31))

def case(dt, lat, lng, birth_local, wishes, with_time=True):
    _, L = N.natal(dt, lat, lng, with_time)
    day = E.is_day_chart(dt, lat, lng)
    out = {'utc': dt.isoformat(), 'lat': lat, 'lng': lng, 'birth_local': birth_local.isoformat(), 'with_time': with_time,
           'L': L, 'day_chart': day, 'temperament': E.temperament(L, with_time), 'wishes': {}}
    for w in wishes:
        res, sig = E.judge_years(L, birth_local, w, sky, years, with_time, day)
        out['wishes'][w] = {'significators': sig, 'years': {str(y): {
            'support': res[y]['support'], 'movement': res[y]['movement'],
            'plus': [(i['event'], i.get('exact'), i['score']) for i in res[y]['plus']],
            'minus': [(i['event'], i.get('exact'), i['score']) for i in res[y]['minus']],
            'move': [(i['event'], i['exact']) for i in res[y]['move']],
        } for y in years}}
    return out

cases = [case(datetime.datetime(1996, 4, 1, 1, 17), 37.2893, 127.0535, datetime.date(1996, 4, 1), list(E.WISH))]
random.seed(11)
for i in range(12):
    dt = datetime.datetime(1965, 1, 1) + datetime.timedelta(seconds=random.random() * 41 * 365.25 * 86400)
    dt = dt.replace(second=0, microsecond=0)
    lat, lng = random.choice([(37.5663, 126.9779), (35.1798, 129.075), (33.489, 126.4983), (51.5, -0.12)])
    local = (dt + datetime.timedelta(hours=9)).date()  # 기준값용 '현지 날짜' — 테스트도 같은 값을 넣는다
    cases.append(case(dt, lat, lng, local, random.sample(list(E.WISH), 3), with_time=(i % 4 != 3)))
# 키론 리턴(약 50세)이 2027~2031에 들어오는 출생(1977~1981년생) — 무작위 표본에는 거의 없어 따로 넣는다.
cases.append(case(datetime.datetime(1978, 6, 14, 18, 0), 37.5663, 126.9779, datetime.date(1978, 6, 15), ['안정', '도약', '나다움']))
cases.append(case(datetime.datetime(1980, 2, 2, 3, 0), 35.1798, 129.075, datetime.date(1980, 2, 2), ['회복', '인정'], with_time=False))
json.dump(cases, open(os.path.join(ROOT, 'test/fixtures/wish-v3.json'), 'w'), ensure_ascii=False)
print('cases', len(cases))
