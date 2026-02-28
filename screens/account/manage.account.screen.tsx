import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput, ScrollView } from 'react-native';
import { useAccountStore } from '@/stores/accountStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { Card } from '@/components/common/Card';
import { tokens } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useCurrency } from '@/hooks/useCurrency';

export const ManageAccountScreen = () => {
    const { colors, isDark } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { accounts, removeAccount, addAccount, editAccount } = useAccountStore();

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "Delete Account",
            `Are you sure you want to delete ${name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeAccount(id);
                            // Best-effort remote delete if online. The user id would be needed for a robust sync, but we use match.
                            supabase.from('accounts').delete().eq('id', id).then();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete account');
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!editingAccount?.name || !editingAccount?.provider) {
            Alert.alert('Validation Error', 'Account Name and Bank/Provider are required.');
            return;
        }

        try {
            if (editingAccount.id) {
                // Update
                const accToUpdate = accounts.find(a => a.id === editingAccount.id);
                if (accToUpdate) {
                    const finalAcc = { ...accToUpdate, ...editingAccount } as Account;
                    await editAccount(finalAcc);
                    supabase.from('accounts').update({
                        account_name: finalAcc.name,
                        provider: finalAcc.provider,
                        account_number: finalAcc.accountNumber,
                        metadata: { icon: finalAcc.icon, color: finalAcc.color }
                    }).eq('id', finalAcc.id).then();
                }
            } else {
                // Create
                const newAcc: Account = {
                    id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    name: editingAccount.name,
                    type: editingAccount.type || 'bank',
                    balance: editingAccount.balance || 0,
                    currency: editingAccount.currency || 'INR',
                    isIncludeInNetWorth: editingAccount.isIncludeInNetWorth ?? true,
                    color: editingAccount.color || colors.primary,
                    icon: editingAccount.icon || '🏦',
                    provider: editingAccount.provider,
                    accountNumber: editingAccount.accountNumber || undefined,
                };
                await addAccount(newAcc);
                supabase.from('accounts').insert({
                    id: newAcc.id,
                    user_id: '00000000-0000-0000-0000-000000000001', // placeholder
                    type: newAcc.type,
                    provider: newAcc.provider,
                    account_number: newAcc.accountNumber,
                    account_name: newAcc.name,
                    balance: newAcc.balance,
                    currency: newAcc.currency,
                    metadata: { color: newAcc.color, icon: newAcc.icon }
                }).then();
            }
            setIsFormVisible(false);
            setEditingAccount(null);
        } catch (err) {
            Alert.alert('Error', 'Failed to save account');
        }
    };

    if (isFormVisible) {
        return (
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={[styles.header, { marginBottom: 30 }]}>
                    <TouchableOpacity onPress={() => { setIsFormVisible(false); setEditingAccount(null); }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText variant="h2" style={{ marginLeft: 15 }}>
                        {editingAccount?.id ? 'Edit Account' : 'New Account'}
                    </ThemedText>
                </View>

                <View style={{ gap: 20 }}>
                    <View>
                        <ThemedText variant="body2" style={{ marginBottom: 5 }}>Display Name *</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                            value={editingAccount?.name || ''}
                            onChangeText={(text) => setEditingAccount(prev => ({ ...prev, name: text }))}
                            placeholder="e.g., Chase Primary"
                            placeholderTextColor={colors.text + '80'}
                        />
                    </View>
                    <View>
                        <ThemedText variant="body2" style={{ marginBottom: 5 }}>Bank / Provider *</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                            value={editingAccount?.provider || ''}
                            onChangeText={(text) => setEditingAccount(prev => ({ ...prev, provider: text }))}
                            placeholder="e.g., Chase Bank"
                            placeholderTextColor={colors.text + '80'}
                        />
                    </View>
                    <View>
                        <ThemedText variant="body2" style={{ marginBottom: 5 }}>Account Number (Last 4) </ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                            value={editingAccount?.accountNumber || ''}
                            onChangeText={(text) => setEditingAccount(prev => ({ ...prev, accountNumber: text }))}
                            placeholder="e.g., 1234"
                            keyboardType="numeric"
                            placeholderTextColor={colors.text + '80'}
                        />
                    </View>
                    {!editingAccount?.id && (
                        <View>
                            <ThemedText variant="body2" style={{ marginBottom: 5 }}>Starting Balance</ThemedText>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                                value={editingAccount?.balance?.toString() || ''}
                                onChangeText={(text) => setEditingAccount(prev => ({ ...prev, balance: parseFloat(text) || 0 }))}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor={colors.text + '80'}
                            />
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 40 }]}
                    onPress={handleSave}
                >
                    <ThemedText variant="h3" style={{ color: '#fff' }}>Save Account</ThemedText>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <ThemedText variant="h2" style={{ marginLeft: 15 }}>Manage Accounts</ThemedText>

                <TouchableOpacity
                    style={{ marginLeft: 'auto' }}
                    onPress={() => {
                        setEditingAccount({ type: 'bank', balance: 0, currency: 'INR' });
                        setIsFormVisible(true);
                    }}
                >
                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={accounts}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20, gap: 15 }}
                renderItem={({ item }) => (
                    <Card variant="elevated" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }] as any}>
                        <View style={styles.cardInfo}>
                            <View style={[styles.iconBox, { backgroundColor: item.color || colors.primary }] as any}>
                                <ThemedText variant="h2">{item.icon || '🏦'}</ThemedText>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <ThemedText variant="h3">{item.name}</ThemedText>
                                    <ThemedText variant="h3" style={{ color: item.balance >= 0 ? colors.success : colors.error }}>
                                        {formatCurrency(item.balance)}
                                    </ThemedText>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <ThemedText variant="body2" style={{ opacity: 0.7 }}>
                                        {item.provider} {item.accountNumber ? `••••${item.accountNumber}` : ''}
                                    </ThemedText>

                                    {item.lastModified && (
                                        <ThemedText variant="caption" style={{ opacity: 0.5 }}>
                                            Updated {new Date(item.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </ThemedText>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingAccount(item); setIsFormVisible(true); }}>
                                <Ionicons name="pencil" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id, item.name)}>
                                <Ionicons name="trash" size={20} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderWidth: 1,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 15,
    },
    actionBtn: {
        padding: 5,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    saveButton: {
        height: 55,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
