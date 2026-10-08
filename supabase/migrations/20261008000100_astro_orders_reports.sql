-- =====================================================================
-- 쏠 점성술 하우스 — migration: 유료 리포트 결제(주문)와 리포트 저장 (Supabase SQL Editor에 전체를 붙여넣고 Run)
-- 먼저 20261008000000_astro_results.sql을 실행한 뒤에 실행한다.
--
-- 결제 흐름: 서버가 주문(pending)을 만들고 금액을 정한다 → 토스 결제창 → 서버가 토스에 승인 확인(confirm)한 뒤에만
-- paid로 바꾸고 리포트를 만든다. 브라우저가 보낸 금액·결과는 믿지 않는다(쏘웰라 결제와 같은 방식).
-- 사용자는 자기 주문만 볼 수 있고, 쓰기는 서버(service_role)만 한다.
-- =====================================================================

begin;

create table if not exists public.astro_orders (
  id           uuid primary key default gen_random_uuid(),   -- 토스 orderId로 그대로 쓴다
  user_id      uuid not null references auth.users (id) on delete cascade,
  result_id    uuid not null references public.astro_results (id) on delete cascade,
  amount       integer not null check (amount > 0),
  status       text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  payment_key  text,
  method       text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index if not exists astro_orders_user_idx on public.astro_orders (user_id, created_at desc);
create index if not exists astro_orders_result_idx on public.astro_orders (result_id);

alter table public.astro_orders enable row level security;
drop policy if exists astro_orders_select_own on public.astro_orders;
create policy astro_orders_select_own on public.astro_orders for select to authenticated using (auth.uid() = user_id);
revoke all on public.astro_orders from anon, authenticated;
grant select on public.astro_orders to authenticated;
grant select, insert, update, delete on public.astro_orders to service_role;

-- 결과별 유료 리포트(결제 후 서버가 만든다).
alter table public.astro_results add column if not exists paid_at timestamptz;
alter table public.astro_results add column if not exists report jsonb;
alter table public.astro_results add column if not exists report_status text not null default 'none';
alter table public.astro_results add column if not exists report_started_at timestamptz;
do $$ begin
  alter table public.astro_results add constraint astro_results_report_status_check
    check (report_status in ('none', 'generating', 'ready', 'failed'));
exception when duplicate_object then null; end $$;

commit;
