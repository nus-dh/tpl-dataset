import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fields = { name: 160, description: 500 };
const url = /https?:\/\/|git@github\.com:/i;

function validText(value, limit) {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value === value.trim() &&
    value.length <= limit &&
    !url.test(value);
}

export function validateMetadata(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['metadata.json must be a JSON object'];
  }
  const errors = [];
  for (const key of Object.keys(data)) {
    if (!Object.hasOwn(fields, key) && !['keywords', 'role', 'derivedFrom'].includes(key)) {
      errors.push(`unknown field: ${key}`);
    }
  }
  for (const [key, limit] of Object.entries(fields)) {
    if (!validText(data[key], limit)) {
      errors.push(`${key} must be nonempty text (max ${limit} characters, no URLs)`);
    }
  }
  const { keywords } = data;
  if (!Array.isArray(keywords) || keywords.length < 1 || keywords.length > 20) {
    errors.push('keywords must contain 1–20 subject terms');
  } else if (keywords.some((keyword) => !validText(keyword, 80))) {
    errors.push('each keyword must be nonempty text (max 80 characters, no URLs)');
  } else if (new Set(keywords).size !== keywords.length) {
    errors.push('keywords must be unique');
  }
  if (Object.hasOwn(data, 'role') && !['master', 'derived'].includes(data.role)) {
    errors.push('role must be master or derived');
  }
  if (Object.hasOwn(data, 'derivedFrom')) {
    if (!Array.isArray(data.derivedFrom)) {
      errors.push('derivedFrom must be an array of catalogue parent references');
    } else {
      const seen = new Set();
      for (const parent of data.derivedFrom) {
        if (!parent || typeof parent !== 'object' || Array.isArray(parent) ||
          Object.keys(parent).length !== 2 || !Object.hasOwn(parent, 'namespace') ||
          !Object.hasOwn(parent, 'slug') ||
          typeof parent.namespace !== 'string' || parent.namespace.length > 40 ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parent.namespace) ||
          typeof parent.slug !== 'string' || parent.slug.length > 80 ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parent.slug)) {
          errors.push('each derivedFrom parent needs only a URL-safe namespace and slug');
          continue;
        }
        const key = JSON.stringify([parent.namespace, parent.slug]);
        if (seen.has(key)) errors.push('derivedFrom parents must be unique');
        seen.add(key);
      }
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const errors = validateMetadata(JSON.parse(readFileSync('metadata.json', 'utf8')));
    if (errors.length) {
      console.error(errors.map((error) => `metadata.json: ${error}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('metadata.json: valid');
    }
  } catch (error) {
    console.error(`metadata.json: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
