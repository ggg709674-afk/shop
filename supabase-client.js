// ─────────────────────────────────────────────────────────────────────
// supabase-client.js — woozoo-apps 프로젝트 클라이언트
// 이 파일은 @supabase/supabase-js (CDN UMD) 로드 직후 실행돼야 함
// anon key는 브라우저 노출 안전 (Supabase 공식 정책)
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://qpexfvwrlwkpjyihlnwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZXhmdndybHdrcGp5aWhsbnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTAwMTIsImV4cCI6MjA5MzQ2NjAxMn0.Aq1b2i5UpQ2Y48nWlnygkkxrw-h8GufAkl8L8K8e0kY';

if (!window.supabase || !window.supabase.createClient) {
  console.error('[supabase-client] @supabase/supabase-js CDN이 먼저 로드돼야 합니다.');
}

// admin.html만 로그인 세션이 필요. 공개 사이트(index.html, 미리보기 iframe 포함)는
// anon 읽기 전용 → 인증 클라이언트를 만들면 navigator 잠금을 두고 admin과 충돌해
// getSession()이 매달릴 수 있음. 그래서 admin일 때만 세션 유지 클라이언트 생성.
const _isAdminPage = /admin\.html$/.test(location.pathname);

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: _isAdminPage
    ? {
        persistSession: true,    // admin.html 로그인 세션 유지 (새로고침/재방문)
        autoRefreshToken: true,
        storageKey: 'mobileshop_auth'  // woozoo-apps 다른 앱과 세션 분리
      }
    : {
        persistSession: false,   // 공개 사이트는 인증 안 씀
        autoRefreshToken: false
      }
});
