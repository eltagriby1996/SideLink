# Security Model and Privacy Notice

## 1. Threat Model and Principles

SideLink follows strict secure software development principles:
- **Zero Cloud Credential Storage**: Apple ID credentials and passwords are never transmitted to the Link Unlock backend, third-party analytics, or remote servers.
- **Ephemeral Process Authorization**: The Link Unlock verification gate is strictly held in process memory (`RAM`). Closing the application immediately clears the verification state. No persistent local flag or bypass file is written to disk.
- **Cryptographic Token Binding**: The backend issues HMAC-SHA256 signed JWT tokens containing the specific `sessionId` claim. Tokens are valid for a short window (5 minutes) and cannot be reused for different sessions.
- **Windows DPAPI Storage**: Local credentials stored on Windows use `ProtectedData.Protect` bound to the current Windows user profile with custom salt entropy.
- **Sensitive Data Redaction**: Real-time log streams and exported diagnostic reports automatically redact JWT tokens, bearer credentials, and passwords.
- **Zip Slip Defense**: Archive extraction during IPA inspection and signing enforces canonical path validation to prevent malicious relative path directory traversals (`../../`).

---

## 2. Link Unlock Security Flow

```
1. App Startup (Memory Locked)
   │
   ▼
2. POST /api/verification/sessions (Server generates session UUID & challenge nonce)
   │
   ▼
3. Desktop opens default browser to /verify?session=...&nonce=...
   │
   ▼
4. User completes 1-step human interaction in browser
   │
   ▼
5. Browser posts completion proof to /api/verification/sessions/{id}/complete
   │
   ▼
6. Server validates proof atomically and marks session verified
   │
   ▼
7. Desktop polling detects verified status and requests authorization
   │
   ▼
8. Server signs JWT token (HMAC-SHA256) bound to sessionId
   │
   ▼
9. Desktop verifies JWT signature, issuer, audience, and session claim
   │
   ▼
10. Application Unlocks (In-Memory Only)
```

---

## 3. Advertising Compliance Notice

When sponsored content or advertising is integrated into the `/verify` web gateway:
- **No Forced Clicks**: Users are never required to click advertisements or complete promotional offers to verify their session.
- **Distinct Visual Styling**: Verification controls ("Complete Verification" button) are clearly distinct from any promotional or sponsorship content.
- **Independent Completion**: Verification completion is entirely decoupled from whether external ad scripts or network banners successfully load.
- **No Misleading Redirects**: The verification button triggers server-side completion without deceptive redirects or fraudulent traffic generation.

---

## 4. Privacy Notice

- **Information Collected by Backend**: Temporary session identifiers, expiration timestamps, and client IP addresses for rate limiting and abuse prevention.
- **Retention**: Verification sessions are purged from the database after expiration (30-minute retention cycle).
- **Apple Data**: SideLink communicates directly between your local PC and your connected iPhone over USB. No telemetry or IPA binaries are uploaded to the web backend.
