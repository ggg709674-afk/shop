// ─────────────────────────────────────────────────────────────────────
// data-store.js — 사이트 데이터의 단일 진입점 (Supabase 백엔드)
// 사용 패턴:
//   await DataStore.init();        // 부트스트랩 (앱 시작 시 1회)
//   const data = DataStore.load(); // 캐시에서 동기 반환
//   await DataStore.save(data);    // DB 업서트
//   await DataStore.reset();       // 모든 데이터 삭제 → 기본값
//   const url = await DataStore.uploadImage(file, 'banner-bg');
// ─────────────────────────────────────────────────────────────────────

// ───── 배경 프리셋 라이브러리 (admin에서 선택, index.html에서 CSS 클래스로 적용) ─────
const BACKGROUND_PRESETS = [
  { id: 'lavender-pastel', label: '라벤더 파스텔', desc: '영롱 보라 + 로즈 광채 (휴대폰 기본)' },
  { id: 'sky-pastel',      label: '스카이 파스텔', desc: '스카이 + 라벤더 (인터넷 기본)' },
  { id: 'mint-pastel',     label: '민트 파스텔',   desc: '민트 + 피치 (렌탈 기본)' },
  { id: 'rose-warm',       label: '로즈 웜',       desc: '핑크-피치 따뜻한 그라데이션' },
  { id: 'sunset-gradient', label: '선셋',          desc: '오렌지 → 핑크' },
  { id: 'aurora',          label: '오로라',        desc: '5색 영롱 다이라이트' },
  { id: 'dark-glow',       label: '다크 글로우',   desc: '딥 블루 + 보라 광채 (다크톤)' },
  { id: 'mono-clean',      label: '미니멀 화이트', desc: '거의 흰색 + 옅은 라인' },
  { id: 'mono-ink',        label: '미니멀 다크',   desc: '거의 검정 + 옅은 라인' },
  { id: 'mesh-pastel',     label: '메쉬 파스텔',   desc: '여러 색 부드러운 메쉬' },
  // ───── 단색 10종 (테마 액센트 색에 맞춘 부드러운 톤) ─────
  { id: 'solid-lavender',  label: '라벤더 단색',   desc: '연한 라벤더 단일톤' },
  { id: 'solid-sky',       label: '스카이 단색',   desc: '연한 하늘색 단일톤 (토스 무드)' },
  { id: 'solid-mint',      label: '민트 단색',     desc: '연한 민트 단일톤' },
  { id: 'solid-coral',     label: '코랄 단색',     desc: '연한 살구 단일톤' },
  { id: 'solid-beige',     label: '베이지 단색',   desc: '오트밀 베이지 단일톤 (웜)' },
  { id: 'solid-slate',     label: '슬레이트 단색', desc: '연한 회색 단일톤 (클래식)' },
  { id: 'solid-lilac',     label: '라일락 단색',   desc: '연한 보라 단일톤' },
  { id: 'solid-cream',     label: '크림 단색',     desc: '연한 크림 옐로우' },
  { id: 'solid-pink',      label: '핑크 단색',     desc: '소프트 핑크 단일톤' },
  { id: 'solid-sage',      label: '세이지 단색',   desc: '옅은 세이지 그린' },
  // ───── 패턴 (흰 바탕) ─────
  { id: 'pattern-dots',    label: '화이트 도트',   desc: '흰 바탕 + 잔잔한 도트' },
  { id: 'pattern-stripes', label: '화이트 스트라이프', desc: '흰 바탕 + 대각선 스트라이프' }
];

const DEFAULT_DATA = {
  banners: {
    phone: {
      tags: [{ text: '사전예약', hot: true }, { text: 'D-3', hot: false }],
      eyebrow: 'SAMSUNG GALAXY',
      title: 'S26 Ultra · 5월 신상',
      ctaText: '예약 혜택',
      ctaHighlight: '−730,000원',
      imageUrl: '',
      background: { type: 'preset', presetId: 'lavender-pastel', imageUrl: '' }
    },
    internet: {
      tags: [{ text: '결합특가', hot: true }, { text: '5월 한정', hot: false }],
      eyebrow: 'SK · KT · LG U+ INTERNET',
      title: '1G + IPTV · 평생 할인',
      ctaText: '현금 사은품',
      ctaHighlight: '최대 35만원',
      imageUrl: '',
      background: { type: 'preset', presetId: 'sky-pastel', imageUrl: '' }
    },
    rental: {
      tags: [{ text: '신상', hot: true }, { text: '4개월 무료', hot: false }],
      eyebrow: 'SK매직 · 코웨이 RENTAL',
      title: '정수기 · 청정기 · 식세기',
      ctaText: '설치비',
      ctaHighlight: '0원 + 무료체험',
      imageUrl: '',
      background: { type: 'preset', presetId: 'mint-pastel', imageUrl: '' }
    }
  },
  productsPhone: [],
  models: [],
  plans: [],
  support: []
};

// 기본 카테고리 (DB에 mobileshop_categories 없을 때 폴백)
const DEFAULT_CATEGORIES = [
  { id: 'skt',  label: 'SKT',   swatch: 'skt',  sort_order: 10 },
  { id: 'kt',   label: 'KT',    swatch: 'kt',   sort_order: 20 },
  { id: 'lg',   label: 'LG U+', swatch: 'lg',   sort_order: 30 },
  { id: 'mvno', label: '알뜰폰', swatch: '',     sort_order: 40 }
];

// 레거시 호환 (구 코드가 CARRIER_META 참조)
const CARRIER_META = {
  skt:  { label: 'SKT',   swatch: 'skt'  },
  kt:   { label: 'KT',    swatch: 'kt'   },
  lg:   { label: 'LG U+', swatch: 'lg'   },
  mvno: { label: '알뜰폰', swatch: ''    }
};

const STORAGE_BUCKET = 'mobileshop-images';

const DataStore = {
  _cache: null,
  _ready: null,
  CACHE_KEY: 'mobileshop_snapshot_v1',
  _cacheKey: 'mobileshop_snapshot_v1',

  // 부트스트랩: localStorage 즉시 hydration + Supabase 백그라운드 fetch
  // opts.master:false → 손님 페이지(index.html)용. models/plans/support(2만행+) 안 받음.
  // admin.html은 인자 없이 호출 → master 전부 로드.
  init(opts = {}) {
    if (this._ready) return this._ready;

    const loadMaster = opts.master !== false;
    this._cacheKey = loadMaster ? this.CACHE_KEY : this.CACHE_KEY + '_lite';

    // ① 동기 캐시 hydration — 첫 렌더가 fetch 대기 안 하게
    try {
      const cached = localStorage.getItem(this._cacheKey);
      if (cached) this._cache = JSON.parse(cached);
    } catch (e) { /* 무시 */ }

    // ② 비동기 fresh fetch
    this._ready = (async () => {
      try {
        const sb = window.supabaseClient;
        if (!sb) throw new Error('supabaseClient 없음 (supabase-client.js 먼저 로드)');

        const [bRes, pRes, cRes] = await Promise.all([
          sb.from('mobileshop_banners').select('id, data'),
          sb.from('mobileshop_products_phone').select('*').order('sort_order', { ascending: true }),
          sb.from('mobileshop_categories').select('*').order('sort_order', { ascending: true })
        ]);
        if (bRes.error) throw bRes.error;
        if (pRes.error) throw pRes.error;
        if (cRes.error) throw cRes.error;

        const def = this._cloneDefault();
        const banners = Object.assign({}, def.banners);
        (bRes.data || []).forEach(row => { if (row && row.id) banners[row.id] = row.data; });

        const productsPhone = (pRes.data && pRes.data.length > 0)
          ? pRes.data.map(this._rowToProduct)
          : def.productsPhone;

        const categories = (cRes.data && cRes.data.length > 0)
          ? cRes.data
          : DEFAULT_CATEGORIES.slice();

        // 마스터 데이터 (모델/요금제/공통지원금) — admin 전용. 손님 페이지는 안 받음.
        let models = [], plans = [], support = [];
        if (loadMaster) {
          try {
            // 1차 — 모델/요금제 + 공통지원금 행 수(count)를 한 번에 병렬 요청
            const [mRes, plRes, cRes] = await Promise.all([
              sb.from('mobileshop_models').select('*').order('sort_order', { ascending: true }),
              sb.from('mobileshop_plans').select('*').order('sort_order', { ascending: true }),
              sb.from('mobileshop_support').select('*', { count: 'exact', head: true })
            ]);
            if (!mRes.error)  models = (mRes.data  || []).map(this._rowToModel);
            if (!plRes.error) plans  = (plRes.data || []).map(this._rowToPlan);
            // 2차 — 공통지원금은 1000행 초과 → 전 페이지를 병렬 요청 (순차 20여 번 → 병렬 1번)
            const total = cRes.error ? 0 : (cRes.count || 0);
            if (total) {
              const pageReqs = [];
              for (let from = 0; from < total; from += 1000) {
                pageReqs.push(sb.from('mobileshop_support').select('*').range(from, from + 999));
              }
              const pages = await Promise.all(pageReqs);
              for (const pg of pages) {
                if (!pg.error) support.push(...(pg.data || []).map(this._rowToSupport));
              }
            }
          } catch (e) {
            console.warn('[DataStore.init] 마스터 로드 스킵:', e);
          }
        }

        this._cache = { banners, productsPhone, categories, models, plans, support };
        // 다음 방문용 캐시 저장
        this._persistCache();
      } catch (e) {
        console.error('[DataStore.init] Supabase 로드 실패, 기본값/캐시 사용:', e);
        if (!this._cache) this._cache = this._cloneDefault();
      }
    })();
    return this._ready;
  },

  load() {
    return this._cache || this._cloneDefault();
  },

  async save(data) {
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('supabaseClient 없음');

      const bannerRows = ['phone', 'internet', 'rental'].map(id => ({
        id,
        data: data.banners[id] || this._cloneDefault().banners[id],
        updated_at: new Date().toISOString()
      }));
      const { error: bErr } = await sb
        .from('mobileshop_banners')
        .upsert(bannerRows, { onConflict: 'id' });
      if (bErr) throw bErr;

      // 상품: delete-all → insert (MVP — 변경량 적어서 충분)
      const { error: dErr } = await sb
        .from('mobileshop_products_phone')
        .delete()
        .not('id', 'is', null);
      if (dErr) throw dErr;

      const list = Array.isArray(data.productsPhone) ? data.productsPhone : [];
      if (list.length > 0) {
        const rows = list.map((p, i) => this._productToRow(p, i));
        const { error: pErr } = await sb
          .from('mobileshop_products_phone')
          .insert(rows);
        if (pErr) throw pErr;
      }

      // 모델: delete-all → insert (상품과 동일 패턴)
      const { error: mdErr } = await sb
        .from('mobileshop_models')
        .delete()
        .not('id', 'is', null);
      if (mdErr) throw mdErr;

      const mlist = Array.isArray(data.models) ? data.models : [];
      if (mlist.length > 0) {
        const mrows = mlist.map((m, i) => this._modelToRow(m, i));
        const { error: miErr } = await sb
          .from('mobileshop_models')
          .insert(mrows);
        if (miErr) throw miErr;
      }

      // 요금제 마스터 (동일 패턴).
      // ⚠ 공통지원금(support)은 2만행+ — 전체 delete+insert 하면 브라우저가 멈춤.
      // 셀 편집 시 saveSupport/deleteSupport로 행 단위 즉시 저장되므로 여기선 건드리지 않음.
      await this._replaceTable('mobileshop_plans', data.plans, (p, i) => this._planToRow(p, i));

      this._cache = JSON.parse(JSON.stringify(data));
      this._persistCache();
      window.dispatchEvent(new Event('mobileshop:datachange'));
      return true;
    } catch (e) {
      alert('저장 실패: ' + (e?.message || e));
      console.error('[DataStore.save]', e);
      return false;
    }
  },

  async reset() {
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('supabaseClient 없음');

      const [r1, r2] = await Promise.all([
        sb.from('mobileshop_banners').delete().not('id', 'is', null),
        sb.from('mobileshop_products_phone').delete().not('id', 'is', null)
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      try { await sb.from('mobileshop_models').delete().not('id', 'is', null); } catch (e) {}
      try { await sb.from('mobileshop_plans').delete().not('id', 'is', null); } catch (e) {}
      try { await sb.from('mobileshop_support').delete().not('id', 'is', null); } catch (e) {}

      this._cache = this._cloneDefault();
      try { localStorage.removeItem(this.CACHE_KEY); } catch (e) {}
      window.dispatchEvent(new Event('mobileshop:datachange'));
      return true;
    } catch (e) {
      alert('리셋 실패: ' + (e?.message || e));
      console.error('[DataStore.reset]', e);
      return false;
    }
  },

  newId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  },

  // ───── 모델 핀포인트 저장 (전체 재작성 없이 단일 행만) ─────
  // sortOrder 생략 시(=null) sort_order 컬럼을 건드리지 않음 → 편집 때 순서 유지
  async saveModel(model, sortOrder) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const row = this._modelToRow(model, 0);
    if (sortOrder == null) delete row.sort_order;
    else row.sort_order = sortOrder;
    const { error } = await sb.from('mobileshop_models').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this._touchCache();
  },

  async deleteModel(id) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_models').delete().eq('id', id);
    if (error) throw error;
    await sb.from('mobileshop_support').delete().eq('model_id', id);
    this._touchCache();
  },

  // 한 통신사 모델 전체 교체 (엑셀 업로드) — list 배열 순서 = 표시 순서(sort_order)
  async replaceCarrierModels(carrier, list) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { data: existing } = await sb.from('mobileshop_models').select('id').eq('carrier', carrier);
    const oldIds = (existing || []).map(r => r.id);

    const { error: dErr } = await sb.from('mobileshop_models').delete().eq('carrier', carrier);
    if (dErr) throw dErr;

    const rows = list.map((m, i) => this._modelToRow(Object.assign({}, m, { carrier }), i));
    if (rows.length) {
      const { error: iErr } = await sb.from('mobileshop_models').insert(rows);
      if (iErr) throw iErr;
    }
    // 목록에서 빠진 모델의 공통지원금 정리
    const newIds = new Set(rows.map(r => r.id));
    for (const id of oldIds) {
      if (!newIds.has(id)) await sb.from('mobileshop_support').delete().eq('model_id', id);
    }
    this._touchCache();
  },

  // ───── 요금제 핀포인트 저장 ─────
  async savePlan(plan, sortOrder) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const row = this._planToRow(plan, 0);
    if (sortOrder == null) delete row.sort_order;
    else row.sort_order = sortOrder;
    const { error } = await sb.from('mobileshop_plans').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this._touchCache();
  },

  async deletePlan(id) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_plans').delete().eq('id', id);
    if (error) throw error;
    await sb.from('mobileshop_support').delete().eq('plan_id', id);
    this._touchCache();
  },

  // ───── 공통지원금 핀포인트 저장 (셀 1칸 = 행 1개) ─────
  // woozoo 방식 — DB upsert 딱 하나만. 캐시 쓰기/이벤트 없음(support는 캐시에 안 담음).
  async saveSupport(entry) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_support')
      .upsert(this._supportToRow(entry), { onConflict: 'id' });
    if (error) throw error;
  },

  async deleteSupport(modelId, planId, carrier) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_support')
      .delete()
      .eq('model_id', modelId).eq('plan_id', planId).eq('carrier', carrier);
    if (error) throw error;
  },

  // 캐시 영속화 — support(2만행+)는 빼고 저장. 매 저장마다 통째 stringify하면 메인스레드가 멈춤.
  // 다음 방문 hydration용일 뿐이고, init()가 어차피 fresh fetch로 support를 다시 채움.
  _persistCache() {
    try {
      const slim = Object.assign({}, this._cache, { support: [] });
      localStorage.setItem(this._cacheKey, JSON.stringify(slim));
    } catch (e) { /* quota 등 무시 */ }
  },

  // localStorage 캐시 갱신 + 변경 이벤트 (_cache는 호출부가 이미 동기화한 상태)
  _touchCache() {
    this._persistCache();
    window.dispatchEvent(new Event('mobileshop:datachange'));
  },

  // ───── 배너 템플릿 CRUD ─────
  async listTemplates(category) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    let q = sb.from('mobileshop_banner_templates').select('*').order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async saveTemplate({ name, category, data, thumbnail_url = null, scope = 'shared' }) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const { error } = await sb.from('mobileshop_banner_templates').insert({
      id, name, category, data, thumbnail_url, scope
    });
    if (error) throw error;
    return id;
  },

  async deleteTemplate(id) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_banner_templates').delete().eq('id', id);
    if (error) throw error;
  },

  // ───── 배너 삽입 이미지 (사용자 그룹/이미지) CRUD ─────
  // 그룹은 group_name 으로만 정의 — 같은 group_name 행들이 한 그룹.
  async listBannerImages() {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { data, error } = await sb.from('mobileshop_banner_images')
      .select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addBannerImage({ group_name, label, image_url, sort_order = 0 }) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const id = 'bi' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const { error } = await sb.from('mobileshop_banner_images')
      .insert({ id, group_name, label: label || null, image_url, sort_order });
    if (error) throw error;
    return id;
  },

  async deleteBannerImage(id) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_banner_images').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteBannerImageGroup(groupName) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_banner_images')
      .delete().eq('group_name', groupName);
    if (error) throw error;
  },

  // Storage 업로드 → 공개 URL 반환
  async uploadImage(file, prefix = 'banner') {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');

    const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = (safeName.split('.').pop() || 'png').toLowerCase();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;

    const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  // ───── 카테고리 CRUD ─────
  async addCategory({ id, label, swatch = '', sort_order = 100, visible = true }) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_categories').insert({ id, label, swatch, sort_order, visible });
    if (error) throw error;
    if (this._cache) {
      this._cache.categories = this._cache.categories || [];
      this._cache.categories.push({ id, label, swatch, sort_order, visible });
      this._cache.categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      this._persistCache();
    }
  },

  async updateCategory(id, patch) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_categories').update(patch).eq('id', id);
    if (error) throw error;
    if (this._cache && Array.isArray(this._cache.categories)) {
      this._cache.categories = this._cache.categories.map(c =>
        c.id === id ? Object.assign({}, c, patch) : c
      );
      this._persistCache();
    }
  },

  async deleteCategory(id) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('supabaseClient 없음');
    const { error } = await sb.from('mobileshop_categories').delete().eq('id', id);
    if (error) throw error;
    if (this._cache && Array.isArray(this._cache.categories)) {
      this._cache.categories = this._cache.categories.filter(c => c.id !== id);
      this._persistCache();
    }
  },

  _cloneDefault() {
    const d = JSON.parse(JSON.stringify(DEFAULT_DATA));
    d.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    return d;
  },

  // 매장 상품 — 마스터 모델/요금제 참조 (출고가·공통지원금은 마스터에서 조회)
  _rowToProduct(row) {
    return {
      id: row.id,
      carrier: row.carrier || 'skt',
      modelId: row.model_id || '',
      planId: row.plan_id || '',
      addMnp: row.add_disc_mnp == null ? '' : row.add_disc_mnp,
      addChg: row.add_disc_chg == null ? '' : row.add_disc_chg,
      notice: row.notice || '',
      imageUrl: row.image_url || '',
      featured: !!row.featured
    };
  },

  _productToRow(p, sortOrder) {
    const toInt = v => {
      const n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10);
      return isNaN(n) ? null : n;
    };
    return {
      id: p.id,
      carrier: p.carrier || 'skt',
      model_id: p.modelId || null,
      plan_id: p.planId || null,
      add_disc_mnp: toInt(p.addMnp),
      add_disc_chg: toInt(p.addChg),
      notice: p.notice || null,
      image_url: p.imageUrl || null,
      featured: !!p.featured,
      sort_order: sortOrder
    };
  },

  // delete-all → insert (마스터 테이블 공통 저장 패턴)
  async _replaceTable(table, list, mapFn) {
    const sb = window.supabaseClient;
    const { error: dErr } = await sb.from(table).delete().not('id', 'is', null);
    if (dErr) throw dErr;
    const arr = Array.isArray(list) ? list : [];
    if (arr.length > 0) {
      const { error: iErr } = await sb.from(table).insert(arr.map(mapFn));
      if (iErr) throw iErr;
    }
  },

  _rowToPlan(row) {
    return {
      id: row.id,
      name: row.name || '',
      monthlyFee: row.monthly_fee == null ? '' : row.monthly_fee,
      carrier: row.carrier || ''
    };
  },
  _planToRow(p, sortOrder) {
    const n = parseInt(String(p.monthlyFee == null ? '' : p.monthlyFee).replace(/[^0-9-]/g, ''), 10);
    return {
      id: p.id,
      name: p.name || '',
      monthly_fee: isNaN(n) ? null : n,
      carrier: p.carrier || null,
      sort_order: sortOrder
    };
  },

  _rowToSupport(row) {
    return {
      id: row.id,
      modelId: row.model_id || '',
      planId: row.plan_id || '',
      carrier: row.carrier || '',
      amount: row.amount == null ? '' : row.amount
    };
  },
  _supportToRow(s) {
    const n = parseInt(String(s.amount == null ? '' : s.amount).replace(/[^0-9-]/g, ''), 10);
    return {
      id: s.id,
      model_id: s.modelId || null,
      plan_id: s.planId || null,
      carrier: s.carrier || null,
      amount: isNaN(n) ? null : n
    };
  },

  _rowToModel(row) {
    return {
      id: row.id,
      name: row.name || '',
      carrier: row.carrier || 'skt',
      colors: Array.isArray(row.colors) ? row.colors : [],
      releasePrice: row.release_price == null ? '' : row.release_price,
      repPlan: row.rep_plan || '',
      gift: row.gift || '',
      imageUrl: row.image_url || '',
      prices: (row.prices && typeof row.prices === 'object') ? row.prices : {},
      noticeDate: row.notice_date || '',
      visible: row.visible !== false
    };
  },

  _modelToRow(m, sortOrder) {
    const price = parseInt(String(m.releasePrice == null ? '' : m.releasePrice).replace(/[^0-9-]/g, ''), 10);
    return {
      id: m.id,
      name: m.name || '',
      carrier: m.carrier || 'skt',
      colors: Array.isArray(m.colors) ? m.colors : [],
      release_price: isNaN(price) ? null : price,
      rep_plan: m.repPlan || null,
      gift: m.gift || null,
      image_url: m.imageUrl || null,
      prices: (m.prices && typeof m.prices === 'object') ? m.prices : {},
      notice_date: m.noticeDate || null,
      sort_order: sortOrder,
      visible: m.visible !== false
    };
  }
};
