// 모델에 대표 이미지(원격 URL) 세팅 — colors 가 비어(colors:0) 카드가 placeholder 인 모델에
//   공식 제품 이미지 URL을 넣어 카드/상세 대표이미지가 뜨게 한다. (원격 URL 그대로, 자체호스팅 X)
//   jobs.json: [{ "base":"갤럭시 퀀텀7", "carrier":"skt"|null, "image":"https://...", "color":"" }]
//     - base: 모델명에서 용량 토큰 제거한 기본명(같은 폰 모든 용량 변형에 적용)
//     - carrier 생략 시 전 통신사 매칭
// 실행: SB_SERVICE_KEY=<service_role> node scripts/set_model_image.mjs --write   (없으면 DRY)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SB = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const WRITE = process.argv.includes('--write');
const SVC = process.env.SB_SERVICE_KEY || '';
if (WRITE && !SVC) { console.error('✗ --write 에 SB_SERVICE_KEY 필요'); process.exit(1); }
const RH = { apikey: SVC || ANON, Authorization: `Bearer ${SVC || ANON}` };
const base = n => String(n).replace(/\s*\d+(\.\d+)?\s*(GB|TB|G|T)\s*$/i, '').trim();
const hasImg = m => (Array.isArray(m.colors) ? m.colors : []).some(c => Array.isArray(c.images) && c.images.some(Boolean));

const jobs = JSON.parse(await readFile(join(ROOT, 'scripts', 'model_image_jobs.json'), 'utf8'));
const rows = await fetch(`${SB}/rest/v1/mobileshop_models?select=id,name,carrier,visible,colors`, { headers: RH }).then(r => r.json());

const updates = [];
for (const j of jobs) {
  const targets = rows.filter(m => m.visible !== false && !hasImg(m) && base(m.name) === j.base && (!j.carrier || m.carrier === j.carrier));
  if (!targets.length) { console.log(`(매칭 없음) ${j.base}${j.carrier ? ' ['+j.carrier+']' : ''}`); continue; }
  const colors = [{ name: j.color || '', hex: '', images: [j.image], def: true, visible: true }];
  targets.forEach(m => updates.push({ id: m.id, name: m.name, colors }));
}
console.log(`${WRITE ? '[WRITE]' : '[DRY]'} 세팅 대상 ${updates.length}개`);
updates.forEach(u => console.log('   ' + u.name));
if (!WRITE || !updates.length) { if (!WRITE) console.log('\n실제 적용: SB_SERVICE_KEY=<키> node scripts/set_model_image.mjs --write'); process.exit(0); }
const WH = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let done = 0, noop = 0, err = 0;
for (const u of updates) {
  const r = await fetch(`${SB}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(u.id)}`, { method: 'PATCH', headers: WH, body: JSON.stringify({ colors: u.colors }) });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, u.id, await r.text()); continue; }
  let n = 0; try { n = (JSON.parse(await r.text()) || []).length; } catch {}
  if (n > 0) done++; else { noop++; if (noop <= 3) console.log('⚠ 0행', u.id); }
}
console.log(`완료: 반영 ${done} / 0행 ${noop} / 오류 ${err}`);
