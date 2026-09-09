// 형제(같은 폰 다른 용량) 이미지 복사 — 노출 모델 중 colors/이미지가 빈 용량변형에
//   같은 carrier·같은 기본모델명(용량 토큰 제거)에서 이미지가 있는 형제의 colors 를 복사한다.
//   (같은 폰이라 색상·이미지 동일. 상세페이지는 모델명→슬러그라 자동으로 같이 뜬다.)
//
// 실행:
//   node scripts/copy_sibling_images.mjs                 # DRY RUN (바뀔 내용만)
//   SB_SERVICE_KEY=<service_role> node scripts/copy_sibling_images.mjs --write
//
// ⚠ mobileshop_models 쓰기는 RLS(app_metadata.mobileshop_store_id)라 service_role 필요.
//   anon 으로 PATCH 하면 200 이지만 0행(silent no-op). 스크립트가 실제 영향행을 확인한다.
const SB_URL = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const WRITE = process.argv.includes('--write');
const SERVICE = process.env.SB_SERVICE_KEY || '';
if (WRITE && !SERVICE) { console.error('✗ --write 에는 SB_SERVICE_KEY(service_role)가 필요합니다.'); process.exit(1); }
const RH = { apikey: SERVICE || SB_ANON, Authorization: `Bearer ${SERVICE || SB_ANON}` };

const hasImg = m => (Array.isArray(m.colors) ? m.colors : []).some(c => Array.isArray(c.images) && c.images.some(Boolean));
const base = n => String(n).replace(/\s*\d+(\.\d+)?\s*(GB|TB|G|T)\s*$/i, '').trim();

const rows = await fetch(`${SB_URL}/rest/v1/mobileshop_models?select=id,name,carrier,visible,colors`, { headers: RH }).then(r => r.json());
if (!Array.isArray(rows)) { console.error('읽기 실패', rows); process.exit(1); }

const groups = {};
rows.filter(m => m.visible !== false).forEach(m => { const k = m.carrier + '|' + base(m.name); (groups[k] = groups[k] || []).push(m); });

const jobs = [];
rows.filter(m => m.visible !== false && !hasImg(m)).forEach(m => {
  const sib = (groups[m.carrier + '|' + base(m.name)] || []).find(x => x.id !== m.id && hasImg(x));
  if (sib) jobs.push({ id: m.id, name: m.name, from: sib.name, colors: sib.colors });
});

console.log(`${WRITE ? '[WRITE]' : '[DRY RUN]'} 형제복사 대상: ${jobs.length}개`);
jobs.forEach(j => console.log(`   ${j.name}  ←  ${j.from}`));
if (!jobs.length) { console.log('복사할 대상이 없습니다.'); process.exit(0); }
if (!WRITE) { console.log('\n실제 적용: SB_SERVICE_KEY=<service_role> node scripts/copy_sibling_images.mjs --write'); process.exit(0); }

const WH = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let done = 0, noop = 0, err = 0;
for (const j of jobs) {
  const r = await fetch(`${SB_URL}/rest/v1/mobileshop_models?id=eq.${encodeURIComponent(j.id)}`, { method: 'PATCH', headers: WH, body: JSON.stringify({ colors: j.colors }) });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, j.id, await r.text()); continue; }
  let n = 0; try { n = (JSON.parse(await r.text()) || []).length; } catch {}
  if (n > 0) done++; else { noop++; if (noop <= 3) console.log('⚠ 0행(RLS 차단?)', j.id); }
}
console.log(`완료: 실제반영 ${done} / 0행 ${noop} / 오류 ${err}`);
if (noop) console.error('✗ 0행 발생 — service_role 키 아니거나 권한 부족. DB 안 바뀜.');
