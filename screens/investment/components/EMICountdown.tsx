import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { differenceInDays, setDate, addMonths, isBefore, startOfDay } from 'date-fns';

interface EMICountdownProps {
    emiDueDay: number;
}

export default function EMICountdown({ emiDueDay }: EMICountdownProps) {
    const { colors } = useTheme();

    const daysLeft = useMemo(() => {
        const today = startOfDay(new Date());
        let emiDate = setDate(today, emiDueDay);

        if (isBefore(emiDate, today)) {
            emiDate = addMonths(emiDate, 1);
        }

        return differenceInDays(emiDate, today);
    }, [emiDueDay]);

    const isUrgent = daysLeft <= 5;
    const bgColor = isUrgent ? 'rgba(255, 77, 77, 0.15)' : 'rgba(76, 217, 100, 0.15)';
    const textColor = isUrgent ? '#FF4D4D' : '#4CD964';
    const borderColor = isUrgent ? 'rgba(255, 77, 77, 0.3)' : 'rgba(76, 217, 100, 0.3)';

    let timeText = `${daysLeft} days`;
    if (daysLeft === 0) timeText = 'Today';
    else if (daysLeft === 1) timeText = 'Tomorrow';

    return (
        <View style={[styles.container, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
            <ThemedText style={[styles.text, { color: textColor }]}>
                {timeText}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
    }
});
