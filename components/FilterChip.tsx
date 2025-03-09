import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ThemedText } from './common/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ActiveFilterChipsProps {
    onPress: (filterId: string) => void;
    label: string;
    selected: boolean;
    selectedColor?: string
}

const FilterChip: React.FC<ActiveFilterChipsProps> = ({
    onPress,
    label,
    selected,
    selectedColor
}) => {

    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.chip, {
                // backgroundColor: selected ? colors.accent : colors.accent,
                borderColor: selected ? selectedColor : colors.accent,
                borderWidth: 2
            }]}
            onPress={() => onPress(label)}
        >
            <ThemedText style={styles.chipText}>{label}</ThemedText>
        </TouchableOpacity>
    )
}

export default FilterChip

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 50,
    },
    chipText: {
        fontSize: 16
    }
})