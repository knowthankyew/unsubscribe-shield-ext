# unsubscribe-shield-ext 🛡️✉️

> Universal **Thunderbird MailExtension** & **Browser WebExtension (Manifest V3)** for air-gapped email unsubscribe forensics & sterile zero-cookie RFC 8058 execution.

Companion client to [`knowthankyew/mail-stripper`](https://github.com/knowthankyew/mail-stripper).

---

## 🎯 What It Does

1. 🔍 **One-Click Email Inspection**: Directly inspects the active message in Thunderbird or your browser without copy-pasting raw headers.
2. 🛡️ **Air-Gapped Forensics via mailStripper**: Streams raw bytes to your local `mailStripper` engine (`:5001`) to evaluate RFC 8058, RFC 2369, RFC 6376 (DKIM), and RFC 8601 (receiving MX) header integrity.
3. ⚠️ **Active-Inbox Reconnaissance Warning**: Explicitly alerts you before contacting any remote server that an unsubscribe action confirms recipient activity to the sender.
4. 🔒 **Sterile Zero-Cookie Execution**: When you confirm an RFC 8058 One-Click unsubscribe, the extension fires an isolated HTTP POST with `credentials: 'omit'` (no cookies/tokens), `redirect: 'manual'` (no redirect tracking), and immediate response body stream cancellation.
5. 📴 **100% Local-First & Zero Telemetry**: Manifest V3 Content Security Policy strictly permits connections to `http://localhost:5001`. Zero third-party analytics or remote scripts.

---

## 🚀 Quickstart (Zero-Coder "Just Works")

Clone the repository and run:

```bash
./start.sh
```

`start.sh` automatically installs dependencies, builds the extension, runs tests, and launches the interactive popup preview in your browser.

*(Prerequisite: [Node.js](https://nodejs.org/) >= 20 installed).*

---

## 📺 Interactive Walkthrough

![Unsubscribe Shield Walkthrough](demo.gif)

<video src="demo.mp4" controls autoplay loop muted playsinline width="100%"></video>

> 📹 **High-Definition Recording**: [`demo.mp4`](demo.mp4) *(Playwright automated run, 420x600)*  
> To regenerate this recording at any time, run: `./scripts/record-demo.sh`

---

## 🧪 Testing & Invariant Verification

- **Vitest Unit Tests**: Verifies sterile executor parameters, byte preservation, and 10 MB size limits:
  ```bash
  npm run test:unit
  ```
- **Playwright E2E Tests**: Verifies popup rendering and confirmation modal flows:
  ```bash
  npm run test:e2e
  ```
- **Architectural Claims Audit**: Verifies CSP lock, zero-telemetry, and sterile header enforcement:
  ```bash
  npm run audit:claims
  ```

---

## 🛡️ Security & Privacy Guarantees

- **No Ambient Cookies**: Outbound requests strictly omit credentials.
- **No Redirect Tracking**: Requests enforce manual redirect handling to prevent cross-domain reconnaissance hop chains.
- **Byte-Exact MIME Ingestion**: Transmits raw byte Blobs rather than UTF-8 text, preventing corruption of 8-bit European/CJK characters.
- **Immediate Response Stream Termination**: Cancels response streams immediately after reading HTTP status.

---

## 📄 License & Disclosures

- [MIT License](LICENSE)
- [Third-Party Disclosures](NOTICE.md)
