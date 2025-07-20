// Patch 1: /lib/cache.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const cacheFile = path.resolve(process.cwd(), 'claude-cache.json');

function getHash(text: string, prompt: string) {
  return crypto.createHash('sha256').update(text + prompt).digest('hex');
}

function readCache() {
  if (!fs.existsSync(cacheFile)) return {};
  return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
}

function writeCache(data: any) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

function getCachedEdit(hash: string) {
  const cache = readCache();
  return cache[hash] || null;
}

function storeCachedEdit(hash: string, data: any) {
  const cache = readCache();
  cache[hash] = data;
  writeCache(cache);
}

export { getHash, getCachedEdit, storeCachedEdit };
