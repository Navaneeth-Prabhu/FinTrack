import { TransactionList } from '@/components/transactions';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import { Transaction } from '@/types';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';

const SearchTransactionScreen = () => {
    const { colors } = useTheme();
    const { transactions } = useTransactionStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Debounce the search query
    useEffect(() => {
        setIsSearching(true);
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setIsSearching(false);
        }, 300); // 300ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    // Memoized search function to prevent recreation on every render
    const performSearch = useCallback((query: string, transactionList: Transaction[]) => {
        if (query.trim() === '') {
            return [];
        }

        const lowerQuery = query.toLowerCase().trim();
        
        return transactionList.filter((transaction: Transaction) => {
            const { amount, category, note, paidTo } = transaction;
            
            // Convert amount to string once and cache it
            const amountStr = amount.toString();
            
            return (
                amountStr.includes(lowerQuery) || // Match amount
                category.name.toLowerCase().includes(lowerQuery) || // Match category name
                (note && note.toLowerCase().includes(lowerQuery)) || // Match notes
                (paidTo && paidTo.toLowerCase().includes(lowerQuery)) // Match recipient
            );
        });
    }, []);

    // Memoized filtered transactions - only recalculate when debounced query or transactions change
    const filteredTransactions = useMemo(() => {
        return performSearch(debouncedSearchQuery, transactions);
    }, [debouncedSearchQuery, transactions, performSearch]);

    // Handle input change with immediate UI update
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    // Determine what to show based on search state
    const renderContent = () => {
        if (searchQuery.trim() === '') {
            return (
                <View style={styles.placeholderContainer}>
                    <Text style={[styles.placeholderText, { color: colors.subtitle }]}>
                        Start typing to search transactions
                    </Text>
                </View>
            );
        }

        if (isSearching) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.subtitle }]}>
                        Searching...
                    </Text>
                </View>
            );
        }

        if (filteredTransactions.length === 0) {
            return (
                <View style={styles.noResultsContainer}>
                    <Text style={[styles.noResultsText, { color: colors.subtitle }]}>
                        No transactions found for "{debouncedSearchQuery}"
                    </Text>
                </View>
            );
        }

        return (
            <TransactionList 
                transactions={filteredTransactions} 
                overView={false} 
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    placeholder="Search by amount, category, or recipient"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    style={[
                        styles.searchInput, 
                        { 
                            borderColor: colors.border, 
                            color: colors.text,
                            backgroundColor: colors.background 
                        }
                    ]}
                    placeholderTextColor={colors.subtitle}
                    returnKeyType="search"
                    clearButtonMode="while-editing" // iOS only
                />
                {isSearching && (
                    <View style={styles.searchIndicator}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                )}
            </View>
            
            <View style={styles.resultsContainer}>
                {renderContent()}
            </View>
            
            {/* Show results count when there are results */}
            {filteredTransactions.length > 0 && (
                <View style={styles.resultsCount}>
                    <Text style={[styles.resultsCountText, { color: colors.subtitle }]}>
                        {filteredTransactions.length} result{filteredTransactions.length !== 1 ? 's' : ''} found
                    </Text>
                </View>
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
    searchContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    searchInput: {
        borderWidth: 1,
        padding: 12,
        paddingRight: 40, // Space for loading indicator
        borderRadius: 10,
        fontSize: 16,
    },
    searchIndicator: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
    resultsContainer: {
        flex: 1,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    placeholderText: {
        fontSize: 16,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 14,
        marginTop: 8,
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    noResultsText: {
        fontSize: 16,
        textAlign: 'center',
    },
    resultsCount: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    resultsCountText: {
        fontSize: 12,
    },
});