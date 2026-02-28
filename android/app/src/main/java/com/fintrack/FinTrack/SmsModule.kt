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

        private val FINANCIAL_KEYWORDS = listOf(
            "bank", "credit", "debit", "transaction", "account", "spent",
            "payment", "transfer", "balance", "card", "upi", "atm", "paid",
            "credited", "debited", "withdrawn", "deposit", "purchase",
            "inr", "rs", "rupee", "₹", "refund", "cashback", "emi",
            "neft", "rtgs", "imps", "nach", "mandate"
        )

        private fun isFinancialSms(body: String): Boolean {
            val lower = body.lowercase()
            return FINANCIAL_KEYWORDS.any { lower.contains(it) }
        }
    }

    override fun getName(): String = "SmsModule"

    // ─── ContentObserver for real-time SMS detection ──────────────────────────
    private var smsObserver: ContentObserver? = null
    private var lastObservedId: Long = -1L

    @ReactMethod
    fun startSmsObserver() {
        if (smsObserver != null) {
            Log.d(TAG, "Observer already running")
            return
        }

        // Snapshot the current newest SMS ID so we don't re-fire old messages
        lastObservedId = getLatestSmsId()
        Log.d(TAG, "Starting SMS ContentObserver. Last known SMS id=$lastObservedId")

        val handler = Handler(Looper.getMainLooper())
        smsObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) {
                onChange(selfChange, null)
            }

            override fun onChange(selfChange: Boolean, uri: Uri?) {
                Log.d(TAG, "ContentObserver onChange fired")
                checkForNewSms()
            }
        }

        reactContext.contentResolver.registerContentObserver(
            Uri.parse(SMS_URI),
            true,
            smsObserver!!
        )
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
            val cursor: Cursor? = reactContext.contentResolver.query(
                Uri.parse(SMS_URI),
                arrayOf("_id"),
                null,
                null,
                "_id DESC LIMIT 1"
            )
            cursor?.use { c ->
                if (c.moveToFirst()) {
                    maxId = c.getLong(c.getColumnIndexOrThrow("_id"))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting latest SMS id", e)
        }
        return maxId
    }

    private fun checkForNewSms() {
        try {
            val cursor: Cursor? = reactContext.contentResolver.query(
                Uri.parse(SMS_URI),
                arrayOf("_id", "address", "body", "date"),
                if (lastObservedId > 0) "_id > $lastObservedId" else null,
                null,
                "_id DESC LIMIT 5"
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

                    if (id > lastObservedId) lastObservedId = id

                    if (isFinancialSms(body)) {
                        val sms = JSONObject().apply {
                            put("_id", id.toString())
                            put("address", c.getString(addressIdx))
                            put("body", body)
                            put("date", c.getLong(dateIdx))
                        }
                        newMessages.add(sms)
                        Log.d(TAG, "Financial SMS detected from ${c.getString(addressIdx)}")
                    }
                }
            }

            // Emit each new financial SMS to JS individually
            for (sms in newMessages) {
                emitSmsEvent(sms)
            }
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

    // ─── Read SMS inbox ───────────────────────────────────────────────────────
    // Industry-standard approach: filter by financial keywords NATIVELY inside
    // the ContentResolver cursor loop, so only relevant SMS messages cross the
    // React Native bridge. This allows scanning up to 10,000 messages with
    // minimal memory pressure and zero JS thread blocking.
    @ReactMethod
    fun getTransactionSms(maxCount: Int, minDate: Double, promise: Promise) {
        try {
            val uri = Uri.parse(SMS_URI)
            val projection = arrayOf("_id", "address", "body", "date")

            // Build WHERE clause: only apply date filter if a watermark is set
            val selectionParts = mutableListOf<String>()
            if (minDate > 0) {
                selectionParts.add("date >= ${minDate.toLong()}")
            }
            val selection = if (selectionParts.isEmpty()) null else selectionParts.joinToString(" AND ")

            // We query a large window (up to maxCount) to scan the full history,
            // but apply financial keyword filtering INSIDE the loop — only matching
            // rows are added to the result JSON Array sent across the bridge.
            val cursor: Cursor? = reactContext.contentResolver.query(
                uri,
                projection,
                selection,
                null,
                "date DESC LIMIT $maxCount"
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

                    // ✅ Filter natively — only financial SMS cross the bridge
                    if (!isFinancialSms(body)) continue

                    financialCount++
                    val sms = JSONObject()
                    sms.put("_id", c.getString(idIdx))
                    sms.put("address", c.getString(addressIdx))
                    sms.put("body", body)
                    sms.put("date", c.getLong(dateIdx))
                    result.put(sms)
                }
            }

            Log.d(TAG, "SMS scan complete: $scanned scanned → $financialCount financial (sent to JS)")
            promise.resolve(result.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS", e)
            promise.reject("SMS_READ_ERROR", e.message ?: "Unknown error reading SMS", e)
        }
    }

    // Required for DeviceEventEmitter listeners to work in RN
    @ReactMethod
    fun addListener(eventName: String) { /* no-op required by RN */ }

    @ReactMethod
    fun removeListeners(count: Double) { /* no-op required by RN */ }
}
