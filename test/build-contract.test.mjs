import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import test from 'node:test';

const projectUrl = new URL('../', import.meta.url);
const [artifact, readme, demo] = await Promise.all([
  readFile(new URL('obs.min.js', projectUrl), 'utf8'),
  readFile(new URL('README.md', projectUrl), 'utf8'),
  readFile(new URL('demo/index.html', projectUrl), 'utf8')
]);

function extractStableBody(builtArtifact) {
  const withoutBanner = builtArtifact.replace(/^\/\*![^\n]*\*\/\n/, '');
  return withoutBanner.replace(/\n\/\/# sourceURL=obs\.inline\.js\s*$/, '');
}

function occurrenceCount(document, value) {
  return document.split(value).length - 1;
}

test('generated body is synchronised and within payload ceilings', testContext => {
  const body = extractStableBody(artifact);
  const minifiedBytes = Buffer.byteLength(body);
  const gzipBytes = gzipSync(body).length;
  const readmeOccurrences = occurrenceCount(readme, body);
  const demoOccurrences = occurrenceCount(demo, body);

  testContext.diagnostic(`minified body: ${minifiedBytes} bytes (maximum 4330)`);
  testContext.diagnostic(`gzip body: ${gzipBytes} bytes (maximum 1583)`);
  testContext.diagnostic(`README occurrences: ${readmeOccurrences}`);
  testContext.diagnostic(`demo occurrences: ${demoOccurrences}`);

  assert.equal(readmeOccurrences, 1, 'README must contain the generated body once');
  assert.equal(demoOccurrences, 1, 'demo must contain the generated body once');
  assert(minifiedBytes <= 4330, `minified body is ${minifiedBytes} bytes`);
  assert(gzipBytes <= 1583, `gzip body is ${gzipBytes} bytes`);
});
