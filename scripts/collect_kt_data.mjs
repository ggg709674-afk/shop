// KT API에서 색상별 이미지 데이터 수집 → JSON 출력
// Node.js ESM - 브라우저 콘솔 스크립트 생성용

const KT_IMG_BASE = 'https://image.shop.kt.com';

const MODEL_MAP = [
  { namePattern: /갤럭시 S26 Ultra/, prodNo: 'WL00076861' },
  { namePattern: /갤럭시 S26\+/,     prodNo: 'WL00076860' },
  { namePattern: /갤럭시 S26 /,      prodNo: 'WL00077073' },
  { namePattern: /갤럭시 S25 Ultra/, prodNo: 'WL00073118' },
  { namePattern: /갤럭시 S25\+/,     prodNo: 'WL00073117' },
  { namePattern: /갤럭시 S25 (엣지|Edge)/i, prodNo: 'WL00074517' },
  { namePattern: /갤럭시 S25 FE/,    prodNo: 'WL00076056' },
  { namePattern: /갤럭시 S25 /,      prodNo: 'WL00073115' },
  { namePattern: /갤럭시 S24 Ultra/, prodNo: 'WL00069691' },
  { namePattern: /갤럭시 S24 FE/,    prodNo: 'WL00072753' },
  { namePattern: /갤럭시 Z Fold7/,   prodNo: 'WL00075257' },
  { namePattern: /갤럭시 Z Flip7 FE/i, prodNo: 'WL00074993' },
  { namePattern: /갤럭시 Z Flip7/i,  prodNo: 'WL00074994' },
  { namePattern: /갤럭시 Z Fold6|갤럭시 Z 폴드6/, prodNo: 'WL00071923' },
  { namePattern: /갤럭시 Z Flip6|갤럭시 Z 플립6/, prodNo: 'WL00071921' },
  { namePattern: /iPhone 17 Pro Max/, prodNo: 'WL00075906' },
  { namePattern: /iPhone 17 Pro/,    prodNo: 'WL00075905' },
  { namePattern: /iPhone 17e/i,      prodNo: 'WL00077028' },
  { namePattern: /iPhone Air/i,      prodNo: 'WL00075904' },
  { namePattern: /iPhone 17 /,       prodNo: 'WL00075903' },
  { namePattern: /iPhone 16 Pro Max/, prodNo: 'WL00072554' },
  { namePattern: /iPhone 16 Pro/,    prodNo: 'WL00072553' },
  { namePattern: /iPhone 16 Plus/,   prodNo: 'WL00072552' },
  { namePattern: /iPhone 16e/i,      prodNo: 'WL00073518' },
  { namePattern: /iPhone 16 /,       prodNo: 'WL00072551' },
];

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
    },
    body: body.toString()
  });
  const data = await r.json();
  const list = data.listPhoneProductOption || [];
  const colorMap = {};
  for (const item of list) {
    const colorNm = item.colorNm;
    if (!colorNm || colorMap[colorNm]) continue;
    const imgs = (item.imgFilePathNm || '').split(',').map(p => p.trim()).filter(Boolean)
      .map(p => KT_IMG_BASE + p).slice(0, 6);
    if (imgs.length > 0) colorMap[colorNm] = imgs;
  }
  return colorMap;
}

function normalizeColor(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '').replace(/[·•]/g, '');
}

const ktCache = {};
for (const { namePattern, prodNo } of MODEL_MAP) {
  if (ktCache[prodNo] !== undefined) continue;
  try {
    process.stderr.write(`  fetching ${prodNo}...\n`);
    const colorMap = await fetchKtColorImages(prodNo);
    ktCache[prodNo] = colorMap;
    await new Promise(r => setTimeout(r, 400));
  } catch (e) {
    ktCache[prodNo] = {};
    process.stderr.write(`  ERROR ${prodNo}: ${e.message}\n`);
  }
}

// 브라우저 콘솔용 스크립트 생성
const ktData = {};
for (const [prodNo, colorMap] of Object.entries(ktCache)) {
  if (Object.keys(colorMap).length > 0) {
    ktData[prodNo] = colorMap;
  }
}

// MODEL_MAP을 serializable 형태로
const modelMapSerial = MODEL_MAP.map(({ namePattern, prodNo }) => ({
  pattern: namePattern.toString(),
  prodNo
}));

const outputScript = `
// admin.html 콘솔에서 실행 — KT 이미지 DB 등록 (sb 세션 사용)
(async function() {
  const KT_DATA = ${JSON.stringify(ktData, null, 2)};

  function normColor(name) {
    return (name||'').toLowerCase().replace(/\\s+/g,'').replace(/[·•]/g,'');
  }

  function findKtColor(dbColorName, colorMap) {
    const dbNorm = normColor(dbColorName);
    for (const [ktName, imgs] of Object.entries(colorMap)) {
      const ktNorm = normColor(ktName);
      if (ktNorm === dbNorm || ktNorm.includes(dbNorm) || dbNorm.includes(ktNorm)) {
        return imgs;
      }
    }
    return null;
  }

  const MODEL_PATTERNS = ${JSON.stringify(modelMapSerial)};
  function findProdNo(modelName) {
    for (const { pattern, prodNo } of MODEL_PATTERNS) {
      const re = eval(pattern);
      if (re.test(modelName)) return prodNo;
    }
    return null;
  }

  function normColors(arr) {
    return (arr||[]).map(c => {
      if (typeof c === 'string') return { name: c, visible: true, images: [] };
      const imgs = Array.isArray(c.images) ? c.images : (c.imageUrl ? [c.imageUrl] : []);
      return { name: c.name||'', visible: c.visible!==false, images: imgs };
    });
  }

  // 모든 모델 조회
  const { data: models, error } = await window.sb
    .from('mobileshop_models')
    .select('id,name,carrier,colors');
  if (error) { console.error('조회 실패:', error); return; }

  console.log('총 모델:', models.length);
  let updated = 0, skipped = 0;

  for (const model of models) {
    const prodNo = findProdNo(model.name);
    if (!prodNo || !KT_DATA[prodNo]) { skipped++; continue; }

    const ktColors = KT_DATA[prodNo];
    let dbColors = normColors(model.colors);
    let anyChanged = false;
    let newColors;

    if (dbColors.length === 0) {
      // DB 색상 없음 → KT 색상으로 생성
      newColors = Object.entries(ktColors).map(([n,imgs]) => ({name:n, visible:true, images:imgs}));
      anyChanged = newColors.length > 0;
    } else {
      newColors = dbColors.map(c => {
        const ktImgs = findKtColor(c.name, ktColors);
        if (ktImgs && JSON.stringify(ktImgs) !== JSON.stringify(c.images)) {
          anyChanged = true;
          return { ...c, images: ktImgs };
        }
        return c;
      });
    }

    if (anyChanged) {
      const { error: e2 } = await window.sb
        .from('mobileshop_models')
        .update({ colors: newColors })
        .eq('id', model.id);
      if (e2) { console.error('업데이트 실패', model.id, e2); }
      else { console.log('✓', model.id, model.name, '('+model.carrier+')'); updated++; }
      await new Promise(r => setTimeout(r, 50));
    }
  }

  console.log('완료: 업데이트', updated, '/ 스킵', skipped);
})();
`;

// 파일로 저장
import { writeFileSync } from 'fs';
writeFileSync('scripts/run_in_browser_console.js', outputScript.trim());
process.stderr.write('\n브라우저 콘솔 스크립트 생성 완료: scripts/run_in_browser_console.js\n');
console.log(JSON.stringify(Object.fromEntries(
  Object.entries(ktCache).map(([p,c]) => [p, Object.keys(c)])
), null, 2));
