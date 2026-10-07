import sys, json, datetime
sys.path.insert(0, '.')
import engine
ref = engine.calibration()
json.dump({p: v for p, v in ref.items()}, open('calibration.json', 'w'))
dt = datetime.datetime(1996, 4, 1, 1, 17)
chart, L = engine.natal(dt, 37.2893, 127.0535)
chart['character'] = engine.character(L, chart['elements'], ref)
chart['transits'] = engine.transits(L, datetime.date(2026, 1, 1), datetime.date(2031, 12, 31))
chart.update(engine.stations_and_ingress(L, datetime.date(2026, 1, 1), datetime.date(2031, 12, 31)))
json.dump(chart, open('sample.json', 'w'), ensure_ascii=False, indent=1)
# extra fixtures: several births, natal + character only, full precision
import random
random.seed(42)
cases = []
for i in range(30):
    dt = datetime.datetime(1960,1,1) + datetime.timedelta(seconds=random.random()*46*365.25*86400)
    dt = dt.replace(second=0, microsecond=0)
    lat, lng = random.choice([(37.5663,126.9779),(35.1798,129.075),(33.489,126.4983),(34.05,-118.24),(51.5,-0.12),(-33.87,151.2)])
    c, L = engine.natal(dt, lat, lng)
    c['character'] = engine.character(L, c['elements'], ref)
    cases.append({'utc': dt.isoformat(), 'lat': lat, 'lng': lng, 'L': L, 'chart': c})
json.dump(cases, open('cases.json','w'), ensure_ascii=False)
