-- =============================================================================
-- 합본(mobile-shop-rental) 렌탈 운영 데이터 분리
--   목적: skmagic-dealer 와 운영을 완전 분리. 이미지(상품사진)·상품목록(db.js)만 공유.
--   대상 프로젝트: woozoo-apps  (qpexfvwrlwkpjyihlnwz) — skmagic 테이블과 같은 프로젝트지만 별도 테이블.
--   쓰기 권한: 모바일샵 관리자 = JWT app_metadata.mobileshop_store_id 보유 계정.
--   읽기: 손님 카탈로그가 로그인 없이 읽어야 하므로 settings/overrides 는 공개 읽기.
--   실행: Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 Run.
--   ※ 안전: 기존 skmagic 테이블(commission_data/card_benefits/...)은 건드리지 않음.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── 1) 설정류(정책표/제휴카드/배너/FAQ) — key 로 구분하는 단일 payload 행 ──
create table if not exists public.mobileshop_rental_settings (
  key        text primary key,             -- 'commission' | 'cards' | 'faq' | 'banner'
  payload    jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 2) 상품 오버라이드(노출/추천/이름/가격기준/정렬/태그) — goodsId 별 ──
create table if not exists public.mobileshop_rental_overrides (
  goods_id   text primary key,
  patch      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 3) 상담/주문 접수 ──
create table if not exists public.mobileshop_rental_consultations (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind       text        not null default 'consult',  -- consult | order | convert
  status     text        not null default 'new',
  name       text,
  phone      text,
  birth      text,
  address    text,
  product    jsonb,
  memo       text
);

-- ── RLS ──
alter table public.mobileshop_rental_settings      enable row level security;
alter table public.mobileshop_rental_overrides     enable row level security;
alter table public.mobileshop_rental_consultations enable row level security;

-- 관리자 판별 헬퍼식: app_metadata.mobileshop_store_id 가 있으면 합본 관리자
--   (인라인으로 사용. Supabase JWT 에 app_metadata 포함됨)

-- settings: 공개 읽기 / 관리자 쓰기
drop policy if exists msr_settings_read  on public.mobileshop_rental_settings;
drop policy if exists msr_settings_write on public.mobileshop_rental_settings;
create policy msr_settings_read  on public.mobileshop_rental_settings for select using (true);
create policy msr_settings_write on public.mobileshop_rental_settings for all
  using      ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null)
  with check ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);

-- overrides: 공개 읽기 / 관리자 쓰기
drop policy if exists msr_overrides_read  on public.mobileshop_rental_overrides;
drop policy if exists msr_overrides_write on public.mobileshop_rental_overrides;
create policy msr_overrides_read  on public.mobileshop_rental_overrides for select using (true);
create policy msr_overrides_write on public.mobileshop_rental_overrides for all
  using      ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null)
  with check ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);

-- consultations: 손님 INSERT / 관리자 읽기·수정 (공개 SELECT 금지 — 개인정보)
drop policy if exists msr_consult_insert on public.mobileshop_rental_consultations;
drop policy if exists msr_consult_read   on public.mobileshop_rental_consultations;
drop policy if exists msr_consult_update on public.mobileshop_rental_consultations;
create policy msr_consult_insert on public.mobileshop_rental_consultations for insert with check (true);
create policy msr_consult_read   on public.mobileshop_rental_consultations for select
  using ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);
create policy msr_consult_update on public.mobileshop_rental_consultations for update
  using ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);

-- ── 4) 시드: 현재 skmagic 본부공통 데이터를 합본으로 1회 복사 (가격/카드가 비지 않게) ──
--    skmagic 의 정책표·제휴카드 payload 를 합본 settings 로 복제. 이후엔 독립.
insert into public.mobileshop_rental_settings (key, payload)
select 'commission', payload from public.commission_data where id = 1
on conflict (key) do update set payload = excluded.payload, updated_at = now();

insert into public.mobileshop_rental_settings (key, payload)
select 'cards', payload from public.card_benefits where id = 1
on conflict (key) do update set payload = excluded.payload, updated_at = now();

-- faq/banner 는 비어 있어도 프런트 기본값이 있으므로 시드 생략(원하면 위와 동일 패턴으로 추가).

-- 확인용
select key, jsonb_typeof(payload) as payload_type, updated_at
from public.mobileshop_rental_settings order by key;
