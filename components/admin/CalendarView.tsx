import React from 'react';

interface CalendarViewProps {
    year: number;
    month: number;
    data: { [date: string]: number };
}

export const CalendarView: React.FC<CalendarViewProps> = ({ year, month, data }) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = Math.ceil((firstDay + daysInMonth) / 7);

    return (
        <div className="grid grid-cols-7 gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-500 py-1">
                    {day}
                </div>
            ))}
            {Array.from({ length: weeks * 7 }).map((_, i) => {
                const dayNum = i - firstDay + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                    return <div key={i} className="aspect-square" />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const value = data[dateStr] || 0;
                return (
                    <div
                        key={i}
                        className="aspect-square bg-gray-50 rounded-lg flex flex-col items-center justify-center border"
                        style={{
                            backgroundColor: value > 0 ? `rgba(59, 130, 246, ${Math.min(value / 10, 1) * 0.5 + 0.1})` : '#f9fafb'
                        }}
                    >
                        <div className="text-xs font-bold text-gray-700">{dayNum}</div>
                        {value > 0 && <div className="text-[10px] font-bold text-blue-700">{value}</div>}
                    </div>
                );
            })}
        </div>
    );
};

export default CalendarView;
