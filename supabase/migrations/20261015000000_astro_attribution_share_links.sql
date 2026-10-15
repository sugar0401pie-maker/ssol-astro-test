-- =====================================================================
-- 쏠 아스트로 하우스 — migration: 유입 경로 + 공유 링크 코드 (Supabase SQL Editor에 전체를 붙여넣고 Run)
-- owner 개발 메모 2026-10-15: 채널별 테스트 수·결제율·공유 효과를 보려고.
--
-- 유입 경로(jsonb): utm_source·utm_medium·utm_campaign·utm_content·ref(공유 코드)·referrer_host(도메인만)·
--   landing_path(쿼리 없이)·in_app·first_seen_at. 들어오기 직전 주소 전체·검색어·IP는 저장하지 않는다.
--   attribution_first = 처음 유입(30일 동안 유지), attribution_last = 이번 방문.
-- 공유 링크(astro_share_links): 공유 버튼을 누를 때 만든 무작위 코드와 채널·공유한 사람·공유한 결과.
--   '누가 공유한 링크로 들어왔는지'는 astro_results.attribution_first->>'ref'와 이 표를 이어서 본다.
-- ssol_* 테이블은 건드리지 않는다. 새 표는 service_role만 읽고 쓴다(RLS 켜고 사용자 정책 없음).
-- =====================================================================

begin;

alter table public.astro_results add column if not exists attribution_first jsonb;
alter table public.astro_results add column if not exists attribution_last jsonb;
alter table public.astro_orders add column if not exists attribution_last jsonb;

create index if not exists astro_results_src_idx
  on public.astro_results ((attribution_first->>'utm_source'), created_at);
create index if not exists astro_results_ref_idx
  on public.astro_results ((attribution_first->>'ref'))
  where attribution_first ? 'ref';

create table if not exists public.astro_share_links (
  slug              text primary key check (slug ~ '^[A-Za-z0-9]{8,16}$'),
  user_id           uuid references auth.users (id) on delete set null,   -- 공유한 계정(탈퇴하면 비움, 집계용 기록은 남김)
  guest_token_hash  text,                                                 -- 로그인 전 공유(로그인하면 계정으로 옮김)
  result_id         uuid references public.astro_results (id) on delete set null,
  channel           text not null check (channel in ('kakao', 'link_copy', 'naver_blog', 'x', 'instagram', 'youtube')),
  created_at        timestamptz not null default now()
);
create index if not exists astro_share_links_user_idx on public.astro_share_links (user_id);
create index if not exists astro_share_links_guest_idx on public.astro_share_links (guest_token_hash) where guest_token_hash is not null;

alter table public.astro_share_links enable row level security;
grant select, insert, update, delete on public.astro_share_links to service_role;

commit;

-- 보는 법(예시)
-- 채널별 테스트 수·결제율(처음 유입 기준):
--   select coalesce(r.attribution_first->>'utm_source', r.attribution_first->>'referrer_host', 'direct') as source,
--          count(*) as tests, count(o.id) as paid, round(100.0 * count(o.id) / count(*), 1) as pay_rate
--   from public.astro_results r
--   left join public.astro_orders o on o.result_id = r.id and o.status = 'paid'
--   group by 1 order by tests desc;
-- 공유 링크 효과(공유 채널별로 들어와 테스트한 수):
--   select s.channel, count(r.id) as tests
--   from public.astro_share_links s
--   join public.astro_results r on r.attribution_first->>'ref' = s.slug
--   group by 1 order by 2 desc;
