import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  EXPECTED_FILES,
  inspectPackage,
  verifyPackReport
} from '../scripts/verify-package.mjs';

const packageMetadata = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

function validReport() {
  return [{
    id: `${packageMetadata.name}@${packageMetadata.version}`,
    name: packageMetadata.name,
    version: packageMetadata.version,
    filename: `${packageMetadata.name}-${packageMetadata.version}.tgz`,
    entryCount: EXPECTED_FILES.length,
    files: EXPECTED_FILES.map(path => ({ path }))
  }];
}

test('the real package contains exactly the public distribution files', async testContext => {
  const packed = await inspectPackage();

  testContext.diagnostic(packed.files.map(file => file.path).sort().join(', '));
});

test('unexpected public, private, generated, and dependency files fail closed', () => {
  const forbiddenFiles = [
    '.DS_Store',
    '.github/workflows/release.yml',
    '.obs.js.swp',
    'demo/index.html',
    'ingest/plans/private.md',
    'node_modules/terser/package.json',
    'package-lock.json',
    'scripts/build.mjs',
    'test/obs.test.mjs'
  ];

  for (const path of forbiddenFiles) {
    const report = validReport();
    report[0].files.push({ path });
    report[0].entryCount += 1;

    assert.throws(
      () => verifyPackReport(report, packageMetadata, `/*! Obs.js ${packageMetadata.version} |`),
      /published file list/,
      path
    );
  }
});

test('a missing distribution file fails closed', () => {
  const report = validReport();
  report[0].files = report[0].files.filter(file => file.path !== 'obs-speedcurve.js');
  report[0].entryCount -= 1;

  assert.throws(
    () => verifyPackReport(report, packageMetadata, `/*! Obs.js ${packageMetadata.version} |`),
    /published file list/
  );
});

test('private or mismatched metadata fails closed', async () => {
  const artifact = await readFile(new URL('../obs.min.js', import.meta.url), 'utf8');

  assert.throws(
    () => verifyPackReport(validReport(), { ...packageMetadata, private: true }, artifact),
    /must not contain private/
  );
  assert.throws(
    () => verifyPackReport(validReport(), { ...packageMetadata, version: '999.0.0' }, artifact),
    /Expected values to be strictly equal/
  );
});
