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
const banner = '/*! Obs.js | MIT */\n;';
await writeFile(OUTPUT, banner + result.code, 'utf8');
console.log(`[obs] Wrote ${OUTPUT}`);
