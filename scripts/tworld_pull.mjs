// tworld 상품 이미지 자체호스팅 수집기 (SKT tworld 공통 — 퀀텀7/S26FE/아이폰 등)
//   given productGrpId/categoryId/slug → 색상별 갤러리 + 상세 인포그래픽을 내려받아 리포에 저장.
//   원격 핫링크 금지 → 전부 phone-images/<slug>/ 아래로 self-host.
//
// 사용: node scripts/tworld_pull.mjs --grp=000007214 --cat=20010014 --slug=galaxy-s26-fe [--sub=NA00008685] [--entry=31]
//   출력물:
//     phone-images/<slug>/<colorHex>/01..NN.png   (색상별 갤러리 렌더)
//     phone-images/<slug>/detail_01..NN.png        (상세 인포그래픽, contentDpYn=Y 인 경우)
//     scripts/.tworld_<slug>.colors.json           (DB PATCH 용 colors 배열)
//   이후: python 크롭(투명여백) → set_tworld_colors.mjs 로 DB 반영(service_role).
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=').slice(1).join('=') : ''; };
const GRP = arg('grp'), CAT = arg('cat'), SLUG = arg('slug');
const SUB = arg('sub') || 'NA00008685', ENTRY = arg('entry') || '31';
if (!GRP || !CAT || !SLUG) { console.error('필수: --grp --cat --slug'); process.exit(1); }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125';
const CDN = 'https://cdnw.shop.tworld.co.kr/pimg';
const URL = `https://shop.tworld.co.kr/buyproc/prod-detail?stepSeq=1&categoryId=${CAT}&productGrpId=${GRP}&subscriptionId=${SUB}&subcommDcMthd=30&addServiceId=&addServiceNm=&usingSubscriptionExYn=Y&entryCd=${ENTRY}`;

// 1) 페이지 + 세션쿠키
const pageRes = await fetch(URL, { headers: { 'User-Agent': UA } });
const cookies = (pageRes.headers.getSetCookie ? pageRes.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
const html = await pageRes.text();
const contentDpYn = (html.match(/contentDpYn\s*=\s*'([^']*)'/) || [])[1];

// 2) 상세 인포그래픽 (.productImg 내부 img 만 → 공통 푸터 제외)
let detail = [];
const pi = html.indexOf('class="productImg"');
if (pi >= 0) {
  const pe = html.indexOf('prodMore', pi);
  const seg = html.slice(pi, pe > pi ? pe : pi + 20000);
  detail = [...seg.matchAll(/(?:src|data-src)\s*=\s*["']([^"']+\.(?:png|jpg|jpeg))["']/g)]
    .map(m => m[1]).filter(u => /cdnw\.shop\.tworld/.test(u));
}

// 3) 색상/갤러리 (detail/info API)
const infoRes = await fetch('https://shop.tworld.co.kr/api/buyproc/product/detail/info', {
  method: 'POST', headers: { 'User-Agent': UA, Cookie: cookies, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', Referer: URL },
  body: `prodGrpId=${GRP}&prodCtgId=${CAT}&prodClCd=01`,
});
const info = await infoRes.json();
if (!Array.isArray(info) || !info.length) { console.error('info API 실패', JSON.stringify(info).slice(0, 200)); process.exit(1); }

// 색상 그룹 (colorHex 기준 dedup, orderSeq 순)
const byColor = new Map();
info.sort((a, b) => Number(a.orderSeq) - Number(b.orderSeq)).forEach(r => {
  if (byColor.has(r.colorHex)) return;
  const imgs = [r.mimage1, r.mimage2, r.mimage3, r.mimage4].filter(Boolean);
  byColor.set(r.colorHex, { name: r.colorName, hex: '#' + r.colorHex, pid: r.productId, imgs });
});
console.log(`[${SLUG}] grpNm=${info[0].productGrpNm} | 색상 ${byColor.size} | 상세 ${detail.length} | contentDpYn=${contentDpYn}`);

// 4) 다운로드
const dl = async (url, dest) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.log('  DL 실패', r.status, url); return 0; }
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf); return buf.length;
};
const colors = [];
let ci = 0;
for (const [hex, c] of byColor) {
  const folder = hex.toLowerCase();
  const dir = join(ROOT, 'phone-images', SLUG, folder);
  await mkdir(dir, { recursive: true });
  const local = [];
  for (let i = 0; i < c.imgs.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const sz = await dl(CDN + '/phone' + c.imgs[i], join(dir, nn + '.png'));
    local.push(`/phone-images/${SLUG}/${folder}/${nn}.png`);
    console.log(`  ${c.name} ${folder}/${nn}.png ${sz}B`);
  }
  colors.push({ name: c.name, hex: c.hex, images: local, def: ci === 0, visible: true });
  ci++;
}
// 상세
const detDir = join(ROOT, 'phone-images', SLUG);
await mkdir(detDir, { recursive: true });
for (let i = 0; i < detail.length; i++) {
  const nn = String(i + 1).padStart(2, '0');
  const sz = await dl(detail[i], join(detDir, 'detail_' + nn + '.png'));
  if (i < 2 || i === detail.length - 1) console.log(`  detail_${nn}.png ${sz}B`);
}

await writeFile(join(ROOT, 'scripts', `.tworld_${SLUG}.colors.json`), JSON.stringify(colors, null, 2));
console.log(`\ncolors → scripts/.tworld_${SLUG}.colors.json (색상 ${colors.length}, 상세 ${detail.length})`);
console.log(`다음: 1) python 크롭  2) SB_SERVICE_KEY=<키> node scripts/set_tworld_colors.mjs --slug=${SLUG} --match="<모델명base>" --write`);
