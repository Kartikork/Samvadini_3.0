# Certificate Pinning Setup Guide

## Overview

Certificate pinning prevents Man-in-the-Middle (MITM) attacks by ensuring the app only accepts connections from servers with specific, trusted certificates.

## Implementation (Already Configured)

The hyped project includes certificate pinning via:
- `android/app/src/main/java/com/friendsV/network/CertificatePinningModule.kt`
- `android/app/src/main/java/com/friendsV/network/OkHttpClientFactory.kt`
- `MainApplication.kt` - Pinning initialization

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

## Debug Mode

To disable pinning in debug builds:

```kotlin
if (BuildConfig.DEBUG) {
  return CertificatePinner.Builder().build()
}
```
