'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LayoutDashboard, Package, Save, Edit2, RefreshCw } from 'lucide-react';

// --- CONFIGURATION ---
// REPLACE with your Render URL
const API_URL = 'https://optistock-u4ix.onrender.com';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight">
                OptiStock HQ
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-700'
                    : 'hover:bg-indigo-500'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Forecast
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-indigo-700'
                    : 'hover:bg-indigo-500'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-10 px-4">
        {activeTab === 'dashboard' ? <DashboardView /> : <InventoryView />}
      </main>
    </div>
  );
}

// --- VIEW 1: FORECAST DASHBOARD (Your Original Code, Polished) ---
function DashboardView() {
  const [productId, setProductId] = useState('1');
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getForecast = async () => {
    setLoading(true);
    try {
      // 1. Get Prediction
      const res = await axios.post(`${API_URL}/forecast/predict`, {
        product_id: Number(productId),
        price_override: null,
      });

      // 2. Mock Graph Data (Since the API returns a single number, we generate a trend for display)
      const baseVal = res.data.predicted_sales;
      const graphData = [
        { day: 'Mon', sales: Math.max(0, baseVal - 5) },
        { day: 'Tue', sales: Math.max(0, baseVal + 2) },
        { day: 'Wed', sales: baseVal }, // The predicted day
        { day: 'Thu', sales: Math.max(0, baseVal + 8) },
        { day: 'Fri', sales: Math.max(0, baseVal + 12) },
      ];

      setPrediction({ value: baseVal, graph: graphData });
    } catch (error) {
      console.error('Error fetching forecast:', error);
      alert('Failed to fetch forecast. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">
          AI Demand Forecast
        </h2>
        <div className="flex gap-4 mb-8">
          <input
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Product ID"
          />
          <button
            onClick={getForecast}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Predict Demand'}
          </button>
        </div>

        {prediction && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <span className="text-slate-500 text-sm uppercase font-bold tracking-wider">
                Predicted Sales (Next 24h)
              </span>
              <div className="text-4xl font-bold text-indigo-600 mt-1">
                {Math.round(prediction.value)} units
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prediction.graph}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: '#4f46e5', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- VIEW 2: INVENTORY MANAGER (New Feature) ---
function InventoryView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/products`);
      // Sort by ID to keep table stable
      const sorted = res.data.sort((a: any, b: any) => a.id - b.id);
      setProducts(sorted);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await axios.put(`${API_URL}/products/${id}/stock`, {
        quantity: Number(editValue),
      });
      setEditingId(null);
      fetchProducts(); // Refresh list
    } catch (error) {
      alert('Failed to update stock');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">
          Current Inventory
        </h2>
        <button
          onClick={fetchProducts}
          className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-500">
          Loading inventory data...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock Level</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">#{p.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {p.name || `Product Item ${p.id}`}
                  </td>
                  <td className="px-6 py-4 text-slate-600">${p.base_price}</td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        className="w-20 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (p.stock || 0) < 20
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {p.stock || 0} units
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === p.id ? (
                      <button
                        onClick={() => handleUpdate(p.id)}
                        className="text-green-600 hover:text-green-800 font-medium inline-flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" /> Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditValue((p.stock || 0).toString());
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
