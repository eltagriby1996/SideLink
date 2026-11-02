# Dependency and License Inventory

## 1. Windows Desktop Application (`BitLoader.sln`)

Target Platform: Windows 10 & 11 (x64)  
Framework: .NET 8 LTS (`net8.0`, `net8.0-windows`)

| Package / Library | Version | License | Responsibility |
|---|---|---|---|
| `CommunityToolkit.Mvvm` | 8.3.2 | MIT | MVVM architecture, observable properties, relay commands |
| `Microsoft.Extensions.DependencyInjection` | 8.0.1 | MIT | Dependency injection container |
| `Microsoft.Extensions.Hosting` | 8.0.1 | MIT | Application lifecycle and host builder |
| `Microsoft.Extensions.Logging` | 8.0.1 | MIT | Structured logging framework |
| `Microsoft.Data.Sqlite` | 8.0.10 | MIT | Local SQLite database for application metadata |
| `System.IdentityModel.Tokens.Jwt` | 8.2.1 | MIT | JWT token signature validation for Link Unlock |
| `System.Security.Cryptography.Pkcs` | 8.0.0 | MIT | ASN.1 CMS parsing for `.mobileprovision` profiles |
| `System.Security.Cryptography.ProtectedData` | 8.0.0 | MIT | Windows DPAPI encryption for Apple credentials |
| `System.ServiceProcess.ServiceController` | 8.0.0 | MIT | Windows Service monitoring for Apple Mobile Device Service |
| `FluentAssertions` | 6.12.1 | Apache-2.0 | Automated test assertions |
| `xunit` | 2.9.2 | Apache-2.0 | Automated unit and integration test framework |

---

## 2. Web & Verification Backend (`bitloader-web`)

Runtime: Node.js 22 LTS  
Framework: Next.js 15.1 (App Router)

| Package | Version | License | Responsibility |
|---|---|---|---|
| `next` | 15.1.0 | MIT | Serverless React framework and API routing |
| `react` / `react-dom` | 19.0.0 | MIT | Web user interface |
| `jose` | 5.9.6 | MIT | Edge-compatible cryptographic JWT signing |
| `lucide-react` | 0.468.0 | ISC / MIT | Modern UI iconography |
| `uuid` | 11.0.3 | MIT | Cryptographically random UUID generation |
| `tailwindcss` | 3.4.16 | MIT | Utility-first responsive CSS styling |
