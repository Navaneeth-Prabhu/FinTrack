import usePreferenceStore from '@/stores/preferenceStore';
import { formatCurrency, formatCurrencyParts } from '@/utils/currency';
import { useMemo } from 'react';

export const useCurrency = () => {
    const { currency } = usePreferenceStore();

    const format = useMemo(
        () => (amount: number) => formatCurrency(amount, currency),
        [currency]
    );

    const formatParts = useMemo(
        () => (amount: number) => formatCurrencyParts(amount, currency),
        [currency]
    );

    return {
        currencyCode: currency,
        format,
        formatParts,
    };
};
