import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useSIPStore } from '@/stores/sipStore';
import { useHoldingsStore } from '@/stores/holdingsStore';
import PortfolioSummaryCard from './PortfolioSummaryCard';
import PerformanceBars from './PerformanceBars';
import UpcomingSIPsWidget from './UpcomingSIPsWidget';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { fetchAndUpdateNAVs } from '@/services/amfiNavService';
import { RefreshCw } from 'lucide-react-native';

export default function OverviewView() {
    const { fetchSIPs } = useSIPStore();
    const { fetchHoldings } = useHoldingsStore();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [navRefreshing, setNavRefreshing] = useState(false);
    const [navStatus, setNavStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchSIPs();
        fetchHoldings();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchSIPs(), fetchHoldings()]);
        setRefreshing(false);
    };

    const onRefreshNAV = async () => {
        setNavRefreshing(true);
        setNavStatus(null);
        try {
            await fetchAndUpdateNAVs();
            await fetchSIPs(); // reload store with updated NAV values
            setNavStatus('NAVs updated successfully!');
        } catch {
            setNavStatus('NAV update failed — check your connection.');
        } finally {
            setNavRefreshing(false);
            // Auto-clear the status message after 4 seconds
            setTimeout(() => setNavStatus(null), 4000);
        }
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

            <View style={styles.quickActions}>
                <ThemedText style={{ color: colors.subtitle, marginBottom: 8, paddingHorizontal: 4 }}>Quick Actions</ThemedText>

                {/* Refresh NAV button — calls AMFI API for all SIPs with scheme_code set */}
                <Pressable
                    style={({ pressed }) => [
                        styles.refreshNavBtn,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        pressed && { opacity: 0.75 }
                    ]}
                    onPress={onRefreshNAV}
                    disabled={navRefreshing}
                >
                    {navRefreshing ? (
                        <ActivityIndicator size="small" color={colors.primary} style={styles.btnIcon} />
                    ) : (
                        <RefreshCw size={16} color={colors.primary} style={styles.btnIcon} />
                    )}
                    <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                        {navRefreshing ? 'Fetching NAVs…' : 'Refresh NAV (AMFI)'}
                    </ThemedText>
                </Pressable>

                {navStatus && (
                    <ThemedText style={[styles.statusText, {
                        color: navStatus.includes('failed') ? colors.error : colors.success,
                    }]}>
                        {navStatus}
                    </ThemedText>
                )}

                <ThemedText style={[styles.helperText, { color: colors.subtitle }]}>
                    Updates NAVs from AMFI for SIPs with a scheme code. Set the scheme code when adding a SIP.
                </ThemedText>
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
    quickActions: {
        marginTop: 8,
    },
    refreshNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    btnIcon: {
        marginRight: 8,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    helperText: {
        fontSize: 12,
        lineHeight: 17,
        paddingHorizontal: 4,
    },
});
