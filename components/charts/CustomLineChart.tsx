import * as React from "react";
import { Text, TextInput, View } from "react-native";
import { Area, CartesianChart, Line, useChartPressState } from "victory-native";
import { Circle, LinearGradient, vec, useFont } from "@shopify/react-native-skia";
import Animated, { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import SpaceMono from "@/assets/fonts/SpaceMono-Regular.ttf";
import { useTheme } from "@/hooks/useTheme";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function CustomLineChart({
    data,
    lineColor = "lightblue",
    gradientColors = ["#f7ce64", "#f7ce6420"],
    labelColor = "white",
}) {
    const { colors } = useTheme();
    const font = useFont(SpaceMono, 12);
    const { state, isActive } = useChartPressState({ x: 0, y: { highTmp: 0 } });

    const animatedText = useAnimatedProps(() => {
        return {
            text: `${state.y.highTmp.value.value.toFixed(2)} €`,
            defaultValue: '',
        };
    });

    return (
        <View style={{ height: 300, padding: 16 }}>
            <View style={{marginBottom: 16}}>

                {!isActive && (
                    <View>
                        <Text style={{ fontSize: 30, fontWeight: 'bold', color: "white" }}>
                            {2000} €
                        </Text>
                        {/* <Text style={{ fontSize: 18, color: "white" }}>Today</Text> */}
                    </View>
                )}
                {isActive && (
                    <View>
                        <AnimatedTextInput
                            editable={false}
                            underlineColorAndroid={'transparent'}
                            style={{ fontSize: 30, fontWeight: 'bold', color: "white" }}
                            animatedProps={animatedText}></AnimatedTextInput>
                    </View>
                )}
            </View>
            <CartesianChart
                data={DATA}
                xKey="day"
                yKeys={["highTmp", "budget"]}
                axisOptions={{
                    font,
                    tickCount: 3,
                    labelOffset: { x: -2, y: 0 },
                    labelColor: "white",
                    // lineColor: 'white',
                }}
                chartPressState={state}
                yAxis={[
                    {
                        labelOffset: 5,
                        font,
                        labelColor: "white",
                        lineColor: 'white',

                    },
                ]}
            >
                {({ points, chartBounds }) => (
                    <>
                        <Line points={points.budget}
                            color={'red'}
                            strokeWidth={2}
                            animate={{ type: "timing", duration: 500 }} />
                        {/* {isActive && (
                            <ToolTip x={state.x.position} y={state.y.highTmp.position} color={lineColor} />
                        )} */}
                        <Line points={points.highTmp}
                            color={lineColor}
                            strokeWidth={2}
                            animate={{ type: "timing", duration: 500 }} />
                        {isActive && (
                            <ToolTip x={state.x.position} y={state.y.highTmp.position} color={lineColor} />
                        )}

                        <Area
                            points={points.highTmp}
                            y0={chartBounds.bottom}
                            animate={{ type: "timing", duration: 500 }}
                        >
                            <LinearGradient
                                start={vec(chartBounds.bottom, 20)}
                                end={vec(chartBounds.bottom, chartBounds.bottom)}
                                colors={gradientColors}
                            />
                        </Area>

                    </>
                )}
            </CartesianChart>
        </View>
    );
}

export default CustomLineChart;

function ToolTip({ x, y , color}: { x: SharedValue<number>; y: SharedValue<number>; color: string }) {
    return <Circle cx={x} cy={y} r={4} color={color} />;
}

const DATA = Array.from({ length: 7 }, (_, i) => ({
    day: 'fasdf',
    highTmp: 40 + 30 * Math.random(),
    budget: 50,
}));