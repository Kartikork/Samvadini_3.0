package com.friendsV.network

import java.util.concurrent.atomic.AtomicBoolean

/**
 * Records when OkHttp certificate pinning has failed (e.g. server cert didn't match pins).
 * SecurityManager reads this to show MITM_DETECTED in the security modal.
 */
object CertificatePinningFailureHolder {
    private val failureRecorded = AtomicBoolean(false)

    fun recordFailure() {
        failureRecorded.set(true)
        android.util.Log.w("CertificatePinning", "Certificate pinning failure recorded (server cert did not match pins)")
    }

    fun hasFailure(): Boolean = failureRecorded.get()

    /** Call to reset after showing the warning (e.g. for testing). */
    fun clearFailure() {
        failureRecorded.set(false)
    }
}
