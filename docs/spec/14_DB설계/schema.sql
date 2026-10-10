-- 쏠 아스트로 하우스 — DB 테이블 설계 초안 v1 (2026-10-10)
-- 대상: Supabase(PostgreSQL 15+). 공용 테이블은 쏘웰라·다른 테스트(디저트·해양생물·타로)와 함께 쓰고,
-- astro_ 로 시작하는 테이블은 점성술 테스트 전용이다.
-- 이미 같은 역할의 테이블(결제·동의·공유 등)이 운영 중이면 그 테이블을 쓰고, 여기 칸 가운데 없는 것만 추가한다.
-- 사용자 = auth.users (로그인 먼저 확정 2026-10-10: 테스트 전에 카카오·네이버·이메일로 로그인, 세 수단은 각각 별도 계정.
--   '로그인 없이 테스트하기'를 고른 경우에만 Supabase 익명 로그인(is_anonymous=true) — 30일 보관, 쏘웰라 불가, 로그인하면 같은 id로 연결)

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. 공용 테이블 (쏘웰라와 공유)
-- =====================================================================

-- 1-1. 동의 기록: 화면 5(출생 정보)의 필수 동의 4개(만 14세 이상·개인정보·약관·입력 정보와 결과 저장)
create table if not exists public.consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  test_key      text not null,                       -- 'astro' | 'dessert' | 'marine' | 'tarot' | 'sowella'
  consent_key   text not null,                       -- 'age14' | 'privacy' | 'terms' | 'save_result'
  version       text not null,                       -- 약관 버전(예: '2026-10-01')
  agreed        boolean not null default true,
  agreed_at     timestamptz not null default now(),
  unique (user_id, test_key, consent_key, version)
);

-- 1-2. 결제 (토스). 이미 디저트 테스트 결제 테이블이 있으면 그것을 쓰고 product_key만 맞춘다
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,   -- 계정 삭제 뒤에도 결제 기록은 법정 기간 보관
  test_key              text not null,               -- 'astro'
  product_key           text not null,               -- 'astro_report_1900'
  source_id             uuid,                        -- astro_sessions.id
  amount_krw            integer not null check (amount_krw >= 0),
  status                text not null default 'ready'
                          check (status in ('ready','paid','failed','canceled','refunded','pending')),
  provider              text not null default 'toss',
  provider_order_id     text unique,
  provider_payment_key  text unique,
  paid_at               timestamptz,
  refunded_at           timestamptz,
  raw                   jsonb,                       -- PG 응답 원본(카드번호 등 민감 정보는 저장하지 않음)
  created_at            timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);

-- 1-3. 쏘웰라 이용권: 리포트 결제 시 3일
create table if not exists public.sowella_passes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_test       text not null,                   -- 'astro'
  source_payment_id uuid references public.payments(id),
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz not null,            -- starts_at + interval '3 days'
  status            text not null default 'active' check (status in ('active','expired','revoked')),
  created_at        timestamptz not null default now()
);
create index if not exists sowella_passes_user_idx on public.sowella_passes(user_id, ends_at desc);

-- 1-4. 테스트 결과 허브: 쏘웰라가 읽는 유일한 결과 테이블.
-- 각 테스트는 자기 테이블에 원본을 두고, 쏘웰라에 넘길 요약(handoff)을 여기에 한 줄 쓴다.
create table if not exists public.wellness_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  test_key        text not null,                     -- 'astro'
  source_id       uuid not null,                     -- astro_sessions.id
  schema_version  text not null,                     -- 'astro_handoff_v1'
  summary         jsonb not null,                    -- 16_쏘웰라연결/handoff_example.json 형식. 출생 시각·출생지는 넣지 않음
  is_paid         boolean not null default false,    -- 유료 리포트 내용 포함 여부
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (test_key, source_id)
);
create index if not exists wellness_results_user_idx on public.wellness_results(user_id, created_at desc);

-- 1-5. 공유 링크: 무료 구간 요약만 보여 준다(유료 내용·출생정보 없음)
create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                  -- 짧은 무작위 문자열
  user_id     uuid references auth.users(id) on delete set null,
  test_key    text not null,
  source_id   uuid not null,
  channel     text,                                  -- 'kakao' | 'link' | 'naver_blog' | 'x' | 'instagram' | 'youtube'
  payload     jsonb not null,                        -- 공유 카드에 그릴 값(태양 별자리·유형 한 줄 등)
  views       integer not null default 0,
  expires_at  timestamptz,                           -- null = 무기한
  created_at  timestamptz not null default now()
);

-- 1-6. 퍼널 이벤트(파일럿 분석용)
create table if not exists public.funnel_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,                                  -- 로그인 전 브라우저 식별자
  test_key    text not null,
  source_id   uuid,
  event       text not null,                         -- 아래 목록 참고
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists funnel_events_idx on public.funnel_events(test_key, event, created_at);
-- event 예: intro_view, start, nickname_done, birth_done(consents 포함), q1_done, q2_done, q3_done,
--           result_view, wheel_tap, scroll_free_end, paywall_view, pay_click, pay_success, pay_fail,
--           report_ready, report_fallback, share_open, share_done(channel), save_click, login_done, sowella_start

-- =====================================================================
-- 2. 점성술 테스트 전용
-- =====================================================================

-- 2-1. 출생정보 (민감: 본인만 조회, 쏘웰라로 넘기지 않음)
create table if not exists public.astro_birth_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  nickname          text not null,
  birth_date        date not null,
  birth_time        time,                            -- 시·분 입력(정확)일 때만
  time_mode         text not null check (time_mode in ('exact','band','unknown')),
  time_band         text check (time_band in ('dawn','morning','afternoon','evening')),
  place_type        text not null check (place_type in ('korea','overseas')),
  korea_region      text,                            -- '경기' 등 17개 시·도
  city_geoname_id   bigint,                          -- 해외 도시(GeoNames)
  city_label        text,                            -- 화면에 보인 도시 이름
  lat               numeric(8,5) not null,
  lng               numeric(8,5) not null,
  tz                text not null default 'Asia/Seoul',
  accuracy_grade    char(1) not null check (accuracy_grade in ('A','B','C')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists astro_birth_user_idx on public.astro_birth_profiles(user_id);

-- 2-2. 테스트 세션: 질문 답과 진행 상태
create table if not exists public.astro_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  birth_profile_id  uuid not null references public.astro_birth_profiles(id) on delete cascade,
  experience        text check (experience in ('before','first')),
  q1_domain         text not null,                   -- 직업·커리어 …
  q2_word           text not null,                   -- 버텨 …
  q3_wish           text not null,                   -- 안정 …
  status            text not null default 'started'
                      check (status in ('started','computed','free_ready','paid','report_ready','report_fallback')),
  engine_version    text not null,                   -- 예: 'engine v2 / wish v3'
  db_version        text not null,                   -- 예: 'astro-db v1.2'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists astro_sessions_user_idx on public.astro_sessions(user_id, created_at desc);

-- 2-3. 엔진 계산 결과(그대로 다시 쓰기 위해 저장, 재방문 때 재계산하지 않음)
create table if not exists public.astro_chart_results (
  session_id        uuid primary key references public.astro_sessions(id) on delete cascade,
  chart             jsonb not null,                  -- 행성·하우스·ASC·MC·원소·양태
  type_result       jsonb not null,                  -- 역량·방식·유형(캐릭터 비노출 중이어도 저장)
  transits          jsonb not null,                  -- 2026~2031 트랜짓·역행·별자리 이동·키론
  theme_2026        jsonb not null,                  -- A12t 주제 점수·선택 주제·어울림 여부
  wish_judgement    jsonb not null,                  -- 연도별 이루어짐·움직임·경계·근거
  computed_at       timestamptz not null default now()
);

-- 2-4. 무료 결과 조립 기록: 어떤 DB 행·표현을 썼는지(같은 사람 = 같은 문장 재현, 검수 추적)
create table if not exists public.astro_free_results (
  session_id        uuid primary key references public.astro_sessions(id) on delete cascade,
  assembly          jsonb not null,                  -- [{section, db, row_id, variant}] 목록
  rendered          jsonb,                           -- 화면용 완성 문장(선택: 캐시)
  created_at        timestamptz not null default now()
);

-- 2-5. 유료 리포트: 결제 확인 뒤에만 생성·조회
create table if not exists public.astro_paid_reports (
  session_id        uuid primary key references public.astro_sessions(id) on delete cascade,
  payment_id        uuid not null references public.payments(id),
  status            text not null default 'pending'
                      check (status in ('pending','generating','ready','partial_fallback','failed')),
  sections          jsonb,                           -- {"4": {...}, "5": {...}, "6": {...}, "7": {...}} 완성 문장
  section_sources   jsonb,                           -- {"4":"ai","5":"ai+b12","6":"db",...}
  prompt_version    text not null,                   -- '06 v3.1'
  created_at        timestamptz not null default now(),
  ready_at          timestamptz
);

-- 2-6. AI 호출 기록(비용·검증 추적)
create table if not exists public.astro_ai_calls (
  id                bigint generated always as identity primary key,
  session_id        uuid not null references public.astro_sessions(id) on delete cascade,
  part              text not null,                   -- '4' | '5' | '6+7'
  attempt           smallint not null default 1,
  model             text not null,                   -- 'gpt-6.1-sol'
  input_tokens      integer,
  cached_tokens     integer,
  output_tokens     integer,
  cost_usd          numeric(10,5),
  latency_ms        integer,
  validation        jsonb,                           -- validate_ai.py 결과(errors·warnings)
  accepted          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists astro_ai_calls_session_idx on public.astro_ai_calls(session_id);

-- =====================================================================
-- 3. 행 단위 보안(RLS): 본인 행만 읽기. 쓰기는 서버(service role)만.
-- =====================================================================
alter table public.consents             enable row level security;
alter table public.payments             enable row level security;
alter table public.sowella_passes       enable row level security;
alter table public.wellness_results     enable row level security;
alter table public.share_links          enable row level security;
alter table public.funnel_events        enable row level security;
alter table public.astro_birth_profiles enable row level security;
alter table public.astro_sessions       enable row level security;
alter table public.astro_chart_results  enable row level security;
alter table public.astro_free_results   enable row level security;
alter table public.astro_paid_reports   enable row level security;
alter table public.astro_ai_calls       enable row level security;

create policy consents_own        on public.consents             for select using (user_id = auth.uid());
create policy payments_own        on public.payments             for select using (user_id = auth.uid());
create policy passes_own          on public.sowella_passes       for select using (user_id = auth.uid());
create policy results_own         on public.wellness_results     for select using (user_id = auth.uid());
create policy birth_own           on public.astro_birth_profiles for select using (user_id = auth.uid());
create policy sessions_own        on public.astro_sessions       for select using (user_id = auth.uid());
create policy chart_own           on public.astro_chart_results  for select
  using (exists (select 1 from public.astro_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy free_own            on public.astro_free_results   for select
  using (exists (select 1 from public.astro_sessions s where s.id = session_id and s.user_id = auth.uid()));
-- 유료 리포트: 본인 + 결제 완료 + 생성 완료일 때만. 결제 전에는 행 자체가 보이지 않으므로
-- 블러 영역은 서버가 B13 가짜 문장으로 채워 내려준다.
create policy paid_own_after_pay  on public.astro_paid_reports   for select
  using (
    status in ('ready','partial_fallback')
    and exists (select 1 from public.astro_sessions s where s.id = session_id and s.user_id = auth.uid())
    and exists (select 1 from public.payments p where p.id = payment_id and p.status = 'paid')
  );
-- 공유 링크는 slug로 누구나 읽기(payload에는 무료 요약만)
create policy share_public_read   on public.share_links          for select using (expires_at is null or expires_at > now());
-- funnel_events, astro_ai_calls: 사용자 조회 정책 없음(서버·분석 전용)

-- 4. 정리 규칙: 회원 탈퇴 시 on delete cascade로 출생정보·결과 함께 삭제. 익명(로그인 없이 테스트하기) 계정은 30일 뒤 삭제.
--    쏘웰라 제한: sowella_passes·wellness_results는 auth.users.is_anonymous = false 인 계정에만 서버가 만든다(익명 계정이 로그인으로 연결되면 그때 생성).
--    결제 기록(payments)은 user_id만 비우고(on delete set null) 전자상거래법 보관 기간 동안 남긴다.
