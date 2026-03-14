package com.fintrack.FinTrack

import android.database.ContentObserver
import android.database.Cursor
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SmsModule"
        private const val SMS_RECEIVED_EVENT = "SmsReceived"
        private const val SMS_URI = "content://sms/inbox"

        // ─── Layer 1: Must contain at least one TRANSACTION SIGNAL keyword ────
        private val TRANSACTION_SIGNALS = listOf(
            "debited", "credited", "withdrawn", "deducted",
            "upi ref", "upi txn", "neft ref", "imps ref", "rtgs ref",
            "a/c no", "a/c*", "xxxx", "acct", "account no",
            "transaction id", "txn id", "ref no", "ref:",
            "nach debit", "nach credit", "ecs debit",
            "sent rs", "sent inr", "paid rs", "paid inr",
            "received rs", "received inr",
            "available bal", "avl bal", "avl. bal", "available balance",
            "folio", "nav:", "units allotted", "sip of rs",
            "emi deducted", "emi paid",
            "balance is"
        )

        // ─── Layer 2: Spam/promo exclusion ────────────────────────────────────
        private val SPAM_EXCLUSION_SIGNALS = listOf(
            "get your", "approved loan", "pre-approved", "pre approved",
            "offer valid", "use code", "coupon code", "promo code", "discount code",
            "click here", "click to", "tap here", "download app",
            "expires today", "expires soon", "limited time",
            "recharge now", "recharge with", "pack expired", "pack has expired",
            "data consumed", "data balance", "gb data", "gb at rs",
            "unlimited calls", "data/day",
            "credit limit", "credit card offer", "card offer",
            "loan limit", "loan offer", "emi offer",
            "processing fee", "save flat", "save rs",
            "apply now", "apply for",
            "get upto", "get up to", "get rs",
            "cashback offer", "win rs", "earn rs",
            "kyc", "link your",
            "new feature", "update available",
            "fb.fbe", "bit.ly", "tiny.cc", "t.ly",
            "i.airtel.in", "jio.com/offer"
        )

        private fun isFinancialSms(body: String, sender: String? = null): Boolean {
            val lower = body.lowercase()
            val isAlphanumericSender = sender != null && !sender.matches(Regex("^[+0-9]+$"))

            if (SPAM_EXCLUSION_SIGNALS.any { lower.contains(it) }) {
                Log.d(TAG, "SMS excluded by spam signal from: $sender")
                return false
            }

            if (TRANSACTION_SIGNALS.any { lower.contains(it) }) return true

            if (isAlphanumericSender) {
                val hasAmount = Regex("""(?:rs\.?|inr|₹)\s*[\d,]+""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
                val hasRef = Regex("""ref\s*(?:no|#|:)?\s*\d{6,}""", RegexOption.IGNORE_CASE).containsMatchIn(body)
                if (hasAmount && hasRef) return true
            }

            return false
        }

        // ─── BUG FIX: 15 months in milliseconds for first-install floor ───────
        // This is the JS-side constant mirrored here for logging only.
        // The actual floor is passed via minDate from JS (SMSTransactionUtil.ts).
        private const val FIFTEEN_MONTHS_MS = 15L * 30 * 24 * 60 * 60 * 1000
    }

    override fun getName(): String = "SmsModule"

    private var smsObserver: ContentObserver? = null
    private var lastObservedId: Long = -1L

    @ReactMethod
    fun startSmsObserver() {
        if (smsObserver != null) {
            Log.d(TAG, "Observer already running")
            return
        }

        lastObservedId = getLatestSmsId()
        Log.d(TAG, "Starting SMS ContentObserver. Last known SMS id=$lastObservedId")

        val handler = Handler(Looper.getMainLooper())
        smsObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) { onChange(selfChange, null) }
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                Log.d(TAG, "ContentObserver onChange fired")
                checkForNewSms()
            }
        }

        reactContext.contentResolver.registerContentObserver(Uri.parse(SMS_URI), true, smsObserver!!)
        Log.d(TAG, "SMS ContentObserver registered")
    }

    @ReactMethod
    fun stopSmsObserver() {
        smsObserver?.let {
            reactContext.contentResolver.unregisterContentObserver(it)
            smsObserver = null
            Log.d(TAG, "SMS ContentObserver unregistered")
        }
    }

    private fun getLatestSmsId(): Long {
        var maxId = -1L
        try {
            val cursor = reactContext.contentResolver.query(
                Uri.parse(SMS_URI), arrayOf("_id"), null, null, "_id DESC LIMIT 1"
            )
            cursor?.use { if (it.moveToFirst()) maxId = it.getLong(0) }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting latest SMS id", e)
        }
        return maxId
    }

    private fun checkForNewSms() {
        try {
            val cursor = reactContext.contentResolver.query(
                Uri.parse(SMS_URI),
                arrayOf("_id", "address", "body", "date"),
                if (lastObservedId > 0) "_id > $lastObservedId" else null,
                null,
                "_id ASC"
            )

            val newMessages = mutableListOf<JSONObject>()
            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                val addressIdx = c.getColumnIndexOrThrow("address")
                val bodyIdx = c.getColumnIndexOrThrow("body")
                val dateIdx = c.getColumnIndexOrThrow("date")

                while (c.moveToNext()) {
                    val id = c.getLong(idIdx)
                    val body = c.getString(bodyIdx) ?: continue
                    val address = c.getString(addressIdx)
                    if (id > lastObservedId) lastObservedId = id
                    if (isFinancialSms(body, address)) {
                        newMessages.add(JSONObject().apply {
                            put("_id", id.toString())
                            put("address", address)
                            put("body", body)
                            put("date", c.getLong(dateIdx))
                        })
                        Log.d(TAG, "Financial SMS detected from $address")
                    }
                }
            }

            for (sms in newMessages) emitSmsEvent(sms)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking for new SMS", e)
        }
    }

    private fun emitSmsEvent(sms: JSONObject) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(SMS_RECEIVED_EVENT, sms.toString())
            Log.d(TAG, "Emitted SmsReceived event for: ${sms.optString("address")}")
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting SMS event", e)
        }
    }

    // ─── THE MAIN FIX: date DESC without LIMIT ────────────────────────────────
    // ROOT CAUSE OF THE BUG:
    // Old code used "date DESC LIMIT $maxCount" where maxCount=10000.
    // On a phone with >10,000 SMS, this only returns the 10,000 NEWEST messages.
    // Everything older than the 10,000th newest SMS was silently excluded.
    // With a typical Indian phone receiving ~30 SMS/day, 10,000 SMS = ~333 days,
    // meaning anything from before March 2025 was invisible on a March 2026 scan.
    //
    // THE FIX:
    // Remove the LIMIT entirely. The date filter (minDate from JS watermark) is
    // the correct boundary. The JS side now always passes a minDate floor of
    // 15 months ago on first install, so the query is always bounded.
    // For incremental scans (watermark > 0), minDate is set to last processed +1ms.
    @ReactMethod
    fun getTransactionSms(maxCount: Int, minDate: Double, promise: Promise) {
        try {
            val uri = Uri.parse(SMS_URI)
            val projection = arrayOf("_id", "address", "body", "date")

            // Build WHERE clause.
            // minDate is ALWAYS set by JS now (either watermark+1 or 15-month floor).
            // We never do an unbounded scan anymore.
            val selection = if (minDate > 0) {
                "date >= ${minDate.toLong()}"
            } else {
                // Defensive fallback: if JS somehow passes 0, use 15-month floor
                // to prevent scanning the entire SMS history of the device.
                val floor = System.currentTimeMillis() - FIFTEEN_MONTHS_MS
                Log.w(TAG, "minDate=0 received, applying 15-month floor: $floor")
                "date >= $floor"
            }

            // ✅ No LIMIT here — the date filter is the correct bound.
            // All SMS after minDate will be scanned (keyword filter happens in the loop).
            val cursor: Cursor? = reactContext.contentResolver.query(
                uri, projection, selection, null, "date DESC"
            )

            val result = JSONArray()
            var scanned = 0
            var financialCount = 0

            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                val addressIdx = c.getColumnIndexOrThrow("address")
                val bodyIdx = c.getColumnIndexOrThrow("body")
                val dateIdx = c.getColumnIndexOrThrow("date")

                while (c.moveToNext()) {
                    scanned++
                    val body = c.getString(bodyIdx) ?: continue
                    val address = c.getString(addressIdx)

                    if (!isFinancialSms(body, address)) continue

                    financialCount++
                    val sms = JSONObject()
                    sms.put("_id", c.getString(idIdx))
                    sms.put("address", address)
                    sms.put("body", body)
                    sms.put("date", c.getLong(dateIdx))
                    result.put(sms)
                }
            }

            Log.d(TAG, "SMS scan: $scanned scanned → $financialCount financial passed filter (minDate=$minDate)")
            promise.resolve(result.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS", e)
            promise.reject("SMS_READ_ERROR", e.message ?: "Unknown error reading SMS", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) { /* no-op required by RN */ }

    @ReactMethod
    fun removeListeners(count: Double) { /* no-op required by RN */ }
}