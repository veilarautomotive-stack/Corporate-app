import React, { useState, useEffect } from 'react';
import { getView, rpc, formatCurrency } from '../lib/api';
import { Plus, AlertTriangle, Package, RefreshCw, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form States
  const [newItem, setNewItem] = useState({ sku: '', name: '', cost: '', price: '', minStock: '' });
  const [restock, setRestock] = useState({ quantity: '', cost: '', price: '' });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await getView('view_inventory_status');
      setInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // We need a category ID. For now, let's fetch categories or hardcode one if none exist.
      // Wait, we need to create a category first if none exist.
      // Let's just pick the first category or ask user to create one.
      // For simplicity, I'll fetch categories and pick the first one, or create 'General'.
      
      // Actually, let's just create a 'General' category if it doesn't exist in the backend?
      // No, "Database = brain". I should call `addCategory` if needed.
      // Let's assume a category exists or I'll create one on the fly?
      // Better: Fetch categories. If empty, prompt to create.
      // For this MVP, I'll just try to use a default category ID or fetch one.
      
      // Let's just create a category "General" if we can't find one.
      // But I can't do that easily here without more logic.
      // I'll add a "Category" field to the form?
      // Or just hardcode a category creation in the seed?
      // I'll add a seed for category in server.ts later.
      // For now, I'll assume a category exists with ID 'general' (I'll seed it).
      
      await rpc('addInventoryItem', {
        categoryId: 'general', // I will seed this
        sku: newItem.sku,
        name: newItem.name,
        cost: parseFloat(newItem.cost),
        price: parseFloat(newItem.price),
        initialStock: 0,
        minStock: parseInt(newItem.minStock)
      });
      setShowAddModal(false);
      fetchInventory();
      setNewItem({ sku: '', name: '', cost: '', price: '', minStock: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rpc('processRestock', {
        sku: selectedItem.sku,
        quantity: parseInt(restock.quantity),
        costPrice: parseFloat(restock.cost),
        sellingPrice: parseFloat(restock.price)
      });
      setShowRestockModal(false);
      fetchInventory();
      setRestock({ quantity: '', cost: '', price: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRestock = (item: any) => {
    setSelectedItem(item);
    setRestock({ quantity: '', cost: (item.cost_price / 100).toString(), price: (item.selling_price / 100).toString() });
    setShowRestockModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Item
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Value</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.item_name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.sku}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(item.cost_price)}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(item.selling_price)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={clsx(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      item.current_stock <= item.minimum_stock 
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.total_value)}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openRestock(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Restock"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name</label>
                <input
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={newItem.sku}
                  onChange={e => setNewItem({...newItem, sku: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                    value={newItem.cost}
                    onChange={e => setNewItem({...newItem, cost: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Stock Alert</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={newItem.minStock}
                  onChange={e => setNewItem({...newItem, minStock: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Restock {selectedItem.item_name}</h2>
              <button onClick={() => setShowRestockModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity to Add</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  value={restock.quantity}
                  onChange={e => setRestock({...restock, quantity: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                    value={restock.cost}
                    onChange={e => setRestock({...restock, cost: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                    value={restock.price}
                    onChange={e => setRestock({...restock, price: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                  Confirm Restock
                </button>
                <p className="text-xs text-center mt-2 text-gray-500">
                  Funds will be deducted from Capital or Profit Pool.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
