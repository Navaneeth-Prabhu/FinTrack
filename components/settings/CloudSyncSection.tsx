import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSyncStore } from '@/stores/syncStore';
import { useTheme } from '@/hooks/useTheme';
import useThemeStore from '@/stores/preferenceStore';

interface CloudSyncSectionProps {
    themeColor?: string;
    darkThemeColor?: string;
}

/** Format ISO timestamp to a human-readable string like "Today, 10:30 AM" */
const formatSyncTime = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeStr}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return `Yesterday at ${timeStr}`;

    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${timeStr}`;
};

const CloudSyncSection: React.FC<CloudSyncSectionProps> = ({
    themeColor = '#8F85FF',
    darkThemeColor = '#A59BFF',
}) => {
    const { isSyncing, lastSyncTime, lastSyncStats, lastSyncError, triggerSync, loadLastSyncTime } =
        useSyncStore();
    const { colors } = useTheme();
    const { theme } = useThemeStore();
    const isDarkMode = theme === 'dark';
    const accent = isDarkMode ? darkThemeColor : themeColor;

    // Load last sync time from AsyncStorage on mount
    useEffect(() => {
        loadLastSyncTime();
    }, []);

    const handleSyncNow = useCallback(async () => {
        const result = await triggerSync();

        if (result.success) {
            Alert.alert(
                '✅ Backup Complete',
                `${result.transactionsSynced} transactions and ${result.categoriesSynced} categories backed up to Supabase.${result.failed > 0 ? `\n\n⚠️ ${result.failed} items failed.` : ''}`,
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert(
                '❌ Backup Failed',
                result.error ?? 'An unknown error occurred. Please try again.',
                [{ text: 'OK' }]
            );
        }
    }, [triggerSync]);

    const hasStats = lastSyncStats !== null;
    const syncCount = hasStats
        ? `${lastSyncStats!.transactionsSynced} transactions · ${lastSyncStats!.categoriesSynced} categories`
        : null;

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(143,133,255,0.15)' : 'rgba(143,133,255,0.1)' }]}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={accent} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>Cloud Backup</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Back up to Supabase
                    </Text>
                </View>
                {hasStats && !lastSyncError && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                )}
                {lastSyncError && (
                    <Ionicons name="warning-outline" size={20} color="#FF9500" />
                )}
            </View>

            {/* Last sync info */}
            <View style={[styles.infoRow, { borderTopColor: isDarkMode ? '#2C2C2E' : '#F0F0F0' }]}>
                <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last backup</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                        {formatSyncTime(lastSyncTime)}
                    </Text>
                </View>
                {syncCount && (
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Backed up</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{syncCount}</Text>
                    </View>
                )}
            </View>

            {/* Error message if last sync failed */}
            {lastSyncError && (
                <View style={[styles.errorRow, { backgroundColor: isDarkMode ? 'rgba(255,59,48,0.1)' : '#FFF2F2' }]}>
                    <Ionicons name="alert-circle-outline" size={14} color="#FF3B30" />
                    <Text style={styles.errorText} numberOfLines={2}>{lastSyncError}</Text>
                </View>
            )}

            {/* Backup Now button */}
            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: accent },
                    isSyncing && styles.buttonDisabled,
                ]}
                onPress={handleSyncNow}
                disabled={isSyncing}
                activeOpacity={0.8}
            >
                {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <MaterialCommunityIcons name="cloud-sync" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.buttonText}>
                    {isSyncing ? 'Backing up…' : 'Back Up Now'}
                </Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                Your data is backed up manually. Tap the button to sync.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        paddingTop: 12,
        marginBottom: 12,
        gap: 12,
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '500',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
        gap: 6,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: '#FF3B30',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
    disclaimer: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 16,
    },
});

export default CloudSyncSection;
