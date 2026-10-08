"""바람 판정 기준 보정: 무작위 출생(1965~2005, 한국 좌표) × 바람 3개 × 2027~2031 → 이루어짐·움직임 분포의 30/70% 경계.
사용: python3 보정_모의실험.py 700"""
import sys, random, datetime, json, statistics
sys.path.insert(0,'.')  # 07_엔진_프로토타입.py 를 natal_core.py, 바람판정_엔진.py 를 wish_engine.py 로 복사해 두고 실행
import natal_core as N, wish_engine as E
sky=E.Sky(datetime.date(2027,1,1),datetime.date(2031,12,31))
random.seed(7)
years=range(2027,2032)
S={w:[] for w in E.WISH}; M=[]
start=datetime.datetime(1965,1,1); span=(datetime.datetime(2006,1,1)-start).total_seconds()
n=int(sys.argv[1])
for i in range(n):
    dt=start+datetime.timedelta(seconds=random.random()*span)
    lat,lng=37.5+random.uniform(-3,1),127+random.uniform(-1,2)
    _,L=N.natal(dt,lat,lng)
    day=E.is_day_chart(dt,lat,lng)
    for w in random.sample(list(E.WISH),3):
        res,_=E.judge_years(L,dt.date(),w,sky,years,True,day)
        for y in years:
            S[w].append(res[y]['support'])
            if w==list(E.WISH)[0] or True: pass
    for y in years: M.append(res[y]['movement'])
def q(a,p): a=sorted(a); return a[int(p*(len(a)-1))]
allS=[x for v in S.values() for x in v]
print('ALL support q30 q70',q(allS,.3),q(allS,.7))
for w,v in S.items(): print(w,len(v),round(q(v,.3),2),round(q(v,.7),2),round(statistics.mean(v),2))
print('movement q30 q70',q(M,.3),q(M,.7), 'zero share',sum(1 for x in M if x==0)/len(M))
json.dump({'support':{w:[q(v,.3),q(v,.7)] for w,v in S.items()},'movement':[q(M,.3),q(M,.7)]},open('보정결과.json','w'),ensure_ascii=False)
