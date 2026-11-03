#!/usr/bin/env node
// يبني index.html ملفًا واحدًا مستقلًا من src/ (لا يحتاج إلا Node).
//   node tools/build.js          يكتب index.html
//   node tools/build.js --check  يفشل إن كان index.html لا يطابق src/
//
// - src/index.html قالب الصفحة، وفيه علامتان:
//     <!-- build:css styles.css -->  تُستبدل بـ <style> فيه styles.css،
//                                     وكل url(fonts/x.woff2) يصير data: URI
//     <!-- build:js -->               تُستبدل بـ <script> واحد
// - السكربت: src/vendor/three.min.js ثم src/js/*.js بترتيب أسمائها، كلها داخل
//   دالة واحدة (()=>{ ... })(); لأنها تتشارك نطاقًا واحدًا (أسماء three المختصرة).
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const out = path.join(root, 'index.html');

function build() {
  let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

  html = html.replace(/<!-- build:css (\S+) -->/, (_, file) => {
    const css = fs.readFileSync(path.join(src, file), 'utf8').replace(/url\((fonts\/[^)]+\.woff2)\)/g, (_, f) => {
      const b64 = fs.readFileSync(path.join(src, f)).toString('base64');
      return `url(data:font/woff2;base64,${b64})`;
    });
    return `<style>\n${css}</style>`;
  });

  const jsDir = path.join(src, 'js');
  const parts = [
    path.join(src, 'vendor', 'three.min.js'),
    ...fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(jsDir, f)),
  ];
  const js = parts.map((p) => fs.readFileSync(p, 'utf8')).join('');
  if (!html.includes('<!-- build:js -->')) throw new Error('src/index.html: missing <!-- build:js -->');
  html = html.replace('<!-- build:js -->', () => `<script>\n(()=>{${js}})();\n\n</script>`);
  return html;
}

const html = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== html) {
    console.error('index.html لا يطابق src/. شغّل: npm run build');
    process.exit(1);
  }
  console.log('index.html يطابق src/');
} else {
  fs.writeFileSync(out, html);
  console.log(`index.html: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}
