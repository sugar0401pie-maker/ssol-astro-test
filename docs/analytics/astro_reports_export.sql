-- 쏠 아스트로 하우스 — 사용자에게 나간 유료 리포트(4~7장) 본문 내보내기 (2026-11-10)
-- Supabase → SQL Editor에 붙여 넣고 Run → 결과 표 오른쪽 위 [Download CSV] → 엑셀로 열기. 읽기만 한다.
-- 한 줄 = 리포트 한 건의 한 장(4·5·6·7장) + 마지막에 '질문·실천·맺음말' 한 줄.
-- 출처(source): ai = AI가 쓴 글, db = AI 대신 해석 DB 문장이 나간 장.
-- 개인정보: 닉네임·이메일·생년월일·출생 시각·출생지는 꺼내지 않는다(결과_코드로만 구분).
-- 무료 결과(1~3장)는 DB에 글로 저장돼 있지 않다(볼 때마다 해석 DB로 다시 만듦) — 여기에 안 나온다.
-- 날짜 거르기: 맨 아래 where의 '--'를 지우고 날짜를 바꾸면 그 기간(한국 날짜)만.

with rep as (
  select
    left(md5(r.id::text), 10)                                    as 결과_코드,
    ((r.report->>'generatedAt')::timestamptz at time zone 'Asia/Seoul') as 만든_시각,
    coalesce(r.birth_input->>'lang', 'ko')                       as 언어,
    r.answers->>'q1' as q1, r.answers->>'q2' as q2, r.answers->>'q3' as q3,
    r.report
  from astro_results r
  where r.report_status = 'ready'
    and r.report is not null
    and coalesce((r.report->>'partial')::boolean, false) = false
    -- and ((r.report->>'generatedAt')::timestamptz at time zone 'Asia/Seoul')::date between date '2026-11-01' and date '2026-11-09'
),
-- 장 안의 글 조각(문단·소제목·목록·흐름·잇기·안내)을 한 칸의 글로
blocks as (
  select rep.결과_코드, s.ord as 순서, s.sec, b.blk, b.n
  from rep,
       jsonb_array_elements(rep.report->'sections') with ordinality as s(sec, ord),
       jsonb_array_elements(coalesce(s.sec->'body', '[]') || coalesce(s.sec->'tail', '[]')) with ordinality as b(blk, n)
),
block_text as (
  select 결과_코드, 순서, n,
    case blk->>'t'
      when 'items' then (select string_agg(coalesce(i->>'title', '') || ' — ' || coalesce(i->>'text', ''), E'\n')
                         from jsonb_array_elements(blk->'items') i)
      when 'step' then coalesce(blk->>'label', '') || ': ' || coalesce(blk->>'text', '')
      else coalesce(blk->>'text', '')
    end as 글
  from blocks
)
select
  rep.결과_코드, rep.만든_시각, rep.언어, rep.q1 as "Q1_고민영역", rep.q2 as "Q2_2026_한단어", rep.q3 as "Q3_2027_바람",
  (s.sec->>'no')::int                         as 장,
  s.sec->>'title'                             as 장_제목,
  s.sec->>'source'                            as 출처,
  s.sec->>'summary'                           as 굵은_요약,
  (select string_agg(bt.글, E'\n\n' order by bt.n) from block_text bt
     where bt.결과_코드 = rep.결과_코드 and bt.순서 = s.ord) as 본문
from rep, jsonb_array_elements(rep.report->'sections') with ordinality as s(sec, ord)
union all
select
  rep.결과_코드, rep.만든_시각, rep.언어, rep.q1, rep.q2, rep.q3,
  8, '질문·실천·맺음말', 'db', rep.report->'questions'->>'headline',
  concat_ws(E'\n\n',
    (select string_agg('· ' || q, E'\n') from jsonb_array_elements_text(rep.report->'questions'->'items') q),
    (select string_agg(coalesce(p->>'title', '') || ' — ' || coalesce(p->>'how', ''), E'\n') from jsonb_array_elements(rep.report->'practices') p),
    rep.report->>'closing')
from rep
order by 만든_시각 desc, 결과_코드, 장;
