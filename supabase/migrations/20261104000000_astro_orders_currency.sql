-- =====================================================================
-- 쏠 아스트로 하우스 — migration: 결제 주문에 통화 칸(영문판 달러 결제, 2026-11-04)
-- (같은 파일에 receipt_email 칸도 추가 — 영문판 주문 확인 이메일)
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

-- 주문 확인 이메일 받을 주소(영문판, 로그인 없이 결제한 사람만 결제 화면에서 받음 — 로그인한 사람은 계정 이메일을 쓰고 여기 비움).
-- EU·UK 소비자법상 청약철회 포기 확인을 남는 매체(이메일)로 보내야 해서 받는다. 결제 기록과 같이 보관(전자상거래법).
alter table public.astro_orders add column if not exists receipt_email text;

comment on column public.astro_orders.currency is 'KRW: amount = 원 / USD: amount = 센트(US$2.99 = 299). 영문판(/en) 결제만 USD.';

commit;
