import { TransactionList } from '@/components/transactions';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import { Transaction } from '@/types';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';

const SearchTransactionScreen = () => {
    const { colors } = useTheme();
    const { transactions } = useTransactionStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

    // Handle search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (query.trim() === '') {
            setFilteredTransactions([]); // Reset if the query is empty
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = transactions.filter((transaction: Transaction) => {
            const { amount, category, note, paidTo } = transaction;
            return (
                amount.toString().includes(lowerQuery) || // Match amount
                category.name.toLowerCase().includes(lowerQuery) || // Match category name
                (note && note.toLowerCase().includes(lowerQuery)) || // Match notes
                (paidTo && paidTo.toLowerCase().includes(lowerQuery)) // Match recipient
            );
        });

        setFilteredTransactions(filtered);
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Search by amount, category, or recipient"
                autoCapitalize="none"
                autoCorrect={false}
                value={searchQuery}
                onChangeText={handleSearch}
                style={[styles.searchInput, { borderColor: colors.border, color: colors.text }]}
                placeholderTextColor={colors.subtitle}
            />
            {searchQuery.trim() !== '' && (
                <TransactionList transactions={filteredTransactions} overView={false} />
            )}
        </View>
    );
};

export default SearchTransactionScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    searchInput: {
        borderWidth: 1,
        padding: 10,
        borderRadius: 10,
        marginBottom: 16,
    },
    transactionItem: {
        borderWidth: 1,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    transactionText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    transactionDetails: {
        fontSize: 14,
        marginTop: 4,
    },
    noResults: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
});
