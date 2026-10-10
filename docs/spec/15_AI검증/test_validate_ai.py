#!/usr/bin/env python3
"""validate_ai.py 테스트 — 06 프롬프트의 좋은 예는 통과, 나쁜 예는 탈락해야 한다.
실행: python3 test_validate_ai.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_ai import validate_bridge, validate_part, finalize_part  # noqa: E402

GOOD = [
    ('좋은 예 1 — 나다움·보통', {
        'section': 5, 'wish': '나다움', 'level_2027': '보통',
        'tokens': {'흐름근거': '7월 말 목성이 사람들·공동체의 자리로 들어오는', 'U_월': '4·6월'},
        'allowed_names': ['목성', '천왕성', '천정', '달']},
     "나다움을 바라는 지우님에게 이 해는 하늘이 정해 주기보다 내가 고르는 만큼 나다워지는 해예요. {{U_월}}에 천왕성이 건네는 제안이나 계기는 지금의 진로를 무너뜨리기보다, 내가 어떤 방식으로 일할 때 가장 편한지 확인해 볼 기회로 받아 보세요. 그러다 {{흐름근거}} 무렵부터는 생각이 통하는 사람들 사이에서 내 색을 보여 줄 자리가 늘어나기 쉽습니다. 그때 꺼낼 수 있도록 지금 하는 공부나 일 가운데 ‘이건 나답다’고 느끼는 작업 하나를 골라 이번 달 안에 짧은 결과물로 남겨 두세요."),
    ('좋은 예 2 — 안정·역풍', {
        'section': 5, 'wish': '안정', 'level_2027': '역풍',
        'tokens': {'S_기간': '3~10월', '흐름근거': '7월 말 목성이 집·뿌리의 자리로 들어오는'},
        'allowed_names': ['토성', '달', '목성']},
     "안정을 바라는 마음과 달리 이 해는 집안의 책임이 먼저 어깨에 얹히기 쉬운 해예요. 특히 {{S_기간}}에는 토성이 달과 긴장하며 가족 일로 마음 쓸 일이 몰리기 쉬우니, 모든 일을 혼자 떠안기보다 꼭 내가 맡을 일 하나만 정해 두는 편이 좋습니다. 다행히 {{흐름근거}} 무렵부터는 집과 마음의 자리에 숨 쉴 틈이 조금씩 생겨납니다. 흔들려도 지킬 축 하나로, 일요일 저녁 가족과 차 한 잔 마시는 시간을 이번 주부터 정해 보세요."),
    ('좋은 예 3 — 사랑·5년', {
        'section': 6, 'wish': '사랑',
        'tokens': {'열리는해': '2029년', '역풍해': '2028년'},
        'allowed_names': ['목성', '금성', '토성']},
     "사랑을 바라는 지우님에게 다섯 해 가운데 가장 반가운 때는 {{열리는해:이에요/예요}}. {{열리는해:은/는}} 목성이 금성과 조화를 이루며 마음을 표현하는 일이 한결 수월해지는 해라, 새로운 만남이든 지금 관계의 다음 단계든 문을 열어 두기 좋습니다. 그 전의 {{역풍해}}에는 관계에 따르는 조건과 책임이 무겁게 느껴질 수 있지만, 그 시간에 내가 편안한 거리와 속도를 알아 두면 열리는 해에 덜 흔들려요. 올해는 고마웠던 사람에게 마음을 말로 전하는 날을 한 달에 한 번 정해 두는 것부터 시작해 보세요."),
    ('좋은 예 4 — 경제적 여유·열리는 해 없음', {
        'section': 6, 'wish': '경제적 여유',
        'tokens': {'가까운해': '2030년'},
        'allowed_names': ['목성']},
     "경제적 여유를 바라는 지우님에게 앞으로 다섯 해는 하늘이 크게 밀어 주기보다 내가 세운 기준이 결과를 만드는 시기예요. 그중 {{가까운해}}에는 목성이 살림의 자리를 지나며 생활의 기반을 넓히는 선택이 가장 수월해지니, 그해를 목표로 삼아 보세요. 그 전까지는 해마다 고정비 하나를 정리하고, 한 달 생활비 기준을 정해 지켜 보는 편이 좋습니다. 이번 달에는 자동이체와 구독 목록을 한 번 훑어보고 쓰지 않는 것 하나를 정리해 보세요."),
]

BASE_CTX = {'section': 5, 'wish': '사랑', 'level_2027': '역풍', 'tokens': {'흐름근거': 'x'}, 'allowed_names': ['목성', '금성']}
BAD = [
    ('토큰 밖 숫자·단정', 'DIGIT',
     "2027년에는 반드시 원하는 사랑을 만나게 됩니다. {{흐름근거}} 무렵 마음이 열려요. 한 사람에게 먼저 연락해 보세요. 그러면 관계가 한결 가까워지는 걸 느낄 수 있을 거예요."),
    ('수입 예측(경제적 여유)', 'MONEY_PREDICT',
     "경제적 여유를 바라는 마음에 하늘이 크게 답해 주는 해예요. {{흐름근거}} 무렵에는 목성 덕분에 연봉이 오를 거예요. 그 흐름을 놓치지 않도록 지금부터 준비해 두면 좋습니다. 이번 달에는 이력서를 한 번 다듬어 보세요."),
    ('근거·사건 없음(날짜 토큰 없음)', 'BRIDGE_DATE',
     "사랑을 바라는 마음이 참 소중해요. 흐름이 좋으니 걱정하지 마세요. 다 잘될 거예요. 오늘도 나를 아끼는 하루를 보내 보세요."),
    ('3문장', 'BRIDGE_SENTENCES',
     "사랑을 바라는 지우님에게 이 해는 마음을 천천히 여는 해예요. {{흐름근거}} 무렵부터는 표현이 한결 수월해지기 쉬워 고마운 사람에게 짧게라도 마음을 전해 보기 좋습니다. 이번 주에는 가까운 사람에게 고마웠던 순간 하나를 말로 전해 보세요."),
    ('입력에 없는 행성', 'NAME_NOT_IN_INPUT',
     "사랑을 바라는 지우님에게 이 해는 마음을 천천히 여는 해예요. {{흐름근거}} 무렵에는 해왕성이 마음을 부드럽게 열어 주어 다정한 말이 한결 쉽게 나옵니다. 다만 서두르기보다 내가 편안한 속도를 먼저 알아 두는 편이 좋아요. 이번 주에는 가까운 사람에게 고마웠던 순간 하나를 말로 전해 보세요."),
    ('역풍인데 좋게 포장', 'BRIDGE_HEAD_POSITIVE',
     "사랑을 바라는 지우님에게 이 해는 모든 것이 순조로운 해예요. {{흐름근거}} 무렵부터는 목성 덕분에 다정한 말이 한결 쉽게 나오고 관계도 가까워지기 쉽습니다. 다만 서두르기보다 내가 편안한 속도를 먼저 알아 두는 편이 좋아요. 이번 주에는 가까운 사람에게 고마웠던 순간 하나를 말로 전해 보세요."),
    ('판정 이름 한쪽만', 'LABEL_SINGLE',
     "사랑을 바라는 지우님에게 이 해는 기반을 다지는 해예요. {{흐름근거}} 무렵부터는 목성 덕분에 다정한 말이 한결 쉽게 나오고 관계의 숨통이 조금 트일 수 있습니다. 서두르기보다 내가 편안한 속도를 먼저 알아 두는 편이 좋아요. 이번 주에는 가까운 사람에게 고마웠던 순간 하나를 말로 전해 보세요."),
]


def main():
    fails = 0
    for name, ctx, text in GOOD:
        r = validate_bridge(text, ctx)
        print(('PASS' if r['ok'] else 'FAIL'), name, '' if r['ok'] else r['errors'])
        fails += not r['ok']
    for name, code, text in BAD:
        ctx = dict(BASE_CTX)
        if 'MONEY' in code:
            ctx['wish'] = '경제적 여유'
        r = validate_bridge(text, ctx)
        hit = any(e['code'] == code for e in r['errors'])
        print(('PASS' if hit else 'FAIL'), '나쁜 예 —', name, '→', [e['code'] for e in r['errors']])
        fails += not hit
    # DB 문장과 겹침
    db = GOOD[1][2]
    r = validate_bridge(db, dict(GOOD[1][1], db_sentences=[db]))
    hit = any(e['code'] == 'BRIDGE_OVERLAP' for e in r['errors'])
    print(('PASS' if hit else 'FAIL'), '나쁜 예 — DB 문장 되풀이 → BRIDGE_OVERLAP')
    fails += not hit
    # 섹션 + 재생성·대체 흐름
    ctx = dict(GOOD[1][1])
    good_sec = "{닉네임}님의 2027년 키워드는 집 안에 숨 쉴 틈 만들기예요.\n\n<잇기>" + GOOD[1][2] + "</잇기>"
    good_sec = good_sec.replace('{닉네임}님의 2027년 키워드는', '지우님의 다가오는 해 키워드는')
    seq = ["2027년은 반드시 좋은 해입니다.", good_sec]
    out = finalize_part(lambda i: seq[i], ctx, fallback_section='(DB 문장만)', fallback_bridge='(B12)')
    ok = out['source'] == 'ai' and len(out['attempts']) == 2
    print(('PASS' if ok else 'FAIL'), '재생성 1회 후 통과 →', out['source'])
    fails += not ok
    out = finalize_part(lambda i: "2027년은 반드시 좋은 해입니다.", ctx, fallback_section='(DB 문장만)')
    ok = out['source'] == 'db'
    print(('PASS' if ok else 'FAIL'), '두 번 실패 → DB 문장만 →', out['source'])
    fails += not ok
    print('\n실패', fails)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
