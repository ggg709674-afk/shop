// 갤럭시 퀀텀7(SKT 전용) colors 를 자체호스팅 로컬 이미지로 세팅한다.
//   - 출처: SKT tworld product/detail/info API (색상 3종 × 갤러리 4장)
//   - 이미지는 이미 phone-images/galaxy-quantum7/<색상>/01..04.png 로 내려받아 커밋됨(원격 핫링크 X)
//   - 기존에 잘못 걸어둔 samsung.com 핫링크 URL 을 로컬 경로로 교체한다.
// 실행: SB_SERVICE_KEY=<service_role> node scripts/set_quantum7.mjs --write   (없으면 DRY)
//   ⚠ mobileshop_models 쓰기는 RLS(app_metadata.mobileshop_store_id) → service_role 필요.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SB = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const cli = await readFile(join(ROOT, 'supabase-client.js'), 'utf8');
const ANON = (cli.match(/eyJ[A-Za-z0-9_.-]+/) || [])[0];
const WRITE = process.argv.includes('--write');
const SVC = process.env.SB_SERVICE_KEY || '';
if (WRITE && !SVC) { console.error('✗ --write 에 SB_SERVICE_KEY(service_role) 필요'); process.exit(1); }

const SLUG = 'galaxy-quantum7';
const img = (c, n) => `/phone-images/${SLUG}/${c}/${String(n).padStart(2, '0')}.png`;
const colors = [
  { name: '어썸 그레이',   hex: '#7E7D80', images: [1,2,3,4].map(n => img('gray', n)) },
  { name: '어썸 아이스블루', hex: '#CCD8EA', images: [1,2,3,4].map(n => img('iceblue', n)) },
  { name: '어썸 라일락',   hex: '#ABB2E4', images: [1,2,3,4].map(n => img('lilac', n)) },
];

const RH = { apikey: SVC || ANON, Authorization: `Bearer ${SVC || ANON}` };
// 퀀텀7 = SKT 전용. 전 용량 변형에 동일 색상 적용.
const rows = await fetch(`${SB}/rest/v1/mobileshop_models?select=id,name,carrier,colors&name=ilike.*퀀텀7*`, { headers: RH }).then(r => r.json());
const targets = rows.filter(m => m.carrier === 'skt');
console.log(`${WRITE ? '[WRITE]' : '[DRY]'} 퀀텀7 대상 ${targets.length}개`);
targets.forEach(m => console.log('   ' + m.name + ' (colors: ' + (Array.isArray(m.colors) ? m.colors.length : 0) + ' → 3, 이미지 12장)'));
if (!WRITE || !targets.length) {
  if (!WRITE) console.log('\n실제 적용: SB_SERVICE_KEY=<service_role> node scripts/set_quantum7.mjs --write');
  process.exit(0);
}
const WHH = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let done = 0, noop = 0, err = 0;
for (const m of targets) {
  const r = await fetch(`${SB}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(m.id)}`, { method: 'PATCH', headers: WHH, body: JSON.stringify({ colors }) });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, m.id, await r.text()); continue; }
  let n = 0; try { n = (JSON.parse(await r.text()) || []).length; } catch {}
  if (n > 0) done++; else { noop++; console.log('⚠ 0행(RLS 차단?)', m.id); }
}
console.log(`완료: 반영 ${done} / 0행 ${noop} / 오류 ${err}`);
if (noop) console.error('✗ 0행 — service_role 키 아니거나 권한 부족. DB 안 바뀜.');
