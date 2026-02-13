
import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { Database, FileText, PieChart as PieIcon } from 'lucide-react';

interface StorageChartProps {
    books: any[];
    users: any[];
    t: (key: any) => string;
}

const COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];

const StorageChart: React.FC<StorageChartProps> = ({ books, users, t }) => {
    // 1. Format Breakdown
    const formatData = books.reduce((acc: any[], book) => {
        const url = (book.file_url || '').toLowerCase();
        const format = url.endsWith('.pdf') ? 'PDF' : url.endsWith('.epub') ? 'EPUB' : 'Other';
        const existing = acc.find(item => item.name === format);
        if (existing) {
            existing.value += (book.file_size || 0);
        } else {
            acc.push({ name: format, value: (book.file_size || 0) });
        }
        return acc;
    }, []);

    const formattedFormatData = formatData.map(item => ({
        ...item,
        displayValue: (item.value / (1024 * 1024)).toFixed(1) + ' MB'
    }));

    // 2. Top Users Storage
    const userStorageMap: Record<string, number> = {};
    books.forEach(book => {
        const userId = book.user_id;
        userStorageMap[userId] = (userStorageMap[userId] || 0) + (book.file_size || 0);
    });

    const topUsersData = Object.entries(userStorageMap)
        .map(([userId, size]) => {
            const user = users.find(u => u.id === userId);
            return {
                name: user?.display_name || user?.email?.split('@')[0] || t('unknown'),
                value: Number((size / (1024 * 1024)).toFixed(1))
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Format Breakdown Pie Chart */}
            <div className="p-8 rounded-[3rem] bg-card/40 border border-border/40 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                            <PieIcon className="h-5 w-5 text-primary" /> {t('adminStorageBreakdown')}
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('storageUsage')}</p>
                    </div>
                </div>

                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={formattedFormatData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {formattedFormatData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1rem', border: '1px solid hsl(var(--border)/0.5)', fontSize: '10px', fontWeight: 'bold' }}
                                formatter={(value: any) => value ? (Number(value) / (1024 * 1024)).toFixed(1) + ' MB' : '0 MB'}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {formattedFormatData.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/10">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
                            <span className="ml-auto text-[10px] font-bold text-muted-foreground">{item.displayValue}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Users Bar Chart */}
            <div className="p-8 rounded-[3rem] bg-card/40 border border-border/40 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                            <Database className="h-5 w-5 text-orange-500" /> {t('adminTopUsersStorage')}
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('userLabel')}</p>
                    </div>
                </div>

                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUsersData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border)/0.2)" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }}
                                width={100}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1rem', border: '1px solid hsl(var(--border)/0.5)', fontSize: '10px', fontWeight: 'bold' }}
                                formatter={(value: any) => value !== undefined ? value + ' MB' : '0 MB'}
                            />
                            <Bar
                                dataKey="value"
                                radius={[0, 10, 10, 0]}
                                barSize={20}
                            >
                                {topUsersData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default StorageChart;
