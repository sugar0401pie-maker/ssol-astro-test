-- 쏠 아스트로 하우스 이용자 분석용 내보내기(owner 2026-11-05). Supabase → SQL Editor에 붙여넣고 Run → 결과 표 오른쪽 위 [Download CSV] → 엑셀로 열기.
-- 읽기만 한다(데이터를 바꾸지 않음).
-- 개인정보: 닉네임·이메일·계정 id·생년월일·출생 시각·출생지는 넣지 않는다.
--   개인정보처리방침상 출생 정보는 '출생차트 도출에만, 통계 분석 포함 그 밖의 용도 없음'이라 나이대·출생 연도도 넣지 않는다.
--   결과 줄 번호는 결과 id를 바꾼 짧은 코드(결과_코드)라 사람을 알아볼 수 없다.
-- 비회원 결과는 30일 뒤 자동으로 지워지므로, 이 표는 '지금 남아 있는 결과' 기준이다.

-- ① 결과 한 줄 = 테스트 한 번
select
  left(md5(r.id::text), 10)                                   as 결과_코드,
  (r.created_at at time zone 'Asia/Seoul')::date              as 날짜,
  extract(hour from r.created_at at time zone 'Asia/Seoul')    as 시각_시,
  to_char(r.created_at at time zone 'Asia/Seoul', 'Dy')       as 요일,
  coalesce(r.birth_input->>'lang', 'ko')                      as 언어,
  case when r.user_id is null then '비회원' else '로그인' end   as 계정,
  r.first_time                                                as 점성술_처음,
  r.accuracy                                                  as 출생시각_정확도,   -- A 시·분 / B 시간대 / C 모름
  r.sun_sign                                                  as 태양_별자리,
  r.competency                                                as 유형_역량,
  r.style                                                     as 유형_방식,
  r.answers->>'q1'                                            as Q1_고민영역,
  r.answers->>'q2'                                            as Q2_2026_한단어,
  r.answers->>'q3'                                            as Q3_2027_바람,
  (r.paid_at is not null)                                     as 결제함,
  o.amount                                                    as 결제금액,         -- 원화는 원, 달러는 센트(299 = US$2.99)
  coalesce(o.currency, case when o.amount is not null then 'KRW' end) as 통화,
  r.last_page                                                 as 마지막으로_본_장,
  coalesce(r.attribution_first->>'utm_source', r.attribution_first->>'referrer_host', '(직접·알 수 없음)') as 처음_유입,
  r.attribution_first->>'utm_campaign'                        as 처음_유입_캠페인,
  r.attribution_first->>'in_app'                              as 앱안_브라우저
from astro_results r
left join astro_orders o on o.result_id = r.id and o.status = 'paid'
order by r.created_at;

-- ② (따로 실행) 하루별 요약: 방문·시작·결과·결제
-- select d as 날짜,
--   count(distinct case when event='intro_view' then anon_id end) as 첫화면_방문,
--   count(distinct case when event='start' then anon_id end)      as 테스트_시작,
--   count(distinct case when event='result_view' then anon_id end) as 결과_보기,
--   count(distinct case when event='pay_success' then anon_id end) as 결제_완료
-- from (select (created_at at time zone 'Asia/Seoul')::date d, event, anon_id from astro_funnel_events) e
-- group by d order by d;
