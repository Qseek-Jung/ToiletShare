import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StackedBarChartProps {
    data: any[];
    keys: { key: string; color: string; name: string }[]; // Array of keys to stack
    categoryKey: string;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({ data, keys, categoryKey }) => {
    return (
        <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        dataKey={categoryKey}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => typeof value === 'string' && value.includes('-') ? value.split('-').slice(1).join('/') : value}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}
                    />
                    <Legend iconType="circle" />
                    {keys.map((k, idx) => (
                        <Bar
                            key={k.key}
                            dataKey={k.key}
                            name={k.name}
                            stackId="a"
                            fill={k.color}
                            radius={idx === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} // Round top only
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
