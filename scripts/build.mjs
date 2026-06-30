import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const distPath = resolve(root, 'dist');
const browserPath = resolve(distPath, 'browser/fingerprintjs-botblocker.js');
const minPath = resolve(distPath, 'browser/fingerprintjs-botblocker.min.js');
const banner = '/* FingerprintJS by BotBlocker v0.1.1 | MIT | https://botblocker.top */';

await rm(distPath, { recursive: true, force: true });
await mkdir(dirname(browserPath), { recursive: true });

await build({
  entryPoints: {
    index: resolve(root, 'src/index.js'),
    collectors: resolve(root, 'src/collectors/index.js'),
    policy: resolve(root, 'src/policy.js'),
    server: resolve(root, 'src/server.js'),
    storage: resolve(root, 'src/storage-public.js')
  },
  outdir: distPath,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2020',
  outExtension: { '.js': '.mjs' },
  banner: { js: banner },
  legalComments: 'none'
});

await build({
  entryPoints: {
    index: resolve(root, 'src/index.js'),
    collectors: resolve(root, 'src/collectors/index.js'),
    policy: resolve(root, 'src/policy.js'),
    server: resolve(root, 'src/server.js'),
    storage: resolve(root, 'src/storage-public.js')
  },
  outdir: distPath,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2020',
  outExtension: { '.js': '.cjs' },
  banner: { js: banner },
  legalComments: 'none'
});

const browserBuildOptions = {
  entryPoints: [resolve(root, 'src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'FingerprintJSBotBlocker',
  platform: 'browser',
  target: 'es2020',
  external: ['node:crypto'],
  banner: { js: banner },
  legalComments: 'none'
};

await build({
  ...browserBuildOptions,
  outfile: browserPath
});

await build({
  ...browserBuildOptions,
  outfile: minPath,
  minify: true
});

await copyTypes();

async function copyTypes() {
  const pairs = [
    ['types/index.d.ts', 'dist/index.d.ts'],
    ['types/collectors.d.ts', 'dist/collectors.d.ts'],
    ['types/policy.d.ts', 'dist/policy.d.ts'],
    ['types/server.d.ts', 'dist/server.d.ts'],
    ['types/storage.d.ts', 'dist/storage.d.ts']
  ];

  for (const [from, to] of pairs) {
    const target = resolve(root, to);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(root, from), target);
  }
}
