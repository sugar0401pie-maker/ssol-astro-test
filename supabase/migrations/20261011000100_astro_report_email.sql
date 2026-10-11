-- 리포트 완성 메일을 한 번만 보내려고 보낸 시각을 남긴다(owner 2026-10-11 "리포트 생성되면 그 내용 메일로도").
-- 재시도로 리포트가 두 번 만들어져도 메일은 한 번만 간다(보내기 전에 이 칸을 먼저 채운 쪽만 보냄).
alter table public.astro_results add column if not exists report_emailed_at timestamptz;
