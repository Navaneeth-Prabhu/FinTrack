import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, useWindowDimensions, GestureResponderEvent } from "react-native";
import {
  Canvas,
  RoundedRect,
  Text,
  Group,
  useFont,
  Line,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { formatLargeNumber } from "@/utils/numberUtl";

// Remove static Dimensions call
// const { width } = Dimensions.get("window");

type BarData = {
  label: string;
  value: number;
  frontColor?: string;
};

type BarChartProps = {
  data: BarData[];
  type?: "week" | "month" | "year" | string;
  onBarPress?: (item: BarData, index: number) => void;
  showBarBackground?: boolean;
  barBackgroundColor?: string;
  barGap?: number;
  textColor?: string;
  chartHeight?: number;
  padding?: number;
  topPadding?: number;
  yLabelCount?: number;
  yGridLines?: boolean;
  yGridLineColor?: string;
  yGridLineWidth?: number;
  yLabelPadding?: number;
  barBorderRadius?: number;
  showTouchedValue?: boolean;
  touchedValueYOffset?: number;
  highlightSelectedBar?: boolean;
  selectedBarOpacity?: number;
  fontSize?: number;
  labelFormatter?: (val: number) => string;
  externalSelectedBarIndex?: number;
  animationDuration?: number;
};

const BarChart: React.FC<BarChartProps> = ({
  data = [],
  type = "month",
  onBarPress,
  showBarBackground = true,
  barBackgroundColor = "#f5f5f5",
  barGap = 3,
  textColor = "#333333",
  chartHeight = 150,
  padding = 10,
  topPadding = 15,
  yLabelCount = 2,
  yGridLines = false,
  yGridLineColor = "#e0e0e0",
  yGridLineWidth = 1,
  yLabelPadding = 30,
  barBorderRadius = 6,
  showTouchedValue = true,
  touchedValueYOffset = 40,
  highlightSelectedBar = true,
  selectedBarOpacity = 0.35,
  fontSize = 12,
  labelFormatter = formatLargeNumber,
  externalSelectedBarIndex = -1,
  animationDuration = 300,
}) => {
  const { width } = useWindowDimensions();
  const [internalSelectedBarIndex, setInternalSelectedBarIndex] = useState<number>(-1);

  // Single opacity animation for fade in/out
  const opacity = useSharedValue(1);

  // Memoized calculations
  const calculations = useMemo(() => {
    const barCount = data.length;
    const maxY = Math.max(...data.map((d) => d.value || 0), 0.1);
    const actualChartHeight = chartHeight - topPadding;
    const barWidth = (width - 3 * padding - yLabelPadding - (barCount - 1) * barGap) / barCount;

    // Find nice ceiling
    const findNiceCeiling = (maxValue: number) => {
      if (maxValue <= 0) return 1;
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
      const normalized = maxValue / magnitude;

      let niceCeiling;
      if (normalized <= 1) niceCeiling = 1 * magnitude;
      else if (normalized <= 1.5) niceCeiling = 1.5 * magnitude;
      else if (normalized <= 2) niceCeiling = 2 * magnitude;
      else if (normalized <= 2.5) niceCeiling = 2.5 * magnitude;
      else if (normalized <= 3) niceCeiling = 3 * magnitude;
      else if (normalized <= 4) niceCeiling = 4 * magnitude;
      else if (normalized <= 5) niceCeiling = 5 * magnitude;
      else if (normalized <= 6) niceCeiling = 6 * magnitude;
      else if (normalized <= 8) niceCeiling = 8 * magnitude;
      else niceCeiling = 10 * magnitude;

      return niceCeiling;
    };

    const niceCeiling = findNiceCeiling(maxY * 1.05);
    const calculationMaxY = niceCeiling;

    // Calculate static bar heights (no animation)
    const barHeights = data.map((d) =>
      (actualChartHeight / calculationMaxY) * (d.value || 0)
    );

    return {
      barCount,
      actualChartHeight,
      barWidth,
      niceCeiling,
      calculationMaxY,
      barHeights,
    };
  }, [data, chartHeight, topPadding, width, padding, yLabelPadding, barGap]);

  // Load font
  const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), fontSize);

  // Use external selection if provided, otherwise use internal state
  const selectedBarIndex = externalSelectedBarIndex >= -1 ? externalSelectedBarIndex : internalSelectedBarIndex;

  // Memoized labels
  const { xLabels, yLabels } = useMemo(() => {
    const xLabels = type === "month"
      ? data.filter((_, idx) => idx % Math.max(1, Math.floor(calculations.barCount / 4)) === 0)
      : type === "year" ? data.filter((_, idx) => idx % Math.max(1, Math.floor(calculations.barCount / 6)) === 0) : data;

    const yLabels: number[] = [];
    if (yLabelCount === 1) {
      yLabels.push(calculations.niceCeiling);
    } else {
      const interval = calculations.niceCeiling / (yLabelCount - 1);
      for (let i = 0; i < yLabelCount; i++) {
        yLabels.push(calculations.niceCeiling - interval * i);
      }
    }

    return { xLabels, yLabels };
  }, [data, type, calculations.barCount, calculations.niceCeiling, yLabelCount]);

  // Touch handlers
  const getBarIndex = useCallback((touchX: number, touchY: number) => {
    if (touchY < topPadding || touchY > chartHeight) return -1;

    const relativeX = touchX - padding;
    if (relativeX < 0) return -1;

    const barIndexFloat = relativeX / (calculations.barWidth + barGap);
    const barIndex = Math.floor(barIndexFloat);

    const remainderX = relativeX % (calculations.barWidth + barGap);
    return remainderX <= calculations.barWidth && barIndex < data.length ? barIndex : -1;
  }, [topPadding, chartHeight, padding, calculations.barWidth, barGap, data.length]);

  const handleTouch = useCallback((event: GestureResponderEvent) => {
    if (!showTouchedValue && !onBarPress && !highlightSelectedBar) return;

    const { nativeEvent } = event;
    const { locationX, locationY } = nativeEvent;

    const barIndex = getBarIndex(locationX, locationY);

    if (barIndex !== -1) {
      setInternalSelectedBarIndex(barIndex);
      onBarPress?.(data[barIndex], barIndex);
    }
  }, [showTouchedValue, onBarPress, highlightSelectedBar, getBarIndex, data]);

  // Fade animation when type changes
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: animationDuration });
  }, [type, animationDuration]);

  if (!font) return null;

  const getYLabelXPosition = () => width - padding - yLabelPadding;

  return (
    <View
      style={{ flex: 1, padding }}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleTouch}
    >
      <Canvas
        style={{
          width: "100%",
          height: chartHeight + (showTouchedValue ? touchedValueYOffset : 20),
        }}
      >
        <Group opacity={opacity}>
          {/* Y-axis Labels and Grid Lines */}
          {yLabels.map((val, idx) => {
            const yPos = topPadding + calculations.actualChartHeight -
              (calculations.actualChartHeight / calculations.calculationMaxY) * val;

            return (
              <Group key={`y-label-${val}`}>
                {/* <Text
                  x={getYLabelXPosition()}
                  y={yPos + 4}
                  text={labelFormatter(Math.round(val))}
                  font={font}
                  color={textColor}
                />
                {yGridLines && (
                  <Line
                    p1={{ x: padding, y: yPos }}
                    p2={{ x: width - padding - yLabelPadding, y: yPos }}
                    color={yGridLineColor}
                    strokeWidth={yGridLineWidth}
                  />
                )} */}
              </Group>
            );
          })}

          {/* Background Bars */}
          {showBarBackground && data.map((_, idx) => {
            const x = padding + idx * (calculations.barWidth + barGap);
            return (
              <RoundedRect
                key={`bg-${data[idx]?.label || idx}`}
                x={x}
                y={topPadding}
                width={calculations.barWidth}
                height={calculations.actualChartHeight}
                color={barBackgroundColor}
                r={barBorderRadius}
              />
            );
          })}

          {/* Bars */}
          {data.map((d, idx) => {
            const x = padding + idx * (calculations.barWidth + barGap);
            const barHeight = calculations.barHeights[idx];
            const y = topPadding + calculations.actualChartHeight - barHeight;
            const isSelected = selectedBarIndex === idx;
            const barColor = d.frontColor || "#4287f5";
            const barOpacity = selectedBarIndex !== -1
              ? (isSelected ? 1 : selectedBarOpacity)
              : 1;

            return (
              <RoundedRect
                key={`bar-${d.label}`}
                x={x}
                y={y}
                width={calculations.barWidth}
                height={barHeight}
                color={barColor}
                r={barBorderRadius}
                opacity={barOpacity}
              />
            );
          })}

          {/* X-axis Labels */}
          {xLabels.map((d, idx) => {
            const xPos = padding + data.indexOf(d) * (calculations.barWidth + barGap) +
              calculations.barWidth / 2;

            return (
              <Text
                key={`x-label-${d.label}`}
                x={xPos - (d.label.length * (fontSize / 4))}
                y={chartHeight + 15}
                text={d.label}
                font={font}
                color={textColor}
              />
            );
          })}

          {/* Selected bar information */}
          {showTouchedValue && selectedBarIndex !== -1 && (
            <Text
              x={padding}
              y={chartHeight + touchedValueYOffset}
              text={`${data[selectedBarIndex].label}, Value: ${data[selectedBarIndex].value.toFixed(2)}`}
              font={font}
              color={textColor}
            />
          )}
        </Group>
      </Canvas>
    </View>
  );
};

export default React.memo(BarChart);