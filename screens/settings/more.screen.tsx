import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
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
import useThemeStore from '@/stores/themeStore';
import { router } from 'expo-router';

const MoreScreen = () => {
    const { theme, setTheme } = useThemeStore();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
    const [biometricEnabled, setBiometricEnabled] = useState(true);

    const { colors } = useTheme();

    const themeChangeHandler = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
        setIsDarkMode(!isDarkMode);
    }
    // Theme color
    const themeColor = '#8F85FF';
    const darkThemeColor = '#A59BFF';

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle,]}>My Profile</Text>
                {isLoggedIn ? (
                    <TouchableOpacity style={styles.settingsButton}>
                        <Feather name="settings" size={22} color={isDarkMode ? darkThemeColor : themeColor} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Auth Card */}
            <View style={[styles.authCard, { backgroundColor: colors.card }]}>
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
                            <Text style={[styles.loginTitle,]}>Sign in to Sync Your Data</Text>
                            <Text style={styles.loginSubtitle}>Access your finances across devices</Text>
                        </View>
                        <TouchableOpacity style={[styles.loginButton, { backgroundColor: themeColor }]}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: colors.card }]}>
                    <MaterialCommunityIcons name="theme-light-dark" size={24} color={isDarkMode ? darkThemeColor : themeColor} />
                    <ThemedText style={styles.quickActionText}>Theme</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: colors.card }]}>
                    <MaterialCommunityIcons name="currency-usd" size={24} color={isDarkMode ? darkThemeColor : themeColor} />
                    <ThemedText style={styles.quickActionText}>Currency</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: colors.card }]}>
                    <MaterialCommunityIcons name="export-variant" size={24} color={isDarkMode ? darkThemeColor : themeColor} />
                    <ThemedText style={styles.quickActionText}>Export</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: colors.card }]}>
                    <MaterialCommunityIcons name="database-import" size={24} color={isDarkMode ? darkThemeColor : themeColor} />
                    <ThemedText style={styles.quickActionText}>Import</ThemedText>
                </TouchableOpacity>
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
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="currency-usd" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={styles.menuText}>Currency</ThemedText>
                        <ThemedText style={styles.menuValue}>USD</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>
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
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push("/category/categoryList")} style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="tag-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={styles.menuText}>Categories</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="sync" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={styles.menuText}>Cloud Sync</ThemedText>
                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleValue}>Auto</Text>
                            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="export-variant" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={styles.menuText}>Export Data</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="database-import" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Import Data</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? darkTheme.primaryForeground : '#F5E8E8' }]}>
                            <MaterialIcons name="delete-outline" size={20} color={isDarkMode ? "#FF6B6B" : "#FF3B30"} />
                        </View>
                        <ThemedText style={[styles.deleteText]}>Delete All Data</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Security Section */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Security</Text>
                <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                    <View style={styles.toggleItem}>
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
                    </View>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>App Lock</ThemedText>
                        <Text style={styles.menuValue}>PIN</Text>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="shield-check-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Privacy Policy</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
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
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/(routes)/settings/support/index')} style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="chat-question-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Support</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="star-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Rate App</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <Ionicons name="information-circle-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>About</ThemedText>
                        <Text style={styles.versionText}>v1.0.0</Text>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
        </ScrollView>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
        color: '#1C1C1E',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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