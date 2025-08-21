import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';


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


// Leading ';' to guard against ASI, tiny banner for provenance
const header = '/*! Obs.js | (c) Harry Roberts, csswizardry.com | MIT */\n;';
const footer = '\n//# sourceURL=obs.inline.js';
await writeFile(OUTPUT, header + result.code + footer, 'utf8');
console.log(`[obs] Wrote ${OUTPUT}`);
