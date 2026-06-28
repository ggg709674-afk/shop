// KT 제품 이미지 자동 업데이트 스크립트
// Node.js ESM, fetch 내장 (Node 18+)
//
// ⚠ 이 스크립트는 colors[].images 에 KT 원격 URL(image.shop.kt.com)을 쓴다 = 핫링크.
//   우리는 핫링크를 안 쓰기로 했으니(KT 차단 시 사진 깨짐), 이걸 돌린 뒤에는 반드시:
//     1) node scripts/selfhost_phone_images.mjs              # 새 KT 이미지 → phone-images/ 다운로드
//     2) git add phone-images && commit && push              # 우리 도메인에 배포(라이브)
//     3) SB_SERVICE_KEY=... node scripts/relink_phone_images_db.mjs --write   # DB URL → /phone-images 교체
//   ※ anon 키는 mobileshop_models 쓰기가 RLS 로 막혀 있음(silent no-op). 이 스크립트의 PATCH 도
//     anon 이면 0행만 바뀐다 → 실제로는 service_role 로 돌려야 반영됨.

const SB_URL = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const KT_IMG_BASE = 'https://image.shop.kt.com';

// DB 모델명 패턴 → KT prodNo 매핑
// 한 prodNo로 같은 기기의 여러 용량 커버
const MODEL_MAP = [
  // S26 시리즈
  { pattern: /갤럭시 S26 Ultra/,  prodNo: 'WL00076861' },
  { pattern: /갤럭시 S26\+/,      prodNo: 'WL00076860' },
  { pattern: /갤럭시 S26 /,       prodNo: 'WL00077073' }, // S26 (Ultra/+ 제외) - M모바일 버전 사용
  // S25 시리즈
  { pattern: /갤럭시 S25 Ultra/,  prodNo: 'WL00073118' },
  { pattern: /갤럭시 S25\+/,      prodNo: 'WL00073117' },
  { pattern: /갤럭시 S25 (엣지|Edge)/i, prodNo: 'WL00074517' },
  { pattern: /갤럭시 S25 FE/,     prodNo: 'WL00076056' },
  { pattern: /갤럭시 S25 /,       prodNo: 'WL00073115' },
  // S24 시리즈
  { pattern: /갤럭시 S24 Ultra/,  prodNo: 'WL00069691' },
  { pattern: /갤럭시 S24 FE/,     prodNo: 'WL00072753' },
  // Z Fold 시리즈
  { pattern: /갤럭시 Z Fold7/,    prodNo: 'WL00075257' },
  { pattern: /갤럭시 Z Fold6|갤럭시 Z 폴드6/,   prodNo: 'WL00071923' },
  // Z Flip 시리즈
  { pattern: /갤럭시 Z Flip7 FE/i, prodNo: 'WL00074993' },
  { pattern: /갤럭시 Z Flip7/i,   prodNo: 'WL00074994' },
  { pattern: /갤럭시 Z Flip6|갤럭시 Z 플립6/,   prodNo: 'WL00071921' },
  // iPhone 17
  { pattern: /iPhone 17 Pro Max/, prodNo: 'WL00075906' },
  { pattern: /iPhone 17 Pro/,     prodNo: 'WL00075905' },
  { pattern: /iPhone 17e/i,       prodNo: 'WL00077028' },
  { pattern: /iPhone Air/i,       prodNo: 'WL00075904' },
  { pattern: /iPhone 17 /,        prodNo: 'WL00075903' },
  // iPhone 16
  { pattern: /iPhone 16 Pro Max/, prodNo: 'WL00072554' },
  { pattern: /iPhone 16 Pro/,     prodNo: 'WL00072553' },
  { pattern: /iPhone 16 Plus/,    prodNo: 'WL00072552' },
  { pattern: /iPhone 16e/i,       prodNo: 'WL00073518' },
  { pattern: /iPhone 16 /,        prodNo: 'WL00072551' },
];

// 색상명 퍼지 매칭 (DB colorNm ↔ KT colorNm)
function normalizeColor(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '').replace(/[·•]/g, '');
}
function matchColor(dbColor, ktColors) {
  const dbNorm = normalizeColor(dbColor);
  // 정확히 일치하는 것 우선
  let found = ktColors.find(c => normalizeColor(c.colorNm) === dbNorm);
  if (found) return found;
  // 포함 관계 (DB가 KT에 포함)
  found = ktColors.find(c => normalizeColor(c.colorNm).includes(dbNorm));
  if (found) return found;
  // KT가 DB에 포함
  found = ktColors.find(c => dbNorm.includes(normalizeColor(c.colorNm)));
  return found || null;
}

// KT API → 색상별 이미지 맵 반환
async function fetchKtColorImages(prodNo) {
  const body = new URLSearchParams({
    prodNo, pplId: '0942', supportType: '01', sbscTypeCd: '3',
    svcEngtMonsTypeCd: '04', inslMonsTypeCd: '02'
  });
  const r = await fetch('https://shop.kt.com/mobile/listPhoneProductOption.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://shop.kt.com/mobile/view.do?prodNo=${prodNo}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'ko-KR,ko;q=0.9'
    },
    body: body.toString()
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const list = data.listPhoneProductOption || [];

  // 색상별 첫 번째 imgFilePathNm 사용 (중복 행 존재)
  const colorMap = {};
  for (const item of list) {
    const colorNm = item.colorNm;
    if (!colorNm || colorMap[colorNm]) continue;
    const imgStr = item.imgFilePathNm || '';
    const imgs = imgStr.split(',').map(p => p.trim()).filter(Boolean)
      .map(p => KT_IMG_BASE + p).slice(0, 6);
    if (imgs.length > 0) colorMap[colorNm] = imgs;
  }
  return colorMap;
}

// DB 모델의 colors 배열을 이미지로 업데이트
function normColors(arr) {
  return (arr || []).map(c => {
    if (typeof c === 'string') return { name: c, visible: true, images: [] };
    const imgs = Array.isArray(c.images) ? c.images : (c.imageUrl ? [c.imageUrl] : []);
    return { name: c.name || '', visible: c.visible !== false, images: imgs };
  });
}

async function sbPatch(id, colors) {
  const r = await fetch(`${SB_URL}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ colors })
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

async function main() {
  // 모든 모델 가져오기
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const models = await fetch(`${SB_URL}/rest/v1/mobileshop_models?select=id,name,carrier,colors&order=sort_order.asc`, { headers: sbHeaders })
    .then(r => r.json());
  console.log(`총 모델: ${models.length}개`);

  // prodNo별 KT 색상 이미지 캐시
  const ktCache = {};
  let updated = 0, skipped = 0, notFound = 0;

  for (const model of models) {
    // 모델명으로 prodNo 찾기
    const mapping = MODEL_MAP.find(m => m.pattern.test(model.name));
    if (!mapping) { skipped++; continue; }

    const prodNo = mapping.prodNo;
    // KT 데이터 캐시에서 가져오기 (없으면 API 호출)
    if (!ktCache[prodNo]) {
      try {
        console.log(`  KT API 호출: ${prodNo}`);
        ktCache[prodNo] = await fetchKtColorImages(prodNo);
        const colors = Object.keys(ktCache[prodNo]);
        console.log(`  → 색상 ${colors.length}개: ${colors.join(', ')}`);
        await new Promise(r => setTimeout(r, 500)); // 0.5초 대기 (rate limit)
      } catch (e) {
        console.log(`  ⚠ API 실패 ${prodNo}: ${e.message}`);
        ktCache[prodNo] = null;
      }
    }

    const ktColors = ktCache[prodNo];
    if (!ktColors) { notFound++; continue; }

    // DB colors 정규화
    let dbColors = normColors(model.colors);
    let anyUpdated = false;
    let newColors;

    if (dbColors.length === 0) {
      // DB 색상 없음 → KT 색상으로 새로 생성
      newColors = Object.entries(ktColors).map(([colorNm, imgs]) => ({
        name: colorNm, visible: true, images: imgs
      }));
      anyUpdated = newColors.length > 0;
    } else {
      newColors = dbColors.map(c => {
        const ktEntry = Object.entries(ktColors).find(([ktName]) => {
          const match = matchColor(c.name, [{ colorNm: ktName }]);
          return !!match;
        });
        if (ktEntry) {
          const [, imgs] = ktEntry;
          if (imgs.length > 0 && JSON.stringify(imgs) !== JSON.stringify(c.images)) {
            anyUpdated = true;
            return { ...c, images: imgs };
          }
        }
        return c;
      });
    }

    if (anyUpdated) {
      try {
        await sbPatch(model.id, newColors);
        console.log(`✓ ${model.id} | ${model.name} (${model.carrier})`);
        updated++;
      } catch (e) {
        console.log(`✗ PATCH 실패 ${model.id}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n완료: 업데이트 ${updated}개 / 스킵 ${skipped}개 / KT없음 ${notFound}개`);
}

main().catch(console.error);
