import { StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useMemo } from 'react';
import { endOfMonth, isWithinInterval, startOfMonth, subDays } from 'date-fns';
import { ThemedText } from '../common/ThemedText';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useMetricsStore } from '@/stores/metricsStore';
import CategoryBar from './CategoryBar';
import { tokens } from '@/constants/theme';

// Define the data structure for category progress
interface CategoryProgress {
    label: string;
    value: number;
    color: string;
}

interface CategoryCardProps {
    month?: Date;
    type: 'Week' | '30Days' | 'Month';
}

const CategoryCard: React.FC<CategoryCardProps> = ({ month = new Date(), type }) => {
    const { colors } = useTheme();
    const { dashboardMetrics } = useMetricsStore();

    // Directly use the SQLite aggregated thirtyDayCategorySpending mapped to progressData
    const progressData = useMemo(() => {
        if (!dashboardMetrics) return [];
        return dashboardMetrics.thirtyDayCategorySpending.map(item => ({
            label: item.categoryName,
            value: item.total,
            color: item.color || '#ccc'
        }));
    }, [dashboardMetrics]);

    // Only render if we have data
    if (progressData.length === 0) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border
                }
            ]}
        >
            <View style={styles.header}>
                <ThemedText
                    variant='h3'
                    style={{ color: colors.cardForeground, fontSize: 18 }}
                >
                    Category info
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/(routes)/category/categoryRecords')}>
                    <ThemedText
                        style={{ color: colors.cardForeground, fontSize: 14 }}
                    >
                        see more
                    </ThemedText>
                </TouchableOpacity>
            </View>
            <CategoryBar data={progressData} />
        </Animated.View>
    );
};

export default React.memo(CategoryCard);

const styles = StyleSheet.create({
    container: {
        padding: 16,
        justifyContent: 'center',
        borderRadius: 10,
        marginHorizontal: tokens.spacing.md
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 18
    }
});