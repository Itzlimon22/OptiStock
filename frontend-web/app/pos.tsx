import { useState, useRef } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { Printer, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

const API_URL = 'https://optistock-u4ix.onrender.com'; // Your Render URL

export default function POSView() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Invoice Reference for Printing
  const componentRef = useRef<HTMLDivElement>(null);

  // 1. Search Products Live
  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) return;
    try {
      // In real app, make a specific search endpoint. For now, filter client-side or fetch all.
      // We will assume you fetch all products once for speed in this demo
      if (products.length === 0) {
        const res = await axios.get(`${API_URL}/products`);
        setProducts(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter products for the dropdown
  const results = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString().includes(search),
    )
    .slice(0, 5); // Limit to 5 results

  // 2. Add to Cart
  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setSearch(''); // Clear search
  };

  // 3. Remove/Adjust Qty
  const updateQty = (id: number, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          return { ...item, qty: Math.max(1, item.qty + delta) };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // 4. Calculate Totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.base_price * item.qty,
    0,
  );
  const tax = subtotal * 0.1; // 10% Tax example
  const total = subtotal + tax;

  // 5. Checkout Function
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // Send each item as a transaction to Backend
      // Ideally, create a bulk endpoint: POST /transactions/bulk
      for (const item of cart) {
        // Note: You need an endpoint that accepts generic transactions without customer_id if anonymous
        // Or use a default "Walk-in Customer" ID (e.g., 1)
        await axios.put(`${API_URL}/products/${item.id}/stock`, {
          quantity: item.stock - item.qty, // Naive logic: requires fetching fresh stock first
        });
      }
      alert('✅ Sale Recorded!');
      handlePrint(); // Trigger Print
      setCart([]); // Clear Cart
    } catch (e) {
      alert('Transaction Failed');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 6. Print Setup
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'OptiStock_Invoice',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
      {/* LEFT: Product Search & Cart Building */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">New Sale</h2>

          {/* Search Bar */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Scan barcode or type product name..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {/* Search Results Dropdown */}
            {search.length > 1 && (
              <div className="absolute w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 z-10 max-h-60 overflow-y-auto">
                {results.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        Stock: {p.stock} | SKU: {p.id}
                      </div>
                    </div>
                    <div className="font-bold text-indigo-600">
                      ${p.base_price}
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="p-4 text-slate-400 text-center">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="overflow-y-auto flex-grow max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      ${item.base_price}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      ${(item.base_price * item.qty).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      Cart is empty. Scan an item to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT: Invoice Preview & Pay */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-4">
          Invoice Preview
        </h3>

        {/* The Printable Area */}
        <div
          ref={componentRef}
          className="flex-grow bg-slate-50 p-6 rounded border border-slate-100 font-mono text-sm"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              OptiStock Inc.
            </h1>
            <p className="text-slate-500">123 AI Boulevard, Tech City</p>
            <p className="text-slate-500">Tel: +1 234 567 890</p>
          </div>
          <div className="border-b border-dashed border-slate-300 my-4"></div>

          {cart.map((item) => (
            <div key={item.id} className="flex justify-between mb-2">
              <span>
                {item.name.substring(0, 15)}... x{item.qty}
              </span>
              <span>${(item.base_price * item.qty).toFixed(2)}</span>
            </div>
          ))}

          <div className="border-b border-dashed border-slate-300 my-4"></div>
          <div className="flex justify-between font-bold text-slate-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-black text-slate-900 mt-4 pt-4 border-t border-slate-900">
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            <p>Thank you for shopping with AI!</p>
            <p>Invoice #: {Math.floor(Math.random() * 100000)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>Charge ${total.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
