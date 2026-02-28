// screens/alerts/AlertsScreen.tsx
// Grouped list of SMS alerts (SIP confirmations, EMI deductions, balance updates, loan due alerts).
// Swipe-to-delete, mark all read, grouped by type.

import React, { useEffect, useCallback } from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useAlertStore } from '@/stores/alertStore';
import { SMSAlert } from '@/types';

// ─── Alert type config ────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<
    SMSAlert['type'],
    { label: string; icon: string; iconLib: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5'; color: string }
> = {
    sip_confirmation: {
        label: 'SIP Confirmed',
        icon: 'chart-line-variant',
        iconLib: 'MaterialCommunityIcons',
        color: '#4CAF50',
    },
    emi_deduction: {
        label: 'EMI Deducted',
        icon: 'home-city',
        iconLib: 'MaterialCommunityIcons',
        color: '#FF9800',
    },
    account_balance: {
        label: 'Balance Update',
        icon: 'account-balance',
        iconLib: 'MaterialCommunityIcons',
        color: '#2196F3',
    },
    loan_alert: {
        label: 'Loan Due',
        icon: 'alert-circle',
        iconLib: 'MaterialCommunityIcons',
        color: '#F44336',
    },
};

function renderIcon(type: SMSAlert['type'], size = 22): React.ReactNode {
    const cfg = ALERT_CONFIG[type];
    return (
        <MaterialCommunityIcons name={cfg.icon as any} size={size} color={cfg.color} />
    );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
    alert: SMSAlert;
    onPress: () => void;
    onDelete: () => void;
}

function AlertCard({ alert, onPress, onDelete }: AlertCardProps) {
    const { colors } = useTheme();
    const cfg = ALERT_CONFIG[alert.type];

    const date = new Date(alert.createdAt);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderLeftColor: cfg.color,
                    opacity: alert.isRead ? 0.75 : 1,
                },
            ]}
            activeOpacity={0.85}
        >
            {/* Unread dot */}
            {!alert.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
            )}

            {/* Icon */}
            <View style={[styles.iconBox, { backgroundColor: cfg.color + '22' }]}>
                {renderIcon(alert.type)}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.row}>
                    <ThemedText style={styles.title} numberOfLines={1}>
                        {alert.title}
                    </ThemedText>
                    <ThemedText style={[styles.dateText, { color: colors.subtitle }]}>
                        {dateStr}
                    </ThemedText>
                </View>
                <ThemedText style={[styles.body, { color: colors.subtitle }]} numberOfLines={2}>
                    {alert.body}
                </ThemedText>
                <ThemedText style={[styles.timeText, { color: colors.subtitle }]}>
                    {timeStr}
                </ThemedText>
            </View>

            {/* Delete */}
            <TouchableOpacity
                onPress={onDelete}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="trash-outline" size={18} color={colors.subtitle} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyAlerts({ colors }: { colors: any }) {
    return (
        <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={56} color={colors.subtitle} />
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                No alerts yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.subtitle }]}>
                SIP confirmations, EMI deductions, balance{'\n'}updates and loan reminders will appear here.
            </ThemedText>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AlertsScreen() {
    const { colors } = useTheme();
    const { alerts, isLoading, fetchAlerts, markRead, markAllRead, deleteAlert, unreadCount } = useAlertStore();

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handlePress = useCallback((alert: SMSAlert) => {
        if (!alert.isRead) markRead(alert.id);
    }, [markRead]);

    const handleDelete = useCallback((id: string) => {
        Alert.alert('Delete alert', 'Remove this alert?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteAlert(id) },
        ]);
    }, [deleteAlert]);

    const handleMarkAllRead = useCallback(() => {
        if (unreadCount === 0) return;
        markAllRead();
    }, [markAllRead, unreadCount]);

    if (isLoading && alerts.length === 0) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header actions */}
            {alerts.length > 0 && (
                <View style={styles.headerActions}>
                    <ThemedText style={[styles.countText, { color: colors.subtitle }]}>
                        {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                        {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
                    </ThemedText>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={handleMarkAllRead}>
                            <ThemedText style={[styles.markAllText, { color: colors.primary }]}>
                                Mark all read
                            </ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlatList
                data={alerts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={alerts.length === 0 ? styles.emptyContainer : styles.listContent}
                renderItem={({ item }) => (
                    <AlertCard
                        alert={item}
                        onPress={() => handlePress(item)}
                        onDelete={() => handleDelete(item.id)}
                    />
                )}
                ListEmptyComponent={<EmptyAlerts colors={colors} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    countText: {
        fontSize: 13,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 10,
    },
    emptyContainer: {
        flex: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: 4,
        gap: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: 10,
        right: 44,
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    content: {
        flex: 1,
        gap: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: 6,
    },
    dateText: {
        fontSize: 12,
    },
    body: {
        fontSize: 13,
        lineHeight: 18,
    },
    timeText: {
        fontSize: 11,
        marginTop: 2,
    },
    deleteBtn: {
        paddingLeft: 4,
        paddingTop: 2,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
