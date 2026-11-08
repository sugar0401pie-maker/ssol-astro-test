-- AI 없이(해석 DB 문장만으로) 만들어진 결제 리포트 찾기 (2026-11-08)
-- Supabase SQL Editor에 붙여 넣고 Run. 읽기만 하고 아무것도 바꾸지 않는다.
-- 리포트 생성 기록(report->'log'->'parts')의 파트 결과가 'db'면 그 파트는 AI 없이 나간 것.
-- 개인정보(닉네임·이메일·생년월일)는 꺼내지 않는다.
select
  r.id                                   as result_id,
  r.paid_at,
  coalesce(r.birth_input->>'lang', 'ko') as lang,
  r.report->'log'->>'promptVersion'      as prompt_version,
  (select string_agg(p.key || '=' || (p.value->>'result'), ', ' order by p.key)
     from jsonb_each(r.report->'log'->'parts') p)                    as parts,
  (select string_agg(f, ' | ')
     from jsonb_each(r.report->'log'->'parts') p,
          jsonb_array_elements_text(coalesce(p.value->'failures', '[]'::jsonb)) f) as failure_codes
from astro_results r
where r.paid_at is not null
  and exists (
    select 1 from jsonb_each(r.report->'log'->'parts') p
    where p.value->>'result' = 'db'
  )
order by r.paid_at desc;

-- 하루별 요약(AI로 쓴 리포트 vs AI 없이 나간 리포트)
-- select date(r.paid_at at time zone 'Asia/Seoul') as day,
--        count(*) filter (where exists (select 1 from jsonb_each(r.report->'log'->'parts') p where p.value->>'result'='db')) as fallback,
--        count(*) as paid
-- from astro_results r where r.paid_at is not null and r.report is not null
-- group by 1 order by 1 desc;
