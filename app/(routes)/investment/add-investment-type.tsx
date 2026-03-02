import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface InvestmentType {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
}

const INVESTMENT_TYPES: InvestmentType[] = [
    {
        id: 'mf_sip',
        title: 'Mutual Fund / SIP',
        description: 'Track systematic investment plans and lump sum mutual funds',
        icon: 'trending-up',
        route: '/investment/add-sip'
    },
    {
        id: 'stock',
        title: 'Stock / Equity',
        description: 'Direct market investments, shares, and ETFs',
        icon: 'bar-chart',
        route: '/investment/add-holding?type=stock'
    },
    {
        id: 'fd',
        title: 'Fixed Deposit',
        description: 'Bank FDs and corporate deposits',
        icon: 'business',
        route: '/investment/add-holding?type=fd'
    },
    {
        id: 'bond',
        title: 'Bond / Debenture',
        description: 'Government bonds, SGBs, and corporate bonds',
        icon: 'document-text',
        route: '/investment/add-holding?type=bond'
    },
    {
        id: 'gold',
        title: 'Gold',
        description: 'Physical gold, digital gold, and coins',
        icon: 'aperture', // closest generic to gold/coin
        route: '/investment/add-holding?type=gold'
    },
    {
        id: 'ppf_nps',
        title: 'PPF / NPS',
        description: 'Public Provident Fund and National Pension Scheme',
        icon: 'shield-checkmark',
        route: '/investment/add-holding?type=ppf'
    },
    {
        id: 'other',
        title: 'Other',
        description: 'Crypto, real estate, or custom assets',
        icon: 'apps',
        route: '/investment/add-holding?type=other'
    },
];

export default function AddInvestmentTypeScreen() {
    const { colors, getShadow } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <ThemedText variant="h2" style={styles.title}>Add Investment</ThemedText>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <ThemedText style={[styles.subtitle, { color: colors.subtitle }]}>
                    What type of investment would you like to add?
                </ThemedText>

                <View style={styles.list}>
                    {INVESTMENT_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[styles.card, { backgroundColor: colors.card }, getShadow(1)]}
                            onPress={() => router.push(type.route as any)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                                <Ionicons name={type.icon} size={24} color={colors.primary} />
                            </View>
                            <View style={styles.cardContent}>
                                <ThemedText style={styles.cardTitle}>{type.title}</ThemedText>
                                <ThemedText style={[styles.cardDesc, { color: colors.subtitle }]}>
                                    {type.description}
                                </ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.subtitle} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 24,
    },
    list: {
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
    },
});
