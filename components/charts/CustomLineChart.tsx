import * as React from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { Area, CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle, LinearGradient, vec, useFont, DashPathEffect } from "@shopify/react-native-skia";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import SpaceMono from "@/assets/fonts/SpaceMono-Regular.ttf";
import { useTheme } from "@/hooks/useTheme";
import { tokens } from "@/constants/theme";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type ChartDataItem = {
    label: string;
    value: number | null;
    value2?: number | null;
};

interface CustomLineChartProps {
    data: ChartDataItem[];
    lineColor?: string;
    secondLineColor?: string;
    gradientColors?: string[];
    labelColor?: string;
    chartHeight?: number;
    yLabelCount?: number;
    curved?: boolean;
    showDots?: boolean;
    animate?: boolean;
    spendingLabel?: string;
    budgetLabel?: string;
}

function CustomLineChart({
    data,
    lineColor = "#6E88F7",
    secondLineColor = "#FF5555",
    gradientColors = ["#6E88F7", "#6E88F720"],
    labelColor = "white",
    chartHeight = 300,
    yLabelCount = 3,
    curved = false,
    showDots = false,
    animate = true,
    spendingLabel = "Spending",
    budgetLabel = "Budget",
}: CustomLineChartProps) {
    const { colors } = useTheme();
    const font = useFont(SpaceMono, 12);

    // Process data to match expected format
    type ChartPoint = { day: string; highTmp: number | null; budget?: number | null };
    const [chartData, setChartData] = React.useState<ChartPoint[]>([]);
    const [hasSecondLine, setHasSecondLine] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState("0.00 €");

    React.useEffect(() => {
        if (!data || data.length === 0) {
            setDisplayValue("0.00 €");
            return;
        }

        // Check if data has value2 property for the second line
        setHasSecondLine(data.some(item => 'value2' in item));

        // Transform data to match expected format
        const transformed = data.map(item => ({
            day: item.label,
            highTmp: item.value,
            // Only add budget if value2 exists
            ...(item.value2 !== undefined ? { budget: item.value2 } : {})
        }));

        setChartData(transformed);

        // Calculate total transaction amount (get the highest cumulative value)
        // Since your data is cumulative, the total is the last non-null value
        const validValues = data
            .filter(item => item.value !== null && item.value !== undefined && !isNaN(item.value))
            .map(item => item.value)
            .filter((v): v is number => v !== null && v !== undefined);

        const total = validValues.length > 0 ? Math.max(...validValues) : 0;
        const safeTotal = isNaN(total) || total === undefined || total === null ? 0 : total;

        setDisplayValue(`${safeTotal.toFixed(2)} €`);
    }, [data]);

    // Chart press state for interactive tooltips
    const { state, isActive } = useChartPressState({
        x: 0,
        y: { highTmp: 0, budget: 0 }
    });

    // Animated props for the spending value
    const animatedSpendingText = useAnimatedProps(() => {
        'worklet';
        let value = 0;
        try {
            if (state.y.highTmp?.value?.value !== undefined) {
                value = state.y.highTmp.value.value;
            } else if (state.y.highTmp?.value !== undefined) {
                value = state.y.highTmp.value;
            } else if (state.y?.highTmp !== undefined) {
                value = state.y.highTmp;
            }
        } catch (e) {
            value = 0;
        }
        const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        return {
            text: `${safeValue.toFixed(2)} €`,
        };
    }, []);

    // Animated props for the budget value
    const animatedBudgetText = useAnimatedProps(() => {
        'worklet';
        let value = 0;
        try {
            if (state.y.budget?.value?.value !== undefined) {
                value = state.y.budget.value.value;
            } else if (state.y.budget?.value !== undefined) {
                value = state.y.budget.value;
            } else if (state.y?.budget !== undefined) {
                value = state.y.budget;
            }
        } catch (e) {
            value = 0;
        }
        const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        return {
            text: `${safeValue.toFixed(2)} €`,
        };
    }, []);

    // Get current budget value for static display
    const getCurrentBudgetValue = () => {
        const validBudgetValues = data
            .filter(item => item.value2 !== null && item.value2 !== undefined && !isNaN(item.value2!))
            .map(item => item.value2!)
            .filter((v): v is number => v !== null && v !== undefined);
        
        const maxBudget = validBudgetValues.length > 0 ? Math.max(...validBudgetValues) : 0;
        return isNaN(maxBudget) || maxBudget === undefined || maxBudget === null ? 0 : maxBudget;
    };

    // If no data, return empty view
    if (!chartData || chartData.length === 0) {
        return <View style={{ height: chartHeight }} />;
    }

    return (
        <View style={{ height: chartHeight, padding: 16 }}>
            {/* Header with values */}
            <View style={styles.header}>
                {!isActive ? (
                    // Static values with legends
                    <View style={styles.valuesContainer}>
                        <View style={styles.valueRow}>
                            <View style={styles.legendContainer}>
                                <View style={[styles.legendDot, { backgroundColor: lineColor }]} />
                                <Text style={[styles.legendLabel, { color: labelColor }]}>{spendingLabel}</Text>
                            </View>
                            <Text style={[styles.valueText, { color: labelColor }]}>
                                {displayValue}
                            </Text>
                        </View>
                        
                        {hasSecondLine && (
                            <View style={styles.valueRow}>
                                <View style={styles.legendContainer}>
                                    <View style={[styles.legendDot, { backgroundColor: secondLineColor }]} />
                                    <Text style={[styles.legendLabel, { color: labelColor }]}>{budgetLabel}</Text>
                                </View>
                                <Text style={[styles.valueText, { color: labelColor, fontSize: tokens.fontSize.sm }]}>
                                    {getCurrentBudgetValue().toFixed(2)} €
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    // Animated values on hover
                    <View style={styles.valuesContainer}>
                        <View style={styles.valueRow}>
                            <View style={styles.legendContainer}>
                                <View style={[styles.legendDot, { backgroundColor: lineColor }]} />
                                <Text style={[styles.legendLabel, { color: labelColor }]}>{spendingLabel}</Text>
                            </View>
                            <AnimatedTextInput
                                editable={false}
                                underlineColorAndroid={'transparent'}
                                style={[styles.valueText, { color: labelColor }]}
                                animatedProps={animatedSpendingText}
                            />
                        </View>
                        
                        {hasSecondLine && (
                            <View style={styles.valueRow}>
                                <View style={styles.legendContainer}>
                                    <View style={[styles.legendDot, { backgroundColor: secondLineColor }]} />
                                    <Text style={[styles.legendLabel, { color: labelColor }]}>{budgetLabel}</Text>
                                </View>
                                <AnimatedTextInput
                                    editable={false}
                                    underlineColorAndroid={'transparent'}
                                    style={[styles.valueText, { color: labelColor, fontSize: tokens.fontSize.sm }]}
                                    animatedProps={animatedBudgetText}
                                />
                            </View>
                        )}
                    </View>
                )}
            </View>

            <CartesianChart
                data={chartData}
                xKey="day"
                yKeys={hasSecondLine ? ["highTmp", "budget"] : ["highTmp"]}
                axisOptions={{
                    font,
                    tickCount: yLabelCount,
                    labelOffset: { x: 2, y: 0 },
                    labelColor: labelColor,
                }}
                chartPressState={state}
                yAxis={[
                    {
                        labelOffset: 5,
                        font,
                        labelColor: labelColor,
                        lineColor: labelColor,
                        linePathEffect: <DashPathEffect intervals={[5, 5]} />,
                    },
                ]}
            >
                {({ points, chartBounds }) => (
                    <>
                        <Line
                            points={points.highTmp}
                            strokeCap={"round"}
                            color={lineColor}
                            strokeWidth={2}
                            animate={animate ? { type: "timing", duration: 500 } : undefined}
                        />

                        {/* Default circle at the end of value1 line (when not active) */}
                        {!isActive && points.highTmp && points.highTmp.length > 0 && (
                            (() => {
                                // Find the last non-null point
                                const lastValidPoint = points.highTmp
                                    .slice()
                                    .reverse()
                                    .find(point => point && point.y !== null && point.y !== undefined);

                                return lastValidPoint ? (
                                    <Circle
                                        cx={lastValidPoint.x}
                                        cy={lastValidPoint.y}
                                        r={4}
                                        color={lineColor}
                                    />
                                ) : null;
                            })()
                        )}

                        {/* Tooltip for primary line (when active) */}
                        {isActive && showDots && (
                            <ToolTip
                                x={state.x.position}
                                y={state.y.highTmp.position}
                                color={lineColor}
                            />
                        )}

                        {/* Area under primary line */}
                        <Area
                            points={points.highTmp}
                            y0={chartBounds.bottom}
                            animate={animate ? { type: "timing", duration: 500 } : undefined}
                        >
                            <LinearGradient
                                start={vec(chartBounds.bottom, 20)}
                                end={vec(chartBounds.bottom, chartBounds.bottom)}
                                colors={gradientColors}
                            />
                        </Area>

                        {/* Secondary line (budget) */}
                        {hasSecondLine && points.budget && (
                            <Line
                                points={points.budget}
                                color={secondLineColor}
                                strokeWidth={2}
                                animate={animate ? { type: "timing", duration: 500 } : undefined}
                            />
                        )}

                        {/* Tooltip for secondary line */}
                        {isActive && hasSecondLine && showDots && points.budget && (
                            <ToolTip
                                x={state.x.position}
                                y={state.y.budget.position}
                                color={secondLineColor}
                            />
                        )}
                    </>
                )}
            </CartesianChart>
        </View>
    );
}

type ToolTipProps = {
    x: any; // Can be SharedValue or number depending on victory-native version
    y: any; // Can be SharedValue or number depending on victory-native version  
    color: string;
};

function ToolTip({ x, y, color }: ToolTipProps) {
    return <Circle cx={x} cy={y} r={4} color={color} />;
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
    },
    valuesContainer: {
        gap: 2,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    legendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.8,
    },
    valueText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default CustomLineChart;