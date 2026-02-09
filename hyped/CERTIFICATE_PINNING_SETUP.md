# Certificate Pinning & MITM Prevention

## Overview

Certificate pinning prevents **Man-in-the-Middle (MITM) attacks** by ensuring the app only accepts HTTPS connections where the server certificate (or public key) matches a trusted pin. If an attacker intercepts traffic with their own certificate, the connection is rejected.

Additional hardening:
- **Network Security Config** disallows cleartext (HTTP) traffic except to localhost, so all production API traffic must use TLS.
- **Debug builds**: Pinning is disabled so you can use proxy tools (Charles, Fiddler, etc.).

## Implementation

| Component | Purpose |
|-----------|---------|
| `CertificatePinningModule.kt` | Defines SHA-256 pins for your domains; disabled in DEBUG. |
| `PinnedOkHttpClientFactory` (OkHttpClientFactory.kt) | Builds OkHttpClient with certificate pinning. |
| `MainApplication.kt` | Registers the pinned client with React Native via `OkHttpClientProvider.setOkHttpClientFactory()` so **all** fetch/WebSocket traffic uses pinning. |
| `res/xml/network_security_config.xml` | Blocks cleartext traffic; allows localhost for Metro/dev. |
| `AndroidManifest.xml` | Uses the network security config and `usesCleartextTraffic="false"`. |

## Getting Certificate Pins

```bash
# For your domain
openssl s_client -servername qasamvadini.aicte-india.org -connect qasamvadini.aicte-india.org:443 < /dev/null | \
openssl x509 -pubkey -noout | \
openssl pkey -pubin -outform der | \
openssl dgst -sha256 -binary | \
openssl enc -base64
```

## Configuration

Update `CertificatePinningModule.kt` with pins for your domains:

```kotlin
builder.add("qasamvadini.aicte-india.org", "sha256/YOUR_PIN_HERE")
builder.add("*.aicte-india.org", "sha256/YOUR_PIN_HERE")
```

## Backup Pins

For certificate rotation, add backup pins:

```kotlin
.add("qasamvadini.aicte-india.org", "sha256/PRIMARY_PIN")
.add("qasamvadini.aicte-india.org", "sha256/BACKUP_PIN")
```

## How MITM is prevented

1. **HTTPS only** – Network Security Config blocks cleartext; only TLS is used for API calls.
2. **Certificate pinning** – OkHttp (used by React Native for `fetch`, WebSocket, and image loading) validates the server certificate against hardcoded SHA-256 pins. A proxy or attacker certificate will not match and the request fails with an SSL error.
3. **SecurityManager** – Runtime checks (root, proxy, VPN, etc.) and the security modal complement pinning; `MITM_DETECTED` is used when other indicators suggest a risky environment. Actual MITM attempts are **blocked** by pinning rather than only detected.

## Certificate pinning failure → warning modal

When the server certificate **does not match** the pinned SHA-256 hashes (e.g. MITM proxy, wrong cert), OkHttp rejects the connection and the app records a pinning failure. The next security check then reports **MITM_DETECTED** with **certificatePinningFailure** in details, and the **SecurityModal** shows:

- **Title:** "Server Certificate Mismatch"
- **Message:** "The server's certificate did not match the app's security pins. Your connection may be intercepted. Do not enter sensitive data and use a trusted network."

So users get a clear warning in addition to the failed request.

## Testing the warning in a build

1. **Use a debug build** (pinning is disabled by default in DEBUG, but the modal and test API still work).
2. **Option A – Dev button (recommended)**  
   In `__DEV__`, a **"Test cert pin warning"** button appears at the bottom-right of the app. Tap it to simulate a pin failure and run a security check; the modal should appear immediately.
3. **Option B – From code**  
   Call `SecurityService.testCertificatePinningWarning()` from any screen (e.g. a temporary button in Settings). This calls `CertificatePinningModule.simulatePinningFailure()` (debug-only) then `performSecurityCheck()`.
4. **Option C – Real pin failure**  
   Build a **release** APK (or enable pinning in debug for this test), then use a proxy (Charles/Fiddler) with its own certificate to hit your API. The request will fail and the next security check (e.g. on resume or after 3 s) will show the same modal.

**Note:** `simulatePinningFailure()` is only available in debug builds; in release it rejects.

## Debug mode

Pinning is **automatically disabled** when `BuildConfig.DEBUG` is true (see `CertificatePinningModule.createCertificatePinner()`), so you can use Charles, Fiddler, or similar tools. Release builds always use pinning.
