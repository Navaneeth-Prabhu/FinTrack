import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Transaction } from '@/types';
import useEmailImport from '@/hooks/useGmailAuth';

export const EmailImportScreen: React.FC = () => {
    const {
        isAuthenticated,
        isAuthenticating,
        isImporting,
        error,
        lastImported,
        authenticate,
        signOut,
        checkAuth,
        importTransactions
    } = useEmailImport();

    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check authentication status when component mounts
    useEffect(() => {
        const check = async () => {
            await checkAuth();
            setIsCheckingAuth(false);
        };
        check();
    }, []);

    // Handle authentication
    const handleAuthenticate = async () => {
        const success = await authenticate();
        if (success) {
            Alert.alert('Success', 'Gmail account connected successfully.');
        }
    };

    // Handle import
    const handleImport = async () => {
        try {
            const transactions = await importTransactions();
            if (transactions.length === 0) {
                Alert.alert('No Transactions', 'No new transactions were found in your emails.');
            } else {
                Alert.alert('Success', `Imported ${transactions.length} transactions from your emails.`);
            }
        } catch (err) {
            Alert.alert('Error', error || 'Failed to import transactions.');
        }
    };

    // Render a transaction item
    const renderTransactionItem = ({ item }: { item: Transaction }) => (
        <View style={styles.transactionItem}>
            <View style={styles.transactionHeader}>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                <Text
                    style={[
                        styles.transactionAmount,
                        item.type === 'expense' ? styles.expenseText : styles.incomeText
                    ]}
                >
                    {item.type === 'expense' ? '-' : '+'}{item.amount}
                </Text>
            </View>
            <View style={styles.transactionDetails}>
                <Text style={styles.transactionCategory}>{item.category.name}</Text>
                <Text style={styles.transactionDate}>
                    {new Date(item.date).toLocaleDateString()}
                </Text>
            </View>
            {item.description && (
                <Text style={styles.transactionDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
        </View>
    );

    if (isCheckingAuth) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Checking authentication status...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Email Transaction Import</Text>

            {/* Authentication Section */}
            <View style={styles.authSection}>
                <Text style={styles.sectionTitle}>Gmail Connection</Text>

                {isAuthenticated ? (
                    <>
                        <View style={styles.connectedStatus}>
                            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                            <Text style={styles.connectedText}>Gmail account connected</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.disconnectButton}
                            onPress={signOut}
                            disabled={isImporting}
                        >
                            <Text style={styles.disconnectButtonText}>Disconnect Gmail</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.connectButton}
                        onPress={handleAuthenticate}
                        disabled={isAuthenticating}
                    >
                        {isAuthenticating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialIcons name="email" size={20} color="#FFFFFF" />
                                <Text style={styles.connectButtonText}>Connect Gmail Account</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Import Section */}
            {isAuthenticated && (
                <View style={styles.importSection}>
                    <Text style={styles.sectionTitle}>Import Transactions</Text>

                    <Text style={styles.infoText}>
                        Import transactions from your Gmail account. We'll scan your emails for receipts,
                        payment confirmations, and other financial notifications.
                    </Text>

                    <TouchableOpacity
                        style={styles.importButton}
                        onPress={handleImport}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialIcons name="download" size={20} color="#FFFFFF" />
                                <Text style={styles.importButtonText}>Import Transactions</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error" size={20} color="#D32F2F" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Imported Transactions */}
            {lastImported && lastImported.length > 0 && (
                <View style={styles.importedSection}>
                    <Text style={styles.sectionTitle}>Recently Imported</Text>
                    <Text style={styles.importedCount}>
                        {lastImported.length} transaction{lastImported.length !== 1 ? 's' : ''} imported
                    </Text>

                    <FlatList
                        data={lastImported}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTransactionItem}
                        contentContainerStyle={styles.transactionsList}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F5F7FA',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666666',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 24,
        color: '#333333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333333',
    },
    authSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    importSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    importedSection: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    connectButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    connectButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 16,
    },
    disconnectButton: {
        borderWidth: 1,
        borderColor: '#D32F2F',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    disconnectButtonText: {
        color: '#D32F2F',
        fontWeight: '500',
        fontSize: 14,
    },
    importButton: {
        backgroundColor: '#009688',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    importButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 16,
    },
    connectedStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    connectedText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333333',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
    },
    importedCount: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 8,
    },
    errorText: {
        color: 'red',
        fontSize: 14,
    },
    transactionsList: {
        flex: 1,
        marginTop: 8,
    },
});