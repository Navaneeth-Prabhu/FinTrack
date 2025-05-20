import * as React from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { Area, CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle, LinearGradient, vec, useFont, DashPathEffect } from "@shopify/react-native-skia";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import SpaceMono from "@/assets/fonts/SpaceMono-Regular.ttf";
import { useTheme } from "@/hooks/useTheme";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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
}) {
    const { colors } = useTheme();
    const font = useFont(SpaceMono, 12);

    // Process data to match expected format
    const [chartData, setChartData] = React.useState([]);
    const [hasSecondLine, setHasSecondLine] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState("0.00 €");

    React.useEffect(() => {
        if (!data || data.length === 0) return;

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

        // Set initial display value (total or latest)
        const total = data.reduce((sum, item) => sum + item.value, 0);
        setDisplayValue(`${total.toFixed(2)} €`);
    }, [data]);

    // Chart press state for interactive tooltips
    const { state, isActive } = useChartPressState({
        x: 0,
        y: { highTmp: 0, budget: 0 }
    });

    // Animated props for the text display when pressing on the chart
    const animatedText = useAnimatedProps(() => {
        return {
            text: `${state.y.highTmp.value?.value?.toFixed(2) || "0.00"} €`,
            defaultValue: displayValue,
        };
    });

    // If no data, return empty view
    if (!chartData || chartData.length === 0) {
        return <View style={{ height: chartHeight }} />;
    }

    return (
        <View style={{ height: chartHeight, padding: 16 }}>
            <View style={styles.header}>
                {!isActive && (
                    <View>
                        <Text style={[styles.valueText, { color: labelColor }]}>
                            {displayValue}
                        </Text>
                    </View>
                )}
                {isActive && (
                    <View>
                        <AnimatedTextInput
                            editable={false}
                            underlineColorAndroid={'transparent'}
                            style={[styles.valueText, { color: labelColor }]}
                            animatedProps={animatedText}
                        />
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

                        {/* Tooltip for primary line */}
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
                            curved={curved}
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

function ToolTip({ x, y, color }) {
    return <Circle cx={x} cy={y} r={4} color={color} />;
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 16,
    },
    valueText: {
        fontSize: 30,
        fontWeight: 'bold',
    },
});

export default CustomLineChart;