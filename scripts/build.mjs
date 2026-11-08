import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
const ESBUILD_TARGETS = { chrome: 'chrome120', firefox: 'firefox140', safari: 'safari15' };
if (!Object.hasOwn(ESBUILD_TARGETS, target ?? '')) {
  console.error('Usage: node scripts/build.mjs <chrome|firefox|safari>');
  process.exit(1);
}

const root = process.cwd();
const outDir = path.join(root, 'dist', target);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: ['src/content.ts'],
  bundle: true,
  minify: false,
  sourcemap: false,
  platform: 'browser',
  format: 'iife',
  target: ESBUILD_TARGETS[target],
  outfile: path.join(outDir, 'content.js'),
});

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const pkg = readJson('package.json');
const manifest = {
  ...readJson('manifests/base.json'),
  ...readJson(`manifests/${target}.patch.json`),
  version: pkg.version,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

fs.cpSync(path.join(root, 'icons'), path.join(outDir, 'icons'), { recursive: true });

console.log(`Built ${target} → ${outDir}`);
