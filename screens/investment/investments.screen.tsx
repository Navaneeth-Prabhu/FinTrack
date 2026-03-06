import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import HoldingsView from './components/HoldingsView';
import SIPsView from './components/SIPsView';
import LoansView from './components/LoansView';
import AlertsScreen from '@/screens/alerts/AlertsScreen';
import { useAlertStore } from '@/stores/alertStore';
import { Ionicons } from '@expo/vector-icons';
import { importCamsData } from '@/services/camsCasParser';

import OverviewView from './components/OverviewView';

type Tab = 'Overview' | 'Holdings' | 'SIPs' | 'Loans' | 'Alerts';
const TABS: Tab[] = ['Overview', 'Holdings', 'SIPs', 'Loans', 'Alerts'];

export default function InvestmentsScreen() {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('Overview');
    const { unreadCount } = useAlertStore();
    const [isImporting, setIsImporting] = useState(false);

    const handleImportCams = async () => {
        setIsImporting(true);
        const result = await importCamsData();
        setIsImporting(false);

        if (result.status === 'success') {
            Alert.alert('Import Successful', result.message);
        } else if (result.status === 'error') {
            Alert.alert('Import Failed', result.message);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <ThemedText variant="h2">Investments</ThemedText>

                <View style={styles.headerActions}>
                    {(activeTab === 'Holdings' || activeTab === 'Overview') && (
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}
                            onPress={handleImportCams}
                            disabled={isImporting}
                        >
                            {isImporting ? (
                                <ActivityIndicator size="small" color="#60A5FA" />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={20} color="#60A5FA" />
                            )}
                        </TouchableOpacity>
                    )}

                    {activeTab !== 'Loans' && activeTab !== 'Alerts' && (
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/investment/add-investment-type' as any)}
                        >
                            <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
                        </TouchableOpacity>
                    )}
                    {activeTab === 'Loans' && (
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/investment/add-loan')}
                        >
                            <ThemedText style={styles.addButtonText}>Add Loan</ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Segmented Control */}
            <View style={styles.tabContainer}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                        ]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <View style={styles.tabLabelRow}>
                            <ThemedText
                                style={[
                                    styles.tabText,
                                    { color: activeTab === tab ? colors.primary : colors.subtitle },
                                    activeTab === tab ? styles.tabTextActive : {},
                                ]}
                            >
                                {tab}
                            </ThemedText>
                            {tab === 'Alerts' && unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <ThemedText style={styles.badgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {activeTab === 'Overview' && <OverviewView />}
                {activeTab === 'Holdings' && <HoldingsView />}
                {activeTab === 'SIPs' && <SIPsView />}
                {activeTab === 'Loans' && <LoansView />}
                {activeTab === 'Alerts' && <AlertsScreen />}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tabText: {
        fontSize: 14,
    },
    tabTextActive: {
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#F44336',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
});

