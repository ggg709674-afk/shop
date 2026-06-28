// 휴대폰 모델 이미지 self-host 마이그레이션 (2/2 — DB URL 교체)
//   mobileshop_models.colors[].images 의 KT 원격 URL을 self-host 경로(/phone-images/...)로 바꾼다.
//   반드시 selfhost_phone_images.mjs 를 먼저 돌리고, phone-images/ 가 배포(라이브)된 뒤 실행할 것.
//   (DB부터 바꾸면 배포 전까지 라이브 사진이 깨진다.)
//
// 실행:
//   node scripts/relink_phone_images_db.mjs          # DRY RUN (바뀔 내용만 출력, 쓰기 안 함)
//   SB_SERVICE_KEY=... node scripts/relink_phone_images_db.mjs --write   # 실제 DB PATCH
//
// ⚠ mobileshop_models 쓰기는 RLS 로 막혀 있다(app_metadata.mobileshop_store_id 필요).
//   anon 키로 PATCH 하면 HTTP 200 이지만 0행만 바뀜(silent no-op).
//   → 반드시 service_role 키를 SB_SERVICE_KEY 환경변수로 넘길 것.
//     (Supabase 대시보드 → Project Settings → API → service_role secret)
//   스크립트는 실제 '영향 행 수'를 확인해서 거짓 성공을 막는다.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const SB_URL = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const SB_SERVICE = process.env.SB_SERVICE_KEY || '';     // 쓰기에 필요
const READ_KEY = SB_SERVICE || SB_ANON;
const WRITE_KEY = SB_SERVICE;
const H = { apikey: READ_KEY, Authorization: `Bearer ${READ_KEY}` };

if (WRITE && !WRITE_KEY) {
  console.error('✗ --write 에는 service_role 키가 필요합니다. 예:\n  SB_SERVICE_KEY=<service_role> node scripts/relink_phone_images_db.mjs --write');
  process.exit(1);
}

// KT URL → 로컬경로 매핑 (selfhost 스크립트가 생성). 없으면 경로 규칙으로 직접 변환.
let map = {};
try { map = JSON.parse(await readFile(join(ROOT, 'scripts', '.phone-image-map.json'), 'utf8')); } catch {}
function toLocal(u) {
  if (!u || !u.includes('image.shop.kt.com')) return u;       // 이미 self-host 됐거나 KT 아님 → 그대로
  if (map[u]) return map[u];
  const seg = new URL(u).pathname.split('/').filter(Boolean);  // upload/product/<prod>/<file>
  return `/phone-images/${seg[2]}/${seg[3]}`;
}

const models = await fetch(`${SB_URL}/rest/v1/mobileshop_models?select=id,name,colors`, { headers: H }).then(r => r.json());

let changedModels = 0, changedUrls = 0;
const updates = [];
for (const m of models) {
  let dirty = false;
  const colors = (m.colors || []).map(c => {
    const imgs = Array.isArray(c.images) ? c.images : [];
    const next = imgs.map(u => { const v = toLocal(u); if (v !== u) { dirty = true; changedUrls++; } return v; });
    return { ...c, images: next };
  });
  if (dirty) { changedModels++; updates.push({ id: m.id, name: m.name, colors }); }
}

console.log(`${WRITE ? '[WRITE]' : '[DRY RUN]'} 교체 대상: 모델 ${changedModels}개 / URL ${changedUrls}개`);
if (!WRITE) {
  for (const u of updates.slice(0, 5)) console.log('  -', u.name, '(', u.id, ')');
  if (updates.length > 5) console.log(`  … 외 ${updates.length - 5}개`);
  console.log('\n실제 적용하려면: node scripts/relink_phone_images_db.mjs --write');
  process.exit(0);
}

const WH = { apikey: WRITE_KEY, Authorization: `Bearer ${WRITE_KEY}` };
let done = 0, noop = 0, err = 0;
for (const u of updates) {
  // return=representation 으로 실제 영향 행을 확인 → RLS silent no-op 탐지
  const r = await fetch(`${SB_URL}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(u.id)}`, {
    method: 'PATCH',
    headers: { ...WH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ colors: u.colors }),
  });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, u.id, await r.text()); continue; }
  let n = 0; try { n = (JSON.parse(await r.text()) || []).length; } catch {}
  if (n > 0) done++; else { noop++; if (noop <= 3) console.log('⚠ 0행(RLS 차단?)', u.id); }
}
console.log(`완료: 실제반영 ${done} / 0행(차단) ${noop} / 오류 ${err}`);
if (noop) console.error('✗ 일부/전부가 0행 — service_role 키가 아니거나 권한 부족. DB는 안 바뀌었습니다.');
