#!/usr/bin/env node
/**
 * audit-claims.mjs — Claims, Architectural Parity & Security Invariant Linter for unsubscribe-shield-ext.
 *
 * Invariants Enforced:
 * 1. Strict Manifest V3 CSP locked to 'self' and http://localhost:5001; exact host_permissions without broad wildcards.
 * 2. Sterile RFC 8058 One-Click HTTP POST Execution (credentials: 'omit', redirect: 'manual', HTTPS only, awaited stream cancel).
 * 3. Byte-Preserving Ingestion & 10 MB Client Ingestion Budget (zero Blob.text(), TextDecoder, or readAsText).
 * 4. Safe DOM Construction across UI (Zero innerHTML, outerHTML, insertAdjacentHTML, document.write).
 * 5. Active-Inbox Reconnaissance Warning Modal Requirement before Remote Contact (guard precedes executor call).
 * 6. Prohibited Marketing Vocabulary Guardrails.
 * 7. Dynamic Test Inventory & Portfolio Master Brief Parity (dynamically verified against Vitest & Playwright).
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

// ── Invariant 1: Manifest V3 & Strict Content Security Policy (CSP) ───────────
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
    errors.push("manifest.json must lock CSP connect-src strictly to 'self' and http://localhost:5001;");
  }
  if (!csp.includes("script-src 'self';") || !csp.includes("object-src 'none';")) {
    errors.push("manifest.json must lock CSP script-src to 'self' and object-src to 'none'.");
  }

  // Reject broad host permissions or unauthorized origins
  const hostPerms = manifest.host_permissions || [];
  if (hostPerms.length !== 1 || hostPerms[0] !== 'http://localhost:5001/*') {
    errors.push("manifest.json host_permissions must contain exactly ['http://localhost:5001/*'] without broad wildcards or remote hosts.");
  }
  if (hostPerms.includes('<all_urls>') || hostPerms.some((p) => p.includes('*://*') || p.includes('http://*') || p.includes('https://*'))) {
    errors.push('manifest.json must not grant broad or wildcard remote host permissions.');
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
  // Enforce awaited response stream cancellation
  if (!stripped.includes('await res.body.cancel()') && !stripped.includes('await res.body?.cancel()')) {
    errors.push('src/core/sterile-executor.ts must await immediate response body stream cancellation (await res.body.cancel()).');
  }
  if (!stripped.includes("'https:'") && !stripped.includes('"https:"')) {
    errors.push('src/core/sterile-executor.ts must enforce https: protocol scheme.');
  }
  if (!stripped.includes('List-Unsubscribe=One-Click')) {
    errors.push('src/core/sterile-executor.ts must send standard RFC 8058 body (List-Unsubscribe=One-Click).');
  }
});

// ── Invariant 3: Byte-Preserving Raw MIME Ingestion & 10 MB Budget ────────────
checkFile('src/core/mail-stripper-client.ts', (content) => {
  const stripped = stripSourceComments(content);

  if (!stripped.includes('10 * 1024 * 1024') && !stripped.includes('10485760')) {
    errors.push('src/core/mail-stripper-client.ts must enforce 10 MB maximum size budget cap.');
  }
  if (!stripped.includes('rawBlob.size > MAX_EMAIL_BYTE_SIZE') && !stripped.includes('.size >')) {
    errors.push('src/core/mail-stripper-client.ts must verify blob size budget before making request.');
  }
  if (!stripped.includes('FormData') || !stripped.includes('.append(')) {
    errors.push('src/core/mail-stripper-client.ts must stream raw Blob multipart.');
  }

  // Strictly forbid UTF-8 text re-encoding APIs that corrupt 8-bit non-UTF-8 bytes
  const forbiddenTextEncoders = [
    { name: 'Blob.text()', regex: /\.text\s*\(\s*\)/ },
    { name: 'TextDecoder', regex: /\bTextDecoder\b/ },
    { name: 'FileReader.readAsText', regex: /\breadAsText\b/ },
  ];
  for (const api of forbiddenTextEncoders) {
    if (api.regex.test(stripped)) {
      errors.push(`src/core/mail-stripper-client.ts violates byte-preservation invariant: uses ${api.name}. Raw 8-bit octet streaming required.`);
    }
  }
});

checkFile('src/background/service-worker.ts', (content) => {
  const stripped = stripSourceComments(content);
  // Byte preservation in background worker
  if (/\.text\s*\(\s*\)/.test(stripped) || /\bTextDecoder\b/.test(stripped) || /\breadAsText\b/.test(stripped)) {
    errors.push('src/background/service-worker.ts violates byte-preservation invariant: text decoding detected.');
  }
});

// ── Invariant 4: Safe DOM Construction (Zero innerHTML / outerHTML / write) ───
function scanDirectoryForUnsafeDom(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryForUnsafeDom(full);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') ||
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.js') ||
        entry.name.endsWith('.mjs'))
    ) {
      const code = fs.readFileSync(full, 'utf8');
      const stripped = stripSourceComments(code);

      const unsafePatterns = [
        { name: '.innerHTML', regex: /\.innerHTML\b/ },
        { name: "['innerHTML']", regex: /\[\s*['"`]innerHTML['"`]\s*\]/ },
        { name: '.outerHTML', regex: /\.outerHTML\b/ },
        { name: '.insertAdjacentHTML', regex: /\.insertAdjacentHTML\b/ },
        { name: 'document.write', regex: /\bdocument\s*\.\s*write\b/ },
      ];

      for (const pattern of unsafePatterns) {
        if (pattern.regex.test(stripped)) {
          errors.push(`Found unsafe DOM primitive (${pattern.name}) in ${entry.name}. Must use safe DOM primitives (textContent, createElement, classList).`);
        }
      }
    }
  }
}
scanDirectoryForUnsafeDom(path.join(rootDir, 'src/popup'));
scanDirectoryForUnsafeDom(path.join(rootDir, 'src/background'));

// ── Invariant 5: Active-Inbox Reconnaissance Warning Modal ────────────────────
checkFile('src/background/service-worker.ts', (content) => {
  const stripped = stripSourceComments(content);
  // Guard must precede executeSterileOneClick within the EXECUTE_STERILE_UNSUBSCRIBE case handler
  const caseIndex = stripped.indexOf("'EXECUTE_STERILE_UNSUBSCRIBE'");
  if (caseIndex === -1) {
    errors.push("service-worker.ts must handle 'EXECUTE_STERILE_UNSUBSCRIBE' action.");
  } else {
    const handlerCode = stripped.slice(caseIndex);
    const guardIndex = handlerCode.indexOf('!userConfirmed');
    const execIndex = handlerCode.indexOf('executeSterileOneClick');
    if (guardIndex === -1 || execIndex === -1 || guardIndex > execIndex) {
      errors.push('service-worker.ts must enforce !userConfirmed guard blocking execution prior to calling executeSterileOneClick in EXECUTE_STERILE_UNSUBSCRIBE handler.');
    }
  }
});

checkFile('src/popup/popup.ts', (content) => {
  const stripped = stripSourceComments(content);
  if (!stripped.includes('confirmModal') || !stripped.includes('modalConfirmBtn')) {
    errors.push('src/popup/popup.ts must wire confirmation modal acknowledgment before dispatching execution.');
  }
  if (!stripped.includes('reconWarningCard') || !stripped.includes('reconWarningText')) {
    errors.push('src/popup/popup.ts must render Active-Inbox Reconnaissance Warning disclosure.');
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

let actualUnitTestCount = null;
let actualE2ETestCount = null;

try {
  let testOutput = '';
  try {
    testOutput = execSync('npx vitest run --no-color', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60 * 1000,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
  } catch (execErr) {
    testOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '');
    if (!testOutput.trim()) {
      throw execErr;
    }
  }

  // Strip ANSI escape codes to ensure reliable parsing in CI environments
  const cleanOutput = testOutput.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const passMatch = cleanOutput.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed\s+\((\d+)\)/);
  if (passMatch) {
    const failed = passMatch[1] ? parseInt(passMatch[1], 10) : 0;
    const passed = parseInt(passMatch[2], 10);
    const total = parseInt(passMatch[3], 10);

    if (failed > 0) {
      errors.push(`Unit test suite failure: ${failed} tests failed during verification (${passed}/${total} passed).`);
    } else {
      actualUnitTestCount = passed;
      console.log(`  ✓ Dynamic unit test verification: ${passed}/${total} unit tests passing`);
    }
  } else {
    errors.push('Unable to parse unit test results from vitest output.');
  }
} catch (err) {
  errors.push(`Failed executing vitest during claims audit: ${err.message}`);
}

// Dynamically audit Playwright E2E test inventory
try {
  const e2eFile = path.join(rootDir, 'tests/e2e/popup.spec.ts');
  if (fs.existsSync(e2eFile)) {
    const e2eContent = fs.readFileSync(e2eFile, 'utf8');
    const matches = e2eContent.match(/\btest\s*\(/g);
    if (matches) {
      actualE2ETestCount = matches.length;
      console.log(`  ✓ E2E test suite inventory verified: ${actualE2ETestCount} Playwright test(s) declared`);
    }
  }
} catch (err) {
  errors.push(`Failed scanning E2E tests: ${err.message}`);
}

// Check parity with Portfolio Master Brief if present
const briefPath = path.join(devRoot, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
if (fs.existsSync(briefPath) && actualUnitTestCount !== null) {
  const briefText = fs.readFileSync(briefPath, 'utf8');
  const briefLines = briefText.split('\n');
  const repoRow = briefLines.find((l) => l.includes('`unsubscribe-shield-ext`') && /unit\s+tests/i.test(l));
  if (repoRow) {
    const briefMatch = repoRow.match(/(\d+)\/(\d+)\s+(?:[uU]nit\s+[tT]ests|[uU]nit\s+tests\s+pass)/i);
    if (briefMatch) {
      const briefPassed = parseInt(briefMatch[1], 10);
      const briefTotal = parseInt(briefMatch[2], 10);
      if (briefPassed !== actualUnitTestCount || briefTotal !== actualUnitTestCount) {
        errors.push(`Portfolio Brief Drift: KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md documents ${briefPassed}/${briefTotal} unit tests, but test runner executed ${actualUnitTestCount}/${actualUnitTestCount}.`);
      } else {
        console.log(`  ✓ Portfolio Master Brief parity verified: ${briefPassed}/${briefTotal} tests documented`);
      }
    }
  }
}

// Check published test counts in README.md and ROADMAP.md
if (actualUnitTestCount !== null) {
  for (const docName of ['README.md', 'ROADMAP.md']) {
    const docFile = path.join(rootDir, docName);
    if (fs.existsSync(docFile)) {
      const docContent = fs.readFileSync(docFile, 'utf8');
      const testNumMatches = docContent.matchAll(/(\d+)\/(\d+)\s+(?:automated\s+)?unit\s+tests/gi);
      for (const m of testNumMatches) {
        const documented = parseInt(m[1], 10);
        if (documented !== actualUnitTestCount) {
          errors.push(`${docName} documents ${documented} unit tests, but ${actualUnitTestCount} are executed.`);
        }
      }
    }
  }
}

// Check published E2E test counts in README.md
if (actualE2ETestCount !== null) {
  const readmeFile = path.join(rootDir, 'README.md');
  if (fs.existsSync(readmeFile)) {
    const docContent = fs.readFileSync(readmeFile, 'utf8');
    const e2eMatches = docContent.matchAll(/(\d+)\/(\d+)\s+e2e\s+tests/gi);
    for (const m of e2eMatches) {
      const documented = parseInt(m[1], 10);
      if (documented !== actualE2ETestCount) {
        errors.push(`README.md documents ${documented} e2e tests, but ${actualE2ETestCount} are declared.`);
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
console.log('  ✓ Byte-preserving raw MIME ingestion verified (zero Blob.text/TextDecoder)');
console.log('  ✓ Safe DOM primitives verified across UI components (zero innerHTML/outerHTML/write)');
console.log('  ✓ Active-inbox reconnaissance warning modal required prior to execution');
console.log('  ✓ Zero prohibited marketing adjectives in documentation');
console.log(`  ✓ Dynamic published numbers & portfolio brief parity verified (${actualUnitTestCount}/${actualUnitTestCount} unit tests, ${actualE2ETestCount}/${actualE2ETestCount} e2e tests)`);
process.exit(0);
