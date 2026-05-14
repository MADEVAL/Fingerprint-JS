import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, 'src/index.js');
const typesPath = resolve(root, 'types/index.d.ts');
const distPath = resolve(root, 'dist');
const esmPath = resolve(distPath, 'index.mjs');
const dtsPath = resolve(distPath, 'index.d.ts');
const browserPath = resolve(distPath, 'browser/fingerprint-framework.js');
const minPath = resolve(distPath, 'browser/fingerprint-framework.min.js');
const banner = '/* Fingerprint Framework v0.1.0 | MIT */\n';

await rm(distPath, { recursive: true, force: true });
await mkdir(dirname(esmPath), { recursive: true });
await mkdir(dirname(browserPath), { recursive: true });

const source = await readFile(sourcePath, 'utf8');
const types = await readFile(typesPath, 'utf8');

await writeFile(esmPath, `${banner}${source}`, 'utf8');
await writeFile(dtsPath, types, 'utf8');

const browserBody = source.replace(/\nexport \{[\s\S]*?\n\};\s*$/u, '');
const browserApi = `
  const api = Object.freeze({
    VERSION,
    PROFILE_PRESETS,
    canonicalStringify,
    createBrowserCollectorPack,
    createClient,
    createCollector,
    createDefaultCollectors,
    createPolicy,
    hashValue
  });

  root.FingerprintFramework = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
`;

const browserBundle = `${banner}(function attachFingerprintFramework(root) {\n  'use strict';\n${indent(browserBody, 2)}\n${browserApi}})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);\n`;

await writeFile(browserPath, browserBundle, 'utf8');
await writeFile(minPath, minify(browserBundle), 'utf8');

function indent(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map((line) => (line ? `${prefix}${line}` : line)).join('\n');
}

function minify(text) {
  return text
    .replace(/\/\*[^!*][\s\S]*?\*\//gu, '')
    .replace(/\n\s*/gu, '\n')
    .replace(/\s{2,}/gu, ' ')
    .replace(/\n/gu, '')
    .trim();
}
