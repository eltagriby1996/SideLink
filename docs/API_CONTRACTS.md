# SideLink Link Unlock — Backend API Contracts

The Link Unlock backend is deployed as a serverless application on Vercel (`sidelink-web`). It provides REST endpoints for session creation, real-time polling, human completion verification, and cryptographic authorization token issuance.

---

## 1. Health Check
`GET /api/health`

Confirms backend service health and availability.

### Response `200 OK`
```json
{
  "status": "ok",
  "service": "sidelink-verification-api",
  "version": "1.0.0",
  "timestamp": "2026-11-02T08:00:00.000Z"
}
```

---

## 2. Create Verification Session
`POST /api/verification/sessions`

Invoked by the SideLink Windows desktop client on fresh launch.

### Request Body (Optional Metadata)
```json
{
  "clientVersion": "1.0.0",
  "platform": "windows-x64"
}
```

### Response `201 Created`
```json
{
  "sessionId": "4f553f14-2bd8-490b-ba62-ec72f7797746",
  "verificationUrl": "https://www.sidelinktool.me/verify?session=4f553f14-2bd8-490b-ba62-ec72f7797746&nonce=9a7c3f...",
  "expiresAt": "2026-11-02T08:10:00.000Z"
}
```

---

## 3. Check Session Status
`GET /api/verification/sessions/{sessionId}/status`

Polled by the desktop client every 2 seconds while the user completes the web step.

### URL Parameters
- `sessionId` (string, UUID): The session identifier.

### Response `200 OK`
```json
{
  "sessionId": "4f553f14-2bd8-490b-ba62-ec72f7797746",
  "status": "pending",
  "expiresAt": "2026-11-02T08:10:00.000Z"
}
```
Possible values for `status`:
- `pending`: Waiting for verification.
- `verified`: Verification completed.
- `expired`: Session has exceeded its validity window (10 minutes).
- `failed`: Verification failed.

---

## 4. Complete Verification
`POST /api/verification/sessions/{sessionId}/complete`

Invoked by the web page (`/verify`) upon the user completing the single verification action.

### Request Body
```json
{
  "nonce": "9a7c3f104d55b08e23f9901456a0bc12"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "sessionId": "4f553f14-2bd8-490b-ba62-ec72f7797746",
  "status": "verified",
  "message": "Verification complete. You may now return to SideLink."
}
```

### Error Responses
- `400 Bad Request`: `{ "error": "Invalid verification proof" }`
- `404 Not Found`: `{ "error": "Session not found" }`
- `410 Gone`: `{ "error": "Session has expired" }`

---

## 5. Authorize Session & Issue Token
`POST /api/verification/sessions/{sessionId}/authorize`

Invoked by the SideLink desktop client once polling detects `verified`. Generates an HMAC-SHA256 cryptographically signed JSON Web Token (JWT).

### Request Body
```json
{
  "sessionId": "4f553f14-2bd8-490b-ba62-ec72f7797746"
}
```

### Response `200 OK`
```json
{
  "sessionId": "4f553f14-2bd8-490b-ba62-ec72f7797746",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0ZjU1M2YxNC0yYmQ4LTQ5MGItYmE2Mi1lYzcyZjc3OTc3NDYiLCJwdXJwb3NlIjoiYml0bG9hZGVyLXNlc3Npb24tdW5sb2NrIiwiaWF0IjoxNzMwNTMwMjAwLCJpc3MiOiJiaXRsb2FkZXItdmVyaWZpY2F0aW9uIiwiYXVkIjoiYml0bG9hZGVyLWNsaWVudCIsInN1YiI6IjRmNTUzZjE0LTJiZDgtNDkwYi1iYTYyLWVjNzJmNzc5Nzc0NiIsImV4cCI6MTczMDUzMDUwMH0.signature",
  "expiresAt": "2026-11-02T08:15:00.000Z",
  "tokenType": "Bearer"
}
```

### Token Claims
| Claim | Type | Description |
|---|---|---|
| `iss` | String | Must match `sidelink-verification` |
| `aud` | String | Must match `sidelink-client` |
| `sub` | String | Session ID matching the active launch session |
| `sessionId` | String | Session ID binding |
| `iat` | Integer | Epoch timestamp when token was created |
| `exp` | Integer | Epoch timestamp when token expires (5 min from issue) |
