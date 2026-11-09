-- =====================================================================
-- 쏠 아스트로 하우스 — migration: 관리자 화면 숫자 집계 함수 (2026-11-09)
-- Supabase SQL Editor에 전체를 붙여 넣고 Run. 표는 만들지도 바꾸지도 않고, 읽기만 하는 함수 하나를 만든다.
-- 서버(service_role)만 부를 수 있다 — 브라우저(anon·authenticated)는 못 부른다.
-- 방문·시작은 '브라우저 수'(astro_funnel_events.anon_id 중복 제외, 2026-10-11부터 기록)라 Postgres에서 세야 정확하다.
-- =====================================================================

create or replace function public.astro_admin_stats(p_day date)
returns jsonb
language sql
stable
set search_path = public
as $$
  with b as (
    select (p_day::timestamp at time zone 'Asia/Seoul')             as day_start,
           ((p_day + 1)::timestamp at time zone 'Asia/Seoul')       as day_end
  ),
  e as (
    select f.event, f.anon_id, f.created_at >= b.day_start as today
    from astro_funnel_events f, b
    where f.created_at < b.day_end and f.anon_id is not null
      and f.event in ('intro_view', 'start', 'birth_done')
  ),
  r as (
    select x.user_id, x.created_at >= b.day_start as today
    from astro_results x, b where x.created_at < b.day_end
  ),
  o as (
    select x.amount, coalesce(x.currency, 'KRW') as currency, x.paid_at >= b.day_start as today
    from astro_orders x, b where x.status = 'paid' and x.paid_at < b.day_end
  )
  select jsonb_build_object(
    'visitors',   jsonb_build_object('day', (select count(distinct anon_id) from e where event = 'intro_view' and today),
                                     'total', (select count(distinct anon_id) from e where event = 'intro_view')),
    'starts',     jsonb_build_object('day', (select count(distinct anon_id) from e where event = 'start' and today),
                                     'total', (select count(distinct anon_id) from e where event = 'start')),
    'births',     jsonb_build_object('day', (select count(distinct anon_id) from e where event = 'birth_done' and today),
                                     'total', (select count(distinct anon_id) from e where event = 'birth_done')),
    'results',    jsonb_build_object('day', (select count(*) from r where today), 'total', (select count(*) from r)),
    'members',    jsonb_build_object('day', (select count(*) from r where today and user_id is not null),
                                     'total', (select count(*) from r where user_id is not null)),
    'paid',       jsonb_build_object('day', (select count(*) from o where today), 'total', (select count(*) from o)),
    'krw',        jsonb_build_object('day', (select coalesce(sum(amount), 0) from o where today and currency = 'KRW'),
                                     'total', (select coalesce(sum(amount), 0) from o where currency = 'KRW')),
    'usd_cents',  jsonb_build_object('day', (select coalesce(sum(amount), 0) from o where today and currency = 'USD'),
                                     'total', (select coalesce(sum(amount), 0) from o where currency = 'USD'))
  );
$$;

revoke all on function public.astro_admin_stats(date) from public, anon, authenticated;
grant execute on function public.astro_admin_stats(date) to service_role;
