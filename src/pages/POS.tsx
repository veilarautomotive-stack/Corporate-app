import React, { useState, useEffect } from 'react';
import { getView, rpc, formatCurrency } from '../lib/api';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Product {
  id: string;
  sku: string;
  item_name: string;
  selling_price: number;
  current_stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getView('view_inventory_status');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev; // Stock limit
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.current_stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      await rpc('processSale', {
        items: cart.map(item => ({ sku: item.sku, quantity: item.quantity }))
      });
      setSuccess(true);
      setCart([]);
      fetchProducts(); // Refresh stock
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.item_name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Product List */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.current_stock === 0}
              className="flex flex-col items-start p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-full flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-900 dark:text-white truncate w-full text-left">{product.item_name}</span>
              </div>
              <div className="w-full flex justify-between items-end">
                <span className="text-sm text-gray-500 dark:text-gray-400">{product.sku}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(product.selling_price)}</span>
              </div>
              <div className={clsx(
                "mt-2 text-xs font-medium px-2 py-1 rounded-full",
                product.current_stock > 10 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                product.current_stock > 0 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {product.current_stock} in stock
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h2 className="text-lg font-bold flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Current Sale
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium truncate">{item.item_name}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(item.selling_price)} x {item.quantity}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500">Total</span>
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            className={clsx(
              "w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center",
              success ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700",
              (cart.length === 0 || processing) && "opacity-50 cursor-not-allowed"
            )}
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Sale Complete
              </>
            ) : (
              'Complete Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
