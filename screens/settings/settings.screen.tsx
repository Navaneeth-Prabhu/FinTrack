import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import {
    Ionicons,
    MaterialCommunityIcons,
    FontAwesome5,
    Feather,
    MaterialIcons,
    Octicons
} from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { darkTheme } from '@/constants/theme';
import useThemeStore from '@/stores/preferenceStore';
import { router } from 'expo-router';
import DataExportSection from './DataExportSection';
import DataImportSection from './DataImportSection';
import { SafeAreaView } from 'react-native-safe-area-context';
import BiometricToggle from './BiometricSection';
import CloudSyncSection from '@/components/settings/CloudSyncSection';
import { useSupabaseAuthStore } from '@/stores/supabaseAuthStore';
import { syncAll } from '@/services/sync';
import { resetSmsProcessedIds, wipeAllLocalData } from '@/db/services/sqliteService';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAlertStore } from '@/stores/alertStore';
import { useLoanStore } from '@/stores/loanStore';
import { useSIPStore } from '@/stores/sipStore';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { useMetricsStore } from '@/stores/metricsStore';
import { importSMSTransactionsToStore } from '@/utils/SMSTransactionUtil';
import { resetOEMPromptFlag, showOEMBatteryPromptIfNeeded } from '@/services/oemDetection';

const MoreScreen = () => {
    const { theme, setTheme } = useThemeStore();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
    const [biometricEnabled, setBiometricEnabled] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const { colors } = useTheme();
    const { user, signOut } = useSupabaseAuthStore();

    const themeChangeHandler = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
        setIsDarkMode(!isDarkMode);
    }

    const handleSync = async () => {
        if (!user) {
            router.push('/(auth)/google-signin');
            return;
        }
        setIsSyncing(true);
        try {
            await syncAll();
            Alert.alert('✅ Sync complete', 'Your data has been synced to the cloud.');
        } catch (e: any) {
            Alert.alert('Sync failed', e?.message ?? 'Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
    };

    const handleResyncSMS = () => {
        Alert.alert(
            '📨 Resync SMS Transactions',
            'This will re-read all your bank SMS messages. Duplicates will be skipped automatically.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Resync',
                    style: 'destructive',
                    onPress: async () => {
                        await resetSmsProcessedIds();
                        const categories = useCategoryStore.getState().categories;
                        const saveBulkTransactions = useTransactionStore.getState().saveBulkTransactions;
                        await importSMSTransactionsToStore(categories, saveBulkTransactions);
                    },
                },
            ]
        );
    };

    const handleDeleteAllData = () => {
        // Two-step confirmation to prevent accidental data loss (industry standard)
        Alert.alert(
            '⚠️ Delete All Data',
            'This will permanently delete ALL your transactions, accounts, budgets, categories and investments. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delete Everything',
                    style: 'destructive',
                    onPress: () => {
                        // Double-confirm destructive action
                        Alert.alert(
                            'Are you absolutely sure?',
                            'All local data will be irreversibly erased.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete Everything',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await wipeAllLocalData();
                                            // Reset all in-memory Zustand stores to reflect empty state
                                            useCategoryStore.getState().fetchCategories();
                                            useTransactionStore.getState().fetchTransactions(50);
                                            useAccountStore.getState().fetchAccounts();
                                            useBudgetStore.getState().fetchBudgets();
                                            useAlertStore.getState().fetchAlerts();
                                            useLoanStore.getState().fetchLoans();
                                            useSIPStore.getState().fetchSIPs();
                                            useRecurringTransactionStore.getState().fetchRecurringTransactions();
                                            useMetricsStore.getState().fetchDashboardMetrics();
                                            useMetricsStore.setState({ chartData: [] });

                                            Alert.alert('Done', 'All data has been deleted. Your app is now fresh.');
                                        } catch (e: any) {
                                            Alert.alert('Error', 'Failed to delete data: ' + (e?.message ?? 'Unknown error'));
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };
    // Theme color
    const themeColor = '#8F85FF';
    const darkThemeColor = '#A59BFF';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false} style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <ThemedText variant='h2'>My Profile</ThemedText>
                    {isLoggedIn ? (
                        <TouchableOpacity style={styles.settingsButton}>
                            <Feather name="settings" size={22} color={isDarkMode ? darkThemeColor : themeColor} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Auth Card */}
                {/* <View style={[styles.authCard, { backgroundColor: colors.card }]}>
                {isLoggedIn ? (
                    <View style={styles.userInfoContainer}>
                        <View style={[styles.avatarContainer, { backgroundColor: themeColor }]}>
                            <Text style={styles.avatarText}>AJ</Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={[styles.userName,]}>Alex Johnson</Text>
                            <Text style={styles.userEmail}>alex.johnson@example.com</Text>
                        </View>
                        <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: isDarkMode ? 'rgba(165, 155, 255, 0.2)' : 'rgba(143, 133, 255, 0.15)' }]}>
                            <Text style={[styles.editButtonText, { color: isDarkMode ? darkThemeColor : themeColor }]}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.loginPrompt}>
                        <MaterialCommunityIcons name="account-circle-outline" size={40} color={isDarkMode ? darkThemeColor : themeColor} />
                        <View style={styles.loginTextContainer}>
                            <ThemedText style={[styles.loginTitle,]}>Sign in to Sync Your Data</ThemedText>
                            <ThemedText style={styles.loginSubtitle}>Access your finances across devices</ThemedText>
                        </View>
                        <TouchableOpacity style={[styles.loginButton, { backgroundColor: themeColor }]}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View> */}

                {/* Account / Sync Card */}
                <View style={[styles.sectionContainer, { marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Account & Sync</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                        {user ? (
                            <>
                                <View style={styles.menuItem}>
                                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                        <MaterialCommunityIcons name="account-circle" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={styles.menuText}>{user.user_metadata?.full_name ?? 'Signed In'}</ThemedText>
                                        <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>{user.email}</ThemedText>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={handleSync}
                                    disabled={isSyncing}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                        {isSyncing
                                            ? <ActivityIndicator size={18} color={isDarkMode ? darkThemeColor : themeColor} />
                                            : <MaterialCommunityIcons name="cloud-sync-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                                        }
                                    </View>
                                    <ThemedText style={styles.menuText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</ThemedText>
                                    <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                                    <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? darkTheme.primaryForeground : '#F5E8E8' }]}>
                                        <MaterialCommunityIcons name="logout" size={20} color={isDarkMode ? '#FF6B6B' : '#FF3B30'} />
                                    </View>
                                    <ThemedText style={[styles.menuText, { color: '#FF3B30' }]}>Sign Out</ThemedText>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => router.push('/(auth)/google-signin')}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                    <MaterialCommunityIcons name="google" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={styles.menuText}>Sign in with Google</ThemedText>
                                    <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>Sync data across devices</ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Premium Banner */}
                <TouchableOpacity style={[styles.premiumBanner, { backgroundColor: themeColor }]}>
                    <View style={styles.premiumBannerContent}>
                        <View style={styles.premiumIconContainer}>
                            <FontAwesome5 name="crown" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.premiumTextWrapper}>
                            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                            <View style={styles.premiumFeatures}>
                                <View style={styles.premiumFeatureItem}>
                                    <Octicons name="check-circle-fill" size={12} color="#FFFFFF" />
                                    <Text style={styles.premiumFeatureText}>Advanced Analytics</Text>
                                </View>
                                <View style={styles.premiumFeatureItem}>
                                    <Octicons name="check-circle-fill" size={12} color="#FFFFFF" />
                                    <Text style={styles.premiumFeatureText}>Unlimited Budgets</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.premiumArrowContainer}>
                            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Personalization Section */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Personalization</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                        <View style={styles.toggleItem}>
                            <View style={styles.toggleItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                    <Ionicons name="moon-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                                </View>
                                <ThemedText style={styles.toggleText}>Dark Mode</ThemedText>
                            </View>
                            <Switch
                                value={isDarkMode}
                                onValueChange={themeChangeHandler}
                                trackColor={{ false: "#D1D1D6", true: themeColor }}
                                thumbColor={isDarkMode ? "#FFFFFF" : "#FFFFFF"}
                            />
                        </View>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <Ionicons name="color-palette-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={styles.menuText}>App Color</ThemedText>
                            <View style={styles.colorPreview}>
                                <View style={[styles.colorDot, { backgroundColor: '#8F85FF' }]} />
                                <View style={[styles.colorDot, { backgroundColor: '#FF85C0' }]} />
                                <View style={[styles.colorDot, { backgroundColor: '#85C9FF' }]} />
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="currency-usd" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={styles.menuText}>Currency</ThemedText>
                            <ThemedText style={styles.menuValue}>USD</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>
                        {/* <TouchableOpacity onPress={() => router.push('/(auth)/EmailAuth')} style={[styles.menuItem, { backgroundColor: colors.card }]}>
                            <MaterialCommunityIcons name="currency-usd" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            <ThemedText style={styles.quickActionText}>Currency</ThemedText>
                        </TouchableOpacity> */}
                    </View>
                </View>

                {/* Data Management Section */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Data & Privacy</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="account-plus-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={styles.menuText}>Linked Accounts</ThemedText>
                            <Text style={styles.menuValue}>2</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push("/category/categoryList")} style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="tag-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={styles.menuText}>Categories</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <CloudSyncSection
                            themeColor={themeColor}
                            darkThemeColor={darkThemeColor}
                        />

                        <DataExportSection />
                        <DataImportSection />

                        <TouchableOpacity style={styles.menuItem} onPress={async () => {
                            await resetOEMPromptFlag();
                            await showOEMBatteryPromptIfNeeded();
                        }}>
                            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? darkTheme.primaryForeground : '#F5E8E8' }]}>
                                <MaterialCommunityIcons name="battery-alert" size={20} color={isDarkMode ? "#EAB308" : "#CA8A04"} />
                            </View>
                            <ThemedText style={[styles.menuText, { color: isDarkMode ? "#EAB308" : "#CA8A04" }]}>Fix Background SMS</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleResyncSMS}>
                            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? darkTheme.primaryForeground : '#F5E8E8' }]}>
                                <MaterialCommunityIcons name="message-alert-outline" size={20} color={isDarkMode ? "#FF6B6B" : "#FF3B30"} />
                            </View>
                            <ThemedText style={[styles.menuText, { color: isDarkMode ? "#FF6B6B" : "#FF3B30" }]}>Resync All SMS Messages</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAllData}>
                            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? darkTheme.primaryForeground : '#F5E8E8' }]}>
                                <MaterialIcons name="delete-outline" size={20} color={isDarkMode ? "#FF6B6B" : "#FF3B30"} />
                            </View>
                            <ThemedText style={[styles.deleteText]}>Delete All Data</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Security Section */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Security</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                        {/* <View style={styles.toggleItem}>
                            <View style={styles.toggleItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                    <MaterialCommunityIcons name="fingerprint" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                                </View>
                                <ThemedText style={styles.toggleText}>Biometric Login</ThemedText>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={setBiometricEnabled}
                                trackColor={{ false: "#D1D1D6", true: themeColor }}
                                thumbColor={"#FFFFFF"}
                            />
                        </View> */}
                        <BiometricToggle
                            isDarkMode={isDarkMode}
                            themeColor={themeColor}
                            darkThemeColor={darkThemeColor}
                            colors={colors}
                        />
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText]}>App Lock</ThemedText>
                            <Text style={styles.menuValue}>PIN</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="shield-check-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText]}>Privacy Policy</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Support</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <Ionicons name="help-buoy-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText,]}>Help Center</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push('./support')} style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="chat-question-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText]}>Support</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <MaterialCommunityIcons name="star-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText]}>Rate App</ThemedText>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                                <Ionicons name="information-circle-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                            </View>
                            <ThemedText style={[styles.menuText]}>About</ThemedText>
                            <Text style={styles.versionText}>v1.0.0</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    darkContainer: {
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    darkText: {
        color: '#FFFFFF',
    },
    settingsButton: {
        padding: 8,
    },
    authCard: {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.05,
        // shadowRadius: 8,
        // elevation: 2,
    },
    darkCard: {
        backgroundColor: '#1C1C1E',
        shadowColor: '#000',
        shadowOpacity: 0.15,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    userEmail: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    editProfileButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
    },
    editButtonText: {
        fontWeight: '500',
        fontSize: 14,
    },
    loginPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    loginTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    loginSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    loginButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 14,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 16,
    },
    quickActionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: '23%',
        paddingVertical: 12,
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.05,
        // shadowRadius: 5,
        // elevation: 1,
    },
    darkQuickAction: {
        backgroundColor: '#1C1C1E',
    },
    quickActionText: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '500',
    },
    premiumBanner: {
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
    },
    premiumBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    premiumIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumTextWrapper: {
        flex: 1,
        marginLeft: 12,
    },
    premiumTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    premiumFeatures: {
        flexDirection: 'row',
        marginTop: 4,
    },
    premiumFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    premiumFeatureText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginLeft: 4,
    },
    premiumArrowContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        color: '#6E6E6E',
        fontWeight: '600',
        marginBottom: 8,
        paddingLeft: 4,
    },
    darkSectionTitle: {
        color: '#8E8E93',
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.05,
        // shadowRadius: 8,
        // elevation: 2,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        // borderBottomWidth: 1,
        marginBottom: 1,
        // borderBottomColor: '#F0F0F0',
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        // borderBottomWidth: 1,
        // borderBottomColor: '#F0F0F0',
    },
    toggleItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        flex: 1,
    },
    deleteText: {
        fontSize: 16,
        color: '#FF3B30',
        flex: 1,
    },
    menuValue: {
        fontSize: 14,
        color: '#8E8E93',
        marginRight: 8,
    },
    toggleValue: {
        fontSize: 14,
        color: '#8E8E93',
        marginRight: 8,
    },
    chevron: {
        marginLeft: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorPreview: {
        flexDirection: 'row',
        marginRight: 8,
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 2,
    },
    versionText: {
        fontSize: 12,
        color: '#8E8E93',
        marginRight: 8,
    },
    bottomPadding: {
        height: 40,
    },
});

export default MoreScreen;