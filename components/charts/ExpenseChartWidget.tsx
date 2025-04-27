import React, { useState } from "react";
import { View, Dimensions } from "react-native";
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

const BarChart = ({
  data  = [],
  type = "month",
  onBarPress = null,
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
  selectedBarOpacity = 0.7,
  fontSize = 12,
  labelFormatter = formatLargeNumber,
}) => {
  const barCount = data.length;
  const [selectedBarIndex, setSelectedBarIndex] = useState(-1);
  const maxY = Math.max(...data.map((d) => d.value));
  
  // Actual chart dimensions
  const actualChartHeight = chartHeight - topPadding;
  
  // Calculate bar width
  const barWidth =
    (width - 3 * padding - yLabelPadding - (barCount - 1) * barGap) /
    barCount;

  const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), fontSize);

  if (!font) return null;

  // Dynamically adjust X-axis labels based on chart type
  const xLabels =
    type === "month" || type === "year"
      ? data.filter((_: any, idx: number) => idx % Math.max(1, Math.floor(barCount / 4)) === 0)
      : data;

  // Function to find a nice round number ceiling for the y-axis
  const findNiceCeiling = (maxValue) => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const normalized = maxValue / magnitude;
    
    let niceCeiling;
    if (normalized <= 1) {
      niceCeiling = 1 * magnitude;
    } else if (normalized <= 1.5) {
      niceCeiling = 1.5 * magnitude;
    } else if (normalized <= 2) {
      niceCeiling = 2 * magnitude;
    } else if (normalized <= 2.5) {
      niceCeiling = 2.5 * magnitude;
    } else if (normalized <= 3) {
      niceCeiling = 3 * magnitude;
    } else if (normalized <= 4) {
      niceCeiling = 4 * magnitude;
    } else if (normalized <= 5) {
      niceCeiling = 5 * magnitude;
    } else if (normalized <= 6) {
      niceCeiling = 6 * magnitude;
    } else if (normalized <= 8) {
      niceCeiling = 8 * magnitude;
    } else {
      niceCeiling = 10 * magnitude;
    }
    
    return niceCeiling;
  };
  
  // Calculate ceiling and generate Y-axis labels
  const niceCeiling = findNiceCeiling(maxY * 1.05);
  const calculationMaxY = niceCeiling;
  
  const yLabels = [];
  if (yLabelCount === 1) {
    yLabels.push(niceCeiling);
  } else {
    const interval = niceCeiling / (yLabelCount - 1);
    for (let i = 0; i < yLabelCount; i++) {
      yLabels.push(niceCeiling - (interval * i));
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

  const handleTouch = (event: { nativeEvent: any }) => {
    if (!showTouchedValue && !onBarPress && !highlightSelectedBar) return;
    
    const { nativeEvent } = event;
    const { locationX, locationY } = nativeEvent;

    const barIndex = getBarIndex(locationX, locationY);

    if (barIndex !== -1) {
      setSelectedBarIndex(barIndex);
      
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
        {showBarBackground && data.map((d: any, idx: number) => {
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
        {data.map((d: any, idx: number) => {
          const barHeight = (actualChartHeight / calculationMaxY) * d.value;
          const x = padding + idx * (barWidth + barGap);
          
          // Determine if this bar is selected
          const isSelected = selectedBarIndex === idx;
          
          // Apply opacity for non-selected bars when a bar is selected
          const opacity = highlightSelectedBar && selectedBarIndex !== -1 
            ? (isSelected ? 1 : selectedBarOpacity)
            : 1;
          
          return (
            <RoundedRect
              key={idx}
              x={x}
              y={topPadding + actualChartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              color={d.frontColor || "#4287f5"}
              r={barBorderRadius}
              opacity={opacity}
            />
          );
        })}

        {/* X-axis Labels */}
        {xLabels.map((d: any, idx: number) => {
          const xPos = padding + data.indexOf(d) * (barWidth + barGap) + barWidth / 2;
          
          return (
            <Text
              key={idx}
              x={xPos - (d.label.length * (fontSize/4))}
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

/*
EXAMPLE USAGE:

import BarChart from './BarChart';

const data = [
  { label: 'Jan', value: 125, frontColor: '#6E88F7' },
  { label: 'Feb', value: 220, frontColor: '#6E88F7' },
  { label: 'Mar', value: 180, frontColor: '#6E88F7' },
  { label: 'Apr', value: 250, frontColor: '#6E88F7' },
  { label: 'May', value: 310, frontColor: '#6E88F7' },
  { label: 'Jun', value: 190, frontColor: '#6E88F7' },
  { label: 'Jul', value: 270, frontColor: '#6E88F7' },
];

const MyComponent = () => {
  const handleBarPress = (barItem, index) => {
    console.log(`Bar pressed: ${barItem.label} - Value: ${barItem.value}`);
  };

  return (
    <BarChart
      data={data}
      type="month"
      onBarPress={handleBarPress}
      showBarBackground={true}
      barBackgroundColor="#F0F4F8"
      barGap={5}
      textColor="#506690"
      chartHeight={200}
      topPadding={20}
      yLabelCount={5}
      yGridLines={true}
      yGridLineColor="#E2E8F0"
      barBorderRadius={8}
      showTouchedValue={true}
      fontSize={14}
    />
  );
};
*/