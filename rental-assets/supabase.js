/* ============================================================
   supabase.js — Supabase 클라이언트 초기화 + 공통 헬퍼
   - CDN의 supabase-js v2 글로벌 사용 (window.supabase)
   - 슬러그: rental.html <head>의 window.RENTAL_STORE_SLUG 고정 사용
     (멀티테넌트 ?store=/path 파싱은 합본 사이트에서 제거됨 — skmGetSlug 참조)
   ============================================================ */

(function(){
  // woozoo-shop 프로젝트 (합본 전용, skmagic/woozoo-apps 와 완전 분리)
  const SUPABASE_URL  = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient){
    console.error('[supabase] supabase-js CDN 이 로드되지 않았습니다. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> 가 먼저 와야 합니다.');
    return;
  }

  // 글로벌 클라이언트 — 모든 페이지에서 공용
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'skm-auth',
    },
  });

  /* ─── 매장 슬러그 — 합본(mobile-shop-rental) 사이트는 단일 매장 고정 ─────
     원래 멀티테넌트(sk-magic.kr/{슬러그})의 path 파싱이었지만, 합본 사이트는
     /rental 단일 페이지라 path 를 슬러그로 해석하면 안 됨('rental'이 매장으로 오인).
     → rental.html <head> 의 window.RENTAL_STORE_SLUG 를 그대로 사용.
       매장을 바꾸려면 rental.html 의 RENTAL_STORE_SLUG 와 아래 fallback('skmagic')을 함께 수정. */
  window.skmGetSlug = function(){
    return window.RENTAL_STORE_SLUG || 'woozoo_shop';
  };

  /* ─── 매장 경로 헬퍼 ───────────────────────────────
     합본 사이트는 슬러그 경로 prefix 가 없음 — 정적페이지(/card-benefits 등)는
     모두 루트에 그대로 있으므로 경로를 변경하지 않는다. */
  window.skmStorePath = function(p){
    return p;
  };

  /* ─── 페이지 내 링크 보정 (합본 사이트) ─────────────
     정적 정보페이지(/card-benefits·/faq·/terms·/privacy)는 루트 그대로 두고,
     구 카탈로그 링크(./index.html?…|category.html?…|detail.html?…)만 /rental?… 로 바꾼다.
     (정적페이지 헤더/푸터의 카탈로그 링크가 모바일샵 index.html 로 가는 것 방지 안전망.)
     외부·앵커·tel/mailto 링크는 건드리지 않음. */
  window.skmLocalizeLinks = function(opts){
    opts = opts || {};
    const CATALOG = /^\.?\/?(?:index|category|detail)\.html(\?[^#]*)?(#.*)?$/i;
    document.querySelectorAll('a[href]').forEach(function(a){
      const raw = a.getAttribute('href');
      if (!raw || /^(?:#|mailto:|tel:|javascript:|https?:|\/\/)/i.test(raw)) return;
      if (a.dataset.skmLocalized) return;   // 중복 보정 방지(재렌더 대비)
      const m = raw.match(CATALOG);
      if (m) { a.setAttribute('href', '/rental' + (m[1] || '') + (m[2] || '')); a.dataset.skmLocalized = '1'; }
    });
  };

  /* ─── 상담 신청 FAB 마운트 (정적 정보페이지 공용) ────────
     메인 카탈로그의 우하단 '상담 신청' 플로팅 버튼 + 전화/카카오 팝업을,
     card-benefits/faq/terms/privacy 같은 정적 페이지에도 동일하게 띄운다.
     CSS(.fab-consult/.fab-popup)는 style.css 공용. store 없으면 라벨만(전화/카카오 생략). */
  window.skmMountConsultFab = function(store){
    if (document.getElementById('fab-consult')) return;   // 이미 있으면(메인 등) 스킵
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    store = store || {};
    const tel   = (store.phone || '').trim();
    const kakao = (store.kakao_url || '').trim();
    const hours = (store.biz_hours || '').trim();
    const chat  = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    const fab = document.createElement('a');
    fab.className = 'fab-consult'; fab.href = '#'; fab.id = 'fab-consult'; fab.setAttribute('aria-label', '상담 신청 열기');
    fab.innerHTML = chat + '<span class="fab-label">상담 신청</span>';
    const popup = document.createElement('div');
    popup.className = 'fab-popup'; popup.id = 'fab-popup'; popup.hidden = true;
    popup.innerHTML =
      '<p class="pop-label">지금 바로 상담 가능</p>' +
      (tel   ? `<a class="pop-tel" href="tel:${esc(tel.replace(/[^0-9+]/g,''))}">${esc(tel)}</a>` : '') +
      (hours ? `<div class="pop-hours">${esc(hours)}</div>` : '') +
      (kakao ? `<a class="pop-kakao" href="${esc(kakao)}" target="_blank" rel="noopener">카카오톡 상담</a>` : '');
    document.body.appendChild(fab);
    document.body.appendChild(popup);
    fab.addEventListener('click', e => { e.preventDefault(); popup.hidden = !popup.hidden; });
    document.addEventListener('click', e => {
      if (popup.hidden) return;
      if (e.target.closest('.fab-consult') || e.target.closest('.fab-popup')) return;
      popup.hidden = true;
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup.hidden) popup.hidden = true; });
    if (window.skmMountScrollTop) window.skmMountScrollTop();   // 정적페이지에도 맨위로 버튼 같이
  };

  /* ─── 맨 위로 버튼 (스크롤 내려가면 좌하단에 노출) ──────── */
  window.skmMountScrollTop = function(){
    if (document.getElementById('scroll-top')) return;
    const btn = document.createElement('button');
    btn.id = 'scroll-top'; btn.className = 'scroll-top'; btn.type = 'button'; btn.setAttribute('aria-label', '맨 위로');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); btn.blur(); });
    // 아래로 스크롤 + 400px 넘으면 표시 / 위로 스크롤하면 무조건 숨김
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < lastY) btn.classList.remove('show');         // 위로 올림 → 숨김
      else if (y > 400) btn.classList.add('show');          // 아래로 + 충분히 내려옴 → 표시
      if (y <= 0) btn.classList.remove('show');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  /* ─── 합본 단일샵 — stores 테이블 없음. 합성 매장 객체 반환 ─────
     skmagic 멀티테넌트(분양/매장)는 합본에서 미사용. 단일 매장 '우주커넥트' 고정. */
  const _COMBINED_STORE = {
    id: 'woozoo_shop', slug: 'woozoo_shop', name: '우주커넥트', type: 'shop',
    parent_store_id: null, margin_group: null,
    biz_no: null, biz_owner: null, mail_order_no: null, address: null,
    phone: null, email: null, biz_hours: null, kakao_url: null,
    theme_color: null, logo_url: null, margins: {}, customer_support: {}
  };
  window.skmFetchStore = async function(){ return _COMBINED_STORE; };

  /* ─── 합본 단일샵 — 분양/매장 관리 미사용 → 무해 스텁 ─────
     (분양관리·본부전용 메뉴는 합본 사이드바에서 숨김. 혹시 호출돼도 stores 미존재로 깨지지 않게.) */
  window.skmUpdateStore = async function(){ return { data: _COMBINED_STORE, error: null }; };
  window.skmSaveMargins = async function(){ return { data: null, error: null }; };
  window.skmSaveCustomerSupport = async function(){ return { data: null, error: null }; };
  window.skmFetchChildStores = async function(){ return []; };
  window.skmFetchAllStores = async function(){ return []; };
  window.skmCreateStoreAccount = async function(){ return { error: new Error('합본 단일샵에선 분양(계정생성) 미지원') }; };
  window.skmDeleteStore = async function(){ return { error: new Error('합본 단일샵에선 미지원') }; };

  /* ─── 로그인 비밀번호 변경 (본인 계정 — 기본정보 메뉴) ───
     Supabase 세션 기반. 최소 6자(프로젝트 정책). */
  window.skmChangePassword = async function(newPw){
    if (!newPw || newPw.length < 6) return { error: new Error('비밀번호는 6자 이상이어야 해요.') };
    const { error } = await window.sb.auth.updateUser({ password: newPw });
    if (error) console.warn('[skmChangePassword]', error);
    return { error };
  };

  window.skmUpdateStoreMarginGroup = async function(){ return { error: null }; };
  window.skmCreateChildStore = async function(){ return { error: new Error('합본 단일샵에선 분양 미지원') }; };

  /* ─── 상담/주문 신청 INSERT (방문자 누구나 — RLS consult_insert_public) ─
     payload = { storeId, kind:'consult'|'order', name, phone, birth, address, email, products, memo }
       - consult: 이름·연락처만 / order: 생년월일·주소까지
       - products: [{goodsId, name, careType, contract, ...}] 선택 상품·옵션 스냅샷 */
  window.skmInsertConsultation = async function(payload){
    payload = payload || {};
    const kind = payload.kind === 'order' ? 'order' : 'consult';
    const trim = v => (v == null ? '' : String(v)).trim();
    const row = {
      kind,
      customer_name:  trim(payload.name),
      customer_phone: trim(payload.phone),
      customer_email: trim(payload.email) || null,
      customer_birth:   kind === 'order' ? (trim(payload.birth)   || null) : null,
      customer_address: kind === 'order' ? (trim(payload.address) || null) : null,
      products: Array.isArray(payload.products) ? payload.products : [],
      memo: trim(payload.memo) || null,
    };
    const insertOnce = () => window.sb.from('mobileshop_rental_consultations').insert(row);
    let { error } = await insertOnce();
    if (error && !error.code){
      await new Promise(r => setTimeout(r, 600));
      ({ error } = await insertOnce());
    }
    if (error) console.warn('[skmInsertConsultation]', error.code || '', error.message || error);
    return { data: error ? null : { ok: true }, error };
  };

  /* ─── 상담/주문 신청 목록 조회 (계층 — RLS consult_visible_view = my_visible_stores) ─
     storeId: 문자열=그 매장만 / 배열=그 매장들만(.in) / 생략=RLS 가 보이는 매장 전체
     (본부=전체 / 분양형=자기+산하 / 판매점=자기). 매장명 표시용으로 stores 조인. */
  window.skmFetchConsultations = async function(){
    const { data, error } = await window.sb
      .from('mobileshop_rental_consultations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error){ console.warn('[skmFetchConsultations]', error); return []; }
    return data || [];
  };

  /* ─── 신청 상태·메모·상세값 변경 (매장 owner — RLS consult_visible_update) ─
     patch 의 허용 키만 update. 상세 모달에서 유형(전환구매 포함)·고객정보·관심상품(products)까지 수정 가능. */
  window.skmUpdateConsultation = async function(id, patch){
    if (!id) return { error: new Error('id 필요') };
    const ALLOWED = ['status', 'memo', 'kind',
      'customer_name', 'customer_phone', 'customer_email', 'customer_birth', 'customer_address',
      'products'];
    const row = { updated_at: new Date().toISOString() };
    for (const k of ALLOWED){
      if (patch && Object.prototype.hasOwnProperty.call(patch, k)) row[k] = patch[k];
    }
    const { data, error } = await window.sb
      .from('mobileshop_rental_consultations')
      .update(row)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) console.warn('[skmUpdateConsultation]', error);
    return { data, error };
  };

  /* ─── 상품 오버라이드 — 합본 전용 단일 테이블 (store_id 없음) ───────── */
  window.skmFetchOverrides = async function(){
    const { data, error } = await window.sb
      .from('mobileshop_rental_overrides')
      .select('*');
    if (error){ console.warn('[skmFetchOverrides]', error); return []; }
    return data || [];
  };

  window.skmUpsertOverride = async function(storeId, goodsId, patch){
    if (!goodsId) return { error: new Error('goodsId 필요') };
    const row = { goods_id: goodsId, ...patch, updated_at: new Date().toISOString() };
    delete row.store_id;  // 합본 테이블엔 store_id 없음 (혹시 patch에 섞여와도 제거)
    // 스키마에 없는 컬럼(예: featured_rank 미보강 프로젝트)이 섞여 PGRST204 가 나면
    // 해당 컬럼을 떼고 1회 재시도 → 컬럼 보강 전에도 노출/추천 토글이 동기화되게 함.
    let attempt = row, lastErr = null;
    for (let i = 0; i < 5; i++){
      const { data, error } = await window.sb
        .from('mobileshop_rental_overrides')
        .upsert(attempt, { onConflict: 'goods_id' })
        .select()
        .maybeSingle();
      if (!error) return { data, error: null };
      lastErr = error;
      const miss = error.code === 'PGRST204' && /'([^']+)' column/.exec(error.message || '');
      if (miss && miss[1] in attempt){ attempt = { ...attempt }; delete attempt[miss[1]]; continue; }
      break;
    }
    console.warn('[skmUpsertOverride]', lastErr);
    return { data: null, error: lastErr };
  };

  window.skmDeleteOverride = async function(storeId, goodsId){
    const { error } = await window.sb
      .from('mobileshop_rental_overrides')
      .delete()
      .eq('goods_id', goodsId);
    if (error) console.warn('[skmDeleteOverride]', error);
    return { error };
  };

  /* ─── 합본 전용 설정 단일행 헬퍼 (mobileshop_rental_settings, key 기반) ───
     skmagic 의 본부공통 단일행(id=1) 4테이블(commission/cards/faq/banner)을
     합본에선 settings 테이블의 key 행으로 통합. payload(jsonb) 모양은 그대로 보존. */
  async function _msrGetSetting(key){
    const { data, error } = await window.sb
      .from('mobileshop_rental_settings')
      .select('payload, updated_at')
      .eq('key', key)
      .maybeSingle();
    if (error){ console.warn('[msrGetSetting '+key+']', error); return null; }
    return data;  // { payload, updated_at } 또는 null
  }
  async function _msrSaveSetting(key, payload){
    const { data, error } = await window.sb
      .from('mobileshop_rental_settings')
      .upsert({ key, payload: payload || {}, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .maybeSingle();
    if (error) console.warn('[msrSaveSetting '+key+']', error);
    return { data, error };
  }

  /* ─── 정책표(수수료) ─── */
  window.skmFetchCommission = async function(){ return await _msrGetSetting('commission'); };
  // 합본은 단일샵 → 스코프 차감 없음. settings 의 commission payload 그대로 반환(없으면 null → 정적 commission.js 폴백).
  window.skmFetchCommissionScoped = async function(){
    const d = await _msrGetSetting('commission');
    return d ? (d.payload || null) : null;
  };
  window.skmSaveCommission = async function(payload){ return _msrSaveSetting('commission', payload); };

  /* ─── 제휴카드 (이미지·링크 + 할인액 discounts) ─── */
  window.skmFetchCardBenefits = async function(){ return await _msrGetSetting('cards'); };
  window.skmSaveCardBenefits = async function(payload){ return _msrSaveSetting('cards', payload); };

  /* ─── 카드할인금액 저장 (card_benefits.payload.discounts 통합, 본부 공통) ───
     discounts = { "<goodsId>": { sale: 13000, compete: 3000 }, ... } (할인액).
     기존 payload(cards 등)는 보존하고 discounts 만 교체. */
  window.skmSaveCardDiscounts = async function(discounts){
    let cur = null;
    try { cur = await window.skmFetchCardBenefits(); } catch(_){}
    const payload = Object.assign({}, (cur && cur.payload) || {}, { discounts: discounts || {} });
    return window.skmSaveCardBenefits(payload);
  };

  /* ─── 카드 이미지 업로드 (Storage card-assets 버킷) → public URL 반환 ─── */
  window.skmUploadCardImage = async function(key, file){
    if (!key || !file) return { error: new Error('key/file 필요') };
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `cards/${key}.${ext}`;
    const { error: upErr } = await window.sb.storage
      .from('card-assets')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
    if (upErr){ console.warn('[skmUploadCardImage]', upErr); return { error: upErr }; }
    const { data } = window.sb.storage.from('card-assets').getPublicUrl(path);
    // 캐시 무력화용 쿼리 부착 (같은 경로 덮어쓰기 시 갱신)
    const url = data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
    return { url };
  };

  /* ─── FAQ (payload = { items:[{q,a}] }) ─── */
  window.skmFetchFaq = async function(){ return await _msrGetSetting('faq'); };
  window.skmSaveFaq  = async function(payload){ return _msrSaveSetting('faq', payload); };

  /* ─── 홈 배너/슬라이드 (payload = { mode, interval, items:[...] }) ─── */
  window.skmFetchBanners = async function(){ return await _msrGetSetting('banner'); };
  window.skmSaveBanners  = async function(payload){ return _msrSaveSetting('banner', payload); };

  /* ─── 배너 이미지 업로드 (Storage banner-assets) → public URL ───
     배너는 여러 개라 파일명을 매번 고유하게 생성. */
  window.skmUploadBannerImage = async function(file){
    if (!file) return { error: new Error('file 필요') };
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `banners/${Date.now()}_${rand}.${ext}`;
    const { error: upErr } = await window.sb.storage
      .from('banner-assets')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (upErr){ console.warn('[skmUploadBannerImage]', upErr); return { error: upErr }; }
    const { data } = window.sb.storage.from('banner-assets').getPublicUrl(path);
    return { url: data?.publicUrl || null };
  };

  /* ─── 현재 로그인된 사용자 + 매장 컨텍스트 (합본 단일샵 — stores 미사용) ─── */
  window.skmAuthContext = async function(){
    const { data: { user } } = await window.sb.auth.getUser();
    if (!user) return { user: null, store: null, isSuperAdmin: false };
    // 합본은 단일 매장 고정. 분양/본부(super) 개념 없음.
    return { user, store: _COMBINED_STORE, isSuperAdmin: false };
  };

})();
