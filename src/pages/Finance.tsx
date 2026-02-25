import React, { useState, useEffect } from 'react';
import { getView, rpc, formatCurrency } from '../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Finance() {
  const [integrity, setIntegrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Distribution Form
  const [partnerA, setPartnerA] = useState(40);
  const [partnerB, setPartnerB] = useState(40);
  const [reinvest, setReinvest] = useState(20);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getView('view_capital_integrity');
      setIntegrity(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (partnerA + partnerB + reinvest !== 100) {
      alert('Percentages must sum to 100%');
      return;
    }
    try {
      await rpc('distributeProfit', { partnerA, partnerB, reinvest });
      alert('Profit distributed successfully');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading finance data...</div>;

  const capitalData = [
    { name: 'Inventory Value', value: integrity.inventory_value, color: '#3B82F6' },
    { name: 'Unallocated Capital', value: integrity.unallocated_capital, color: '#10B981' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Integrity</h1>

      {/* Capital Integrity Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" />
            Capital Structure
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capitalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {capitalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4 mt-4 md:mt-0">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500">Total Recorded Capital</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(integrity.recorded_capital)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">Inventory Value</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(integrity.inventory_value)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">Unallocated Capital</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(integrity.unallocated_capital)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Profit Distribution
          </h2>
          <form onSubmit={handleDistribution} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Partner A (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={partnerA}
                  onChange={(e) => setPartnerA(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Partner B (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={partnerB}
                  onChange={(e) => setPartnerB(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reinvest (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={reinvest}
                  onChange={(e) => setReinvest(parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Distribution will drain the Profit Pool and transfer cash to partners. 
                Reinvested amount will move to Global Capital.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
            >
              Distribute Profit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
