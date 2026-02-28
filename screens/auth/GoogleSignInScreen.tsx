import React, { useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useSupabaseAuthStore } from '@/stores/supabaseAuthStore';

// Required to handle the OAuth redirect back properly on Android/iOS
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface Props {
    onSuccess?: () => void;
    onSkip?: () => void;
}

export default function GoogleSignInScreen({ onSuccess, onSkip }: Props) {
    const { colors, getShadow, tokens } = useTheme();
    const { signInWithGoogle, isLoading } = useSupabaseAuthStore();

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    });

    const handleGoogleResponse = useCallback(async () => {
        if (response?.type !== 'success') return;

        const { id_token, access_token } = response.params;
        if (!id_token) {
            Alert.alert('Sign in failed', 'Could not get ID token from Google.');
            return;
        }

        try {
            await signInWithGoogle(id_token, access_token);
            onSuccess?.();
        } catch (err: any) {
            Alert.alert('Sign in failed', err?.message ?? 'Please try again.');
        }
    }, [response, signInWithGoogle, onSuccess]);

    useEffect(() => {
        handleGoogleResponse();
    }, [handleGoogleResponse]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.inner}>
                {/* Header */}
                <View style={styles.headerSection}>
                    <View style={[styles.logoBox, { backgroundColor: colors.card, ...getShadow(3) }]}>
                        {/* Purple FT logo placeholder */}
                        <ThemedText style={[styles.logoText, { color: colors.primary }]}>FT</ThemedText>
                    </View>
                    <ThemedText variant="h1" style={styles.title}>Sync your data</ThemedText>
                    <ThemedText style={[styles.subtitle, { color: colors.subtitle }]}>
                        Sign in with the same Google account you use on the web. Your transactions, categories, and budgets will sync seamlessly.
                    </ThemedText>
                </View>

                {/* Features list */}
                <View style={[styles.featureCard, { backgroundColor: colors.card, ...getShadow(1) }]}>
                    {[
                        ['🔄', 'Cross-device sync', 'Same data on mobile & web'],
                        ['🔐', 'Secure auth', 'Supabase-backed, zero data leaves your account'],
                        ['📲', 'SMS + web together', 'SMS transactions merge with web imports'],
                    ].map(([icon, title, desc]) => (
                        <View key={title} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                            <ThemedText style={styles.featureIcon}>{icon}</ThemedText>
                            <View style={styles.featureText}>
                                <ThemedText style={styles.featureTitle}>{title}</ThemedText>
                                <ThemedText style={[styles.featureDesc, { color: colors.subtitle }]}>{desc}</ThemedText>
                            </View>
                        </View>
                    ))}
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={[styles.googleButton, getShadow(2), (!request || isLoading) && styles.buttonDisabled]}
                    onPress={() => promptAsync()}
                    disabled={!request || isLoading}
                    activeOpacity={0.85}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <View style={styles.googleIconWrapper}>
                                <ThemedText style={styles.googleG}>G</ThemedText>
                            </View>
                            <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
                        </>
                    )}
                </TouchableOpacity>

                {/* Skip */}
                {onSkip && (
                    <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                        <ThemedText style={[styles.skipText, { color: colors.subtitle }]}>
                            Skip for now — use locally only
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        gap: 24,
    },
    headerSection: {
        alignItems: 'center',
        gap: 12,
    },
    logoBox: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
    },
    title: {
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 15,
    },
    featureCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    featureIcon: {
        fontSize: 24,
        width: 36,
        textAlign: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
    },
    googleButton: {
        backgroundColor: '#4285F4',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    googleIconWrapper: {
        backgroundColor: 'white',
        width: 26,
        height: 26,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleG: {
        color: '#4285F4',
        fontWeight: '800',
        fontSize: 16,
    },
    googleButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
    },
});
