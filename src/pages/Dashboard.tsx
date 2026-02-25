import React, { useEffect, useState } from 'react';
import { getView, formatCurrency } from '../lib/api';
import { DollarSign, TrendingUp, Wallet, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getView('view_dashboard_summary'),
      getView('view_profit_trend')
    ]).then(([summaryData, trendData]) => {
      setSummary(summaryData[0]);
      setTrend(trendData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  const cards = [
    { title: 'Total Capital', value: summary.total_capital, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { title: 'Profit Pool', value: summary.total_profit, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    { title: 'Cash on Hand', value: summary.total_cash, icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
    { title: 'Today\'s Revenue', value: summary.today_revenue, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                  {formatCurrency(card.value)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Profit Trend (Last 30 Days)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(val) => `$${val / 100}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                itemStyle={{ color: '#F3F4F6' }}
                formatter={(val: number) => [formatCurrency(val), 'Profit']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Area 
                type="monotone" 
                dataKey="daily_profit" 
                stroke="#10B981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorProfit)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
