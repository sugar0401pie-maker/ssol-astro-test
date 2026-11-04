-- =====================================================================
-- 쏠 아스트로 하우스 — migration: 결제 주문에 통화 칸(영문판 달러 결제, 2026-11-04)
-- Supabase SQL Editor에 전체를 붙여넣고 Run. 한 번만 실행하면 되고, 다시 실행해도 안전하다.
--
-- 한국어판 주문은 그대로 원화(KRW, amount = 원). 영문판 주문은 달러(USD, amount = 센트 — US$2.99면 299).
-- 영문판 결제 서버는 이 칸이 없으면 주문을 만들지 않는다(fail closed — 금액 단위가 섞이지 않게).
-- =====================================================================

begin;

alter table public.astro_orders add column if not exists currency text not null default 'KRW';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'astro_orders_currency_check') then
    alter table public.astro_orders add constraint astro_orders_currency_check check (currency in ('KRW', 'USD'));
  end if;
end $$;

comment on column public.astro_orders.currency is 'KRW: amount = 원 / USD: amount = 센트(US$2.99 = 299). 영문판(/en) 결제만 USD.';

commit;
