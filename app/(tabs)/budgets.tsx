import { Button } from "@/components/common/Button";
import { ThemedText } from "@/components/common/ThemedText";
import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";

// Example usage in a screen
export default function Budget() {
    const { colors } = useTheme();
    return (
        <Screen>
            <Header
                title="Budget Details"
            />
            <ThemedText>
                asdfasdf
            </ThemedText>
        </Screen>
    );
}