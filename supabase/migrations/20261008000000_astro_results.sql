-- =====================================================================
-- 쏠 점성술 하우스 — migration: 테스트 결과 저장 (Supabase SQL Editor에 전체를 붙여넣고 Run)
--
-- 같은 Supabase 프로젝트를 쏘웰라(app.)·디저트 테스트(quiz.)와 함께 쓴다. ssol_* 테이블은 건드리지 않고,
-- 이 앱의 테이블은 astro_ 접두사를 쓴다. 새 테이블에는 service_role 권한이 자동으로 붙지 않으므로 GRANT를 명시한다.
--
-- 출생일시·출생지는 민감한 개인정보다(마스터스펙 8-1): 저장 동의를 받은 뒤에만 서버가 저장하고(consented_at),
-- 출생지는 도시명·좌표만 남긴다(상세 주소 없음). 사용자는 자기 결과만 보고 지울 수 있다(RLS).
-- 저장·수정은 서버(service_role)만 한다 — 브라우저가 보낸 계산값을 믿지 않고 서버가 다시 계산해 저장하기 때문.
-- 사용자가 회원 탈퇴하면(auth.users 삭제) 결과도 함께 지워진다(on delete cascade).
-- =====================================================================

begin;

create table if not exists public.astro_results (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),

  nickname         text not null,
  first_time       boolean not null default false,          -- 점성술이 처음인지(결과 용어 안내용)

  -- 재계산용 입력 전체(생년월일·시간 입력 방식·고른 후보 시각·출생지 스냅샷{label,lat,lng,timeZone}).
  birth_input      jsonb not null,
  birth_local      text not null,                           -- 현지 시각 "YYYY-MM-DDTHH:MM"
  time_zone        text not null,                           -- IANA 시간대 ID
  birth_utc        timestamptz not null,                    -- 변환된 UTC (현지+시간대+UTC 셋 다 저장, 마스터스펙 2장)
  place_label      text not null,

  answers          jsonb not null,                          -- {q1,q2,q3}
  accuracy         text not null check (accuracy in ('A', 'B', 'C')),
  character        text not null,
  competency       text not null,
  style            text not null,
  sun_sign         text not null,

  engine_version   text not null,
  db_version       text not null,
  consent_version  text not null,
  consented_at     timestamptz not null
);

create index if not exists astro_results_user_idx on public.astro_results (user_id, created_at desc);

alter table public.astro_results enable row level security;

-- 본인 결과만 보기·지우기. 저장은 서버(service_role)만.
drop policy if exists astro_results_select_own on public.astro_results;
create policy astro_results_select_own on public.astro_results
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists astro_results_delete_own on public.astro_results;
create policy astro_results_delete_own on public.astro_results
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.astro_results from anon, authenticated;
grant select, delete on public.astro_results to authenticated;
grant select, insert, update, delete on public.astro_results to service_role;

commit;
