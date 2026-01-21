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
  LineChart,
  Line,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Package,
  Search,
  BrainCircuit,
  Bell,
} from 'lucide-react';

const API_URL = 'https://optistock-u4ix.onrender.com';

export default function ExecutiveDashboard() {
  // 1. STATE: Executive Stats (Revenue)
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // 2. STATE: AI Forecaster (Predict)
  const [productId, setProductId] = useState('1');
  const [prediction, setPrediction] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  // --- FETCH REVENUE STATS ---
  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboard`);
      setStats(res.data || {});
    } catch (e) {
      console.error('Stats Error', e);
    } finally {
      setLoadingStats(false);
    }
  };

  // --- RUN AI PREDICTION ---
  const handleForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await axios.post(`${API_URL}/forecast/predict`, {
        product_id: Number(productId),
        price_override: null,
      });

      const base = res.data.predicted_sales;
      // Generate mock trend line for visualization
      const trend = [
        { day: 'Mon', sales: Math.max(0, base - 5) },
        { day: 'Tue', sales: Math.max(0, base + 2) },
        { day: 'Wed', sales: base }, // Target Day
        { day: 'Thu', sales: Math.max(0, base + 8) },
        { day: 'Fri', sales: Math.max(0, base + 12) },
      ];
      setPrediction({ value: base, graph: trend, name: res.data.product_name });
    } catch (error) {
      alert('Product ID not found!');
    } finally {
      setLoadingForecast(false);
    }
  };

  // --- TRIGGER WATCHDOG ---
  const triggerWatchdog = async () => {
    if (
      !confirm(
        'Release the Watchdog? This will scan inventory and email you alerts.',
      )
    )
      return;

    try {
      await axios.post(`${API_URL}/admin/run-watchdog`);
      alert('🐕 Watchdog released! Check your email in 1-2 minutes.');
    } catch (e) {
      alert('Failed to trigger Watchdog. Check console.');
      console.error(e);
    }
  };

  if (loadingStats)
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading AI Brain...
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Command Center</h2>
          <p className="text-slate-500 text-sm">
            Real-time Analytics & AI Forecasting
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex space-x-3">
          <button
            onClick={triggerWatchdog}
            className="flex items-center space-x-2 text-sm text-red-600 font-bold border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>Test Alert</span>
          </button>

          <button
            onClick={fetchStats}
            className="text-sm text-indigo-600 font-medium hover:underline px-2"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* SECTION 1: FINANCIAL OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Revenue Today
              </p>
              <h3 className="text-2xl font-bold text-slate-900">
                ${(stats?.today_revenue || 0).toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">7-Day Trend</p>
              <h3 className="text-xl font-bold text-slate-900">
                {stats?.revenue_trend?.length > 0 ? '📈 Growing' : 'No Data'}
              </h3>
            </div>
          </div>
        </div>
        {/* Card 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Top Seller</p>
              <h3 className="text-lg font-bold text-slate-900 truncate max-w-[150px]">
                {stats?.top_products?.[0]?.name || 'N/A'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 my-6"></div>

      {/* SECTION 2: THE AI FORECASTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
        {/* Input Panel */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-indigo-600 rounded-full blur-[100px] opacity-30"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-6">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">AI Forecaster</h3>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              Ask the Neural Network to predict demand for any product for
              tomorrow.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Product ID
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                    placeholder="e.g. 1045"
                  />
                </div>
              </div>
              <button
                onClick={handleForecast}
                disabled={loadingForecast}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center"
              >
                {loadingForecast ? (
                  <Search className="w-5 h-5 animate-spin" />
                ) : (
                  'Predict Demand'
                )}
              </button>
            </div>

            {prediction && (
              <div className="mt-8 pt-6 border-t border-slate-700 animate-in slide-in-from-bottom-2">
                <div className="text-slate-400 text-xs uppercase font-bold">
                  Prediction Result
                </div>
                <div className="text-3xl font-bold text-white mt-1">
                  {Math.round(prediction.value)} Units
                </div>
                <div className="text-indigo-400 text-sm mt-1">
                  {prediction.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Graph Panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Demand Projection
          </h3>
          <div className="flex-grow bg-slate-50 rounded-lg border border-slate-100 p-4 relative">
            {!prediction ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                <p>Run a prediction to see the future curve</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prediction.graph}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#4f46e5"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#4f46e5' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: REVENUE HISTORY (Bottom Row) */}
      <div className="h-[300px] bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Revenue History
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats?.revenue_trend || []}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
