import { Budget } from "@/types";
import { addDays, addMonths, addWeeks, addYears, endOfDay, endOfMonth, endOfWeek, endOfYear, formatDate, isToday, parseISO, startOfDay } from "date-fns";

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

export const getEndDateForFrequency = (startDate: string, frequency: Budget['frequency']): Date => {
    const start = parseISO(startDate); 

    switch (frequency) {
        case 'daily':
            return endOfDay(start);
        case 'weekly':
            return endOfWeek(start);
        case 'monthly':
            return endOfMonth(start);
        case 'yearly':
            return endOfYear(start);
    }
};

export const getNextPeriodEndDate = (startDate: string, frequency: Budget['frequency']): Date => {
    const start = parseISO(startDate); 

    switch (frequency) {
        case 'daily':
            return endOfDay(addDays(start, 1));
        case 'weekly':
            return endOfWeek(addWeeks(start, 1));
        case 'monthly':
            return endOfMonth(addMonths(start, 1));
        case 'yearly':
            return endOfYear(addYears(start, 1));
    }
};

export const calculateIdealSpending = (
    limit: number,
    startDate: string,
    frequency: Budget['frequency']
): number => {
    const start = new Date(startDate);
    const now = new Date();
    const end = getEndDateForFrequency(startDate, frequency);

    if (now < start || now > end) return 0;

    const totalDurationMs = end.getTime() - start.getTime();
    const elapsedDurationMs = now.getTime() - start.getTime();
    const elapsedFraction = elapsedDurationMs / totalDurationMs;

    return Math.min(limit * elapsedFraction, limit);
};

