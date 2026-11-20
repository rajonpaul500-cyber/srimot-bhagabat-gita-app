package com.gyansohayota.srimotbhagavadgitabanglaenglish.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object VaishnavReminderManager {

    private const val TAG = "VaishnavReminderMgr"

    private const val PREFS_NAME = "vaishnav_reminder_prefs"
    private const val KEY_LAST_SCHEDULED_DAY = "last_scheduled_day"

    /**
     * Schedules phone notifications for all Vaishnav calendar events on the day before each event at 8:00 PM (20:00).
     */
    fun scheduleAllReminders(context: Context, force: Boolean = false) {
        val appContext = context.applicationContext
        Thread {
            try {
                val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
                val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                if (!force && prefs.getString(KEY_LAST_SCHEDULED_DAY, null) == todayKey) {
                    return@Thread
                }
                scheduleAllRemindersInternal(appContext)
                prefs.edit().putString(KEY_LAST_SCHEDULED_DAY, todayKey).apply()
            } catch (e: Exception) {
                Log.e(TAG, "Reminder scheduling error", e)
            }
        }.start()
    }

    private fun scheduleAllRemindersInternal(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: run {
            Log.e(TAG, "AlarmManager not available")
            return
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val now = System.currentTimeMillis()
        var scheduledCount = 0

        for ((dateStr, combinedTitle) in VaishnavEventsData.groupedEventsByDate) {
            try {
                val eventDate = dateFormat.parse(dateStr) ?: continue
                val cal = Calendar.getInstance().apply {
                    time = eventDate
                    // The day before the event
                    add(Calendar.DAY_OF_YEAR, -1)
                    // At 8:00 PM (20:00) the previous evening
                    set(Calendar.HOUR_OF_DAY, 20)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val triggerMillis = cal.timeInMillis

                // Only schedule for upcoming future dates
                if (triggerMillis > now) {
                    val intent = Intent(context, VaishnavReminderReceiver::class.java).apply {
                        putExtra("event_title", combinedTitle)
                        putExtra("event_date", dateStr)
                    }

                    val requestCode = (dateStr.hashCode() xor 0x5A5A) and 0x7FFFFFFF
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerMillis,
                            pendingIntent
                        )
                    } else {
                        alarmManager.set(
                            AlarmManager.RTC_WAKEUP,
                            triggerMillis,
                            pendingIntent
                        )
                    }
                    scheduledCount++
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule reminder for $dateStr", e)
            }
        }

        Log.d(TAG, "Successfully scheduled $scheduledCount upcoming Vaishnav reminders.")
    }

    /**
     * Sends an immediate sample notification so the user can see and test the exact reminder on their device.
     */
    fun sendTestNotification(context: Context) {
        val intent = Intent(context, VaishnavReminderReceiver::class.java).apply {
            putExtra("event_title", "শ্রীশ্রী রামনবমী")
            putExtra("event_date", "2026-03-27")
        }
        context.sendBroadcast(intent)
    }
}
