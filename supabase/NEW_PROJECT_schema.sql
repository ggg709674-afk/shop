-- =============================================================================
-- woozoo-shop (합본 전용) 새 프로젝트 — 전체 스키마
--   skmagic-dealer(woozoo-apps)와 계정·데이터 완전 분리. 상품 이미지만 sk-magic.kr 원격 공유.
--   실행: woozoo-shop → SQL Editor 에 붙여넣고 Run.
--   쓰기 권한: 관리자 = JWT app_metadata.mobileshop_store_id 보유 계정. 읽기: 카탈로그 공개.
-- =============================================================================
create extension if not exists pgcrypto;

-- ── 휴대폰/인터넷 (모바일샵) ──
create table if not exists public.mobileshop_banners (
  id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.mobileshop_categories (
  id text primary key, label text not null, swatch text default '', sort_order int default 100, visible boolean default true
);
create table if not exists public.mobileshop_products_phone (
  id text primary key, carrier text default 'skt', model_id text, plan_id text,
  add_disc_mnp int, add_disc_chg int, notice text, image_url text, featured boolean default false, sort_order int
);
create table if not exists public.mobileshop_models (
  id text primary key, name text not null default '', carrier text default 'skt', colors jsonb default '[]'::jsonb,
  release_price int, rep_plan text, gift text, image_url text, prices jsonb default '{}'::jsonb,
  notice_date text, sort_order int, visible boolean default true
);
create table if not exists public.mobileshop_plans (
  id text primary key, name text not null default '', monthly_fee int, carrier text, sort_order int
);
create table if not exists public.mobileshop_support (
  id text primary key, model_id text, plan_id text, carrier text, amount int
);

-- ── 렌탈 (합본 전용) ──
create table if not exists public.mobileshop_rental_settings (
  key text primary key, payload jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
-- 오버라이드 — skmagic admin_overrides 호환 컬럼 (store_id 없음)
create table if not exists public.mobileshop_rental_overrides (
  goods_id text primary key,
  hidden boolean default false, featured boolean default false, featured_rank integer, order_index integer,
  name_override text, benefits_override text[], tag_override text,
  price_regular text, price_sale text, price_compete text, price_card text,
  display_term integer, display_care text, display_mode text,
  memo text, updated_at timestamptz not null default now()
);
-- 기존 프로젝트(이미 테이블 생성됨)용 — 추천 순서 컬럼 보강(멱등)
alter table public.mobileshop_rental_overrides add column if not exists featured_rank integer;
-- 상담/주문 — skmagic consultations 호환 컬럼 (store_id 없음)
create table if not exists public.mobileshop_rental_consultations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null, customer_phone text not null, customer_email text,
  customer_birth text, customer_address text,
  products jsonb not null default '[]'::jsonb,
  kind text not null default 'consult', status text not null default 'new',
  memo text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- ── RLS: 카탈로그 = 공개읽기/관리자쓰기 ──
do $$
declare t text;
begin
  foreach t in array array[
    'mobileshop_banners','mobileshop_categories','mobileshop_products_phone',
    'mobileshop_models','mobileshop_plans','mobileshop_support',
    'mobileshop_rental_settings','mobileshop_rental_overrides'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_read', t);
    execute format('drop policy if exists %I on public.%I;', t||'_write', t);
    execute format('create policy %I on public.%I for select using (true);', t||'_read', t);
    execute format($f$create policy %I on public.%I for all
        using ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null)
        with check ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);$f$, t||'_write', t);
  end loop;
end $$;

-- ── 상담: 손님 INSERT / 관리자 읽기·수정 (공개 SELECT 금지) ──
alter table public.mobileshop_rental_consultations enable row level security;
drop policy if exists msr_consult_insert on public.mobileshop_rental_consultations;
drop policy if exists msr_consult_read   on public.mobileshop_rental_consultations;
drop policy if exists msr_consult_update on public.mobileshop_rental_consultations;
create policy msr_consult_insert on public.mobileshop_rental_consultations for insert with check (true);
create policy msr_consult_read   on public.mobileshop_rental_consultations for select
  using ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);
create policy msr_consult_update on public.mobileshop_rental_consultations for update
  using ((auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);

-- ── 스토리지 버킷 (공개 읽기, 관리자 업로드) ──
insert into storage.buckets (id, name, public) values
  ('mobileshop-images','mobileshop-images', true),
  ('card-assets','card-assets', true),
  ('banner-assets','banner-assets', true)
on conflict (id) do nothing;
drop policy if exists msr_storage_admin_write on storage.objects;
create policy msr_storage_admin_write on storage.objects for all to authenticated
  using      (bucket_id in ('mobileshop-images','card-assets','banner-assets') and (auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null)
  with check (bucket_id in ('mobileshop-images','card-assets','banner-assets') and (auth.jwt() -> 'app_metadata' ->> 'mobileshop_store_id') is not null);
