-- ============================================================
-- mobileshop_models 공시일 컬럼 추가 (공통지원금 표 공시일 표시용)
-- ============================================================
-- Supabase(woozoo-apps) SQL Editor에서 1회 실행.
-- 모델별 가장 최근 공시일을 저장. 크롤러 import / backfill 스크립트가 채움.
-- (DDL은 PostgREST 키로 못 돌리므로 여기서 직접 실행해야 함)
-- ============================================================

alter table public.mobileshop_models
  add column if not exists notice_date date;

notify pgrst, 'reload schema';
