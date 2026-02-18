package com.fintrack.FinTrack

import android.database.Cursor
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject

class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SmsModule"

    /**
     * Read SMS messages from the inbox.
     *
     * @param maxCount   Maximum number of messages to return (most recent first).
     * @param minDate    Unix timestamp (ms). Only messages received after this date are returned.
     *                   Pass 0 to disable the filter.
     * @param promise    Resolved with a JSON string of [{address, body, date, _id}].
     */
    @ReactMethod
    fun getTransactionSms(maxCount: Int, minDate: Double, promise: Promise) {
        try {
            val uri = Uri.parse("content://sms/inbox")
            val projection = arrayOf("_id", "address", "body", "date")

            // Filter: only bank/service sender IDs (alphanumeric, not personal numbers)
            // Also apply date filter if minDate > 0
            val selectionParts = mutableListOf(
                "address NOT LIKE '+%'",
                "address NOT LIKE '0%'",
                "address NOT LIKE '1%'",
                "address NOT LIKE '2%'",
                "address NOT LIKE '3%'",
                "address NOT LIKE '4%'",
                "address NOT LIKE '5%'",
                "address NOT LIKE '6%'",
                "address NOT LIKE '7%'",
                "address NOT LIKE '8%'",
                "address NOT LIKE '9%'"
            )

            if (minDate > 0) {
                selectionParts.add("date >= ${minDate.toLong()}")
            }

            val selection = selectionParts.joinToString(" AND ")

            val cursor: Cursor? = reactContext.contentResolver.query(
                uri,
                projection,
                selection,
                null,
                "date DESC LIMIT $maxCount"
            )

            val result = JSONArray()

            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                val addressIdx = c.getColumnIndexOrThrow("address")
                val bodyIdx = c.getColumnIndexOrThrow("body")
                val dateIdx = c.getColumnIndexOrThrow("date")

                while (c.moveToNext()) {
                    val sms = JSONObject()
                    sms.put("_id", c.getString(idIdx))
                    sms.put("address", c.getString(addressIdx))
                    sms.put("body", c.getString(bodyIdx))
                    sms.put("date", c.getLong(dateIdx))
                    result.put(sms)
                }
            }

            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("SMS_READ_ERROR", e.message ?: "Unknown error reading SMS", e)
        }
    }
}
