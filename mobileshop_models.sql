-- ============================================================
-- mobile-shop 모델·가격 테이블
-- ============================================================
-- Supabase(woozoo-apps) SQL Editor에서 전체를 한번에 실행.
-- 모델 1건 = 1행. 통신사별 가격은 prices(jsonb)에 묶어서 저장.
--   prices = {
--     "skt": { "common": 공통지원금, "addMnp": 추가할인_번호이동, "addChg": 추가할인_기기변경 },
--     "kt":  { ... }, "lg": { ... }
--   }
-- 최종가·할인율은 저장 안 함 — 출고가/공통지원금/추가할인으로 화면에서 자동 계산.
-- ============================================================

create table if not exists public.mobileshop_models (
  id            text primary key,
  name          text not null,                 -- 모델명+용량 "iPhone 17 Pro 256GB"
  colors        jsonb       default '[]'::jsonb,-- ["블랙","화이트"]
  release_price integer,                        -- 출고가
  rep_plan      text,                           -- 대표 요금제명
  gift          text,                           -- 사은품
  image_url     text,
  prices        jsonb       default '{}'::jsonb,-- 통신사별 가격 (위 주석 참고)
  sort_order    integer     default 0,
  visible       boolean     default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- MVP — anon 전부 허용 (다른 mobileshop_* 테이블과 동일 정책)
alter table public.mobileshop_models enable row level security;

drop policy if exists mobileshop_models_all on public.mobileshop_models;
create policy mobileshop_models_all on public.mobileshop_models
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.mobileshop_models to anon, authenticated;

notify pgrst, 'reload schema';
