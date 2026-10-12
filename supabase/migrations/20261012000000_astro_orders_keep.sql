-- =====================================================================
-- 쏠 아스트로 하우스 — migration: 결제 기록 보존 + 같은 결과 중복 결제 막기 (Supabase SQL Editor에 전체를 붙여넣고 Run)
-- ① 계정이 지워져도 결제 기록(astro_orders)은 남긴다(전자상거래법 보존) — user_id만 비운다.
--    (예전에는 on delete cascade라 계정을 지우면 결제 기록도 함께 지워졌다.)
-- ② 한 결과에 '결제 완료' 주문은 하나만(두 탭에서 동시에 결제하면 서버가 두 번째를 토스에서 취소한다).
--    이미 중복이 있으면 색인 만들기가 실패하니, 그 경우 아래 확인 쿼리 결과를 Claude에게 알려 주세요.
--    확인: select result_id, count(*) from public.astro_orders where status = 'paid' group by result_id having count(*) > 1;
-- =====================================================================

begin;

alter table public.astro_orders drop constraint if exists astro_orders_user_id_fkey;
alter table public.astro_orders add constraint astro_orders_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

create unique index if not exists astro_orders_one_paid_per_result
  on public.astro_orders (result_id) where status = 'paid' and result_id is not null;

commit;
