import { Button } from "@/components/common/Button";
import { ThemedText } from "@/components/common/ThemedText";
import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import BudgetScreen from "@/screens/budget/budget.screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Example usage in a screen
export default function Budget() {
    return (
        <ErrorBoundary>
            <BudgetScreen />
        </ErrorBoundary>
    );
}