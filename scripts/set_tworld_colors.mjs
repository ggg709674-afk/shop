// tworld_pull 로 만든 colors JSON 을 mobileshop_models 에 반영(로컬 자체호스팅 경로).
//   같은 폰의 전 통신사·전 용량 변형에 동일 색상 적용(이미지는 물리적으로 동일).
// 사용: SB_SERVICE_KEY=<service_role> node scripts/set_tworld_colors.mjs --slug=galaxy-s26-fe --match="S26 FE" --write
//   --match: 모델명 ilike 부분일치(예 "S26 FE" → 갤럭시 S26 FE / …256G 매칭, 비FE 제외)
//   ⚠ RLS(app_metadata.mobileshop_store_id) → --write 에 service_role 필요.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=').slice(1).join('=') : ''; };
const SLUG = arg('slug'), MATCH = arg('match');
const WRITE = process.argv.includes('--write');
if (!SLUG || !MATCH) { console.error('필수: --slug --match'); process.exit(1); }
const SB = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const cli = await readFile(join(ROOT, 'supabase-client.js'), 'utf8');
const ANON = (cli.match(/eyJ[A-Za-z0-9_.-]+/) || [])[0];
const SVC = process.env.SB_SERVICE_KEY || '';
if (WRITE && !SVC) { console.error('✗ --write 에 SB_SERVICE_KEY 필요'); process.exit(1); }
const colors = JSON.parse(await readFile(join(ROOT, 'scripts', `.tworld_${SLUG}.colors.json`), 'utf8'));

const RH = { apikey: SVC || ANON, Authorization: `Bearer ${SVC || ANON}` };
const q = `${SB}/rest/v1/mobileshop_models?select=id,name,carrier,colors&name=ilike.*${encodeURIComponent(MATCH)}*`;
const rows = await fetch(q, { headers: RH }).then(r => r.json());
if (!Array.isArray(rows)) { console.error('읽기 실패', rows); process.exit(1); }
console.log(`${WRITE ? '[WRITE]' : '[DRY]'} slug=${SLUG} match="${MATCH}" → ${rows.length}개 (색상 ${colors.length})`);
rows.forEach(m => console.log(`   [${m.carrier}] ${m.name} (colors ${(m.colors || []).length} → ${colors.length})`));
if (!WRITE || !rows.length) { if (!WRITE) console.log(`\n실제 적용: SB_SERVICE_KEY=<키> node scripts/set_tworld_colors.mjs --slug=${SLUG} --match="${MATCH}" --write`); process.exit(0); }
const WHH = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let done = 0, noop = 0, err = 0;
for (const m of rows) {
  const r = await fetch(`${SB}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(m.id)}`, { method: 'PATCH', headers: WHH, body: JSON.stringify({ colors }) });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, m.id, await r.text()); continue; }
  let n = 0; try { n = (JSON.parse(await r.text()) || []).length; } catch {}
  if (n > 0) done++; else { noop++; console.log('⚠ 0행', m.id); }
}
console.log(`완료: 반영 ${done} / 0행 ${noop} / 오류 ${err}`);
if (noop) console.error('✗ 0행 — service_role 키/권한 확인');
