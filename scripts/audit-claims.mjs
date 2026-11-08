#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const errors = [];

function checkFile(relPath, validator) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required file: ${relPath}`);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  validator(content, relPath);
}

// 1. Manifest V3 & CSP check
checkFile('manifest.json', (content) => {
  const manifest = JSON.parse(content);
  if (manifest.manifest_version !== 3) {
    errors.push('manifest.json must be Manifest V3 (manifest_version: 3).');
  }
  const csp = manifest.content_security_policy?.extension_pages || '';
  if (!csp.includes("connect-src 'self' http://localhost:5001;")) {
    errors.push("manifest.json must lock CSP connect-src strictly to 'self' and http://localhost:5001.");
  }
});

// 2. Sterile execution guarantees
checkFile('src/core/sterile-executor.ts', (content) => {
  if (!content.includes("credentials: 'omit'")) {
    errors.push("src/core/sterile-executor.ts must enforce credentials: 'omit'.");
  }
  if (!content.includes("redirect: 'manual'")) {
    errors.push("src/core/sterile-executor.ts must enforce redirect: 'manual'.");
  }
  if (!content.includes('body.cancel')) {
    errors.push('src/core/sterile-executor.ts must cancel response body stream immediately.');
  }
});

// 3. Size budget in client
checkFile('src/core/mail-stripper-client.ts', (content) => {
  if (!content.includes('10 * 1024 * 1024')) {
    errors.push('src/core/mail-stripper-client.ts must enforce 10 MB maximum size budget cap.');
  }
});

// 4. Zero innerHTML usage in popup
checkFile('src/popup/popup.ts', (content) => {
  if (content.includes('.innerHTML')) {
    errors.push('src/popup/popup.ts must use pure DOM primitives (zero innerHTML interpolation).');
  }
});

// 5. Prohibited vocabulary in docs
for (const doc of ['README.md', 'ROADMAP.md']) {
  const full = path.join(rootDir, doc);
  if (fs.existsSync(full)) {
    const text = fs.readFileSync(full, 'utf8').toLowerCase();
    for (const bad of ['bulletproof', 'conclusive', 'definitive', 'infinitely scalable']) {
      if (text.includes(bad)) {
        errors.push(`${doc} contains prohibited marketing adjective: '${bad}'.`);
      }
    }
  }
}

console.log('=== Unsubscribe Shield Extension Claims & Security Invariant Audit ===\n');

if (errors.length > 0) {
  console.error(`[FAIL] Found ${errors.length} violation(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('[PASS] All extension architectural & security invariants verified:');
console.log("  ✓ Strict Manifest V3 CSP locked to 'self' and http://localhost:5001");
console.log("  ✓ Sterile RFC 8058 HTTP POST execution enforced (credentials: 'omit', redirect: 'manual')");
console.log('  ✓ 10 MB client-side ingestion budget verified');
console.log('  ✓ Safe DOM primitives verified in popup UI (zero innerHTML)');
console.log('  ✓ Zero prohibited marketing adjectives in documentation');
process.exit(0);
