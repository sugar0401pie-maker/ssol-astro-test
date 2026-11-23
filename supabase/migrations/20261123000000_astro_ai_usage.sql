-- AI 호출마다 실제 토큰 수 기록(owner 2026-11-23): 사이트별·기능별 비용을 정확히 보려고.
-- 한 줄 = OpenAI 호출 한 번(실패해서 다시 부른 호출도 따로 한 줄). 문장·고민·출생 정보는 넣지 않고 숫자·코드만.
-- model = OpenAI가 실제로 응답한 모델 이름(요청한 이름과 다를 수 있음). 서버(service_role)만 읽고 쓴다.
create table if not exists public.astro_ai_usage (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  site              text not null default 'astro',
  feature           text not null,             -- paid_report / paid_report_redo
  part              text,                      -- 리포트 파트 A·B·C
  result_id         uuid,
  lang              text,
  model             text,
  input_tokens      integer not null default 0,
  cached_tokens     integer not null default 0,
  output_tokens     integer not null default 0,
  reasoning_tokens  integer not null default 0,
  ok                boolean not null default true  -- false = 호출 자체가 실패(토큰 0)
);
create index if not exists astro_ai_usage_created_idx on public.astro_ai_usage(created_at);
create index if not exists astro_ai_usage_result_idx on public.astro_ai_usage(result_id);
alter table public.astro_ai_usage enable row level security;
grant select, insert on public.astro_ai_usage to service_role;

-- 보는 법(예): 날짜·기능·모델별 합계
-- select (created_at at time zone 'Asia/Seoul')::date as day, feature, model, count(*) calls,
--        sum(input_tokens) input, sum(cached_tokens) cached, sum(output_tokens) output
-- from astro_ai_usage group by 1,2,3 order by 1 desc;
