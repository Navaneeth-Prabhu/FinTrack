import { differenceInDays, differenceInMonths, addMonths, parseISO, isAfter } from 'date-fns';
import xirr from 'xirr';

/**
 * Basic Absolute Return
 */
export const calculateAbsoluteReturn = (currentValue: number, investedAmount: number): number => {
    return currentValue - investedAmount;
};

/**
 * Basic Return Percentage
 */
export const calculateReturnPercentage = (currentValue: number, investedAmount: number): number => {
    if (investedAmount === 0) return 0;
    return ((currentValue - investedAmount) / investedAmount) * 100;
};

/**
 * CAGR (Compound Annual Growth Rate)
 * Formula: [(EV / BV) ^ (1 / n)] - 1
 */
export const calculateCAGR = (currentValue: number, investedAmount: number, startDate: string, endDate: string = new Date().toISOString()): number => {
    if (investedAmount <= 0 || currentValue <= 0) return 0;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const years = differenceInDays(end, start) / 365;

    if (years <= 0) return 0;

    return (Math.pow(currentValue / investedAmount, 1 / years) - 1) * 100;
};

/**
 * XIRR (Extended Internal Rate of Return)
 * Requires an array of { amount, date }
 * Note: Withdrawals/Current Value should be positive, Investments should be negative.
 */
export const calculateXIRRValue = (transactions: { amount: number; date: Date }[]): number => {
    if (transactions.length < 2) return 0;
    try {
        // xirr package expects: [{ amount: -1000, date: new Date('2020-01-01') }, { amount: 1100, date: new Date('2021-01-01') }]
        return xirr(transactions) * 100;
    } catch (e) {
        console.error('XIRR calculation failed:', e);
        return 0;
    }
};

/**
 * Fixed Deposit / Compound Interest Value
 * Formula: A = P(1 + r/n)^(nt)
 */
export const calculateCompoundInterest = (
    principal: number,
    annualRate: number,
    tenureMonths: number,
    compoundingFrequency: number = 4 // Quarterly by default for Indian FDs
): number => {
    const r = annualRate / 100;
    const n = compoundingFrequency;
    const t = tenureMonths / 12;
    return principal * Math.pow(1 + r / n, n * t);
};

/**
 * Loan EMI (Equated Monthly Installment)
 * Formula: [P x R x (1+R)^N]/[(1+R)^N-1]
 */
export const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    const r = annualRate / 12 / 100; // Monthly interest rate
    const n = tenureMonths;
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/**
 * Loan Outstanding Balance after X months
 */
export const calculateOutstandingBalance = (
    principal: number,
    annualRate: number,
    totalTenureMonths: number,
    monthsElapsed: number
): number => {
    const r = annualRate / 12 / 100;
    const n = totalTenureMonths;
    const p = monthsElapsed;

    if (r === 0) return principal - (principal / n * p);

    const emi = calculateEMI(principal, annualRate, totalTenureMonths);
    // Standard amortization formula for balance
    return (principal * Math.pow(1 + r, p)) - (emi * (Math.pow(1 + r, p) - 1) / r);
};

/**
 * Remaining Tenure in Months
 */
export const calculateRemainingTenure = (
    currentOutstanding: number,
    annualRate: number,
    emiAmount: number
): number => {
    if (currentOutstanding <= 0) return 0;
    const r = annualRate / 12 / 100;
    if (r === 0) return currentOutstanding / emiAmount;

    // Derived from EMI formula: n = log(EMI / (EMI - Principal * r)) / log(1 + r)
    const numerator = Math.log(emiAmount / (emiAmount - currentOutstanding * r));
    const denominator = Math.log(1 + r);
    return numerator / denominator;
};
