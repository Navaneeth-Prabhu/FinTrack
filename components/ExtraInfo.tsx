import { useTheme } from "@/hooks/useTheme";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { ThemedText } from "./common/ThemedText";
import { fontSizes, tokens } from "@/constants/theme";
import { ChartLine } from "lucide-react-native";
import { Card } from "./common/Card";
import { Touchable } from "react-native";
import { router } from "expo-router";

export function ExtraInfo() {
    const { colors } = useTheme();
    const data = [
        { id: '1', title: 'AI Research', description: 'Latest insights on AI and finance.', variant: 'elevated' },
        { id: '2', title: 'Highest Income', amount: '$430.21', description: 'You earned $5,000 this month.', variant: 'default' },
        { id: '3', title: 'Expenses', description: 'Your expenses increased by 10%.', variant: 'outlined' },
    ];

    return (
        <FlatList
            data={data}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <Card variant="default" style={{ marginHorizontal: 10, width: 240, padding: tokens.spacing.md, alignItems: 'flex-start', }}>
                    <TouchableOpacity onPress={() => router.push('/(routes)/ai/chat') } style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground, }]}>
                            <ChartLine color={colors.primary} size={18} />
                        </View>
                        <Text style={{ fontWeight: tokens.fontWeight.medium, fontSize: fontSizes.FONT16, color: colors.text, flex: 1 }}>{item.title}</Text>
                    </TouchableOpacity >
                    {
                        item.amount && (
                            <Text style={{
                                fontSize: fontSizes.FONT28, color: colors.text,
                                fontWeight: tokens.fontWeight.semibold, marginVertical: 4
                            }}>
                                {item.amount}
                            </Text>
                        )
                    }
                    <ThemedText style={{ fontSize: fontSizes.FONT14, color: colors.subtitle }}>{item.description}</ThemedText>
                </Card>
            )}
            contentContainerStyle={{ paddingHorizontal: 6 }}
            showsHorizontalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        justifyContent: 'flex-start',
        gap: 10,
        flex: 1,
    },
    iconContainer: {
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        padding: 8,
        alignSelf: 'center',
    }
})
