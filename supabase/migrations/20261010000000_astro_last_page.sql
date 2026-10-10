-- 결과마다 '마지막으로 보던 장'(1~7)을 계정·비회원 결과에 기억(마스터스펙 6-1-1: 마지막으로 보던 페이지를 계정에 기억).
-- 다른 기기에서 [내 결과 보기]를 눌러도 그 장으로 연다. 없으면 이 기기 기억(localStorage) → 1장.
alter table public.astro_results
  add column if not exists last_page smallint check (last_page between 1 and 7);
