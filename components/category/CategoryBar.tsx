import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface CategoryBarProps {
    data: any[];
}
const CategoryBar: React.FC<CategoryBarProps> = ({ data }) => {
    const { colors } = useTheme();
    const router = useRouter()
    // Calculate total value
    const totalValue = data.reduce((sum: number, category: any) => sum + category.value, 0);

    return (
        <View style={[styles.container]}>
            <View style={styles.progressBarContainer}>
                {data.map((category: any, index: number) => {
                    const width = (category.value / totalValue) * 100; // Percentage of the total
                    return (
                        <View
                            key={index}
                            style={[styles.segment, { width: `${width}%`, backgroundColor: category.color, opacity: 0.9 }]}
                        />
                    );
                })}
            </View>

            {/* Legends and percentages */}
            <View style={styles.legendContainer}>
                {data.map((category: any, index: number) => {
                    let percentage = (category.value / totalValue) * 100;
                    percentage = percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1);

                    return (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                            <Text
                                style={[styles.legendText, { color: colors.text }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {category.label}: {percentage}%
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {

    },
    progressBarContainer: {
        flexDirection: 'row',
        width: '100%',
        height: 30,
        borderRadius: 5,
        overflow: 'hidden',
        gap: 4
    },
    segment: {
        height: '100%',
        borderRadius: 4
    },
    legendContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 10,
        gap: 10,
        flexWrap: 'wrap'
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    legendDot: {
        height: 10,
        width: 10,
        borderRadius: 10,
        marginRight: 5,
    },
    legendText: {
        textAlign: 'center',
        flexShrink: 1, // Allows text to shrink when too long
    },
});

export default CategoryBar;
