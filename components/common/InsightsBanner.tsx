import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useInsightsStore } from '@/stores/insightsStore';
import { ThemedText } from './ThemedText';

const { width } = Dimensions.get('window');

export const InsightsBanner = () => {
    const { colors, tokens } = useTheme();
    const { insights, fetchInsights, isLoading } = useInsightsStore();

    useEffect(() => {
        fetchInsights();
    }, []);

    if (isLoading || insights.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingHorizontal: tokens.spacing.md }]}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>Smart Insights</ThemedText>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.sm }}
                snapToInterval={width * 0.7 + tokens.spacing.sm}
                snapToAlignment={"start"}
                decelerationRate="fast"
            >
                {insights.map((insight) => (
                    <View
                        key={insight.id}
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.card,
                                borderColor: insight.severity === 'warning' ? '#F59E0B' :
                                    insight.severity === 'positive' ? '#10B981' : colors.border,
                            }
                        ]}
                    >
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>{insight.icon}</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <ThemedText style={styles.title} numberOfLines={1}>{insight.title}</ThemedText>
                            <ThemedText style={[styles.subtitle, { color: colors.subtitle }]} numberOfLines={2}>
                                {insight.subtitle}
                            </ThemedText>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    header: {
        marginBottom: 12,
    },
    card: {
        width: width * 0.7,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 20,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
    }
});
