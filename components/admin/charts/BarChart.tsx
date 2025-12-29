import React from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartProps {
    data: any[];
    dataKey: string;
    categoryKey: string;
    color: string;
    label: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, dataKey, categoryKey, color, label }) => {
    return (
        <div className="h-[200px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                <ReBarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        dataKey={categoryKey}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey={dataKey} name={label} radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                        ))}
                    </Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    );
};
