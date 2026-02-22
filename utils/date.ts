import { Budget } from "@/types";
import { addDays, addMonths, addWeeks, addYears, differenceInDays, endOfDay, endOfMonth, endOfWeek, endOfYear, formatDate, isAfter, isBefore, isFirstDayOfMonth, isToday, parseISO, startOfDay, subDays } from "date-fns";

type DateFormatOptions = {
  dateFormat?: string; // Custom date format
  timeFormat?: string; // Custom time format
  includeTime?: boolean; // Include the time in the formatted string
  excludeYearIfCurrent?: boolean; // Exclude the year if the date is within the current year
  timeOnly?: boolean; //Only provide time
  relative?: boolean; // Whether to use relative labels like "Today"
};

export const formatDateString = (
  dateString: string,
  {
    dateFormat = 'MMM dd, yyyy',
    timeFormat = 'p',
    includeTime = true,
    excludeYearIfCurrent = false,
    timeOnly = false,
    relative = true
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
  if (relative && isToday(date)) {
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
      return addDays(start, 0); // Same day
    case 'weekly':
      return addDays(start, 6); // 7 days including start
    case 'monthly':
      return isFirstDayOfMonth(start) ? endOfMonth(start) : addDays(start, 29); // 30 days including start
    case 'yearly':
      return addDays(start, 364); // 365 days including start
    default:
      return start;
  }
};

export const getNextPeriodEndDate = (startDate: string, frequency: Budget['frequency']): Date => {
  const start = parseISO(startDate);
  const nextStart = addDays(start, 1); // Start of next period

  switch (frequency) {
    case 'daily':
      return addDays(nextStart, 0);
    case 'weekly':
      return addDays(nextStart, 6);
    case 'monthly':
      return isFirstDayOfMonth(nextStart) ? endOfMonth(nextStart) : addDays(nextStart, 29);
    case 'yearly':
      return addDays(nextStart, 364);
    default:
      return nextStart;
  }
};

export const calculateIdealSpending = (
  limit: number,
  startDate: string,
  frequency: Budget['frequency']
): number => {
  const start = parseISO(startDate);
  const now = new Date();
  const end = getEndDateForFrequency(startDate, frequency);

  if (isBefore(now, start) || isAfter(now, end)) return 0;

  const totalDurationMs = end.getTime() - start.getTime();
  const elapsedDurationMs = now.getTime() - start.getTime();
  const elapsedFraction = elapsedDurationMs / totalDurationMs;

  return Math.min(limit * elapsedFraction, limit);
};

export const calculatePeriodStart = (startDate: string, frequency: string, periodLength?: number, referenceDate: Date = new Date()): Date => {
  const start = new Date(startDate);
  const now = referenceDate;

  if (start >= now) return start; // If budget hasn't started yet, return startDate

  const daysSinceStart = differenceInDays(now, start);
  let periodsElapsed: number;

  switch (frequency) {
    case 'daily':
      periodsElapsed = Math.floor(daysSinceStart);
      return addDays(start, periodsElapsed);
    case 'weekly':
      periodsElapsed = Math.floor(daysSinceStart / 7);
      return addWeeks(start, periodsElapsed);
    case 'monthly':
      const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
      return new Date(start.getFullYear(), start.getMonth() + monthsSinceStart, start.getDate());
    case 'yearly':
      periodsElapsed = now.getFullYear() - start.getFullYear();
      return addYears(start, periodsElapsed);
    case 'custom':
      if (!periodLength) throw new Error('periodLength required for custom frequency');
      periodsElapsed = Math.floor(daysSinceStart / periodLength);
      return addDays(start, periodsElapsed * periodLength);
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
};

export const calculatePeriodEnd = (periodStart: Date, frequency: string, periodLength?: number): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(periodStart, 1);
    case 'weekly':
      return addWeeks(periodStart, 1);
    case 'monthly':
      return subDays(addMonths(periodStart, 1), 1); // Last day of the month
    case 'yearly':
      return subDays(addYears(periodStart, 1), 1); // Last day of the year
    case 'custom':
      if (!periodLength) throw new Error('periodLength required for custom frequency');
      return addDays(periodStart, periodLength - 1);
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
};