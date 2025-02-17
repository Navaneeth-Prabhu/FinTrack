import { endOfDay, formatDate, isToday, startOfDay } from "date-fns";

type DateFormatOptions = {
    dateFormat?: string; // Custom date format
    timeFormat?: string; // Custom time format
    includeTime?: boolean; // Include the time in the formatted string
    excludeYearIfCurrent?: boolean; // Exclude the year if the date is within the current year
    timeOnly?: boolean //Only provide time
};

export const formatDateString = (
    dateString: string,
    {
        dateFormat = 'MMM dd, yyyy',
        timeFormat = 'p',
        includeTime = true,
        excludeYearIfCurrent = false,
        timeOnly = false // New option to handle time-only formatting
    }: DateFormatOptions = {}
): string => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return 'Invalid Date'; // Handle invalid date
    }

    if (timeOnly) {
        // If timeOnly is true, return only the formatted time
        return formatDate(date, timeFormat);
    }

    const today = new Date();
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    // If excludeYearIfCurrent is true and the date is in the current year, format date without the year
    const adjustedDateFormat = excludeYearIfCurrent && isCurrentYear ? 'dd MMM' : dateFormat;

    const formattedTime = formatDate(date, timeFormat);
    const formattedDate = formatDate(date, adjustedDateFormat);

    // Check if the date is today
    if (isToday(date)) {
        return includeTime ? `Today, ${formattedTime}` : 'Today';
    }

    // Return formatted date and time (or just date based on includeTime)
    return includeTime ? `${formattedDate}, ${formattedTime}` : formattedDate;
};

export const getDateRange = (date: Date) => ({
    start: startOfDay(date),
    end: endOfDay(date),
});

