#!/usr/bin/env node
/**
 * audit-claims.mjs — Claims, Architectural Parity & Security Invariant Linter for unsubscribe-shield-ext.
 *
 * Invariants Enforced:
 * 1. Strict Manifest V3 CSP locked to 'self' and http://localhost:5001.
 * 2. Sterile RFC 8058 One-Click HTTP POST Execution (credentials: 'omit', redirect: 'manual', HTTPS only, stream cancel).
 * 3. Raw Byte Streaming & 10 MB Client Ingestion Budget.
 * 4. Safe DOM Primitives in Popup UI (Zero innerHTML interpolation).
 * 5. Active-Inbox Reconnaissance Warning Modal Requirement before Remote Contact.
 * 6. Prohibited Marketing Vocabulary Guardrails.
 * 7. Dynamic Test Inventory & Portfolio Master Brief Parity (dynamically verified against Vitest).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  stripLineComment,
  stripBlockComments,
  scanDocumentationForVocabulary,
  BANNED_VOCABULARY,
} from './claims-linter-core.mjs';

function stripSourceComments(source) {
  const noBlock = stripBlockComments(source);
  return noBlock
    .split('\n')
    .map((line) => stripLineComment(line))
    .join('\n');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const devRoot = path.resolve(rootDir, '..');

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

// ── Invariant 1: Manifest V3 & Content Security Policy (CSP) ─────────────────
checkFile('manifest.json', (content) => {
  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (err) {
    errors.push(`manifest.json parse error: ${err.message}`);
    return;
  }

  if (manifest.manifest_version !== 3) {
    errors.push('manifest.json must be Manifest V3 (manifest_version: 3).');
  }

  const csp = manifest.content_security_policy?.extension_pages || '';
  if (!csp.includes("connect-src 'self' http://localhost:5001;")) {
    errors.push("manifest.json must lock CSP connect-src strictly to 'self' and http://localhost:5001.");
  }
  if (!csp.includes("script-src 'self';") || !csp.includes("object-src 'none';")) {
    errors.push("manifest.json must lock CSP script-src to 'self' and object-src to 'none'.");
  }

  const hostPerms = manifest.host_permissions || [];
  if (!hostPerms.includes('http://localhost:5001/*')) {
    errors.push("manifest.json must include 'http://localhost:5001/*' in host_permissions.");
  }
});

// ── Invariant 2: Sterile RFC 8058 Dispatching Invariants ──────────────────────
checkFile('src/core/sterile-executor.ts', (content) => {
  const stripped = stripSourceComments(content);

  if (!stripped.includes("credentials: 'omit'")) {
    errors.push("src/core/sterile-executor.ts must enforce credentials: 'omit'.");
  }
  if (!stripped.includes("redirect: 'manual'")) {
    errors.push("src/core/sterile-executor.ts must enforce redirect: 'manual'.");
  }
  if (!stripped.includes("referrerPolicy: 'no-referrer'")) {
    errors.push("src/core/sterile-executor.ts must enforce referrerPolicy: 'no-referrer'.");
  }
  if (!stripped.includes('res.body?.cancel') && !stripped.includes('body.cancel')) {
    errors.push('src/core/sterile-executor.ts must immediately cancel response body stream.');
  }
  if (!stripped.includes("'https:'") && !stripped.includes('"https:"')) {
    errors.push('src/core/sterile-executor.ts must enforce https: protocol scheme.');
  }
  if (!stripped.includes('List-Unsubscribe=One-Click')) {
    errors.push('src/core/sterile-executor.ts must send standard RFC 8058 body (List-Unsubscribe=One-Click).');
  }
});

// ── Invariant 3: Raw Byte Streaming & Ingestion Budget ────────────────────────
checkFile('src/core/mail-stripper-client.ts', (content) => {
  const stripped = stripSourceComments(content);

  if (!stripped.includes('10 * 1024 * 1024') && !stripped.includes('10485760')) {
    errors.push('src/core/mail-stripper-client.ts must enforce 10 MB maximum size budget cap.');
  }
  if (!stripped.includes('FormData') || !stripped.includes('.append(')) {
    errors.push('src/core/mail-stripper-client.ts must stream raw Blob multipart.');
  }
});

// ── Invariant 4: Safe DOM Primitives (Zero innerHTML) ─────────────────────────
function scanDirectoryForInnerHtml(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryForInnerHtml(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      const code = fs.readFileSync(full, 'utf8');
      const stripped = stripSourceComments(code);
      if (stripped.includes('.innerHTML')) {
        errors.push(`Found forbidden .innerHTML in ${entry.name}. Must use safe DOM primitives (textContent, createElement).`);
      }
    }
  }
}
scanDirectoryForInnerHtml(path.join(rootDir, 'src/popup'));

// ── Invariant 5: Active-Inbox Reconnaissance Warning Modal ────────────────────
checkFile('src/background/service-worker.ts', (content) => {
  const stripped = stripSourceComments(content);
  if (!stripped.includes('userConfirmed')) {
    errors.push('service-worker.ts must enforce userConfirmed check before executing sterile unsubscribe.');
  }
});

// ── Invariant 6: Prohibited Marketing Adjectives in Documentation ─────────────
const docsToCheck = ['README.md', 'ROADMAP.md', 'docs/ARCHITECTURE.md', 'NOTICE.md'];
for (const doc of docsToCheck) {
  const full = path.join(rootDir, doc);
  if (fs.existsSync(full)) {
    const text = fs.readFileSync(full, 'utf8');
    const vocabErrors = scanDocumentationForVocabulary(text, doc);
    errors.push(...vocabErrors);
  }
}

// ── Invariant 7: Dynamic Test Inventory & Portfolio Parity ────────────────────
console.log('=== Unsubscribe Shield Extension Claims & Security Invariant Audit ===\n');

let actualTestCount = null;
try {
  let testOutput = '';
  try {
    testOutput = execSync('npx vitest run', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60 * 1000,
    });
  } catch (execErr) {
    testOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '');
    if (!testOutput.trim()) {
      throw execErr;
    }
  }

  const passMatch = testOutput.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed\s+\((\d+)\)/);
  if (passMatch) {
    const failed = passMatch[1] ? parseInt(passMatch[1], 10) : 0;
    const passed = parseInt(passMatch[2], 10);
    const total = parseInt(passMatch[3], 10);

    if (failed > 0) {
      errors.push(`Test suite failure: ${failed} tests failed during verification (${passed}/${total} passed).`);
    } else {
      actualTestCount = passed;
      console.log(`  ✓ Dynamic test runner verification: ${passed}/${total} unit tests passing`);
    }
  } else {
    errors.push('Unable to parse test results from vitest output.');
  }
} catch (err) {
  errors.push(`Failed executing vitest during claims audit: ${err.message}`);
}

// Check parity with Portfolio Master Brief if present
const briefPath = path.join(devRoot, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
if (fs.existsSync(briefPath) && actualTestCount !== null) {
  const briefText = fs.readFileSync(briefPath, 'utf8');
  const briefLines = briefText.split('\n');
  const repoRow = briefLines.find((l) => l.includes('`unsubscribe-shield-ext`') && /unit\s+tests/i.test(l));
  if (repoRow) {
    const briefMatch = repoRow.match(/(\d+)\/(\d+)\s+(?:[uU]nit\s+[tT]ests|[uU]nit\s+tests\s+pass)/i);
    if (briefMatch) {
      const briefPassed = parseInt(briefMatch[1], 10);
      const briefTotal = parseInt(briefMatch[2], 10);
      if (briefPassed !== actualTestCount || briefTotal !== actualTestCount) {
        errors.push(`Portfolio Brief Drift: KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md documents ${briefPassed}/${briefTotal} unit tests, but test runner executed ${actualTestCount}/${actualTestCount}.`);
      } else {
        console.log(`  ✓ Portfolio Master Brief parity verified: ${briefPassed}/${briefTotal} tests documented`);
      }
    }
  }
}

// Check published test counts in README.md and ROADMAP.md
if (actualTestCount !== null) {
  for (const docName of ['README.md', 'ROADMAP.md']) {
    const docFile = path.join(rootDir, docName);
    if (fs.existsSync(docFile)) {
      const docContent = fs.readFileSync(docFile, 'utf8');
      const testNumMatches = docContent.matchAll(/(\d+)\/(\d+)\s+(?:automated\s+)?unit\s+tests/gi);
      for (const m of testNumMatches) {
        const documented = parseInt(m[1], 10);
        if (documented !== actualTestCount) {
          errors.push(`${docName} documents ${documented} unit tests, but ${actualTestCount} are executed.`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n[FAIL] Found ${errors.length} violation(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('[PASS] All extension architectural & security invariants verified:');
console.log("  ✓ Strict Manifest V3 CSP locked to 'self' and http://localhost:5001");
console.log("  ✓ Sterile RFC 8058 HTTP POST execution enforced (credentials: 'omit', redirect: 'manual', stream cancel)");
console.log('  ✓ 10 MB client-side ingestion budget verified');
console.log('  ✓ Safe DOM primitives verified in popup UI (zero innerHTML)');
console.log('  ✓ Active-inbox reconnaissance warning modal required prior to execution');
console.log('  ✓ Zero prohibited marketing adjectives in documentation');
console.log(`  ✓ Dynamic published numbers & portfolio brief parity verified (${actualTestCount}/${actualTestCount} tests)`);
process.exit(0);
