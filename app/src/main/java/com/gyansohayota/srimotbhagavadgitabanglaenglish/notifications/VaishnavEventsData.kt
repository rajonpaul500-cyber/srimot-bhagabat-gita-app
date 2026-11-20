package com.gyansohayota.srimotbhagavadgitabanglaenglish.notifications

data class CalendarEvent(
    val date: String, // YYYY-MM-DD
    val title: String,
    val type: String
)

object VaishnavEventsData {

    val allEvents: List<CalendarEvent> = listOf(
        // Ekadashis 2026
        CalendarEvent("2026-01-14", "ষটতিলা একাদশী", "ekadashi"),
        CalendarEvent("2026-01-29", "ভৈমী একাদশী", "ekadashi"),
        CalendarEvent("2026-02-13", "বিজয়া একাদশী", "ekadashi"),
        CalendarEvent("2026-02-27", "আমলকীব্রত একাদশী", "ekadashi"),
        CalendarEvent("2026-03-15", "পাপমোচনী একাদশী", "ekadashi"),
        CalendarEvent("2026-03-29", "কামদা একাদশী", "ekadashi"),
        CalendarEvent("2026-04-13", "বরূথিনী একাদশী", "ekadashi"),
        CalendarEvent("2026-04-27", "মোহিনী একাদশী", "ekadashi"),
        CalendarEvent("2026-05-13", "অপরা একাদশী", "ekadashi"),
        CalendarEvent("2026-05-27", "পদ্মিনী একাদশী", "ekadashi"),
        CalendarEvent("2026-06-11", "পরমা একাদশী", "ekadashi"),
        CalendarEvent("2026-06-26", "পাণ্ডবা নির্জলা একাদশী", "ekadashi"),
        CalendarEvent("2026-07-11", "যোগিনী একাদশী", "ekadashi"),
        CalendarEvent("2026-07-25", "শয়ন একাদশী", "ekadashi"),
        CalendarEvent("2026-08-09", "কামিকা একাদশী", "ekadashi"),
        CalendarEvent("2026-08-24", "পবিত্রারোপণ একাদশী", "ekadashi"),
        CalendarEvent("2026-09-07", "অন্নদা একাদশী", "ekadashi"),
        CalendarEvent("2026-09-22", "পার্শ্ব একাদশী", "ekadashi"),
        CalendarEvent("2026-10-06", "ইন্দিরা একাদশী", "ekadashi"),
        CalendarEvent("2026-10-22", "পাশাঙ্কুশা একাদশী", "ekadashi"),
        CalendarEvent("2026-11-05", "রমা একাদশী", "ekadashi"),
        CalendarEvent("2026-11-21", "উত্থান একাদশী", "ekadashi"),
        CalendarEvent("2026-12-05", "উৎপন্না একাদশী", "ekadashi"),
        CalendarEvent("2026-12-20", "মোক্ষদা একাদশী", "ekadashi"),

        // Major Vaishnav Festivals 2026
        CalendarEvent("2026-01-03", "শ্রীকৃষ্ণের পুষ্যাভিষেক", "festival"),
        CalendarEvent("2026-01-23", "শ্রী সরস্বতী পূজা", "festival"),
        CalendarEvent("2026-01-25", "শ্রী অদ্বৈত আচার্যের আবির্ভাব", "festival"),
        CalendarEvent("2026-01-31", "শ্রী নিত্যানন্দ ত্রয়োদশী", "festival"),
        CalendarEvent("2026-02-01", "শ্রীল নরোত্তম দাস ঠাকুরের আবির্ভাব", "festival"),
        CalendarEvent("2026-02-16", "শ্রীশিবরাত্রি", "festival"),
        CalendarEvent("2026-03-03", "শ্রীশ্রী গৌরপূর্ণিমা", "festival"),
        CalendarEvent("2026-03-11", "শ্রী শ্রীনিবাস ঠাকুরের আবির্ভাব", "festival"),
        CalendarEvent("2026-03-16", "পনতীর্থ মহাবারুণী স্নান", "festival"),
        CalendarEvent("2026-03-27", "শ্রীশ্রী রামনবমী", "festival"),
        CalendarEvent("2026-03-29", "শ্রীল জয়পতাকা স্বামী গুরু মহারাজের ব্যাসপূজা", "festival"),
        CalendarEvent("2026-04-20", "অক্ষয় তৃতীয়া, চন্দনযাত্রা শুরু", "festival"),
        CalendarEvent("2026-04-30", "শ্রী নৃসিংহ চতুর্দশী", "festival"),
        CalendarEvent("2026-05-16", "শ্রীশ্রী পুরুষোত্তম ব্রত আরম্ভ", "festival"),
        CalendarEvent("2026-06-27", "পানিহাটি চিড়াদধি মহোৎসব", "festival"),
        CalendarEvent("2026-06-29", "শ্রী জগন্নাথদেবের স্নানযাত্রা", "festival"),
        CalendarEvent("2026-07-16", "শ্রীশ্রী জগন্নাথদেবের রথযাত্রা", "festival"),
        CalendarEvent("2026-07-24", "উল্টো রথযাত্রা", "festival"),
        CalendarEvent("2026-08-07", "নিউইয়র্কে ইসকন প্রতিষ্ঠাবার্ষিকী", "festival"),
        CalendarEvent("2026-08-23", "শ্রীশ্রী রাধা-মাধবের ঝুলনযাত্রা", "festival"),
        CalendarEvent("2026-08-28", "শ্রী বলরাম পূর্ণিমা", "festival"),
        CalendarEvent("2026-09-04", "শ্রীকৃষ্ণের জন্মাষ্টমী", "festival"),
        CalendarEvent("2026-09-05", "শ্রীল প্রভুপাদের ১৩০তম শুভ আবির্ভাব", "festival"),
        CalendarEvent("2026-09-17", "শ্রীল ভক্তিচারু স্বামী গুরু মহারাজের ব্যাসপূজা", "festival"),
        CalendarEvent("2026-09-19", "শ্রীশ্রী রাধাষ্টমী", "festival"),
        CalendarEvent("2026-09-26", "ভাদ্র পূর্ণিমা", "festival"),
        CalendarEvent("2026-10-18", "শ্রীশ্রী দুর্গাপূজা - সপ্তমী", "festival"),
        CalendarEvent("2026-10-26", "শ্রী লক্ষ্মীপূজা, দামোদর ব্রত শুরু", "festival"),
        CalendarEvent("2026-10-30", "শ্রীল নরোত্তম দাস ঠাকুরের তিরোভাব", "festival"),
        CalendarEvent("2026-11-09", "দীপাবলি, শ্রীশ্রী কালীপূজা", "festival"),
        CalendarEvent("2026-11-10", "গোবর্ধন পূজা, অন্নকূট মহোৎসব", "festival"),
        CalendarEvent("2026-11-13", "শ্রীল প্রভুপাদের তিরোভাব", "festival"),
        CalendarEvent("2026-11-17", "গোপষ্টমী", "festival"),
        CalendarEvent("2026-11-24", "শ্রীকৃষ্ণের রাসযাত্রা", "festival"),
        CalendarEvent("2026-12-20", "শ্রীশ্রী গীতা জয়ন্তী", "festival"),
        CalendarEvent("2026-12-31", "শ্রীল সুভগ স্বামী গুরু মহারাজের ব্যাসপূজা", "festival"),

        // Amavasya 2026
        CalendarEvent("2026-01-18", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-02-17", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-03-18", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-04-17", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-05-16", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-06-14", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-07-14", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-08-12", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-09-10", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-10-10", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-11-09", "অমাবস্যা", "amavasya"),
        CalendarEvent("2026-12-09", "অমাবস্যা", "amavasya"),

        // Purnima 2026
        CalendarEvent("2026-01-03", "পৌষ পূর্ণিমা", "purnima"),
        CalendarEvent("2026-02-01", "মাঘ পূর্ণিমা", "purnima"),
        CalendarEvent("2026-03-03", "ফাল্গুন পূর্ণিমা", "purnima"),
        CalendarEvent("2026-04-02", "চৈত্র পূর্ণিমা", "purnima"),
        CalendarEvent("2026-05-01", "বৈশাখ পূর্ণিমা", "purnima"),
        CalendarEvent("2026-06-29", "জ্যৈষ্ঠ পূর্ণিমা", "purnima"),
        CalendarEvent("2026-07-29", "আষাঢ় পূর্ণিমা", "purnima"),
        CalendarEvent("2026-08-28", "শ্রাবণ পূর্ণিমা", "purnima"),
        CalendarEvent("2026-09-26", "ভাদ্র পূর্ণিমা", "purnima"),
        CalendarEvent("2026-10-26", "আশ্বিন পূর্ণিমা", "purnima"),
        CalendarEvent("2026-11-24", "কার্তিক পূর্ণিমা", "purnima"),
        CalendarEvent("2026-12-23", "মার্গশীর্ষ পূর্ণিমা", "purnima")
    )

    /**
     * Returns events grouped by date with merged titles for identical days.
     */
    val groupedEventsByDate: Map<String, String> by lazy {
        val map = linkedMapOf<String, MutableList<String>>()
        for (event in allEvents) {
            val list = map.getOrPut(event.date) { mutableListOf() }
            if (!list.contains(event.title)) {
                list.add(event.title)
            }
        }
        map.mapValues { (_, titles) -> titles.joinToString(" ও ") }
    }
}
