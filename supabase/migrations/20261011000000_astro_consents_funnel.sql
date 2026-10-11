-- 동의 기록·이용 흐름 기록·결제 전 청약철회 제한 동의(owner 결정 2026-10-11).
-- 14_DB설계의 공용 consents·funnel_events 안을 이 앱 전용(astro_ 접두사)으로 옮겼다 — 공용 테이블안은 쓰지 않기로 한 10-10 결정 A.
-- 서버(service_role)만 쓰고, 사용자는 자기 동의 기록만 읽을 수 있다. 이용 흐름 기록은 사용자 조회 정책 없음(분석 전용).

-- 1. 동의 기록: 누가(계정 또는 비회원 열쇠 해시) 어떤 항목·어떤 문구 버전에 언제 동의했는지. 로그인하면 비회원 기록을 계정으로 옮긴다.
create table if not exists public.astro_consents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  guest_token_hash text,
  result_id        uuid references public.astro_results(id) on delete set null,
  order_id         uuid references public.astro_orders(id) on delete set null,
  consent_key      text not null check (consent_key in ('age', 'privacy', 'terms', 'store', 'withdrawal_limit')),
  version          text not null,
  agreed_at        timestamptz not null default now(),
  check (user_id is not null or guest_token_hash is not null)
);
create index if not exists astro_consents_user_idx on public.astro_consents(user_id);
create index if not exists astro_consents_guest_idx on public.astro_consents(guest_token_hash) where user_id is null;
alter table public.astro_consents enable row level security;
drop policy if exists astro_consents_select_own on public.astro_consents;
create policy astro_consents_select_own on public.astro_consents for select to authenticated using (auth.uid() = user_id);
grant select on public.astro_consents to authenticated;
grant select, insert, update, delete on public.astro_consents to service_role;

-- 2. 결제 전 청약철회 제한 고지에 동의한 시각(이용약관 제13조 2항: 사전 고지 + 동의가 있어야 생성 완료 뒤 철회가 제한된다)
alter table public.astro_orders add column if not exists withdrawal_notice_at timestamptz;
alter table public.astro_orders add column if not exists withdrawal_notice_version text;

-- 3. 이용 흐름 기록(어디까지 왔다가 그만두는지). 입력값·출생 정보·문장은 넣지 않는다 — 단계 이름과 장 번호 같은 짧은 값만.
create table if not exists public.astro_funnel_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,                     -- 이 브라우저의 무작위 식별자(이름·연락처와 연결되지 않음)
  event       text not null,
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists astro_funnel_events_idx on public.astro_funnel_events(event, created_at);
alter table public.astro_funnel_events enable row level security;
grant select, insert, update, delete on public.astro_funnel_events to service_role;
grant usage, select on sequence public.astro_funnel_events_id_seq to service_role;
