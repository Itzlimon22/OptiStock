import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Minus, Trash2, ShoppingCart, Search, ScanBarcode, X, Store, Receipt } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

const API_URL = "https://optistock-u4ix.onrender.com";

export default function POSView() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  
  // MOBILE STATE: 'catalog' or 'cart'
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');

  // SCANNER STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef, 
    documentTitle: "Receipt",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
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
      })
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.base_price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
        const payload = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.qty,
                price: item.base_price
            }))
        };
        await axios.post(`${API_URL}/pos/checkout`, payload);
        alert("✅ Sale Recorded!");
        handlePrint(); 
        setCart([]); 
    } catch (e) {
        alert("Transaction Failed");
    } finally {
        setLoading(false);
    }
  };

  const handleScan = (err: any, result: any) => {
    if (result) {
      const scannedId = parseInt(result.text); 
      const product = products.find(p => p.id === scannedId);

      if (product) {
        addToCart(product);
        setIsScanning(false);
        alert(`Added: ${product.name}`);
      } else {
        setScanError(`Product ID ${result.text} not found.`);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toString().includes(search)
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100 md:h-[800px] md:p-6">
      
      {/* DESKTOP LAYOUT (Hidden on Mobile) */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 h-full">
         {/* ... (This reuses the components below, but we build the Mobile-First logic primarily) ... */}
         {/* For simplicity, we will use the dynamic visibility below to handle both Desktop and Mobile in one DOM tree */}
      </div>

      {/* UNIFIED LAYOUT CONTAINER */}
      <div className="flex-1 md:grid md:grid-cols-3 md:gap-6 overflow-hidden relative">
        
        {/* === LEFT COLUMN: PRODUCT CATALOG === */}
        {/* Show if Desktop OR (Mobile AND ActiveTab is Catalog) */}
        <div className={`
            flex flex-col h-full bg-white md:rounded-xl md:shadow-sm border-slate-200
            ${activeTab === 'catalog' ? 'block' : 'hidden md:flex'} 
            md:col-span-2
        `}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Store className="w-5 h-5 mr-2 text-indigo-600"/>
                    Catalog
                </h2>
                <button 
                    onClick={() => setIsScanning(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center text-sm"
                >
                    <ScanBarcode className="w-4 h-4 mr-2" />
                    Scan
                </button>
            </div>

            {/* Search */}
            <div className="p-4 bg-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map(product => (
                        <div key={product.id} 
                            onClick={() => addToCart(product)}
                            className="p-3 border border-slate-200 rounded-lg bg-white active:scale-95 transition-transform flex flex-col items-center text-center shadow-sm"
                        >
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold mb-2 text-sm">
                                {product.name.charAt(0)}
                            </div>
                            <h3 className="font-medium text-slate-800 text-sm line-clamp-2 h-10">{product.name}</h3>
                            <div className="text-indigo-600 font-bold text-sm mt-1">${product.base_price}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* === RIGHT COLUMN: CART === */}
        {/* Show if Desktop OR (Mobile AND ActiveTab is Cart) */}
        <div className={`
            flex flex-col h-full bg-white md:rounded-xl md:shadow-sm border-slate-200
            ${activeTab === 'cart' ? 'block' : 'hidden md:flex'} 
            md:col-span-1
        `}>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600"/>
                    Current Order
                </h2>
                <button onClick={() => setCart([])} className="text-xs text-red-500 font-medium">Clear</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <ShoppingCart className="w-8 h-8 mb-2 opacity-50"/>
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm">{item.name}</div>
                                <div className="text-xs text-slate-500">${item.base_price} x {item.qty}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Minus className="w-3 h-3"/></button>
                                <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center"><Plus className="w-3 h-3"/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex justify-between text-lg font-bold text-slate-900 mb-4">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0}
                    className="w-full bg-indigo-600 active:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Charge"}
                </button>
            </div>
        </div>

      </div>

      {/* MOBILE BOTTOM NAV (Hidden on Desktop) */}
      <div className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2 pb-safe sticky bottom-0 z-20">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col items-center p-2 rounded-lg w-1/2 ${activeTab === 'catalog' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
              <Store className="w-6 h-6" />
              <span className="text-xs font-medium mt-1">Catalog</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('cart')}
            className={`flex flex-col items-center p-2 rounded-lg w-1/2 relative ${activeTab === 'cart' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {cartCount}
                    </span>
                )}
              </div>
              <span className="text-xs font-medium mt-1">Cart (${cartTotal})</span>
          </button>
      </div>

      {/* SCANNER MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold">Scan Barcode</h3>
                    <button onClick={() => setIsScanning(false)}><X className="w-5 h-5"/></button>
                </div>
                <div className="h-64 bg-black relative">
                    <BarcodeScannerComponent
                        width={400} height={400}
                        onUpdate={handleScan}
                    />
                    {/* Visual Guide Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 pointer-events-none"></div>
                </div>
                <div className="p-4 text-center">
                    <p className="text-sm text-slate-500">Align barcode within frame</p>
                    {scanError && <p className="text-red-500 font-bold mt-2 text-sm">{scanError}</p>}
                </div>
            </div>
        </div>
      )}

      {/* HIDDEN RECEIPT */}
      <div className="hidden">
        <div ref={printRef} className="p-8 max-w-[300px] font-mono text-xs">
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold">OPTISTOCK</h1>
                <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
            <hr className="my-2"/>
            {cart.map((item) => (
                <div key={item.id} className="flex justify-between mb-1">
                    <span>{item.name} x{item.qty}</span>
                    <span>${(item.base_price * item.qty).toFixed(2)}</span>
                </div>
            ))}
            <hr className="my-2"/>
            <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>${cartTotal.toFixed(2)}</span>
            </div>
        </div>
      </div>

    </div>
  );
}