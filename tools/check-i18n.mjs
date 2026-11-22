#!/usr/bin/env node
/**
 * Service Pro translation checker. No dependencies.
 *
 *   node tools/check-i18n.mjs            # errors fail the run (exit 1), warnings do not
 *   node tools/check-i18n.mjs --strict   # warnings fail the run too
 *   node tools/check-i18n.mjs --files    # also list every file that was scanned
 *   node tools/check-i18n.mjs --warn=40  # show up to 40 files in the hard-coded text report
 *
 * What it checks (the app languages are read from shared/src/i18n/translations.js):
 *   ERROR  a Service Pro key (sp.*) that is missing, or empty, in any of hi, te, ta, mr, bn
 *   ERROR  a key used in Service Pro code that is not in the dictionary
 *   ERROR  {placeholders} that differ between languages for the same key
 *   WARN   one key used with two different English fallbacks
 *   WARN   English text typed straight into the UI (JSX text, placeholder/title/aria-label/alt,
 *          toast messages) in a file Service Pro renders
 *
 * English is the source language: it lives in the t('key', 'English') fallback, so English
 * "coverage" means every t() call has a non-empty fallback.
 *
 * Scope = every file under servicepro/src plus the shared/src files they import (followed
 * through @shared/... and relative imports). Customer-only and admin-only files are not scanned.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const LIST_FILES = args.includes('--files');
const WARN_LIMIT = Number((args.find((a) => a.startsWith('--warn=')) || '--warn=25').split('=')[1]);

const NS = 'sp.';
const LANG_CODES = ['hi', 'te', 'ta', 'mr', 'bn'];

// ── dictionary ──────────────────────────────────────────────────────────────
function loadDictionary() {
  const file = path.join(ROOT, 'shared/src/i18n/translations.js');
  const src = fs.readFileSync(file, 'utf8').replace(/export /g, '');
  const box = {};
  new Function('box', `${src}\nbox.translations = translations; box.LANGUAGES = LANGUAGES;`)(box);
  return box;
}

// ── scope: servicepro/src + the shared files it reaches ─────────────────────
const EXT = ['.jsx', '.js', '.tsx', '.ts'];
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@shared/')) base = path.join(ROOT, 'shared/src', spec.slice(8));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  const tries = [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, 'index' + e))];
  return tries.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

function collectScope() {
  const seen = new Set();
  const queue = walk(path.join(ROOT, 'servicepro/src'));
  const importRe = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const s = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = importRe.exec(s))) {
      const r = resolveImport(f, m[1] || m[2]);
      if (r && !seen.has(r) && r.startsWith(ROOT)) queue.push(r);
    }
  }
  const skip = (f) => f.includes(`${path.sep}i18n${path.sep}`); // the dictionary itself
  return [...seen].filter((f) => !skip(f)).sort();
}

// ── scanning ────────────────────────────────────────────────────────────────
const KEY_RE = /(['"`])(sp\.[A-Za-z0-9_.]+)\1/g;
const FALLBACK_RE = /\b(?:t|tr)\(\s*(['"`])(sp\.[A-Za-z0-9_.]+)\1\s*,\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/g;
const JSX_TEXT_RE = />\s*([A-Z][A-Za-z][A-Za-z0-9 ,.'’&!?:()/+-]{2,})\s*</g;
const ATTR_RE = /\b(?:placeholder|title|aria-label|alt)=(['"])([A-Za-z][^'"]{2,})\1/g;
const TOAST_RE = /\btoast(?:\.\w+)?\(\s*(['"`])([^'"`$]*[A-Za-z]{3}[^'"`$]*)\1/g;

const IGNORE_TEXT = /^(?:OTP|UPI|KYC|GST|PAN|IFSC|ID|QR|Zappy\w*|ZappyOne|WhatsApp|PDF|SOS|Aadhaar|Instagram|\d+)$/;

function scanFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const used = new Set();
  const fallbacks = [];
  const hard = [];
  let m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(src))) used.add(m[2]);
  FALLBACK_RE.lastIndex = 0;
  while ((m = FALLBACK_RE.exec(src))) fallbacks.push({ key: m[2], en: m[4].replace(/\\(['"`])/g, '$1'), rel });
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const re of [JSX_TEXT_RE, ATTR_RE, TOAST_RE]) {
      re.lastIndex = 0;
      while ((m = re.exec(line))) {
        const text = (m[2] ?? m[1]).trim();
        if (IGNORE_TEXT.test(text) || /^[A-Z_]{2,}$/.test(text)) continue;
        if (/\bt\(|\btr\(|\bwords\(/.test(line.slice(Math.max(0, m.index - 40), m.index + m[0].length))) continue;
        hard.push({ line: i + 1, text: text.slice(0, 60) });
      }
    }
  });
  return { rel, used, fallbacks, hard };
}

// ── main ────────────────────────────────────────────────────────────────────
const { translations, LANGUAGES } = loadDictionary();
const errors = [];
const warnings = [];

const declared = LANGUAGES.map((l) => l.code).filter((c) => c !== 'en');
for (const c of LANG_CODES) if (!declared.includes(c)) errors.push(`Language ${c} is not declared in LANGUAGES`);

// 1. parity of the sp.* namespace
const allKeys = new Set();
for (const c of LANG_CODES) Object.keys(translations[c] || {}).filter((k) => k.startsWith(NS)).forEach((k) => allKeys.add(k));
const coverage = {};
for (const c of LANG_CODES) {
  const d = translations[c] || {};
  const missing = [...allKeys].filter((k) => !(k in d));
  const empty = [...allKeys].filter((k) => k in d && !String(d[k]).trim());
  coverage[c] = { have: allKeys.size - missing.length - empty.length, missing, empty };
  missing.forEach((k) => errors.push(`[${c}] missing ${k}`));
  empty.forEach((k) => errors.push(`[${c}] empty ${k}`));
}

// 2. placeholder parity ({name}, {n}, ...), using Hindi as the reference
const ph = (v) => (String(v).match(/\{\w+\}/g) || []).sort().join(',');
for (const k of allKeys) {
  const ref = translations.hi?.[k];
  if (ref === undefined) continue;
  for (const c of LANG_CODES) {
    const v = translations[c]?.[k];
    if (v !== undefined && ph(v) !== ph(ref)) errors.push(`[${c}] ${k}: placeholders ${ph(v) || '(none)'} differ from hi ${ph(ref) || '(none)'}`);
  }
}

// 3. code scan
const scope = collectScope();
const results = scope.map(scanFile);
const fbByKey = new Map();
const usedKeys = new Map();
for (const r of results) {
  r.used.forEach((k) => { if (!usedKeys.has(k)) usedKeys.set(k, r.rel); });
  for (const f of r.fallbacks) {
    if (!f.en.trim()) errors.push(`${f.rel}: ${f.key} has an empty English fallback`);
    const list = fbByKey.get(f.key) || new Map();
    list.set(f.en, f.rel);
    fbByKey.set(f.key, list);
  }
}
for (const [k, where] of usedKeys) {
  if (k.endsWith('.') || /\.$/.test(k)) continue; // a prefix used to build a key
  if (!allKeys.has(k)) errors.push(`${where}: ${k} is used but not defined in translations.js`);
}
for (const [k, list] of fbByKey) {
  if (list.size > 1) warnings.push(`${k} has ${list.size} different English fallbacks: ${[...list.keys()].map((s) => JSON.stringify(s.slice(0, 40))).join(' / ')}`);
}

// 4. report
const pad = (s, n) => String(s).padEnd(n);
console.log('Service Pro translation check');
console.log(`  files scanned: ${scope.length}   keys (${NS}*): ${allKeys.size}   keys used in code: ${usedKeys.size}`);
console.log('  coverage:');
console.log(`    ${pad('en', 3)} source language (t() fallbacks)  ${results.reduce((n, r) => n + r.fallbacks.length, 0)} calls`);
for (const c of LANG_CODES) {
  const { have } = coverage[c];
  console.log(`    ${pad(c, 3)} ${have}/${allKeys.size}  ${((have / allKeys.size) * 100).toFixed(1)}%`);
}
const hardFiles = results.filter((r) => r.hard.length).sort((a, b) => b.hard.length - a.hard.length);
const hardTotal = hardFiles.reduce((n, r) => n + r.hard.length, 0);
console.log(`  hard-coded UI text candidates: ${hardTotal} in ${hardFiles.length} files`);
hardFiles.slice(0, WARN_LIMIT).forEach((r) => console.log(`    ${pad(r.hard.length, 4)} ${r.rel}   e.g. L${r.hard[0].line} "${r.hard[0].text}"`));
if (hardFiles.length > WARN_LIMIT) console.log(`    … and ${hardFiles.length - WARN_LIMIT} more (use --warn=${hardFiles.length})`);
if (hardTotal) warnings.push(`${hardTotal} possible hard-coded UI strings in ${hardFiles.length} files (heuristic: check that each is intended)`);
if (LIST_FILES) scope.forEach((f) => console.log('   scanned', path.relative(ROOT, f).split(path.sep).join('/')));

errors.slice(0, 80).forEach((e) => console.log(`  ERROR ${e}`));
if (errors.length > 80) console.log(`  … ${errors.length - 80} more errors`);
warnings.forEach((w) => console.log(`  WARN  ${w}`));
console.log(errors.length ? `\nFAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `\nOK: no errors, ${warnings.length} warning(s)`);
process.exit(errors.length || (STRICT && warnings.length) ? 1 : 0);
