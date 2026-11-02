# SideLink — Windows iOS IPA Sideloading & Refresh Manager

[![.NET 8 Windows](https://img.shields.io/badge/.NET-8.0--windows-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1--AppRouter-000000?logo=next.js)](https://nextjs.org/)
[![Vercel Compatible](https://img.shields.io/badge/Deployment-Vercel-000000?logo=vercel)](https://vercel.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-12%20Passed-10B981)](#-automated-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**SideLink** is a high-performance Windows desktop application and serverless web system for installing, managing, signing, and refreshing personal iOS IPA applications on user-owned iPhones and iPads.

Equipped with a secure, server-verified **Link Unlock** system, SideLink authorizes each application launch via a single-step human verification gateway hosted on **Vercel** with persistent PostgreSQL session storage.

---

## 🌟 Key Capabilities

- **Direct Usbmux Device Detection**: Pure asynchronous TCP listener on `127.0.0.1:27015` communicating directly with Apple Mobile Device Service (`AppleMobileDeviceService.exe`). Reads device model, iOS version, UDID, and trust/passcode states in real time.
- **Safe IPA Archive Inspection**: Built-in Apple XML and Binary Property List (`bplist00`) parsers. Extracts bundle identifier, display name, version, build number, and app icons with strict path-traversal (Zip Slip) security guards.
- **Provisioning Profile Inspection**: Decodes ASN.1 CMS signed `embedded.mobileprovision` envelopes to extract team identifiers, expiration timestamps, and device entitlements.
- **7-Day Refresh Lifecycle**: Tracks personal developer certificates down to the hour, providing timely expiration alerts and automated re-signing workflows.
- **Windows DPAPI Credential Isolation**: Apple ID passwords are encrypted using the Windows Data Protection API (`ProtectedData`), ensuring secrets are never stored in plaintext or logged.
- **Link Unlock Launch Gate**: Full modal launch gate preventing access to dashboard until single-use session verification is confirmed and cryptographically validated via HMAC-SHA256 JWT tokens.

---

## 📁 Repository Structure

```
SideLink/
├── SideLink.sln                         # Visual Studio / .NET Solution
├── build-installer.ps1                   # Automated build and packaging script
├── installer/
│   └── SideLinkSetup.iss                # Inno Setup Windows Installer script
├── dist/                                 # Published binaries and distributions
├── docs/                                 # Technical documentation
│   ├── API_CONTRACTS.md                  # Verification REST API schema
│   ├── ARCHITECTURE.md                   # System component architecture
│   ├── DEPLOYMENT_GUIDE.md               # Vercel & Supabase/Neon setup
│   ├── SECURITY_AND_PRIVACY.md           # Security model & threat analysis
│   ├── TROUBLESHOOTING.md                # Diagnostic resolution steps
│   └── DEPENDENCIES_AND_LICENSES.md      # Dependency inventory
├── src/                                  # Windows Desktop Modules
│   ├── SideLink.App/                    # WPF Application (MVVM, Dark Theme)
│   ├── SideLink.Core/                   # Domain Models & Service Interfaces
│   ├── SideLink.Device/                 # Usbmuxd & Lockdown TCP Client
│   ├── SideLink.IPA/                    # Zip, Binary Plist, & MobileProvision
│   ├── SideLink.Signing/                # CodeResources Manifest & Signing
│   ├── SideLink.Installation/           # Installation Proxy & Staging
│   ├── SideLink.Refresh/                # 7-Day Expiration Tracking & Refresh
│   ├── SideLink.Verification/           # Link Unlock Client & JWT Validator
│   └── SideLink.Infrastructure/         # SQLite Repository & DPAPI Store
├── tests/
│   └── SideLink.Tests/                  # xUnit Automated Test Suite
└── sidelink-web/                        # Next.js 15+ Verification Web & API
    ├── app/
    │   ├── api/health/                   # Health Check Endpoint
    │   ├── api/verification/sessions/   # Session Creation & Polling Routes
    │   ├── verify/                       # Verification Gateway Page
    │   ├── page.tsx                      # Product Landing & Security Info
    │   └── globals.css                   # Tailwind Responsive Dark Theme
    ├── lib/database/                     # PostgreSQL / SQLite Session Store
    ├── lib/security/                     # JWT Cryptographic Signing Service
    ├── database/schema.sql               # PostgreSQL Database Migrations
    └── tests/verification.test.mjs       # Backend Integration Test Suite
```

---

## 🚀 Quick Start & Development Setup

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (64-bit x64).
- **.NET SDK**: .NET 8 or .NET 9 SDK ([download](https://dotnet.microsoft.com/download)).
- **Node.js**: Node.js 18+ or 22 LTS ([download](https://nodejs.org/)).
- **Apple Drivers**: Apple Mobile Device Support (installed automatically with iTunes 64-bit).

### 1. Build and Run the Verification Web Backend
```bash
cd sidelink-web
npm install
npm run dev
```
The verification web server will start at `http://localhost:3000`.

### 2. Build the Desktop Client
In the root directory:
```bash
dotnet restore SideLink.sln
dotnet build SideLink.sln -c Release
```

### 3. Run Automated Tests
```bash
# Run all .NET unit and integration tests
dotnet test SideLink.sln

# Run backend verification and security tests
cd sidelink-web
npm test
```

### 4. Launch SideLink
```bash
dotnet run --project src\SideLink.App\SideLink.App.csproj
```

---

## 🌐 Deploying the Verification Gateway to Vercel

The web verification backend is fully optimized for **Vercel**:
1. Fork or push this repository to GitHub.
2. Import the `sidelink-web/` project in the [Vercel Dashboard](https://vercel.com/new).
3. Set your environment variables in Vercel:
   - `VERIFICATION_BASE_URL`: `https://your-sidelink.vercel.app`
   - `DATABASE_URL`: Your Supabase or Neon PostgreSQL connection URI
   - `TOKEN_SIGNING_PRIVATE_KEY`: A secure 32+ byte secret key
4. Deploy! Your verification gateway and APIs are instantly live.

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed database setup instructions.

---

## 📦 Packaging & Distributable Installer

To create a release build and portable distribution archive:
```powershell
.\build-installer.ps1
```
This generates:
- Standalone binaries in `dist\SideLink\`
- Compressed portable distribution: `dist\SideLink-v1.0.0-win-x64.zip`
- Setup executable installer (if Inno Setup is installed): `dist\Installer\SideLink-v1.0.0-Setup.exe`

---

## 🔒 Security & Privacy Model

- **No Secrets Transmitted**: Apple ID credentials are never transmitted over the internet to SideLink servers.
- **In-Memory Launch Gating**: Verification authorization is strictly ephemeral. Closing the application clears the authorization state from RAM.
- **Cryptographic Token Binding**: All authorization tokens are cryptographically signed and bound to the specific `sessionId`.
- **Sensitive Data Redaction**: Log files and diagnostic export reports automatically mask passwords, bearer tokens, and private keys.

---

## 📋 Release Checklist & Technical Status

| Feature | Status | Verification Details |
|---|---|---|
| **USB Device Detection** | Verified | AMDS usbmux protocol over TCP `127.0.0.1:27015` |
| **Lockdown & Trust Query** | Verified | Parses device properties and passcode/pairing states |
| **IPA Inspection** | Verified | Safe archive unpacker with Zip Slip traversal protection |
| **Binary Plist (`bplist00`)** | Verified | Full binary parser supporting object tables & strings |
| **MobileProvision Parsing** | Verified | ASN.1 CMS parser extracting team & expiration timestamps |
| **7-Day Refresh Monitoring** | Verified | SQLite persistence, automated thresholds, refresh workflow |
| **Link Unlock System** | Verified | 1-step web gateway + cryptographic JWT authorization |
| **Vercel Compatibility** | Verified | Next.js 15 App Router with full static & serverless routes |
| **Automated Tests** | Verified | 12 tests passing across .NET 8 and Node.js test runners |

---

## ⚖️ License
Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
