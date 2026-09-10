// 기존 상담/주문 레코드에서 주민번호 뒷자리(전체 RRN) 제거.
//   products[].rrn 에 'YYMMDD-XXXXXXX' 로 저장돼 있던 것 → 앞 6자리(생년월일)만 남기고 rrn 은 비움.
//   customer_birth 가 비어 있으면 앞 6자리로 채움(개통 워크플로 유지). 뒷자리는 폐기.
// 실행: SB_SERVICE_KEY=<service_role> node scripts/scrub_rrn.mjs        # DRY
//       SB_SERVICE_KEY=<service_role> node scripts/scrub_rrn.mjs --write
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SB = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const WRITE = process.argv.includes('--write');
const SVC = process.env.SB_SERVICE_KEY || '';
if (!SVC) { console.error('✗ SB_SERVICE_KEY 필요(RLS로 상담 레코드는 서비스키로만 접근)'); process.exit(1); }
const RH = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const front6 = v => { const m = String(v || '').match(/^(\d{6})/); return m ? m[1] : ''; };

const rows = await fetch(`${SB}/rest/v1/mobileshop_rental_consultations?select=id,customer_birth,products`, { headers: RH }).then(r => r.json());
if (!Array.isArray(rows)) { console.error('읽기 실패', rows); process.exit(1); }

const updates = [];
for (const row of rows) {
  const prods = Array.isArray(row.products) ? row.products : [];
  let touched = false, birthFromRrn = '';
  const newProds = prods.map(p => {
    if (p && p.rrn) {
      touched = true;
      if (!birthFromRrn) birthFromRrn = front6(p.rrn);
      return { ...p, rrn: '' };
    }
    return p;
  });
  if (!touched) continue;
  const patch = { products: newProds };
  if (!row.customer_birth && birthFromRrn) patch.customer_birth = birthFromRrn;
  updates.push({ id: row.id, patch, hadRrn: prods.filter(p => p && p.rrn).length });
}
console.log(`${WRITE ? '[WRITE]' : '[DRY]'} 전체 ${rows.length}건 중 주민번호 뒷자리 보유 ${updates.length}건 정리 대상`);
updates.slice(0, 10).forEach(u => console.log(`   id=${u.id}  rrn보유상품 ${u.hadRrn}개  birth보정=${u.patch.customer_birth || '(기존유지)'}`));
if (!WRITE) { console.log('\n실제 적용: SB_SERVICE_KEY=<키> node scripts/scrub_rrn.mjs --write'); process.exit(0); }
const WHH = { ...RH, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let done = 0, err = 0;
for (const u of updates) {
  const r = await fetch(`${SB}/rest/v1/mobileshop_rental_consultations?id=eq.${encodeURIComponent(u.id)}`, { method: 'PATCH', headers: WHH, body: JSON.stringify(u.patch) });
  if (!r.ok) { err++; console.log('PATCH 실패', r.status, u.id, await r.text()); continue; }
  done++;
}
console.log(`완료: 반영 ${done} / 오류 ${err}`);
