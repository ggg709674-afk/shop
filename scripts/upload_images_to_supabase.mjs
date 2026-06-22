// KT CDN 이미지 → Supabase Storage 업로드 후 DB URL 교체
// Node.js ESM

const SB_URL = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const BUCKET = 'mobileshop-images';
const PREFIX = 'phone-products';
const KT_BASE = 'https://image.shop.kt.com';

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
};

// KT CDN URL → Supabase public URL 캐시
const uploadCache = {}; // ktUrl → sbUrl

async function uploadToSupabase(ktUrl) {
  if (uploadCache[ktUrl]) return uploadCache[ktUrl];

  // KT에서 이미지 다운로드
  const imgResp = await fetch(ktUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!imgResp.ok) throw new Error(`다운로드 실패 ${ktUrl}: HTTP ${imgResp.status}`);
  const buf = await imgResp.arrayBuffer();

  // 파일명: kt URL의 마지막 경로 부분 (e.g. WL00076861_1775639060967.png)
  const parts = ktUrl.split('/upload/product/')[1]; // "WL00076861/1775639060967.png"
  const fileName = parts ? parts.replace('/', '_') : Date.now() + '.png';
  const storagePath = `${PREFIX}/${fileName}`;

  // Supabase Storage에 업로드
  const upResp = await fetch(
    `${SB_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        ...sbHeaders,
        'Content-Type': 'image/png',
        'x-upsert': 'true', // 이미 있으면 덮어쓰기
      },
      body: buf,
    }
  );
  if (!upResp.ok) {
    const err = await upResp.text();
    throw new Error(`업로드 실패 ${fileName}: ${upResp.status} ${err.slice(0,100)}`);
  }

  const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  uploadCache[ktUrl] = publicUrl;
  return publicUrl;
}

function normColors(arr) {
  return (arr || []).map(c => {
    if (typeof c === 'string') return { name: c, visible: true, images: [] };
    const imgs = Array.isArray(c.images) ? c.images : (c.imageUrl ? [c.imageUrl] : []);
    return { name: c.name || '', visible: c.visible !== false, images: imgs };
  });
}

async function sbPatch(id, colors) {
  const r = await fetch(
    `${SB_URL}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ colors }),
    }
  );
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

async function main() {
  // 모든 모델 가져오기
  const models = await fetch(
    `${SB_URL}/rest/v1/mobileshop_models?select=id,name,carrier,colors&order=sort_order.asc`,
    { headers: sbHeaders }
  ).then(r => r.json());

  console.log(`총 모델 ${models.length}개 스캔 중...`);

  // KT CDN URL 가진 모델만 처리
  const toProcess = models.filter(m => {
    const colors = normColors(m.colors);
    return colors.some(c => c.images.some(u => u.includes('image.shop.kt.com')));
  });

  console.log(`KT 이미지 가진 모델: ${toProcess.length}개\n`);

  let modelDone = 0, modelFail = 0, imgUploaded = 0;

  for (const model of toProcess) {
    const colors = normColors(model.colors);
    let anyChanged = false;

    const newColors = [];
    for (const c of colors) {
      const newImgs = [];
      for (const imgUrl of c.images) {
        if (imgUrl.includes('image.shop.kt.com')) {
          try {
            const sbUrl = await uploadToSupabase(imgUrl);
            newImgs.push(sbUrl);
            if (uploadCache[imgUrl] === sbUrl && !Object.values(uploadCache).includes(imgUrl)) {
              imgUploaded++;
            }
            if (imgUrl !== sbUrl) anyChanged = true;
          } catch (e) {
            console.log(`  ⚠ 업로드 실패: ${e.message}`);
            newImgs.push(imgUrl); // 실패 시 원본 유지
          }
          await new Promise(r => setTimeout(r, 30)); // 짧은 딜레이
        } else {
          newImgs.push(imgUrl);
        }
      }
      newColors.push({ ...c, images: newImgs });
    }

    if (anyChanged) {
      try {
        await sbPatch(model.id, newColors);
        process.stdout.write(`✓ ${model.id}\n`);
        modelDone++;
      } catch (e) {
        console.log(`✗ ${model.id}: ${e.message}`);
        modelFail++;
      }
    }
  }

  const cached = Object.keys(uploadCache).length;
  console.log(`\n완료: 고유 이미지 ${cached}개 업로드 / 모델 ${modelDone}개 DB업데이트 / 실패 ${modelFail}개`);
}

main().catch(console.error);
