import React from 'react';

interface MiniBarChartProps {
    data: number[];
    color: string;
    maxValue?: number;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, color, maxValue }) => {
    const max = maxValue || Math.max(...data, 1);
    const barWidth = 100 / data.length;

    return (
        <div className="flex items-end gap-0.5 h-12 mt-2">
            {data.map((value, i) => {
                const height = (value / max) * 100;
                return (
                    <div
                        key={i}
                        className="flex-1 flex flex-col justify-end"
                        title={`${value}`}
                    >
                        <div
                            className="rounded-t transition-all"
                            style={{
                                height: `${height}%`,
                                backgroundColor: color,
                                minHeight: value > 0 ? '2px' : '0px'
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default MiniBarChart;
