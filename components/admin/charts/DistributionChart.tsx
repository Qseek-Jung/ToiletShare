import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DistributionChartProps {
    data: { name: string; value: number; color: string }[];
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ data }) => {
    return (
        <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '12px', color: '#666' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
