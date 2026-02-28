import React from 'react';
import { View, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSmsSyncStore } from '@/stores/smsSyncStore';
import { useTheme } from '@/hooks/useTheme';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    withTiming
} from 'react-native-reanimated';
import { ThemedText } from '../common/ThemedText';

const { width } = Dimensions.get('window');

export function GlobalSmsSyncModal() {
    const { isSyncing, totalMessages, currentProgress, statusMessage } = useSmsSyncStore();
    const { colors, isDark } = useTheme();

    if (!isSyncing) return null;

    // Calculate generic progress percentage safely
    const progressPercent = totalMessages > 0 ? (currentProgress / totalMessages) * 100 : 0;
    // If we are in "Analyzing" phase but progress isn't updating per SMS (because it uses Promise.all locally),
    // we just show an indeterminate-like full bar, or stick to 0. We've added currentProgress mostly for the saving stage.
    const displayPercent = progressPercent > 0 ? progressPercent : 15; // Give a small default width so it looks active

    const progressBarAnimatedStyle = useAnimatedStyle(() => {
        return {
            width: withTiming(`${displayPercent}%`, { duration: 300 }),
        };
    });

    return (
        <Modal transparent visible={isSyncing} animationType="fade">
            <View style={styles.overlay}>
                <BlurView
                    intensity={40}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />

                <Animated.View
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(300)}
                    style={[styles.modalCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                >
                    <View style={styles.iconRing}>
                        <View style={[styles.iconInner, { backgroundColor: colors.primary + '20' }]}>
                            <ThemedText style={{ fontSize: 24 }}>💬</ThemedText>
                        </View>
                    </View>

                    <ThemedText style={styles.title}>
                        Syncing Messages
                    </ThemedText>

                    <ThemedText style={styles.message} variant="body2">
                        {statusMessage}
                    </ThemedText>

                    <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                { backgroundColor: colors.primary },
                                progressBarAnimatedStyle
                            ]}
                        />
                    </View>

                    <View style={styles.footer}>
                        <ThemedText style={styles.statsText}>
                            {currentProgress > 0 ? `${currentProgress} / ${totalMessages}` : `${totalMessages} Found`}
                        </ThemedText>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 20,
    },
    modalCard: {
        width: width * 0.85,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    iconRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 24,
        fontSize: 14,
    },
    progressContainer: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    statsText: {
        fontSize: 12,
        opacity: 0.5,
        fontWeight: '600',
    }
});
