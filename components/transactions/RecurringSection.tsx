import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';

export const RecurringSection = ({
    isRecurringState,
    setIsRecurringState,
    recurringSchedule,
    setRecurringSchedule,
    isRecurring,
    formState,
    setShowStartDatePicker,
    setShowEndDatePicker,
    setShowTimePicker
}) => {
    const { colors } = useTheme();

    return (
        <View style={styles.recurringSection}>
            <View style={styles.recurringHeader}>
                <ThemedText>Make this a recurring transaction</ThemedText>
                <Switch
                    value={isRecurringState}
                    onValueChange={setIsRecurringState}
                    disabled={isRecurring || !!formState.recurringId} // Disable if editing recurring or linked instance
                />
            </View>
            {isRecurringState && (
                <View style={[styles.recurringOptions, { backgroundColor: colors.card, borderRadius: 8 }]}>
                    <Picker
                        selectedValue={recurringSchedule.frequency}
                        onValueChange={value => setRecurringSchedule((prev: any) => ({ ...prev, frequency: value }))}
                        style={[styles.picker, { backgroundColor: colors.card }]}
                    >
                        <Picker.Item label="Daily" value="daily" />
                        <Picker.Item label="Weekly" value="weekly" />
                        <Picker.Item label="Monthly" value="monthly" />
                        <Picker.Item label="Yearly" value="yearly" />
                    </Picker>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowStartDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>
                            Start: {format(new Date(recurringSchedule.startDate), 'MMM d, yyyy')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>Time: {recurringSchedule.time}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowEndDatePicker(true)}
                    >
                        <Text style={{ color: recurringSchedule.endDate ? colors.text : colors.subtitle }}>
                            End: {recurringSchedule.endDate
                                ? format(new Date(recurringSchedule.endDate), 'MMM d, yyyy')
                                : 'Never'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    recurringSection: {
        marginTop: 16,
        marginBottom: 16,
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recurringOptions: {
        marginTop: 8,
        padding: 16,
    },
    input: {
        width: '100%',
        height: 40,
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    picker: {
        marginBottom: 10,
        height: 40,
    },
});