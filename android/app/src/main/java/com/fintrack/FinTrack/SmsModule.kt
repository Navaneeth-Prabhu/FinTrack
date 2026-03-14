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

        // ─── Layer 1: TRANSACTION SIGNAL keywords ────────────────────────────
        // A message must contain at least one of these to be considered financial.
        //
        // Intentionally excluded (too broad / false-positive prone):
        //   "dr" / "cr"  → match "Dr." in names/address lines, "Cr." in unrelated text.
        //                   Real debit/credit is covered by "debited" / "credited".
        //   "xx"         → matches any word containing 'xx'. Use "xxxx" for masked accounts.
        //   "rs"/"inr"   → alone these match promo SMS ("Get 2GB at Rs.33", "recharge for Rs.299").
        //                   Covered by structured fallback (amount + verb + context).
        //   "credit"/"card"/"payment" → alone match loan-offer, recharge, promo SMS.
        private val TRANSACTION_SIGNALS = listOf(
            "debited", "credited", "withdrawn", "spent", "paid", "received", "deposited", "deducted",
            "upi ref", "upi txn", "upi payment", "via upi",
            "neft ref", "imps ref", "rtgs ref",
            "utr", "rrn", "txn of", "transaction of",
            "transaction id", "txn id", "ref no", "ref:", "txn",
            // Account masking and identification patterns
            "a/c no", "a/c*", "a/c *", "xxxx", "xx", "acct", "account no", "ac no", "acc no", "a/c",
            "card ending", "card no", "ending with",
            "folio", "nav:", "units allotted", "is debited", "is credited",
            "available bal", "avl bal", "available balance", "bal:"
        )

        // ─── Layer 2: SPAM / PROMO EXCLUSION signals ─────────────────────────
        // If any of these phrases appear, the SMS is rejected as spam/promo,
        // even when a transaction signal is also present.
        //
        // IMPORTANT — the following were intentionally REMOVED from this list
        // because they appear in VALID financial SMS:
        //
        //   "kyc"                  → HDFC/SBI footer: "For KYC, visit branch. -HDFCBK"
        //                           Also: "KYC status: Active." in balance SMS
        //   "link your"            → "Link your account to receive UPI payments"
        //   "collect request"      → Valid UPI P2P incoming credit ("UPI collect from XXX")
        //   "upi collect"          → Valid UPI credit received SMS from banks
        //   "mandate registration" → SIP NACH setup confirmation from AMCs/banks
        //   "autopay mandate"      → Recurring payment / SIP ECS confirmation
        //   "e-mandate"            → NACH/ECS mandate debit confirmation SMS
        //   "save rs" / "save flat"→ Valid cashback credited SMS ("Rs.50 cashback saved")
        //
        // Be precise: use the most specific phrase possible to avoid false rejections.
        private val SPAM_EXCLUSION_SIGNALS = listOf(
            // Loan promotions (very specific, won't match real loan SMS)
            "get your approved", "approved loan limit", "pre-approved loan", "pre approved loan",
            // Generic promo indicators
            "offer valid", "use code", "coupon code", "promo code", "discount code",
            "click here", "click to", "tap here", "download app", "download now",
            "expires today", "expires soon", "limited time offer",
            // Telecom recharge promotions
            "recharge now", "recharge with", "pack expired", "pack has expired",
            "% data consumed", "data balance low", "gb data", "gb at rs",
            "unlimited calls", "data/day",
            // Credit card/loan offers (specific phrases that won't match real transactions)
            "credit limit upto", "credit limit up to", "credit card offer",
            "loan limit of rs", "loan offer", "emi offer",
            // Marketing calls to action
            "processing fee",
            "apply now for", "apply for loan",
            // Telecom operator reminders
            "reminder: airtel", "reminder: jio", "reminder: vi ", "reminder: bsnl",
            // Gambling/contest/reward spam
            "get upto", "get up to rs", "earn rs",
            "cashback offer", "win rs",
            // App update spam
            "new feature", "update available",
            // URL shorteners in promo SMS
            "fb.fbe", "bit.ly", "tiny.cc", "t.ly",
            "i.airtel.in", "jio.com/offer"
        )

        /**
         * 2-layer financial SMS detection (industry standard - CRED/Axio/Walnut pattern):
         *   Layer 1 – must contain a real transaction signal (debited, credited, UPI ref, etc.)
         *   Layer 2 – must NOT contain spam/promo exclusion phrases
         *
         * Structured fallback for uncommon but valid transaction formats:
         *   amount (Rs./INR/₹) + action verb (debited/sent/paid/etc.) + financial context
         *   (UPI/account/card/ref) = financial SMS even without a specific keyword match.
         */
        private fun isFinancialSms(body: String, sender: String? = null): Boolean {
            val lower = body.lowercase()

            val isAlphanumericSender = sender != null && !sender.matches(Regex("^[+0-9]+$"))

            // Layer 2 check first (cheap fast-path) — reject known spam patterns
            if (SPAM_EXCLUSION_SIGNALS.any { lower.contains(it) }) {
                Log.d(TAG, "SMS excluded by spam signal from: $sender")
                return false
            }

            // Layer 1: direct transaction keyword match
            if (TRANSACTION_SIGNALS.any { lower.contains(it) }) {
                return true
            }

            // Structured fallback for valid but uncommon transaction formats.
            // Requires all 3 signals to avoid false positives.
            val hasAmount = Regex("""(?:rs\.?|inr|\u20B9)\s*[x*]*\s*[\d,]+(?:\.\d{1,2})?""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
            val hasActionVerb = Regex("""\b(?:debited|credited|withdrawn|deducted|spent|paid|sent|received|transfer(?:red)?|purchased|used|dr\.|cr\.)\b""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
            val hasFinancialContext = Regex("""\b(?:a\/c|account|acct|card|upi|vpa|utr|rrn|imps|neft|rtgs|ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?)\b""", RegexOption.IGNORE_CASE).containsMatchIn(lower)

            if (hasAmount && hasActionVerb && hasFinancialContext) {
                return true
            }

            // Sender-aware fallback: business/alphanumeric senders with amount + financial context.
            if (isAlphanumericSender && hasAmount && hasFinancialContext) {
                return true
            }

            return false
        }

        private const val MAX_SCAN_ROWS = MAX_SCAN_ROWS_VAL
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
            val cursor = reactContext.contentResolver.query(
                Uri.parse(SMS_URI),
                arrayOf("_id"),
                null,
                null,
                "_id DESC LIMIT 1"
            )
            cursor?.use { if (it.moveToFirst()) maxId = it.getLong(0) }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting latest SMS id", e)
        }
        return maxId
    }

    private fun checkForNewSms() {
        try {
            val uri = Uri.parse(SMS_URI)
            val cursor = reactContext.contentResolver.query(
                uri,
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
                        val sms = JSONObject().apply {
                            put("_id", id.toString())
                            put("address", address)
                            put("body", body)
                            put("date", c.getLong(dateIdx))
                        }
                        newMessages.add(sms)
                        Log.d(TAG, "Financial SMS detected from $address")
                    }
                }
            }

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

    /**
     * Read financial SMS from the inbox, filtered by date range.
     *
     * Industry-standard approach for ContentResolver pagination:
     *   - Do NOT use "LIMIT N" in sortOrder — it is silently ignored by MIUI/EMUI/Samsung
     *     ContentProvider implementations, causing inconsistent behaviour across devices.
     *   - Instead: issue one unbounded query sorted newest-first, iterate rows applying
     *     the isFinancialSms() filter, and stop at two limits:
     *       (a) MAX_SCAN_ROWS   — hard cap on total rows scanned (protects 50k+ SMS devices)
     *       (b) maxCount        — caps financial SMS returned per batch
     *
     * The JS layer (collectFinancialSmsBatches) handles window-based pagination by:
     *   - Passing minDate to skip already-processed SMS
     *   - Passing maxDate (the oldest date in the previous batch) to fetch the next page
     * This guarantees that no messages are ever permanently skipped.
     */
    @ReactMethod
    fun getTransactionSms(maxCount: Int, minDate: Double, maxDate: Double, promise: Promise) {
        try {
            val uri = Uri.parse(SMS_URI)
            val projection = arrayOf("_id", "address", "body", "date")

            val selectionParts = mutableListOf<String>()
            val selectionArgs = mutableListOf<String>()
            if (minDate > 0) {
                selectionParts.add("date >= ?")
                selectionArgs.add(minDate.toLong().toString())
            }

            // ALWAYS cap the scan at now + buffer (10 mins) to avoid being stalled by
            // common spam messages with fake future timestamps that sit at the top of 'date DESC'.
            val nowBuffer = System.currentTimeMillis() + 600000L // 10 mins buffer
            val effectiveMaxDate = if (maxDate > 0) Math.min(maxDate.toLong(), nowBuffer) else nowBuffer

            // Pagination Safety: Use <= for the boundary. JS layer handles deduplication via _id.
            // This ensures messages with identical timestamps are not skipped.
            selectionParts.add("date <= ?")
            selectionArgs.add(effectiveMaxDate.toString())

            val selection = if (selectionParts.isEmpty()) null else selectionParts.joinToString(" AND ")

            // Improved Sorting: Sort by date AND _id. 
            // This creates a stable deterministic order even for identical timestamps.
            val cursor = reactContext.contentResolver.query(
                uri,
                projection,
                selection,
                if (selectionArgs.isEmpty()) null else selectionArgs.toTypedArray(),
                "date DESC, _id DESC"
            )

            val messagesArray = JSONArray()
            var scanned = 0
            var financialCount = 0
            var lastScannedDate = effectiveMaxDate

            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                val addressIdx = c.getColumnIndexOrThrow("address")
                val bodyIdx = c.getColumnIndexOrThrow("body")
                val dateIdx = c.getColumnIndexOrThrow("date")

                while (c.moveToNext()) {
                    scanned++
                    val currentDate = c.getLong(dateIdx)
                    lastScannedDate = currentDate

                    // Hard row-scan cap — prevents blocking on huge inboxes
                    if (scanned > MAX_SCAN_ROWS) {
                        Log.w(TAG, "Hit MAX_SCAN_ROWS ($MAX_SCAN_ROWS) — stopping scan.")
                        break
                    }

                    val body = c.getString(bodyIdx) ?: continue
                    val address = c.getString(addressIdx)

                    if (!isFinancialSms(body, address)) continue

                    financialCount++
                    val sms = JSONObject()
                    sms.put("_id", c.getString(idIdx))
                    sms.put("address", address)
                    sms.put("body", body)
                    sms.put("date", currentDate)
                    messagesArray.put(sms)

                    // Stop collecting once we have maxCount financial SMS for this batch.
                    if (financialCount >= maxCount) break
                }
            }

            // Return Metadata Wrapper
            val result = JSONObject()
            result.put("messages", messagesArray)
            result.put("oldestScannedDate", lastScannedDate)
            result.put("scannedCount", scanned)

            Log.d(TAG, "SMS scan: rows_scanned=$scanned financial_matched=$financialCount oldest_scanned=$lastScannedDate")
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
