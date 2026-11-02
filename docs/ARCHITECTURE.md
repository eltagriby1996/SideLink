# SideLink Architecture and Technical Overview

## 1. System Components

SideLink is composed of two primary subsystems:
1. **Windows Desktop Application (`SideLink.App` and class libraries)**: A modern WPF .NET 8 application structured using clean architecture and MVVM.
2. **Verification Gateway & API (`sidelink-web`)**: A Next.js 15+ App Router application deployed to Vercel, backed by a persistent database (PostgreSQL / Supabase / Neon).

```
+-----------------------------------------------------------------------------------+
|                            SideLink Desktop Client                               |
|                                                                                   |
|  +--------------------+   +---------------------+   +--------------------------+  |
|  |   SideLink.App    |   |   SideLink.Core    |   | SideLink.Infrastructure |  |
|  |    (WPF / MVVM)    |   |  (Domain Models &   |   |   (SQLite, DPAPI,        |  |
|  |                    |   |     Interfaces)     |   |    Diagnostics)          |  |
|  +--------------------+   +---------------------+   +--------------------------+  |
|             |                         ^                                           |
|             v                         |                                           |
|  +--------------------+   +---------------------+   +--------------------------+  |
|  |  SideLink.Device  |   |   SideLink.IPA     |   |   SideLink.Signing      |  |
|  | (Usbmuxd/Lockdown) |   | (Zip / Plist Parser)|   |  (CMS / CodeResources)   |  |
|  +--------------------+   +---------------------+   +--------------------------+  |
|             |                         |                          |                |
|             +------------+------------+--------------------------+                |
|                          v                                                        |
|             +-------------------------+   +--------------------------+            |
|             | SideLink.Installation  |   |    SideLink.Refresh     |            |
|             | (Staging & Proxy)       |   | (7-Day Expiration Loop)  |            |
|             +-------------------------+   +--------------------------+            |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                        SideLink.Verification                               |  |
|  |              (Link Unlock Client & JWT Signature Validator)                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTPS REST API & Browser Handshake
                                         v
+-----------------------------------------------------------------------------------+
|                        sidelink-web (Vercel Backend)                             |
|                                                                                   |
|  +-----------------------+  +------------------------+  +----------------------+  |
|  | /api/verification/..  |  |   /verify Web Page     |  |   lib/security       |  |
|  | (Sessions, Status,    |  | (1-Step Human Check &  |  | (HMAC-SHA256 Token   |  |
|  |  Authorize)           |  |  Compliant Sponsor)    |  |  Signing & Verifier) |  |
|  +-----------------------+  +------------------------+  +----------------------+  |
|             |                                                                     |
|             v                                                                     |
|  +-----------------------------------------------------------------------------+  |
|  |          lib/database: PostgreSQL / Supabase / Neon Session Store           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Windows iOS Communication Subsystem

### 2.1 Usbmux Protocol Implementation
- Apple Mobile Device Service (AMDS) exposes port 27015 on `127.0.0.1`.
- `SideLink.Device.UsbmuxdProtocol`:
  - 16-byte packet header: `[Length: uint32 LE, Version: 1, RequestType: 8, Tag: uint32]`.
  - Sends a `Listen` XML plist command.
  - Asynchronously receives `Attached` and `Detached` event notifications whenever an iPhone or iPad is connected or disconnected over USB.

### 2.2 Lockdown Service Query
- When a device is attached, `SideLink.Device.LockdownClient` requests a connection tunnel to port 62078 (Lockdown service on device).
- Queries `GetValue`:
  - `DeviceName`
  - `ProductType` (hardware model identifier, e.g. `iPhone15,2` -> "iPhone 14 Pro")
  - `ProductVersion` (iOS version)
  - `UniqueDeviceID` (UDID)
  - Detects if device is locked (`PasswordProtected`) or untrusted (`PairingDialogResponsePending`).

---

## 3. IPA Archive & Property List Handling

- `.ipa` packages are standard ZIP archives containing `Payload/<AppName>.app/`.
- `SideLink.IPA.IpaInspectorService`:
  - Enforces strict path traversal (Zip Slip) security checks, rejecting archives with entries containing `..` or absolute paths.
  - Implements `PlistParser`:
    - Handles standard Apple XML Plists.
    - Handles binary plists (`bplist00` magic header, object tables, reference tables, ASCII/Unicode strings, and dictionaries).
  - Implements `MobileProvisionParser`:
    - Decodes ASN.1 CMS signed messages to extract embedded XML provisioning profile.
    - Extracts `ExpirationDate`, `TeamIdentifier`, `TeamName`, and `Entitlements`.

---

## 4. Signing, Provisioning & 7-Day Refresh

### 4.1 Personal Development Certificate Lifecycle
- Free Apple IDs generate personal team provisioning profiles valid for 7 days.
- Maximum 3 active sideloaded apps per device.
- `SideLink.Refresh.RefreshService`:
  - Monitors expiration dates dynamically in local SQLite storage.
  - Categorizes applications: `Active` (> 3 days), `ExpiringSoon` (<= 3 days), and `Expired` (<= 0 days).
  - Triggers re-signing with original IPA archive and re-installs to device.

---

## 5. Security & Credential Isolation

- Apple ID passwords are never stored in plaintext or ordinary config files.
- Stored exclusively using Windows Data Protection API (DPAPI) with `DataProtectionScope.CurrentUser`.
- All operational logs pass through `SensitiveDataRedactor` before being displayed or exported, masking JWT tokens, passwords, and private keys.
