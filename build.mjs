#!/usr/bin/env node
/**
 * build.mjs — trích text từng trang từ các PDF trong data/, ghép với bảng map
 * URL→PDF trong note.md, rồi nhúng vào src/userscript.js để tạo
 * dist/vlpzovjp.user.js
 *
 * Yêu cầu: pdftotext (poppler) có trong PATH.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, 'data');
const OUT_DIR = join(ROOT, 'dist');
const OUT_FILE = join(OUT_DIR, 'vlpzovjp.user.js');
const TEMPLATE = join(ROOT, 'src', 'userscript.js');

/* ------------------------------------------------- 1. đọc bảng map từ note.md */

function parseSlideMap() {
  const note = readFileSync(join(ROOT, 'note.md'), 'utf8');
  const re = /^https?:\/\/(?:www\.)?vlearn\.dev\/course\/([^/\s]+)\/reader\?slide=([A-Za-z0-9._-]+)\s*-\s*(\S+\.pdf)\s*$/gim;
  const rows = [];
  let m;
  while ((m = re.exec(note))) {
    rows.push({ course: m[1], slideId: m[2], pdf: m[3] });
  }
  if (!rows.length) throw new Error('Không tìm thấy dòng map URL→PDF nào trong note.md');
  return rows;
}

/* ------------------------------------------------------- 2. trích text từ PDF */

/**
 * Trích text từng trang. pdftotext phân cách trang bằng form feed (\f) khi
 * KHÔNG truyền -nopgbrk, nên ta dựa vào đó để tách trang.
 */
function extractPages(pdfPath) {
  const raw = execFileSync('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  return raw.split('\f');
}

/**
 * Bỏ header/footer lặp lại trên nhiều trang và số trang lẻ.
 * Footer kiểu "Tuần 1 1 / 25" khác nhau từng trang, nên so khớp theo dạng đã
 * chuẩn hóa (mọi dãy số → #) chứ không so khớp nguyên văn.
 */
function cleanPages(pages) {
  const norm = (s) => s.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  const freq = new Map();
  for (const p of pages) {
    const seen = new Set();
    for (const line of p.split('\n')) {
      const t = line.trim();
      if (t.length < 3 || t.length > 60) continue;
      const n = norm(t);
      if (seen.has(n)) continue;
      seen.add(n);
      freq.set(n, (freq.get(n) || 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.floor(pages.length * 0.35));
  const boilerplate = new Set(
    [...freq.entries()].filter(([, n]) => n >= threshold).map(([t]) => t)
  );

  return pages.map((p) => {
    const lines = p
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .filter((l) => {
        const t = l.trim();
        if (!t) return true;
        if (t.length <= 60 && boilerplate.has(norm(t))) return false;
        if (/^\d+\s*\/\s*\d+$/.test(t)) return false; // "3 / 25"
        if (/^\d{1,3}$/.test(t)) return false; // số trang trơ trọi
        return true;
      });
    return lines
      .join('\n')
      // "■ a ■ b" → mỗi bullet một dòng, dùng "-" cho model dễ đọc
      .replace(/[■□▪▶●•]\s*/g, '\n- ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{3,}/g, '  ')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
  });
}

/* ---------------------------------------------------------------- 3. build ra */

const rows = parseSlideMap();
const docs = {}; // pdfName -> { pages: string[], titles: string[] }
const slideIndex = {}; // "course/slideId" -> pdfName

for (const row of rows) {
  const key = `${row.course}/${row.slideId}`;
  slideIndex[key] = row.pdf;

  if (docs[row.pdf]) continue;
  const path = join(DATA, row.pdf);
  if (!existsSync(path)) {
    console.warn(`  ! thiếu file: data/${row.pdf} — bỏ qua`);
    delete slideIndex[key];
    continue;
  }
  const pages = cleanPages(extractPages(path));
  // bỏ các trang trắng ở cuối
  while (pages.length && !pages[pages.length - 1]) pages.pop();
  const titles = pages.map((p) => {
    const first = p.split('\n').find((l) => l.trim());
    return (first || '').trim().slice(0, 120);
  });
  docs[row.pdf] = { pages, titles };
  const chars = pages.reduce((a, p) => a + p.length, 0);
  console.log(`  ✓ ${row.pdf} — ${pages.length} trang, ${chars.toLocaleString()} ký tự`);
}

const payload = { docs, slideIndex, builtAt: new Date().toISOString() };
const json = JSON.stringify(payload);

const template = readFileSync(TEMPLATE, 'utf8');
if (!template.includes('__SLIDE_DATA__')) {
  throw new Error('src/userscript.js thiếu placeholder __SLIDE_DATA__');
}
// Nhúng dưới dạng string đã escape rồi JSON.parse để tránh mọi vấn đề cú pháp.
const embedded = JSON.stringify(json);
let out = template.replace('__SLIDE_DATA__', `JSON.parse(${embedded})`);

// Nhúng flappyQuizGame.js (nếu có placeholder) — module game được wrap IIFE
// nên có thể nhúng trực tiếp vào body userscript mà không cần escape.
if (out.includes('__FLAPPY_QUIZ_BODY__')) {
  const gamePath = join(ROOT, 'src', 'flappyQuizGame.js');
  if (!existsSync(gamePath)) {
    throw new Error('src/flappyQuizGame.js không tồn tại nhưng placeholder __FLAPPY_QUIZ_BODY__ vẫn còn');
  }
  const gameCode = readFileSync(gamePath, 'utf8');
  out = out.replace('__FLAPPY_QUIZ_BODY__', gameCode);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, out, 'utf8');

console.log(
  `\n→ ${OUT_FILE}\n  ${Object.keys(docs).length} tài liệu, ` +
    `${Object.keys(slideIndex).length} slide, ${(out.length / 1024).toFixed(0)} KB`
);
