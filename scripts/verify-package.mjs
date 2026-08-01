import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectUrl = new URL('../', import.meta.url);
const projectPath = fileURLToPath(projectUrl);

export const EXPECTED_FILES = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'obs-speedcurve.js',
  'obs.js',
  'obs.min.js',
  'package.json'
];

export function verifyPackReport(packReport, packageMetadata, artifact) {
  assert.ok(Array.isArray(packReport), 'npm pack must return a JSON array');
  assert.equal(packReport.length, 1, 'npm pack must describe exactly one package');

  const [packed] = packReport;
  const actualFiles = packed.files.map(file => file.path).sort();

  assert.deepEqual(actualFiles, EXPECTED_FILES, 'published file list must match the allowlist');
  assert.equal(packed.entryCount, EXPECTED_FILES.length, 'package entry count must match the allowlist');
  assert.equal(packageMetadata.name, 'obs.js');
  assert.equal(packed.name, packageMetadata.name);
  assert.equal(packed.version, packageMetadata.version);
  assert.equal(packed.id, `${packageMetadata.name}@${packageMetadata.version}`);
  assert.equal(packed.filename, `${packageMetadata.name}-${packageMetadata.version}.tgz`);
  assert.equal(packageMetadata.license, 'MIT');
  assert.equal(packageMetadata.publishConfig?.access, 'public');
  assert.equal('private' in packageMetadata, false, 'package metadata must not contain private');
  assert.ok(
    artifact.startsWith(`/*! Obs.js ${packageMetadata.version} |`),
    'generated banner must match the package version'
  );

  return packed;
}

export async function inspectPackage() {
  const cachePath = await mkdtemp(join(tmpdir(), 'obs-js-pack-'));

  try {
    const [{ stdout }, packageMetadata, artifact] = await Promise.all([
      execFileAsync('npm', [
        'pack',
        '--dry-run',
        '--json',
        '--ignore-scripts',
        '--cache',
        cachePath
      ], { cwd: projectPath }),
      readFile(new URL('package.json', projectUrl), 'utf8').then(JSON.parse),
      readFile(new URL('obs.min.js', projectUrl), 'utf8')
    ]);

    return verifyPackReport(JSON.parse(stdout), packageMetadata, artifact);
  } finally {
    await rm(cachePath, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const packed = await inspectPackage();
  console.log(`[obs] Verified ${packed.id}: ${packed.entryCount} files (${packed.filename})`);
}
