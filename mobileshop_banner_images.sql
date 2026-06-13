-- ============================================================
-- mobile-shop 배너 삽입 이미지 — 사용자가 올린 그룹·이미지
-- ============================================================
-- Supabase(woozoo-apps) SQL Editor에서 전체를 한번에 실행.
-- 사이트편집 "배너에 삽입할 이미지" 모달에서 형이 직접 만든 그룹/이미지를 저장.
-- (KT 크롤 기본 이미지는 kt-models.json 정적 파일 — 이 테이블엔 안 들어감)
--
-- group_name 같은 행들 = 한 그룹. 그룹은 행으로만 정의(별도 그룹 테이블 없음).
-- ============================================================

create table if not exists public.mobileshop_banner_images (
  id          text primary key,
  group_name  text not null,                 -- 그룹 이름 (예: "프로모션 5월")
  label       text,                          -- 이미지 라벨 (선택)
  image_url   text not null,                 -- Supabase Storage 공개 URL
  sort_order  integer     default 0,
  created_at  timestamptz default now()
);

-- 그룹별 조회 빠르게
create index if not exists mobileshop_banner_images_group_idx
  on public.mobileshop_banner_images (group_name);

-- MVP — anon 전부 허용 (다른 mobileshop_* 테이블과 동일 정책)
alter table public.mobileshop_banner_images enable row level security;

drop policy if exists mobileshop_banner_images_all on public.mobileshop_banner_images;
create policy mobileshop_banner_images_all on public.mobileshop_banner_images
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.mobileshop_banner_images to anon, authenticated;

notify pgrst, 'reload schema';
