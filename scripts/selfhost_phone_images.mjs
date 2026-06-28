// 휴대폰 모델 이미지 self-host 마이그레이션 (1/2 — 다운로드)
//   mobileshop_models.colors[].images 안의 KT 원격 URL(image.shop.kt.com)을
//   전부 받아 repo의 phone-images/<prodNo>/<file>.png 로 저장한다.
//   → KT 핫링크 의존 제거. 우리 도메인에서 정적 서빙(/phone-images/...).
//   이 스크립트는 파일만 받는다(멱등). DB URL 교체는 relink_phone_images_db.mjs.
//
// 실행: node scripts/selfhost_phone_images.mjs
//   결과: phone-images/ 채워짐 + scripts/.phone-image-map.json (KT URL → 로컬경로)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAPOUT = join(ROOT, 'scripts', '.phone-image-map.json');

const SB_URL = 'https://nfbpbxfpmcrtxsgvnnhr.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYnBieGZwbWNydHhzZ3ZubmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODQ4OTQsImV4cCI6MjA5NzE2MDg5NH0.0JhTeZNkjisxed692QuxbDH4vFcJBJALpOaMpNA-LpM';
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const models = await fetch(`${SB_URL}/rest/v1/mobileshop_models?select=id,name,colors`, { headers: H }).then(r => r.json());
const urls = new Set();
for (const m of models)
  for (const c of (m.colors || []))
    for (const u of (Array.isArray(c.images) ? c.images : []))
      if (u && u.includes('image.shop.kt.com')) urls.add(u);

const list = [...urls];
console.log('받을 고유 이미지:', list.length);

const map = {};
let ok = 0, skip = 0, fail = 0;
const exists = async p => { try { await access(p); return true; } catch { return false; } };

async function one(u) {
  const seg = new URL(u).pathname.split('/').filter(Boolean); // upload/product/<prod>/<file>
  const prod = seg[2], file = seg[3];
  map[u] = `/phone-images/${prod}/${file}`;
  const dir = join(ROOT, 'phone-images', prod);
  const abs = join(dir, file);
  if (await exists(abs)) { skip++; return; }
  await mkdir(dir, { recursive: true });
  const r = await fetch(u);
  if (!r.ok) { fail++; console.log('FAIL', r.status, u); return; }
  await writeFile(abs, Buffer.from(await r.arrayBuffer()));
  ok++;
}

let i = 0;
const worker = async () => { while (i < list.length) { const idx = i++; try { await one(list[idx]); } catch (e) { fail++; console.log('ERR', e.message); } } };
await Promise.all(Array.from({ length: 8 }, worker));
await writeFile(MAPOUT, JSON.stringify(map, null, 2));
console.log(`완료: 다운로드 ${ok} / 기존스킵 ${skip} / 실패 ${fail}`);
console.log('매핑 저장:', MAPOUT, `(${Object.keys(map).length}개)`);
