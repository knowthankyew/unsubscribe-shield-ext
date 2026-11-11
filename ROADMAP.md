# Roadmap: unsubscribe-shield-ext — Universal Thunderbird & WebExtension Client

> **Repository**: [`knowthankyew/unsubscribe-shield-ext`](https://github.com/knowthankyew/unsubscribe-shield-ext)  
> **Governance Scope**: Universal WebExtension (Manifest V3) for Thunderbird MailExtension + Chromium/Firefox  
> **Backend Integration**: Local `mailStripper` Ingestion Plane (`http://localhost:5001/api/strip/file`)  
> **Governance Standard**: Zero Telemetry · Local-First (:5001) · Zero-Cookie Sterile RFC 8058 Execution · Mandatory Recon Warnings · Automated Claims Auditing (`scripts/audit-claims.mjs`)

---

## 1. Executive Context for Incoming AI Agents

This repository serves as **Companion A** to [`knowthankyew/mail-stripper`](https://github.com/knowthankyew/mail-stripper).

### Why a Separate Repository Was Established
Under portfolio governance boundaries:
1. `mailStripper` operates under an uncompromising air-gap (`connect-src 'self' http://localhost:8000;` only, 100% volatile in-memory). It performs purely static forensics, defangs HTML links, and emits copyable `curl` commands—never executing outbound requests to remote sender hosts.
2. `unsubscribe-shield-ext` lives in this independently governed repository to hold the explicit user-authorized network execution permissions: communicating with local `mailStripper` (`:5001`) and performing user-confirmed, sterile RFC 8058 One-Click HTTP POST requests to remote ESP endpoints.

---

## 2. Master Milestone Grid

| Milestone | Target | Description | Status |
|:----------|:------:|:------------|:------:|
| **Milestone 1** | `v0.1.0` | **Scaffold & Sterile Engine**: Vite/TS build, Manifest V3, background worker, sterile RFC 8058 executor, popup UI, unit tests, Playwright recorder, claims linter | 🟢 **Complete** |
| **Milestone 2** | `v0.2.0` | **Thunderbird MailExtension Adapter**: `browser.messages.getRaw` stream extraction, raw blob piping, message-header action bar badge | 📋 **Planned** |
| **Milestone 3** | `v0.3.0` | **Webmail Overlay Adapter**: Chromium/Firefox DOM content script for Gmail/Outlook Web, floating shield button, safe iframe injection | 📋 **Planned** |
| **Milestone 4** | `v0.4.0` | **Packaging & Store Publishing**: AMO (addons.mozilla.org) + ATN (Thunderbird) + Chrome Web Store release builds, automated SBOM | 📋 **Planned** |

---

## 3. Detailed Milestone Specifications

### Milestone 1: Core Extension Scaffold & Sterile Execution Engine (`v0.1.0`)
- [x] **Project Scaffolding**: TypeScript 5.7, Vite 6, Vitest, Playwright, strict ESLint.
- [x] **Manifest V3 Specification (`manifest.json`)**:
  - Permissions: `activeTab`, `storage`.
  - Host permissions: `http://localhost:5001/*`.
  - Content Security Policy: `extension_pages: "script-src 'self'; object-src 'none'; connect-src 'self' http://localhost:5001;"`.
- [x] **Sterile RFC 8058 Executor (`src/core/sterile-executor.ts`)**:
  - `method: 'POST'` with `headers: { 'Content-Type': 'application/x-www-form-urlencoded' }`.
  - `body: 'List-Unsubscribe=One-Click'`.
  - `credentials: 'omit'` (zero ambient cookies or Authorization headers).
  - `redirect: 'manual'` (blocks redirect chains to prevent tracking hops).
  - `referrerPolicy: 'no-referrer'`.
  - Immediate response body discard: `await res.body?.cancel()`.
  - Enforces `https://` scheme exclusively.
- [x] **mailStripper Streaming Client (`src/core/mail-stripper-client.ts`)**:
  - Enforces 10 MB budget cap (`blob.size <= 10 * 1024 * 1024`).
  - Sends raw byte `Blob` multipart data, preserving 8-bit non-UTF-8 characters.
  - Supports optional `expectedAuthservId` query/form parameter.
- [x] **Popup Interface (`src/popup/`)**:
  - Provenance badges matching `mailStripper` (`TrustedReceivingMx`, `UnverifiedUpload`).
  - Mandatory **Active-Inbox Reconnaissance Warning** on all candidates.
  - Confirmation modal required before triggering execution.
- [x] **Testing & CI**:
  - Vitest unit tests verifying sterile executor and client budget caps.
  - Playwright E2E tests verifying popup rendering and modal flows.
  - Automated claims linter (`scripts/audit-claims.mjs`).
  - Automated demo recording script (`scripts/record-demo.sh`).

### Milestone 2: Thunderbird MailExtension Adapter (`v0.2.0`)
- [ ] **Thunderbird Manifest Expansion**: Add `messageDisplayAction` and `messagesRead` permissions.
- [ ] **Raw MIME Ingestion**: Call `browser.messages.getRaw(messageId, { data_format: 'File' })`.
  - Ensure the raw `Blob` is streamed directly into `sendEmailToMailStripper` without calling `Blob.text()`.
- [ ] **Message Header Bar**: Inject action button next to native Thunderbird headers showing shield icon and risk score badge.
- [ ] **Offline Resilience**: If `mailStripper` is offline, surface clear setup notification with 1-click retry.

### Milestone 3: Webmail Overlay Adapter (`v0.3.0`)
- [ ] **Content Script Injection**: Scoped strictly to `mail.google.com` and `outlook.live.com` / `outlook.office.com`.
- [ ] **Header Extraction**: Detect presence of native unsubscribe links or parse raw message source via webmail UI hooks.
- [ ] **Closed Shadow DOM Badge**: Inject isolated indicator into email header bar using closed shadow root.

### Milestone 4: Production Packaging & Release Readiness (`v0.4.0`)
- [ ] **Cross-Platform Bundles**: Generate `.xpi` (Thunderbird/Firefox) and `.zip` (Chrome).
- [ ] **Security Auditing**: Pass `addons-linter` (Mozilla) and Chrome extension validation.
- [ ] **Supply Chain SBOM**: Generate CycloneDX `bom.json` attestation in CI.

---

## 4. Non-Negotiable Technical Guardrails & Edge Cases

### Edge Case 1: Byte-Preserving Raw MIME Handling
- **Issue**: Calling `Blob.text()` forces UTF-8 decoding and irrevocably corrupts 8-bit non-UTF-8 bodies (ISO-8859-1, Windows-1252 accents, symbols).
- **Rule**: Always keep the message payload as a raw `Blob` or `Uint8Array` when streaming to `mailStripper`.

### Edge Case 2: Zero Ambient Cookie Transmission
- **Issue**: Standard browser `fetch()` can attach ambient cookies or session tokens to external hosts, which would unmask the user during an opt-out.
- **Rule**: All outbound RFC 8058 POSTs must strictly enforce `credentials: 'omit'`.

### Edge Case 3: Stealth Redirect Hop Chains
- **Issue**: An attacker or tracker may respond to an unsubscribe POST with a `302 Found` to log IP addresses or set cookies across domains.
- **Rule**: Enforce `redirect: 'manual'` and immediately cancel the response stream (`await res.body?.cancel()`).

### Edge Case 4: Active-Inbox Reconnaissance Disclosure
- **Issue**: Contacting any external server confirms that the mailbox is monitored.
- **Rule**: Never execute an opt-out automatically without explicit user gesture and disclosure confirmation.
