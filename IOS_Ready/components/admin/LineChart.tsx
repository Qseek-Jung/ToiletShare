import React from 'react';

interface LineChartProps {
    data: number[];
    labels: string[];
    color: string;
}

export const LineChart: React.FC<LineChartProps> = ({ data, labels, color }) => {
    const max = Math.max(...data, 1);
    const height = 120;
    const width = 100;

    // Generate SVG path
    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (value / max) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                    key={ratio}
                    x1="0"
                    y1={height * ratio}
                    x2={width}
                    y2={height * ratio}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                />
            ))}
            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Points */}
            {data.map((value, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - (value / max) * height;
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2"
                        fill={color}
                    />
                );
            })}
        </svg>
    );
};

export default LineChart;
