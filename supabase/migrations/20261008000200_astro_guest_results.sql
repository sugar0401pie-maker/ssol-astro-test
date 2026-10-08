-- =====================================================================
-- 쏠 점성술 하우스 — migration: 비회원(로그인 없이) 결과 저장·결제 + 쏘웰라 채팅용 요약
-- 먼저 20261008000000, 20261008000100을 실행한 뒤에 실행한다. (Supabase SQL Editor에 전체를 붙여넣고 Run)
--
-- owner 결정(2026-10-08): 결과를 먼저 보여 주고 저장을 권한다. 로그인 없이도 결과를 익명으로 저장하고 결제할 수 있고,
-- 가입·로그인하면 그 브라우저의 익명 결과·주문이 계정으로 옮겨진다.
-- Supabase 익명 로그인은 쓰지 않는다 — 로그인 쿠키를 쏘웰라와 함께 쓰는데 쏘웰라는 익명 세션을 보면 로그아웃시키기 때문.
-- 대신 브라우저가 가진 무작위 열쇠의 해시(guest_token_hash)로 주인을 확인한다(열쇠 자체는 저장하지 않음).
--
-- 보관: 계정으로 옮겨지지 않은 익명 결과는 expires_at이 지나면 지운다(결제 전 30일, 결제 후 1년 — 앱이 정함, owner 확정 전 초안).
-- 지우기는 /api/cron/cleanup(하루 한 번, Vercel Cron)이 한다. 결제 기록(astro_orders)은 전자상거래법 보존 의무가 있어
-- 결과가 지워져도 남긴다(result_id만 비움).
-- =====================================================================

begin;

-- 결과: 주인이 계정(user_id) 또는 익명 열쇠(guest_token_hash) 중 하나
alter table public.astro_results alter column user_id drop not null;
alter table public.astro_results add column if not exists guest_token_hash text;
alter table public.astro_results add column if not exists expires_at timestamptz;
alter table public.astro_results add column if not exists claimed_at timestamptz;
do $$ begin
  alter table public.astro_results add constraint astro_results_owner_check
    check (user_id is not null or guest_token_hash is not null);
exception when duplicate_object then null; end $$;
create index if not exists astro_results_guest_idx on public.astro_results (guest_token_hash) where guest_token_hash is not null;
create index if not exists astro_results_expires_idx on public.astro_results (expires_at) where expires_at is not null;

-- 쏘웰라 채팅이 참고할 리포트 요약(유형 문장·2026 회고·바라는 것·5년 흐름·리포트 제안). 출생 날짜·시간·장소·별자리는 넣지 않는다.
alter table public.astro_results add column if not exists chat_summary text;
alter table public.astro_results add column if not exists chat_summary_at timestamptz;

-- 주문: 비회원 결제도 받는다. 결과가 지워져도 결제 기록은 남긴다.
alter table public.astro_orders alter column user_id drop not null;
alter table public.astro_orders add column if not exists guest_token_hash text;
alter table public.astro_orders alter column result_id drop not null;
alter table public.astro_orders drop constraint if exists astro_orders_result_id_fkey;
alter table public.astro_orders add constraint astro_orders_result_id_fkey
  foreign key (result_id) references public.astro_results (id) on delete set null;

-- RLS는 그대로: 로그인한 사용자는 자기 user_id 행만 본다(익명 행은 user_id가 비어 있어 누구에게도 보이지 않음).
-- 익명 행의 읽기·쓰기는 서버(service_role)가 열쇠 해시를 확인한 뒤에만 한다.

commit;
