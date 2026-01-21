'use client';

import { useState, useEffect } from 'react';
import POSView from './pos'; // <--- Add this line
import ExecutiveDashboard from './dashboard-executive';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  Package,
  Save,
  Edit2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';

// --- CONFIGURATION ---
const API_URL = 'https://optistock-u4ix.onrender.com';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight">
                OptiStock Pro
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
              <button
                onClick={() => setActiveTab('pos')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'pos' ? 'bg-indigo-700' : 'hover:bg-indigo-500'
                }`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                POS / Checkout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4">
        {activeTab === 'dashboard' && <ExecutiveDashboard />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'pos' && <POSView />} {/* <--- Add this line */}
      </main>
    </div>
  );
}

// --- VIEW 1: DASHBOARD (Forecast & Alerts) ---
function DashboardView() {
  const [productId, setProductId] = useState('1');
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getForecast = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/forecast/predict`, {
        product_id: Number(productId),
        price_override: null,
      });

      const baseVal = res.data.predicted_sales;
      // Generate a mock trend line around the prediction for visualization
      const graphData = [
        { day: 'Mon', sales: Math.max(0, baseVal - 5) },
        { day: 'Tue', sales: Math.max(0, baseVal + 2) },
        { day: 'Wed', sales: baseVal },
        { day: 'Thu', sales: Math.max(0, baseVal + 8) },
        { day: 'Fri', sales: Math.max(0, baseVal + 12) },
      ];

      setPrediction({ value: baseVal, graph: graphData });
    } catch (error) {
      console.error('Error fetching forecast:', error);
      alert('Product not found or ID invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">
            AI Demand Forecast
          </h2>
          <div className="flex gap-4 mb-8 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Product ID Lookup
              </label>
              <input
                type="number"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 1045"
              />
            </div>
            <button
              onClick={getForecast}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 h-[42px]"
            >
              {loading ? 'Analyzing...' : 'Predict Demand'}
            </button>
          </div>

          {prediction && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 flex items-baseline gap-3">
                <span className="text-slate-500 text-sm uppercase font-bold tracking-wider">
                  Predicted Sales (Tomorrow):
                </span>
                <span className="text-4xl font-bold text-indigo-600">
                  {Math.round(prediction.value)} units
                </span>
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

      <div className="lg:col-span-1">
        <RestockAlerts />
      </div>
    </div>
  );
}

// --- COMPONENT: AI RESTOCK ALERTS ---
function RestockAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get(`${API_URL}/analytics/reorder-report`)
      .then((res) => setAlerts(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (alerts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
        <h3 className="text-lg font-bold text-slate-800">✅ System Status</h3>
        <p className="text-slate-500 mt-2">All stock levels healthy.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200 h-full overflow-y-auto max-h-[600px]">
      <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4 sticky top-0 bg-white pb-2 border-b border-orange-100">
        <span className="bg-orange-100 text-orange-600 p-2 rounded-lg mr-3">
          ⚠️
        </span>
        Restock Recommended
      </h3>
      <div className="space-y-3">
        {alerts.map((item) => (
          <div
            key={item.product_id}
            className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-slate-900 truncate pr-2 w-2/3">
                {item.name}
              </div>
              {item.status === 'CRITICAL' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">
                  Critical
                </span>
              )}
            </div>
            <div className="flex justify-between items-end">
              <div className="text-slate-500 text-xs">
                <div>Stock: {item.current_stock}</div>
                <div>Demand: {item.predicted_demand}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-400 font-bold">
                  Order
                </div>
                <div className="text-green-600 font-bold text-lg leading-none">
                  +{item.recommended_order}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW 2: INVENTORY MANAGER (Updated for Big Data) ---
function InventoryView() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const ITEMS_PER_PAGE = 20;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
      setFilteredProducts(res.data);
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
      // Optimistic Update (Faster than re-fetching)
      const updated = products.map((p) =>
        p.id === id ? { ...p, stock: Number(editValue) } : p,
      );
      setProducts(updated);
      setFilteredProducts(
        updated.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    } catch (error) {
      alert('Failed to update stock');
    }
  };

  const handleRetrain = async () => {
    if (!confirm('This will consume server resources. Continue?')) return;
    try {
      await axios.post(`${API_URL}/admin/retrain`);
      alert('🧠 AI Training Started! Models will update in ~30 seconds.');
    } catch (e) {
      alert('Failed to start training.');
    }
  };

  // Search Logic
  useEffect(() => {
    const lower = search.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.id.toString().includes(lower),
    );
    setFilteredProducts(filtered);
    setPage(0); // Reset to page 1 on search
  }, [search, products]);

  // Pagination Logic
  const paginatedData = filteredProducts.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Store Inventory ({products.length} Items)
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={handleRetrain}
              className="text-purple-600 hover:text-purple-800 flex items-center text-sm font-bold border border-purple-200 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
            >
              ⚡ Retrain AI
            </button>
            <button
              onClick={fetchProducts}
              className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products by Name, Category, or ID..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-20 text-center text-slate-500">
            Loading inventory data...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-6 py-3 text-slate-500 text-sm">#{p.id}</td>
                  <td
                    className="px-6 py-3 font-medium text-slate-900 text-sm max-w-[200px] truncate"
                    title={p.name}
                  >
                    {p.name}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-sm">
                    ${p.base_price}
                  </td>
                  <td className="px-6 py-3">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-bold ${
                          (p.stock || 0) < 10
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {editingId === p.id ? (
                      <button
                        onClick={() => handleUpdate(p.id)}
                        className="text-green-600 hover:text-green-800 font-medium inline-flex items-center text-sm"
                      >
                        <Save className="w-4 h-4 mr-1" /> Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditValue((p.stock || 0).toString());
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-sm text-slate-600">
        <div>
          Showing {page * ITEMS_PER_PAGE + 1} to{' '}
          {Math.min((page + 1) * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
          {filteredProducts.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
