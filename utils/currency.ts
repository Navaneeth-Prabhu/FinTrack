export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (e) {
        // Fallback if currency code is invalid or Intl fails
        return `$${amount.toFixed(2)}`;
    }
};

export const formatCurrencyParts = (amount: number, currencyCode: string = 'USD') => {
    try {
        const parts = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).formatToParts(amount);

        const symbol = parts.find(p => p.type === 'currency')?.value || '$';
        const integer = parts.filter(p => p.type === 'integer' || p.type === 'group').map(p => p.value).join('');
        const fraction = parts.find(p => p.type === 'fraction')?.value || '00';
        const decimal = parts.find(p => p.type === 'decimal')?.value || '.';

        return { symbol, integer, fraction, decimal };
    } catch (e) {
        // Fallback
        const fixed = amount.toFixed(2);
        const [int, frac] = fixed.split('.');
        return { symbol: '$', integer: int, fraction: frac, decimal: '.' };
    }
};
