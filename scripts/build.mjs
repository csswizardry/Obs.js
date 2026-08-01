import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

// Minimal build: read obs.js → write obs.min.js (root)
const INPUT = 'obs.js';
const OUTPUT = 'obs.min.js';

const [{ version }, src] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(INPUT, 'utf8')
]);

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('package.json must contain a valid SemVer version');
}
const result = await minify(src, {
  ecma: 2018,
  compress: {
    passes: 2,
    pure_getters: true,
    toplevel: true,
    hoist_funs: true
  },
  mangle: { toplevel: true }
});
if (!result.code) throw new Error('Minify failed for obs.js');

// Stamp the package version in every environment; leading ';' guards against ASI.
const header = `/*! Obs.js ${version} | (c) Harry Roberts, csswizardry.com | MIT */\n;`;
const footer = '\n//# sourceURL=obs.inline.js';
await writeFile(OUTPUT, header + result.code + footer, 'utf8');
console.log(`[obs] Wrote ${OUTPUT}`);
