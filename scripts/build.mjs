import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

// In CI (i.e. tag builds), GitHub sets this to e.g. ‘0.1.1’
const CI_VERSION = process.env.GITHUB_REF_NAME || '';

// Minimal build: read obs.js → write obs.min.js (root)
const INPUT = 'obs.js';
const OUTPUT = 'obs.min.js';


const src = await readFile(INPUT, 'utf8');
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

// Stamp current tag in CI, omit locally; leading ';' to guard against ASI.
const header = `/*! Obs.js${CI_VERSION && ' ' + CI_VERSION} | (c) Harry Roberts, csswizardry.com | MIT */\n;`;
const footer = '\n//# sourceURL=obs.inline.js';
await writeFile(OUTPUT, header + result.code + footer, 'utf8');
console.log(`[obs] Wrote ${OUTPUT}`);
