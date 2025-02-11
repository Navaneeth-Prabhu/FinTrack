import { Button } from "@/components/common/Button";
import { Text } from "@/components/common/Typography";
import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";

// Example usage in a screen
export default function TransactionDetails() {
    return (
        <Screen>
            <Header
                title="Budget Details"
            />
        </Screen>
    );
}