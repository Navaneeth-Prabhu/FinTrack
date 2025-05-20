import React, { useState } from "react";
import { View, Dimensions, GestureResponderEvent } from "react-native";
import {
  Canvas,
  RoundedRect,
  Text,
  Group,
  useFont,
  Line,
} from "@shopify/react-native-skia";
import { formatLargeNumber } from "@/utils/numberUtl";

const { width } = Dimensions.get("window");

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
  labelFormatter?: (val: string) => string;
  externalSelectedBarIndex?: number;
};

const BarChart: React.FC<BarChartProps> = ({
  data = [],
  type = "month",
  onBarPress = undefined,
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
}) => {
  const barCount = data.length;
  const [internalSelectedBarIndex, setInternalSelectedBarIndex] = useState<number>(-1);

  // Use external selection if provided, otherwise use internal state
  const selectedBarIndex =
    externalSelectedBarIndex !== undefined && externalSelectedBarIndex >= -1
      ? externalSelectedBarIndex
      : internalSelectedBarIndex;

  const maxY = Math.max(...data.map((d) => d.value || 0), 0.1);

  // Actual chart dimensions
  const actualChartHeight = chartHeight - topPadding;

  // Calculate bar width
  const barWidth =
    (width - 3 * padding - yLabelPadding - (barCount - 1) * barGap) / barCount;

  const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), fontSize);

  if (!font) return null;

  // Dynamically adjust X-axis labels based on chart type
  const xLabels =
    type === "month" || type === "year"
      ? data.filter((_, idx) => idx % Math.max(1, Math.floor(barCount / 4)) === 0)
      : data;

  // Function to find a nice round number ceiling for the y-axis
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

  // Calculate ceiling and generate Y-axis labels
  const niceCeiling = findNiceCeiling(maxY * 1.05);
  const calculationMaxY = niceCeiling;

  const yLabels: number[] = [];
  if (yLabelCount === 1) {
    yLabels.push(niceCeiling);
  } else {
    const interval = niceCeiling / (yLabelCount - 1);
    for (let i = 0; i < yLabelCount; i++) {
      yLabels.push(niceCeiling - interval * i);
    }
  }

  const getBarIndex = (touchX: number, touchY: number) => {
    if (touchY < topPadding || touchY > chartHeight) return -1;

    const relativeX = touchX - padding;
    if (relativeX < 0) return -1;

    const barIndexFloat = relativeX / (barWidth + barGap);
    const barIndex = Math.floor(barIndexFloat);

    const remainderX = relativeX % (barWidth + barGap);
    return remainderX <= barWidth && barIndex < data.length ? barIndex : -1;
  };

  const handleTouch = (event: GestureResponderEvent) => {
    if (!showTouchedValue && !onBarPress && !highlightSelectedBar) return;

    const { nativeEvent } = event;
    const { locationX, locationY } = nativeEvent;

    const barIndex = getBarIndex(locationX, locationY);

    if (barIndex !== -1) {
      // Set internal selection state
      setInternalSelectedBarIndex(barIndex);

      // Call onBarPress with the item and index
      if (onBarPress) {
        const barItem = data[barIndex];
        onBarPress(barItem, barIndex);
      }
    }
  };

  // Position for y-axis labels
  const getYLabelXPosition = () => {
    return width - padding - yLabelPadding;
  };

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
        {/* Y-axis Labels and Grid Lines */}
        {yLabels.map((val, idx) => {
          const yPos = topPadding + actualChartHeight - (actualChartHeight / calculationMaxY) * val;

          return (
            <Group key={idx}>
              {/* Right Y-axis Labels */}
              <Text
                x={getYLabelXPosition()}
                y={yPos + 4}
                text={labelFormatter(Math.round(val).toString())}
                font={font}
                color={textColor}
              />

              {/* Horizontal Grid Lines */}
              {yGridLines && (
                <Line
                  p1={{ x: padding, y: yPos }}
                  p2={{ x: width - padding - yLabelPadding, y: yPos }}
                  color={yGridLineColor}
                  strokeWidth={yGridLineWidth}
                />
              )}
            </Group>
          );
        })}

        {/* Background Bars */}
        {showBarBackground && data.map((d, idx) => {
          const x = padding + idx * (barWidth + barGap);
          return (
            <RoundedRect
              key={`bg-${idx}`}
              x={x}
              y={topPadding}
              width={barWidth}
              height={actualChartHeight}
              color={barBackgroundColor}
              r={barBorderRadius}
            />
          );
        })}

        {/* Actual Bars */}
        {data.map((d, idx) => {
          const barHeight = (actualChartHeight / calculationMaxY) * (d.value || 0);
          const x = padding + idx * (barWidth + barGap);

          // Determine if this bar is selected
          const isSelected = selectedBarIndex === idx;

          // Get color based on transaction type
          const barColor = d.frontColor || "#4287f5";

          // Calculate opacity based on selection state
          const opacity = selectedBarIndex !== -1
            ? (isSelected ? 1 : selectedBarOpacity)
            : 1;

          return (
            <RoundedRect
              key={idx}
              x={x}
              y={topPadding + actualChartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              color={barColor}
              r={barBorderRadius}
              opacity={opacity}
            />
          );
        })}

        {/* X-axis Labels */}
        {xLabels.map((d, idx) => {
          const xPos = padding + data.indexOf(d) * (barWidth + barGap) + barWidth / 2;

          return (
            <Text
              key={idx}
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
      </Canvas>
    </View>
  );
};

export default BarChart;