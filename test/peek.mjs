import { readFileSync } from 'node:fs';
const src = readFileSync('dist/vlpzovjp.user.js', 'utf8');
const start = src.indexOf('JSON.parse(') + 'JSON.parse('.length;
// tìm dấu ) khớp: chuỗi JSON là literal, nên đọc tới cuối dòng và bỏ ')'
const lineEnd = src.indexOf('\n', start);
let lit = src.slice(start, lineEnd).trim();
lit = lit.replace(/\);?$/, '');
const data = JSON.parse(JSON.parse(lit));
const doc = data.docs['day06-ai-product-project-management.pdf'];
for (const i of [0, 1, 2, 3]) {
  console.log(`--- page ${i + 1} ---\n${doc.pages[i]}\n`);
}
console.log('slideIndex:', JSON.stringify(data.slideIndex, null, 1));
console.log('day03 pages:', data.docs['day03-tu-chatbot-den-agentic-agent-react.pdf'].pages.length);
