import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { fontSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import useThemeStore from "@/stores/themeStore";
import { Screen } from "@/components/layout/Screen";

export default function SettingsScreen() {
    const { colors, tokens } = useTheme();
    const { theme, setTheme } = useThemeStore();
    const [courseUpdates, setcourseUpdates] = useState<any>("");
    const [supportTicketResponse, setsupportTicketResponse] = useState<any>("");
    const [latestUpdates, setlatestUpdates] = useState<any>("");

    // useEffect(() => {
    //   const checkForPreferences = async () => {
    //     const courseUpdates = await AsyncStorage.getItem("courseUpdates");
    //     const supportTicketResponse = await AsyncStorage.getItem(
    //       "supportTicketResponse"
    //     );
    //     const latestUpdates = await AsyncStorage.getItem("latestUpdates");

    //     if (courseUpdates || supportTicketResponse || latestUpdates) {
    //       setcourseUpdates(courseUpdates === "true" ? true : false);
    //       setsupportTicketResponse(
    //         supportTicketResponse === "true" ? true : false
    //       );
    //       setlatestUpdates(latestUpdates === "true" ? true : false);
    //     } else {
    //       await AsyncStorage.setItem("courseUpdates", "true");
    //       await AsyncStorage.setItem("supportTicketResponse", "true");
    //       await AsyncStorage.setItem("latestUpdates", "true");

    //       setcourseUpdates(true);
    //       setsupportTicketResponse(true);
    //       setlatestUpdates(true);
    //     }
    //   };
    //   checkForPreferences();
    // }, []);

    // const updatePreferences = async (e: string) => {
    //   if (e === "courseUpdates") {
    //     setcourseUpdates(!courseUpdates);
    //     const value = !courseUpdates;
    //     await AsyncStorage.setItem("courseUpdates", value.toString());
    //   } else if (e === "supportTicketResponse") {
    //     setsupportTicketResponse(!supportTicketResponse);
    //     const value = !supportTicketResponse;
    //     await AsyncStorage.setItem("supportTicketResponse", value.toString());
    //   } else {
    //     setlatestUpdates(!latestUpdates);
    //     const value = !latestUpdates;
    //     await AsyncStorage.setItem("latestUpdates", value.toString());
    //   }
    // };

    return (
        <Screen
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <StatusBar />

            {/* header item */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 50,
                    backgroundColor: colors.background,
                    paddingHorizontal: 20,
                    paddingBottom: 10,
                    shadowColor: colors.accent,
                    shadowOpacity: 0.1,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 1,
                    elevation: 5,
                }}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                    <AntDesign
                        name="left"
                        size={20}
                        color={colors.primary}
                    />
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: fontSizes.FONT20,
                        }}
                    >
                        Back
                    </Text>
                </Pressable>
                <Text
                    style={{
                        color: colors.text,
                        textAlign: "center",
                        //   width: scale(220),
                        fontSize: fontSizes.FONT22,
                    }}
                >
                    Settings
                </Text>
            </View>

            <ScrollView style={{ padding: 20 }}>
                <Text
                    style={[
                        styles.sectionHeader,
                        { color: colors.text },
                    ]}
                >
                    Push Notifications
                </Text>
                <View style={styles.settingItem}>
                    <Text
                        style={[styles.normalText, { color: colors.text }]}
                    >
                        Course Updates
                    </Text>
                    <Switch
                        value={courseUpdates}
                    //   onValueChange={() => updatePreferences("courseUpdates")}
                    />
                </View>

                <View style={styles.settingItem}>
                    <Text
                        style={[styles.normalText, { color: colors.text }]}
                    >
                        Support Ticket Response
                    </Text>
                    <Switch
                        value={supportTicketResponse}
                    //   onValueChange={() => updatePreferences("supportTicketResponse")}
                    />
                </View>

                <View style={styles.settingItem}>
                    <Text
                        style={[styles.normalText, { color: colors.text }]}
                    >
                        Latest Updates
                    </Text>
                    <Switch
                        value={latestUpdates}
                    //   onValueChange={() => updatePreferences("latestUpdates")}
                    />
                </View>

                <View style={styles.settingSection}>
                    <Text
                        style={[
                            styles.sectionHeader,
                            { color: colors.text },
                        ]}
                    >
                        Appearance
                    </Text>
                    <View style={styles.settingItem}>
                        <Text
                            style={[
                                styles.normalText,
                                { color: colors.text },
                            ]}
                        >
                            App Theme
                        </Text>
                        <Switch />
                    </View>
                    <Pressable onPress={() => router.push("/(routes)/settings/themes")} style={styles.settingItem}>
                        <Text
                            style={[
                                styles.normalText,
                                { color: colors.text },
                            ]}
                        >
                            Personalization
                        </Text>

                    </Pressable>
                    <View style={styles.settingItem}>
                        <Text
                            style={[
                                styles.normalText,
                                { color: colors.text },
                            ]}
                        >
                            Data
                        </Text>

                    </View>

                   
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    settingSection: {
        marginBottom: 30,
    },
    sectionHeader: {
        fontSize: fontSizes.FONT23,
        fontFamily: "Poppins_600SemiBold",
        marginBottom: 10,
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    normalText: {
        fontSize: fontSizes.FONT19,
        opacity: 0.9,
        fontFamily: "Poppins_500Medium",
    },
});