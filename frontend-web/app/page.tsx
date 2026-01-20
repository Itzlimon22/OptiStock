'use client';
import { useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Search, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [productId, setProductId] = useState(1);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getForecast = async () => {
    setLoading(true);
    try {
      // Connect to your FastAPI Backend
      const res = await axios.post(
        'https://optistock-u4ix.onrender.com/forecast/predict',
        {
          product_id: Number(productId),
          price_override: null,
        },
      );
      setPrediction(res.data);
    } catch (err) {
      console.error('API Error (Is Uvicorn running?):', err);
      alert('Failed to fetch forecast. Check console.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">OptiStock HQ</h1>

        {/* CONTROLS */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Product ID
            </label>
            <input
              type="number"
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              className="border p-2 rounded w-32"
            />
          </div>
          <button
            onClick={getForecast}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            {loading ? (
              'Calculating...'
            ) : (
              <>
                <Search size={18} /> Predict Demand
              </>
            )}
          </button>
        </div>

        {/* RESULTS CARD */}
        {prediction && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 1. The Big Number (Supervised ML) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
              <h2 className="text-slate-500 text-sm uppercase tracking-wide">
                Predicted Sales (Tomorrow)
              </h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-bold text-slate-900">
                  {prediction.predicted_sales}
                </span>
                <span className="text-slate-500">units</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium">
                <TrendingUp size={16} /> High Confidence (
                {prediction.confidence_score * 100}%)
              </div>
            </div>

            {/* 2. Visual Context (Mocked Chart) */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-slate-500 text-sm mb-4">7-Day Trend</h2>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { day: 'Mon', sales: 12 },
                      { day: 'Tue', sales: 19 },
                      { day: 'Wed', sales: 3 },
                      { day: 'Thu', sales: 5 },
                      { day: 'Fri', sales: 2 },
                      { day: 'Sat', sales: prediction.predicted_sales }, // Connecting ML to Chart
                    ]}
                  >
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
