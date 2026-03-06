import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { PriceSnapshot } from '@/types';

interface PriceSparklineProps {
    snapshots: PriceSnapshot[];
    width?: number;
    height?: number;
    color?: string;          // Line colour (defaults to green/red based on trend)
    showGradient?: boolean;  // Fill area under the line with a gradient
}

/**
 * PriceSparkline
 *
 * Renders a compact SVG line chart of historical prices from price_snapshots.
 * Designed to fit inside a HoldingCard without taking much space.
 *
 * - Requires at least 2 data points to draw a line.
 * - Handles flat data (all prices the same) gracefully.
 * - Uses a gradient fill to improve visual density.
 */
export default function PriceSparkline({
    snapshots,
    width = 80,
    height = 32,
    color,
    showGradient = true,
}: PriceSparklineProps) {
    const points = useMemo(() => {
        // Sort by recorded_at ascending
        const sorted = [...snapshots].sort(
            (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );
        // Deduplicate by date (keep last per day)
        const deduped: PriceSnapshot[] = [];
        const seen = new Set<string>();
        for (const s of sorted) {
            const day = s.recorded_at.slice(0, 10);
            if (!seen.has(day)) {
                seen.add(day);
                deduped.push(s);
            }
        }
        return deduped;
    }, [snapshots]);

    if (points.length < 2) return null;

    const prices = points.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1; // avoid / 0

    const pad = 2; // vertical padding in px
    const usableH = height - 2 * pad;
    const usableW = width;

    // Map each price to an SVG coordinate
    const coords = prices.map((p, i) => ({
        x: (i / (prices.length - 1)) * usableW,
        y: pad + usableH - ((p - minP) / range) * usableH,
    }));

    // Build SVG path
    const linePath = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
        .join(' ');

    // Build closed gradient fill path (line → bottom-right → bottom-left → close)
    const fillPath = [
        linePath,
        `L${coords[coords.length - 1].x.toFixed(1)},${height}`,
        `L${coords[0].x.toFixed(1)},${height}`,
        'Z',
    ].join(' ');

    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = color ?? (isUp ? '#4CD964' : '#FF4D4D');
    const gradId = `sparkGrad_${Math.random().toString(36).slice(2, 8)}`;

    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                    <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </LinearGradient>
            </Defs>

            {showGradient && (
                <Path d={fillPath} fill={`url(#${gradId})`} />
            )}
            <Path
                d={linePath}
                stroke={lineColor}
                strokeWidth={1.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </Svg>
    );
}
