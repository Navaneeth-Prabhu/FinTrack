import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSIPStore } from '@/stores/sipStore';
import { useHoldingsStore } from '@/stores/holdingsStore';
import PortfolioSummaryCard from './PortfolioSummaryCard';
import PerformanceBars from './PerformanceBars';
import UpcomingSIPsWidget from './UpcomingSIPsWidget';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';

export default function OverviewView() {
    const { fetchSIPs } = useSIPStore();
    const { fetchHoldings } = useHoldingsStore();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchSIPs();
        fetchHoldings();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchSIPs(), fetchHoldings()]);
        setRefreshing(false);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            <PortfolioSummaryCard />

            <UpcomingSIPsWidget />
            <PerformanceBars />

            <View style={styles.quickStatsContainer}>
                <ThemedText style={{ color: colors.subtitle, marginBottom: 8, paddingHorizontal: 4 }}>Quick Actions</ThemedText>
                <View style={[styles.alertCard, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                    <ThemedText style={{ color: '#FF9500', fontWeight: '500', fontSize: 13, lineHeight: 20 }}>
                        Remember to manually update your NAVs and stock prices periodically to see accurate portfolio returns.
                    </ThemedText>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    quickStatsContainer: {
        marginTop: 8,
    },
    alertCard: {
        padding: 16,
        borderRadius: 12,
    }
});
