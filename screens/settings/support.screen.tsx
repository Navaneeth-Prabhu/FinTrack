import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ThemedText } from '@/components/common/ThemedText'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'

const SupportScreen = () => {
    const { colors } = useTheme();
    return (
        <View>
            {/* Support Section */}
            <View style={styles.sectionContainer}>
                <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <Ionicons name="help-buoy-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText,]}>Help Center</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="chat-question-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Support</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <MaterialCommunityIcons name="star-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>Rate App</ThemedText>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                            <Ionicons name="information-circle-outline" size={20} color={isDarkMode ? darkThemeColor : themeColor} />
                        </View>
                        <ThemedText style={[styles.menuText]}>About</ThemedText>
                        <Text style={styles.subText}>v1.0.0</Text>
                        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#6E6E6E" : "#A0A0A0"} style={styles.chevron} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

export default SupportScreen

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        // borderBottomWidth: 1,
        marginBottom: 1,
        // borderBottomColor: '#F0F0F0',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        flex: 1,
    },
    subText: {
        fontSize: 14,
        color: '#8E8E93',
        marginRight: 8,
    }
})