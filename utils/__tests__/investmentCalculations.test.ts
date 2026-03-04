import {
    calculateAbsoluteReturn,
    calculateReturnPercentage,
    calculateCAGR,
    calculateEMI,
    calculateCompoundInterest,
    calculateOutstandingBalance
} from '../investmentCalculations';

describe('Investment Calculations (Test Gate 5)', () => {

    test('Absolute Return and Percentage', () => {
        expect(calculateAbsoluteReturn(120, 100)).toBe(20);
        expect(calculateReturnPercentage(120, 100)).toBe(20);
        expect(calculateReturnPercentage(100, 100)).toBe(0);
        expect(calculateReturnPercentage(150, 0)).toBe(0);
    });

    test('CAGR Calculation', () => {
        // 100 to 144 in 2 years is roughly 20% CAGR
        const startDate = '2020-01-01';
        const endDate = '2022-01-01';
        const cagr = calculateCAGR(144, 100, startDate, endDate);
        expect(cagr).toBeCloseTo(20, 0);
    });

    test('FD Compound Interest', () => {
        // 100,000 at 10% for 1 year compounded quarterly
        // Formula: 100000 * (1 + 0.1/4)^(4*1) = 110381.28
        const maturityValue = calculateCompoundInterest(100000, 10, 12, 4);
        expect(maturityValue).toBeCloseTo(110381.28, 0);
    });

    test('Loan EMI and Outstanding', () => {
        // 1,000,000 at 10% for 12 months
        // EMI should be around 87915
        const emi = calculateEMI(1000000, 10, 12);
        console.log('EMI:', emi);
        expect(emi).toBeCloseTo(87916, 0);

        // After 6 months, outstanding should be roughly half-ish but slightly more due to interest front-loading
        const balance = calculateOutstandingBalance(1000000, 10, 12, 6);
        console.log('Balance after 6 months:', balance);
        expect(balance).toBeLessThan(1000000);
        expect(balance).toBeGreaterThan(0);
    });

});
