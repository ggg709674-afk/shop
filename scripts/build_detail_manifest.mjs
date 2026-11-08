// 상세 이미지 목록 만들기 (2026-11-08): phone-images/<slug>/detail_NN.(jpg|png) 를 세어 phone-images/detail-manifest.json 저장.
// 사이트(index.html)가 이 파일을 읽어 상세 인포그래픽을 보여 줌 → 새 폰은 폴더에 detail 파일만 넣고 배포하면 됨. deploy.bat 가 배포 전에 부름.
import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'phone-images');
const out = {};
for (const d of (await readdir(ROOT, { withFileTypes: true })).filter(x => x.isDirectory() && !x.name.startsWith('_'))) {
  const fs = (await readdir(join(ROOT, d.name))).filter(f => /^detail_\d+\.(jpg|png)$/i.test(f)).sort();
  if (!fs.length) continue;
  const ext = fs[0].split('.').pop().toLowerCase();
  let n = 0; while (fs.includes(`detail_${String(n + 1).padStart(2, '0')}.${ext}`)) n++;   // 01 부터 빠짐없이 이어진 장수만
  if (n) out[d.name] = { n, ext };
}
await writeFile(join(ROOT, 'detail-manifest.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`detail-manifest.json: ${Object.keys(out).length}개 폰`);
