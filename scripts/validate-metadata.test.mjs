import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateMetadata } from './validate-metadata.mjs';

test('accepts a catalogue descriptor', () => {
  assert.deepEqual(
    validateMetadata({
      name: 'Jawi transcription subset',
      description: 'Annotated pages for transcription research.',
      keywords: ['jawi', 'transcription'],
      role: 'derived',
      derivedFrom: [],
    }),
    [],
  );
});

test('rejects missing or empty fields', () => {
  for (const value of [
    {},
    { name: ' ', description: 'Description', keywords: ['jawi'] },
    { name: 'Name', description: ' ', keywords: ['jawi'] },
    { name: 'Name', description: 'Description', keywords: [] },
  ]) {
    assert.notDeepEqual(validateMetadata(value), []);
  }
});

test('rejects unharvested or unsafe fields', () => {
  for (const value of [
    { name: 'Name', description: 'Description', keywords: ['jawi'], sources: [] },
    { name: 'Name', description: 'https://private.example/data', keywords: ['jawi'] },
    { name: 'Name', description: 'Description', keywords: ['jawi', 'jawi'] },
    { name: 'Name', description: 'Description', keywords: ['https://private.example/data'] },
    { name: 'Name', description: 'Description', keywords: ['jawi'], extra: 'unused' },
  ]) {
    assert.notDeepEqual(validateMetadata(value), []);
  }
});

test('rejects unknown JSON keys even when they match object prototypes', () => {
  const value = JSON.parse('{"name":"Name","description":"Description","keywords":["jawi"],"__proto__":"unused"}');
  assert.notDeepEqual(validateMetadata(value), []);
});

test('accepts one or more confirmed catalogue parents', () => {
  const data = {
    name: 'Subset',
    description: 'A selected subset of source pages.',
    keywords: ['jawi'],
    role: 'derived',
    derivedFrom: [
      { namespace: 'culturalheritagenus', slug: 'source-pages' },
      { namespace: 'another-publisher', slug: 'annotations' },
    ],
  };
  assert.deepEqual(validateMetadata(data), []);
  assert.deepEqual(validateMetadata({ ...data, role: 'master', derivedFrom: [] }), []);
  assert.deepEqual(validateMetadata({ name: data.name, description: data.description, keywords: data.keywords }), []);
});

test('rejects invalid roles, malformed or duplicate parent references', () => {
  const data = { name: 'Subset', description: 'A selected subset.', keywords: ['jawi'], role: 'derived' };
  for (const lineage of [
    { role: 'unknown' },
    { derivedFrom: null },
    { derivedFrom: ['source-pages'] },
    { derivedFrom: [{ namespace: '', slug: 'source-pages' }] },
    { derivedFrom: [{ namespace: 'publisher', slug: 'Bad Slug' }] },
    { derivedFrom: [{ namespace: 'publisher', slug: 'source-pages', path: 'private-url' }] },
    { derivedFrom: [{ namespace: 'publisher', slug: 'source-pages' }, { namespace: 'publisher', slug: 'source-pages' }] },
  ]) {
    assert.notDeepEqual(validateMetadata({ ...data, ...lineage }), []);
  }
});

test('rejects non-object metadata and overlong values', () => {
  assert.notDeepEqual(validateMetadata([]), []);
  assert.notDeepEqual(validateMetadata({ name: 'x'.repeat(161), description: 'ok', keywords: ['jawi'] }), []);
  assert.notDeepEqual(validateMetadata({ name: 'Name', description: 'ok', keywords: ['x'.repeat(81)] }), []);
});

test('CLI fails for missing or malformed metadata.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dataset-metadata-'));
  const script = fileURLToPath(new URL('./validate-metadata.mjs', import.meta.url));
  try {
    assert.throws(() => execFileSync(process.execPath, [script], { cwd: dir, stdio: 'pipe' }));
    writeFileSync(join(dir, 'metadata.json'), '{invalid');
    assert.throws(() => execFileSync(process.execPath, [script], { cwd: dir, stdio: 'pipe' }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
