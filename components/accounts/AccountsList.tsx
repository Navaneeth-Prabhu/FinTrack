import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccountStore } from '@/stores/accountStore';
import { ThemedText } from '@/components/common/ThemedText';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const AccountsList = () => {
    const { colors } = useTheme();
    const { accounts } = useAccountStore();

    const handleCreateAccount = () => {
        router.push('/account/manage');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ThemedText variant="h2">My Accounts</ThemedText>
                <TouchableOpacity onPress={handleCreateAccount}>
                    <ThemedText variant="body2" style={{ color: colors.primary }}>Manage</ThemedText>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <TouchableOpacity activeOpacity={0.8} onPress={handleCreateAccount}>
                    <View style={[styles.card, styles.addCard, { borderColor: colors.border, backgroundColor: colors.background }] as any}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.cardForeground }]}>
                            <MaterialIcons name="add" size={24} color={colors.primary} />
                        </View>
                        <ThemedText variant="body1" style={{ marginTop: tokens.spacing.sm, textAlign: 'center' }}>
                            Add New{'\n'}Account
                        </ThemedText>
                    </View>
                </TouchableOpacity>

                {accounts.map((account) => (
                    <Card
                        key={account.id}
                        variant="elevated"
                        style={[styles.card, { backgroundColor: account.color || colors.card }] as any}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <ThemedText variant="h2">{account.icon || '🏦'}</ThemedText>
                            </View>
                        </View>
                        <View style={styles.cardBody}>
                            <ThemedText variant="body2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {account.type.toUpperCase()}
                            </ThemedText>
                            <ThemedText variant="h3" style={{ color: '#fff', marginVertical: 2 }}>
                                {account.name}
                            </ThemedText>
                            {account.accountNumber && (
                                <ThemedText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    •••• {account.accountNumber}
                                </ThemedText>
                            )}
                        </View>
                        <View style={styles.cardFooter}>
                            <ThemedText variant="h2" style={{ color: '#fff' }}>
                                ₹{account.balance?.toFixed(2) || '0.00'}
                            </ThemedText>
                        </View>
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: tokens.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: tokens.spacing.md,
        gap: tokens.spacing.sm,
    },
    card: {
        width: 160,
        height: 180,
        padding: tokens.spacing.md,
        justifyContent: 'space-between',
    },
    addCard: {
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        flex: 1,
        justifyContent: 'center',
    },
    cardFooter: {
        marginTop: 'auto',
    },
});
