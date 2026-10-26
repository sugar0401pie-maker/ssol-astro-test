-- 결과 저장 IP 기록(owner 결정 2026-10-26 (나)): 같은 인터넷 주소의 하루 저장 한도(20)를 서버 여러 대에서도 정확히 지키고,
-- 며칠 연속 한도를 채우는 주소는 더 오래 막기 위해. IP 그대로가 아니라 서버 비밀값으로 만든 해시(HMAC)만 저장하고,
-- 7일이 지난 줄은 하루 한 번 정리 작업(/api/cron/cleanup)이 지운다. 서버(service_role)만 읽고 쓴다 — 사용자 조회 정책 없음.
create table if not exists public.astro_save_ip_log (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists astro_save_ip_log_idx on public.astro_save_ip_log(ip_hash, created_at);
alter table public.astro_save_ip_log enable row level security;
grant select, insert, delete on public.astro_save_ip_log to service_role;
