import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  ScanBarcode,
  X,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner'; // Import the scanner

const API_URL = 'https://optistock-u4ix.onrender.com';

export default function POSView() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // Print Ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Receipt',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };

  // --- CART LOGIC ---
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }),
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.base_price * item.qty,
    0,
  );

  // --- CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
          price: item.base_price,
        })),
      };

      await axios.post(`${API_URL}/pos/checkout`, payload);
      alert('✅ Sale Recorded!');
      handlePrint();
      setCart([]);
    } catch (e) {
      alert('Transaction Failed');
    } finally {
      setLoading(false);
    }
  };

  // --- SCANNER LOGIC ---
  const handleScan = (err: any, result: any) => {
    if (result) {
      // Assuming the barcode holds the Product ID (e.g., "5")
      // In a real app, you might match a 'barcode' field instead of 'id'
      const scannedId = parseInt(result.text);
      const product = products.find((p) => p.id === scannedId);

      if (product) {
        addToCart(product);
        setIsScanning(false); // Close scanner after 1 successful scan
        alert(`Added: ${product.name}`);
      } else {
        setScanError(`Product ID ${result.text} not found.`);
      }
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
      {/* LEFT: Product Catalog */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        {/* Header & Search */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Product Catalog</h2>
          <div className="flex gap-2">
            {/* SCAN BUTTON */}
            <button
              onClick={() => setIsScanning(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <ScanBarcode className="w-5 h-5 mr-2" />
              Scan Item
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer bg-slate-50 flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                {product.name.charAt(0)}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">
                {product.name}
              </h3>
              <p className="text-slate-500 text-sm mb-2">
                Stock: {product.stock}
              </p>
              <div className="text-indigo-600 font-bold">
                ${product.base_price}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Current Order
        </h2>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
          {cart.length === 0 ? (
            <div className="text-center text-slate-400 mt-20">
              Cart is empty
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    ${item.base_price} x {item.qty}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-4 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-slate-900 pt-2">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold mt-6 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? 'Processing...' : 'Charge / Print Receipt'}
        </button>
      </div>

      {/* SCANNER MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[90%] max-w-md relative">
            <button
              onClick={() => setIsScanning(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold mb-4 text-center">
              Scan Product Barcode
            </h3>

            <div className="bg-black rounded-lg overflow-hidden h-64 flex items-center justify-center">
              <BarcodeScannerComponent
                width={400}
                height={400}
                onUpdate={handleScan}
              />
            </div>

            <p className="text-center text-sm text-slate-500 mt-4">
              Point camera at a barcode. <br />
              (For this demo, barcodes should match Product IDs: 1, 2, 3...)
            </p>
            {scanError && (
              <p className="text-center text-red-500 font-bold mt-2">
                {scanError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* HIDDEN RECEIPT TEMPLATE */}
      <div style={{ display: 'none' }}>
        <div
          ref={printRef}
          className="p-8 max-w-sm mx-auto bg-white text-slate-900 font-mono text-sm"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase">OptiStock Pro</h1>
            <p>123 Tech Street, Silicon Valley</p>
            <p>{new Date().toLocaleString()}</p>
          </div>
          <hr className="border-slate-300 my-4" />
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.name} (x{item.qty})
                </span>
                <span>${(item.base_price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <hr className="border-slate-300 my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <div className="text-center mt-8 text-xs">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  );
}
