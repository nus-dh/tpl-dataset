import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateDataPackage } from './validate-datapackage.mjs';

const validPackage = {
  $schema: 'https://datapackage.org/profiles/2.0/datapackage.json',
  name: 'example-dataset',
  title: 'Example dataset',
  description: 'A clearly labelled placeholder package.',
  keywords: ['example'],
  resources: [{ name: 'input', path: 'input.csv', format: 'csv' }],
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'data-package-'));
  writeFileSync(join(root, 'input.csv'), 'value\nREPLACE_WITH_REAL_DATA\n');
  return root;
}

test('accepts a Data Package with an existing resource', () => {
  const root = fixture();
  try {
    assert.deepEqual(validateDataPackage(validPackage, root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts multiple resources in nested directories', () => {
  const root = fixture();
  try {
    mkdirSync(join(root, 'annotations'));
    writeFileSync(join(root, 'annotations', 'labels.csv'), 'label\nexample\n');
    const descriptor = {
      ...validPackage,
      resources: [
        { name: 'input', path: 'input.csv' },
        { name: 'labels', path: 'annotations/labels.csv' },
        { name: 'combined', path: ['input.csv', 'annotations/labels.csv'] },
      ],
    };
    assert.deepEqual(validateDataPackage(descriptor, root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('requires a package name and at least one resource; validates an optional title', () => {
  const root = fixture();
  try {
    for (const descriptor of [
      { ...validPackage, name: undefined },
      { ...validPackage, title: '' },
      { ...validPackage, resources: [] },
    ]) {
      assert.notDeepEqual(validateDataPackage(descriptor, root), []);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects malformed and duplicate resources', () => {
  const root = fixture();
  try {
    for (const resources of [
      [{ path: 'input.csv' }],
      [{ name: 'input', path: 'input.csv' }, { name: 'input', path: 'input.csv' }],
      [{ name: 'input', path: 'missing.csv' }],
      [{ name: 'input', path: ['input.csv', 'missing.csv'] }],
      [{ name: 'input', data: ['inline'] }],
    ]) {
      assert.notDeepEqual(validateDataPackage({ ...validPackage, resources }, root), []);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects absolute, traversing, URL, and outside-pointing symlink paths', () => {
  const root = fixture();
  const outside = `${root}.outside.csv`;
  writeFileSync(outside, 'private\n');
  symlinkSync(outside, join(root, 'outside.csv'));
  try {
    for (const path of ['/etc/passwd', '../outside-dataset-resource.csv', 'https://example.test/data.csv', 'outside.csv']) {
      const errors = validateDataPackage({
        ...validPackage,
        resources: [{ name: 'input', path }],
      }, root);
      assert.notDeepEqual(errors, [], `expected unsafe path to fail: ${path}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

test('validates optional Data Package fields without requiring them', () => {
  const root = fixture();
  try {
    assert.deepEqual(validateDataPackage({
      ...validPackage,
      created: '2026-01-02T03:04:05Z',
      contributors: [{ title: 'Research group', roles: ['creator'] }],
      licenses: [{ name: 'CC-BY-4.0' }],
      sources: [{ title: 'Source collection' }],
    }, root), []);
    assert.deepEqual(validateDataPackage(validPackage, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, created: 'yesterday' }, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, created: '2026-02-30T00:00:00Z' }, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, contributors: 'unknown' }, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, contributors: [{}] }, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, licenses: ['CC-BY-4.0'] }, root), []);
    assert.notDeepEqual(validateDataPackage({ ...validPackage, sources: [null] }, root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI validates datapackage.json and fails for missing or malformed descriptors', () => {
  const root = fixture();
  const script = fileURLToPath(new URL('./validate-datapackage.mjs', import.meta.url));
  try {
    assert.throws(() => execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' }));
    writeFileSync(join(root, 'datapackage.json'), '{invalid');
    assert.throws(() => execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' }));
    writeFileSync(join(root, 'datapackage.json'), JSON.stringify(validPackage));
    assert.match(execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }), /datapackage\.json: valid/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
