import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { DollarSign, TrendingUp, Package, Activity } from 'lucide-react';

const API_URL = 'https://optistock-u4ix.onrender.com'; // Your Render URL

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboard`);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse">Loading Analytics...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Executive Overview
        </h2>
        <button
          onClick={fetchStats}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Refresh Data
        </button>
      </div>

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Revenue Today
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                ${stats.today_revenue.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">
                7-Day Sales Trend
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.revenue_trend.length > 0 ? 'Active' : 'No Data'}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Top Seller</p>
              <h3 className="text-xl font-bold text-slate-800 truncate max-w-[150px]">
                {stats.top_products[0]?.name || 'N/A'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-700 mb-4">
            Revenue History
          </h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue_trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-700 mb-4">
            Top Selling Products
          </h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  dataKey="sold"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
