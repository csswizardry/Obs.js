import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import test from 'node:test';

const projectUrl = new URL('../', import.meta.url);
const projectPath = fileURLToPath(projectUrl);
const execFileAsync = promisify(execFile);
const [artifact, readme, demo, packageMetadata] = await Promise.all([
  readFile(new URL('obs.min.js', projectUrl), 'utf8'),
  readFile(new URL('README.md', projectUrl), 'utf8'),
  readFile(new URL('demo/index.html', projectUrl), 'utf8'),
  readFile(new URL('package.json', projectUrl), 'utf8').then(JSON.parse)
]);

function extractStableBody(builtArtifact) {
  const withoutBanner = builtArtifact.replace(/^\/\*![^\n]*\*\/\n/, '');
  return withoutBanner.replace(/\n\/\/# sourceURL=obs\.inline\.js\s*$/, '');
}

function occurrenceCount(document, value) {
  return document.split(value).length - 1;
}

test('generated banner uses the package version', () => {
  assert.ok(
    artifact.startsWith(`/*! Obs.js ${packageMetadata.version} |`),
    'generated banner must match package.json'
  );
});

test('build output is independent of the Git ref environment', async () => {
  const build = async githubRefName => {
    await execFileAsync(process.execPath, ['scripts/build.mjs'], {
      cwd: projectPath,
      env: { ...process.env, GITHUB_REF_NAME: githubRefName }
    });

    return readFile(new URL('obs.min.js', projectUrl), 'utf8');
  };

  const branchBuild = await build('main');
  const tagBuild = await build(packageMetadata.version);

  assert.equal(branchBuild, tagBuild);
});

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
