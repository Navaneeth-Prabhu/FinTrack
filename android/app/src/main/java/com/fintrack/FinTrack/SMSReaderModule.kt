// Place in android/app/src/main/java/com/fintrack/FinTrack/SMSReaderModule.kt

package com.fintrack.FinTrack

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import com.facebook.react.bridge.*

class SMSReaderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "SMSReader"
    }

    @ReactMethod
    fun readBankSMS(limit: Int, promise: Promise) {
        try {
            val contentResolver: ContentResolver = reactApplicationContext.contentResolver
            val messages = Arguments.createArray()
            
            // Query for bank-related messages
            val selection = "body LIKE ? OR body LIKE ? OR body LIKE ? OR body LIKE ?"
            val selectionArgs = arrayOf(
                "%credited%", 
                "%debited%", 
                "%transaction%",
                "%account%"
            )
            
            val cursor: Cursor? = contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(
                    Telephony.Sms._ID,
                    Telephony.Sms.ADDRESS, 
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC LIMIT $limit"
            )

            if (cursor != null && cursor.moveToFirst()) {
                do {
                    val message = Arguments.createMap()
                    message.putString("id", cursor.getString(0))
                    message.putString("sender", cursor.getString(1))
                    message.putString("body", cursor.getString(2))
                    message.putDouble("date", cursor.getLong(3).toDouble())
                    
                    messages.pushMap(message)
                } while (cursor.moveToNext())
                
                cursor.close()
            }
            
            promise.resolve(messages)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}