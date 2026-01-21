import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus,
  Minus,
  ShoppingCart,
  Search,
  ScanBarcode,
  X,
  Store,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

const API_URL = 'https://optistock-u4ix.onrender.com';

export default function POSView() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // MOBILE STATE
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');
  const [isScanning, setIsScanning] = useState(false);

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
      console.error(error);
    }
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing)
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id)
            return { ...item, qty: Math.max(0, item.qty + delta) };
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/pos/checkout`, {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
          price: item.base_price,
        })),
      });
      alert('✅ Sale Recorded!');
      handlePrint();
      setCart([]);
      setActiveTab('catalog'); // Go back to catalog
    } catch (e) {
      alert('Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (err: any, result: any) => {
    if (result) {
      const product = products.find((p) => p.id === parseInt(result.text));
      if (product) {
        addToCart(product);
        setIsScanning(false);
        alert(`Added ${product.name}`);
      }
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.base_price * item.qty,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  // --- COMPONENT: CATALOG ---
  const CatalogView = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 shadow-sm flex gap-2 sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsScanning(true)}
          className="bg-slate-900 text-white p-3 rounded-xl"
        >
          <ScanBarcode className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-2xl shadow-sm active:scale-95 transition-transform border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg mb-2">
                {p.name.charAt(0)}
              </div>
              <h3 className="font-bold text-slate-800 line-clamp-1">
                {p.name}
              </h3>
              <p className="text-slate-500 text-xs mb-2">{p.stock} left</p>
              <div className="mt-auto bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-bold">
                ${p.base_price}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- COMPONENT: CART ---
  const CartView = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
        <h2 className="text-xl font-bold">Order</h2>
        <button
          onClick={() => setCart([])}
          className="text-red-500 font-medium"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {cart.length === 0 ? (
          <div className="text-center text-slate-400 mt-20">Cart empty</div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-3 bg-slate-50 rounded-xl"
            >
              <div>
                <div className="font-bold">{item.name}</div>
                <div className="text-sm text-slate-500">
                  ${item.base_price} x {item.qty}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white p-1 rounded-lg shadow-sm">
                <button onClick={() => updateQty(item.id, -1)} className="p-2">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold w-4 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="p-2">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t bg-white absolute bottom-[80px] left-0 right-0 md:static">
        <div className="flex justify-between text-xl font-bold mb-4">
          <span>Total</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Charge $${cartTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      {/* DESKTOP LAYOUT */}
      <div className="hidden md:block md:w-2/3 h-full border-r border-slate-200">
        <CatalogView />
      </div>
      <div className="hidden md:block md:w-1/3 h-full">
        <CartView />
      </div>

      {/* MOBILE LAYOUT (One active at a time) */}
      <div className="md:hidden flex-1 h-full relative">
        {activeTab === 'catalog' ? <CatalogView /> : <CartView />}

        {/* Floating Cart Button (Only on Catalog) */}
        {activeTab === 'catalog' && cart.length > 0 && (
          <button
            onClick={() => setActiveTab('cart')}
            className="absolute bottom-24 left-4 right-4 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center z-20 animate-bounce-short"
          >
            <div className="flex items-center gap-2">
              <div className="bg-indigo-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {cartCount}
              </div>
              <span className="font-bold">View Cart</span>
            </div>
            <span className="font-bold">${cartTotal.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden bg-white border-t p-2 pb-safe flex justify-around h-[80px] z-30">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center w-full ${activeTab === 'catalog' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Store className="w-6 h-6 mb-1" />
          <span className="text-xs font-bold">Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center justify-center w-full ${activeTab === 'cart' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <ShoppingCart className="w-6 h-6 mb-1" />
          <span className="text-xs font-bold">Cart</span>
        </button>
      </div>

      {/* SCANNER & PRINT HIDDEN COMPONENTS */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center text-white">
            <h2 className="text-lg font-bold">Scan Barcode</h2>
            <button onClick={() => setIsScanning(false)}>
              <X className="w-8 h-8" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black relative">
            <BarcodeScannerComponent
              width={window.innerWidth}
              height={window.innerWidth}
              onUpdate={handleScan}
            />
          </div>
        </div>
      )}
      <div className="hidden">
        <div ref={printRef} className="p-4 font-mono text-sm">
          <h1 className="text-center font-bold text-xl mb-4">RECEIPT</h1>
          {cart.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.name}</span>
              <span>{i.base_price}</span>
            </div>
          ))}
          <hr className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>{cartTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
