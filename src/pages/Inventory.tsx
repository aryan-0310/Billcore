import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Package, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  AlertCircle,
  Receipt,
  BarChart3,
  X,
  Camera,
  ArrowUpRight,
  Filter,
  RefreshCcw,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  PLAN_LIMITS,
  useAuth 
} from '../context/AuthContext';
import { cn } from '../lib/utils';
import { logInventoryChange } from '../lib/inventoryService';
import { Currency, formatCurrency } from '../lib/currencyService';
import BarcodeScanner, { ScannerStatus } from '../components/BarcodeScanner'; // Updated
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Inventory() {
  const { profile, businessId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>(null);
  const [scanContext, setScanContext] = useState<'global' | 'add_sku' | 'edit_sku'>('global');
  const [scannedNotFound, setScannedNotFound] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatus, setStockStatus] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentReason, setAdjustmentReason] = useState('Purchase');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    price: '',
    costPrice: '',
    quantity: '',
    minThreshold: '5',
    gstRate: '18',
    category: 'General',
    unit: 'Pcs'
  });

  const units = ['Pcs', 'Kgs', 'Ltrs', 'Mtrs', 'Boxes', 'Packets', 'Units'];

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, 'inventory'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'inventory');
    });

    return () => {
      unsubscribe();
    };
  }, [businessId]);

  useEffect(() => {
    if (!isDetailsModalOpen || !selectedItem) {
      setItemHistory([]);
      return;
    }

    const q = query(
      collection(db, 'inventoryLogs'),
      where('businessId', '==', businessId),
      where('itemId', '==', selectedItem.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItemHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'inventoryLogs');
    });

    return () => unsubscribe();
  }, [isDetailsModalOpen, selectedItem]);

  const handleStockAdjustment = async () => {
    if (!selectedItem || !adjustmentValue) return;
    const value = parseInt(adjustmentValue);
    if (isNaN(value)) return;

    const newQty = adjustmentType === 'add' ? selectedItem.quantity + value : selectedItem.quantity - value;
    
    try {
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });

      await logInventoryChange({
        itemId: selectedItem.id,
        businessId: businessId!,
        type: 'stock_update',
        field: 'quantity',
        oldValue: selectedItem.quantity,
        newValue: newQty,
        description: `${adjustmentReason}: ${adjustmentType === 'add' ? '+' : '-'}${adjustmentValue} units`,
        updatedBy: profile?.displayName || 'System'
      });

      setSelectedItem({ ...selectedItem, quantity: newQty });
      setIsAdjustmentModalOpen(false);
      setAdjustmentValue('');
    } catch (error) {
      console.error('Adjustment failed:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    // Check Plan Limits
    const currentPlan = profile?.plan || 'starter';
    const limit = ((PLAN_LIMITS as any)[currentPlan] || PLAN_LIMITS.starter).inventory;
    
    if (items.length >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'inventory'), {
        ...newItem,
        businessId,
        price: parseFloat(newItem.price),
        costPrice: parseFloat(newItem.costPrice),
        quantity: parseInt(newItem.quantity),
        minThreshold: parseInt(newItem.minThreshold),
        gstRate: parseInt(newItem.gstRate),
        updatedAt: new Date().toISOString()
      });

      await logInventoryChange({
        itemId: docRef.id,
        businessId,
        type: 'initial',
        oldValue: null,
        newValue: parseInt(newItem.quantity),
        description: 'Initial stock record created',
        updatedBy: profile?.displayName || 'System'
      });

      setIsAddModalOpen(false);
      setNewItem({ name: '', sku: '', price: '', costPrice: '', quantity: '', gstRate: '18', category: 'General', unit: 'Pcs' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const itemRef = doc(db, 'inventory', editingItem.id);
      const originalItem = items.find(i => i.id === editingItem.id);
      
      const updates: any = {
        name: editingItem.name,
        sku: editingItem.sku,
        price: parseFloat(editingItem.price),
        costPrice: parseFloat(editingItem.costPrice),
        quantity: parseInt(editingItem.quantity),
        minThreshold: parseInt(editingItem.minThreshold),
        gstRate: parseInt(editingItem.gstRate),
        category: editingItem.category,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(itemRef, updates);

      // Log changes
      if (originalItem) {
        if (originalItem.quantity !== updates.quantity) {
          await logInventoryChange({
            itemId: editingItem.id,
            businessId: businessId!,
            type: 'stock_update',
            field: 'quantity',
            oldValue: originalItem.quantity,
            newValue: updates.quantity,
            description: `Manual stock adjustment: ${originalItem.quantity} → ${updates.quantity}`,
            updatedBy: profile?.displayName || 'System'
          });
        }
        if (originalItem.price !== updates.price) {
          await logInventoryChange({
            itemId: editingItem.id,
            businessId: businessId!,
            type: 'price_update',
            field: 'price',
            oldValue: originalItem.price,
            newValue: updates.price,
            description: `Price updated: ₹${originalItem.price} → ₹${updates.price}`,
            updatedBy: profile?.displayName || 'System'
          });
        }
        if (originalItem.costPrice !== updates.costPrice) {
          await logInventoryChange({
            itemId: editingItem.id,
            businessId: businessId!,
            type: 'price_update',
            field: 'costPrice',
            oldValue: originalItem.costPrice,
            newValue: updates.costPrice,
            description: `Cost price updated: ₹${originalItem.costPrice} → ₹${updates.costPrice}`,
            updatedBy: profile?.displayName || 'System'
          });
        }
      }

      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleScan = (sku: string) => {
    // If we are specifically in a SKU assignment context
    if (scanContext === 'add_sku') {
      setNewItem(prev => ({ ...prev, sku }));
      setScannerStatus({ type: 'success', message: 'SKU Assigned' });
      return;
    }
    
    if (scanContext === 'edit_sku' && editingItem) {
      setEditingItem(prev => ({ ...prev, sku }));
      setScannerStatus({ type: 'success', message: 'SKU Updated' });
      return;
    }

    // Context-aware: If the Add/Edit modal is open even with global context, fill it
    if (isAddModalOpen) {
      setNewItem(prev => ({ ...prev, sku }));
      setScannerStatus({ type: 'success', message: 'SKU Populated' });
      return;
    }

    if (isEditModalOpen && editingItem) {
      setEditingItem(prev => ({ ...prev, sku }));
      setScannerStatus({ type: 'success', message: 'SKU Populated' });
      return;
    }

    const existing = items.find(i => i.sku === sku);
    if (existing) {
      setScannerStatus({ type: 'success', message: existing.name });
      setSelectedItem(existing);
      setIsDetailsModalOpen(true);
      // Automatically close scanner when match is found in global context
      setTimeout(() => {
        setIsScannerOpen(false);
        setScannerStatus(null);
      }, 500);
    } else {
      setScannerStatus({ type: 'error', message: 'SKU Not Found' });
      setTimeout(() => setScannedNotFound(sku), 1000);
    }
  };

  const openScanner = (context: 'global' | 'add_sku' | 'edit_sku' = 'global') => {
    setScanContext(context);
    setIsScannerOpen(true);
  };

  const deleteItem = async (id: string) => {
    if (window.confirm('Delete this item?')) {
      await deleteDoc(doc(db, 'inventory', id));
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category || 'General')));

  const isAdmin = profile?.role === 'admin';

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    let matchesStock = true;
    if (stockStatus === 'In Stock') matchesStock = item.quantity > 0;
    else if (stockStatus === 'Low Stock') matchesStock = item.quantity > 0 && item.quantity < (item.minThreshold || 10);
    else if (stockStatus === 'Out of Stock') matchesStock = item.quantity <= 0;

    const matchesPrice = (minPrice === '' || item.price >= parseFloat(minPrice)) && 
                         (maxPrice === '' || item.price <= parseFloat(maxPrice));
    
    return matchesSearch && matchesCategory && matchesStock && matchesPrice;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setStockStatus('All');
    setMinPrice('');
    setMaxPrice('');
  };

  const currentPlan = profile?.plan || 'starter';
  const limits = (PLAN_LIMITS as any)[currentPlan] || PLAN_LIMITS.starter;
  const isOverLimit = items.length >= limits.inventory;
  const isNearLimit = !isOverLimit && items.length >= limits.inventory * 0.8;

  const handleExportCSV = () => {
    if (items.length === 0) return;
    
    const headers = ['Product Name', 'SKU', 'Category', 'Price', 'Cost Price', 'Quantity', 'GST Rate'];
    const rows = items.map(item => [
      `"${item.name || ''}"`,
      `"${item.sku || ''}"`,
      `"${item.category || ''}"`,
      item.price,
      item.costPrice,
      item.quantity,
      `${item.gstRate}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Plan Limit Warning Banner */}
      <AnimatePresence>
        {(isOverLimit || isNearLimit) && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className={cn(
              "p-6 rounded-[2rem] border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl",
              isOverLimit ? "bg-rose-600 text-white border-rose-700 shadow-rose-100" : "bg-blue-600 text-white border-blue-700 shadow-blue-100"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest leading-none">
                  {isOverLimit ? 'Inventory Capacity Reached' : 'Approaching Capacity'}
                </h3>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  {isOverLimit 
                    ? `You've utilized all ${limits.inventory} item slots on your ${limits.name}. Expansion required.`
                    : `Your ${limits.name} is at ${(items.length / limits.inventory * 100).toFixed(0)}% capacity. Scale up to avoid disruption.`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard/plan')}
              className="px-8 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-lg"
            >
              Scale Infrastructure <ArrowUpRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header & Usage Meter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6 border-l-4 border-blue-600 pl-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              {profile?.businessName || 'BILLCORE'} <span className="text-blue-600 font-bold opacity-30 tracking-tight lowercase">Inventory.</span>
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1 italic tracking-tight">Active warehouse for {profile?.displayName}.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Usage Meter */}
          {(profile?.plan === 'starter' || !profile?.plan) && (
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm min-w-[240px] w-full md:w-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{PLAN_LIMITS.starter.name} Usage</span>
                <span className="text-[10px] font-black text-slate-900">{items.length}/{PLAN_LIMITS.starter.inventory}</span>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((items.length / PLAN_LIMITS.starter.inventory) * 100, 100)}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    items.length >= PLAN_LIMITS.starter.inventory * 0.9 ? "bg-rose-500" : "bg-blue-500"
                  )}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isAdmin && (
              <button 
                onClick={handleExportCSV}
                className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-[1.25rem] font-bold shadow-sm hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-5 h-5 text-slate-400" />
                <span className="text-xs uppercase tracking-[0.15em]">Export</span>
              </button>
            )}
            <button 
              onClick={() => openScanner('global')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 bg-slate-900 text-white rounded-[1.25rem] font-bold shadow-2xl shadow-slate-200 hover:bg-black transition-all hover:scale-105 active:scale-95 group"
            >
              <Camera className="w-5 h-5 text-blue-400 group-hover:rotate-12 transition-transform" />
              <span className="text-xs uppercase tracking-[0.15em]">Scan Barcode</span>
            </button>
            {isAdmin && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 bg-blue-600 text-white rounded-[1.25rem] font-bold shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs uppercase tracking-[0.15em]">Add Product</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => {
          setIsScannerOpen(false);
          setScannerStatus(null);
        }} 
        onScan={handleScan} 
        status={scannerStatus}
      />

      {/* Product Not Found Modal */}
      <AnimatePresence>
        {scannedNotFound && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto border border-orange-100">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Product Not Found</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                  The SKU <span className="text-slate-900 font-black">"{scannedNotFound}"</span> is not registered in your ledger.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setNewItem({ ...newItem, sku: scannedNotFound });
                    setScannedNotFound(null);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Create New Record
                </button>
                <button 
                  onClick={() => openScanner('global')}
                  className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all hover:scale-[1.02] active:scale-95"
                >
                  Scan Again
                </button>
                <button 
                  onClick={() => setScannedNotFound(null)}
                  className="w-full py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all text-center"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: items.length, icon: Package, color: 'text-blue-600', bg: 'bg-slate-50' },
          { label: 'Low Stock', value: items.filter(i => i.quantity < (i.minThreshold || 10)).length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-slate-50' },
          ...(isAdmin ? [
            { label: 'Total Value', value: formatCurrency(items.reduce((acc, i) => acc + (i.price * i.quantity), 0)), icon: Receipt, color: 'text-emerald-600', bg: 'bg-slate-50' },
            { label: 'Profit Potential', value: formatCurrency(items.reduce((acc, i) => acc + ((i.price - i.costPrice) * i.quantity), 0)), icon: BarChart3, color: 'text-purple-600', bg: 'bg-slate-50' },
          ] : []),
        ].map((stat, idx) => (
          <div key={idx} className={cn("p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md", stat.bg)}>
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
              <div className="text-xl font-bold text-slate-900 tracking-tighter">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search items by name, SKU, or category..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative group min-w-[140px]">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45"></div>
                </div>
              </div>
              
              <div className="relative group min-w-[140px]">
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45"></div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                 <input 
                   type="number" 
                   placeholder="Min ₹"
                   className="w-20 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold focus:outline-none"
                   value={minPrice}
                   onChange={(e) => setMinPrice(e.target.value)}
                 />
                 <span className="text-[10px] text-slate-300 font-black">TO</span>
                 <input 
                   type="number" 
                   placeholder="Max ₹"
                   className="w-20 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold focus:outline-none"
                   value={maxPrice}
                   onChange={(e) => setMaxPrice(e.target.value)}
                 />
              </div>

              {(searchTerm || selectedCategory !== 'All' || stockStatus !== 'All' || minPrice || maxPrice) && (
                <button 
                  onClick={clearFilters}
                  className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Clear All Filters"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-1">
             <Filter className="w-3.5 h-3.5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               Showing {filteredItems.length} of {items.length} matched assets
             </span>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU & Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Health</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing & Margins</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {filteredItems.map((item) => {
                const margin = item.price > 0 ? ((item.price - item.costPrice) / item.price) * 100 : 0;
                const stockPercentage = Math.min((item.quantity / 50) * 100, 100); 
                
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedItem(item);
                      setIsDetailsModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all relative",
                          item.quantity <= 0 ? "bg-red-50 text-red-600 border border-red-100" : 
                          item.quantity < 10 ? "bg-orange-50 text-orange-600 border border-orange-100" : 
                          "bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white"
                        )}>
                          {item.quantity <= 5 && (
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center"
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-white" />
                            </motion.div>
                          )}
                          {item.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-slate-900">{item.name}</div>
                            {item.quantity < 10 && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                item.quantity <= 0 ? "bg-red-600 text-white animate-pulse" : "bg-orange-100 text-orange-700"
                              )}>
                                {item.quantity <= 0 ? 'Urgent' : 'Low'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.gstRate}% GST</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-slate-500 mb-0.5">{item.sku || '---'}</div>
                      <div className="text-[10px] font-black text-blue-600/50 uppercase tracking-tight">{item.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 max-w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            item.quantity <= 0 ? "text-red-500" :
                            item.quantity < 10 ? "text-orange-500" : "text-emerald-500"
                          )}>
                            {item.quantity <= 0 ? 'Out of Stock' : `${item.quantity} Units`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stockPercentage}%` }}
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              item.quantity <= 0 ? "bg-slate-300" :
                              item.quantity < 10 ? "bg-orange-500" : "bg-emerald-500"
                            )}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black text-slate-900 tracking-tight">
                            {formatCurrency(item.price)}
                          </div>
                          {isAdmin && (
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                              margin > 30 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              margin > 15 ? "bg-blue-50 text-blue-700 border-blue-100" :
                              "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                              {Math.round(margin)}% Margin
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="text-[10px] font-bold text-slate-400">
                            Cost: {formatCurrency(item.costPrice)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({
                                ...item,
                                price: item.price.toString(),
                                costPrice: item.costPrice.toString(),
                                quantity: item.quantity.toString(),
                                gstRate: item.gstRate.toString()
                              });
                              setIsEditModalOpen(true);
                            }} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4 px-1 pb-10">
        {filteredItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => {
              setSelectedItem(item);
              setIsDetailsModalOpen(true);
            }}
            className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                  {item.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{item.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                </div>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                item.quantity <= 0 ? "bg-rose-50 text-rose-600" :
                item.quantity < (item.minThreshold || 10) ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {item.quantity} In Stock
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Price</p>
                  <p className="text-sm font-black text-blue-600 tracking-tight">{formatCurrency(item.price)}</p>
                </div>
                {isAdmin && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Cost</p>
                    <p className="text-xs font-bold text-slate-500 tracking-tight">{formatCurrency(item.costPrice)}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem({
                          ...item,
                          price: item.price.toString(),
                          costPrice: item.costPrice.toString(),
                          quantity: item.quantity.toString(),
                          gstRate: item.gstRate.toString()
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
               <Package className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching products</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-10 max-w-lg w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Add Product</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Product Name</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  {/* ... remains same for SKU, Category etc but with border-slate-200 */}
                   <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">SKU Code</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={newItem.sku}
                        onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => openScanner('add_sku')}
                        className="absolute right-2 top-1.5 p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                        title="Scan SKU"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Category</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={newItem.category}
                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Unit of Measure</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium appearance-none"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Selling Price (₹)</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Cost Price (₹)</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.costPrice}
                      onChange={(e) => setNewItem({...newItem, costPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Quantity</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Low Stock Alert Level</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.minThreshold}
                      onChange={(e) => setNewItem({...newItem, minThreshold: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">GST Rate (%)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={newItem.gstRate}
                      onChange={(e) => setNewItem({...newItem, gstRate: e.target.value})}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-6"
                >
                  Create Product
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-10 max-w-lg w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Product</h2>
                <button onClick={() => {
                   setIsEditModalOpen(false);
                   setEditingItem(null);
                }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUpdateItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Product Name</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    />
                  </div>
                   <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">SKU Code</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={editingItem.sku}
                        onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => openScanner('edit_sku')}
                        className="absolute right-2 top-1.5 p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                        title="Scan SKU"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Category</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Unit of Measure</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium appearance-none"
                        value={editingItem.unit || 'Pcs'}
                        onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Selling Price (₹)</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({...editingItem, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Cost Price (₹)</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.costPrice}
                      onChange={(e) => setEditingItem({...editingItem, costPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Quantity</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.quantity}
                      onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">Low Stock Alert Level</label>
                    <input 
                      type="number" required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.minThreshold || 5}
                      onChange={(e) => setEditingItem({...editingItem, minThreshold: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest pl-1">GST Rate (%)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                      value={editingItem.gstRate}
                      onChange={(e) => setEditingItem({...editingItem, gstRate: e.target.value})}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-6"
                >
                  Update Product
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative"
            >
              <button 
                onClick={() => setIsDetailsModalOpen(false)} 
                className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-3xl font-black text-blue-600">
                    {selectedItem.name[0]}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedItem.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase rounded tracking-widest">{selectedItem.sku || 'No SKU'}</span>
                      <span className="px-2 py-1 bg-blue-100 text-[10px] font-bold text-blue-600 uppercase rounded tracking-widest">{selectedItem.category}</span>
                    </div>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Financials</p>
                    <div className="pt-4 space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500">Cost Price</span>
                          <span className="text-sm font-bold text-slate-900">₹{selectedItem.costPrice.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500">Selling Price</span>
                          <span className="text-sm font-bold text-blue-600">₹{selectedItem.price.toLocaleString()}</span>
                       </div>
                       <div className="h-px bg-slate-200 my-1"></div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500">Gross Margin</span>
                          <span className="text-sm font-black text-emerald-600">
                            {selectedItem.price > 0 ? Math.round(((selectedItem.price - selectedItem.costPrice) / selectedItem.price) * 100) : 0}%
                          </span>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 relative group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Inventory State</p>
                    {isAdmin && (
                      <button 
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        className="absolute top-4 right-4 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        Adjust Stock
                      </button>
                    )}
                    <div className="pt-4 space-y-4">
                       <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Stock Level</p>
                            <p className={cn(
                              "text-2xl font-black italic tracking-tighter",
                              selectedItem.quantity < 10 ? "text-orange-600" : "text-slate-900"
                            )}>{selectedItem.quantity} Units</p>
                          </div>
                          <span className="text-xs font-bold text-slate-400 mb-1">{selectedItem.gstRate}% GST Rate</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", selectedItem.quantity < 10 ? "bg-orange-500" : "bg-blue-600")}
                            style={{ width: `${Math.min((selectedItem.quantity / 100) * 100, 100)}%` }}
                          ></div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* History */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Update History</h4>
                    <span className="text-[10px] font-bold text-slate-400 italic">Audit Log Active</span>
                  </div>
                  <div className="space-y-6 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {itemHistory.length > 0 ? (
                      itemHistory.map((log) => (
                        <div key={log.id} className="flex items-start gap-4 group">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 ring-4",
                            log.type === 'initial' ? "bg-emerald-500 ring-emerald-50" :
                            log.type === 'sale' ? "bg-blue-500 ring-blue-50" :
                            log.type === 'price_update' ? "bg-purple-500 ring-purple-50" :
                            "bg-orange-500 ring-orange-50"
                          )}></div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800">{log.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <span className="text-slate-300">•</span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.updatedBy}</p>
                            </div>
                            {log.oldValue !== undefined && log.newValue !== undefined && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">{log.oldValue}</span>
                                <ArrowUpRight className="w-3 h-3 text-slate-300" />
                                <span className="px-2 py-0.5 bg-blue-50 rounded text-[9px] font-black text-blue-600">{log.newValue}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 opacity-20">
                         <Receipt className="w-8 h-8 mb-2" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-center">No history recorded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Adjustment Modal */}
      <AnimatePresence>
        {isAdjustmentModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Adjustment</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{selectedItem.name}</p>
                 </div>
                 <button onClick={() => setIsAdjustmentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="space-y-6">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                   <button 
                     onClick={() => setAdjustmentType('add')}
                     className={cn(
                       "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                       adjustmentType === 'add' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                     )}
                   >Stock In</button>
                   <button 
                     onClick={() => setAdjustmentType('remove')}
                     className={cn(
                       "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                       adjustmentType === 'remove' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"
                     )}
                   >Stock Out</button>
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest">Adjustment Quantity</label>
                   <div className="relative">
                     <input 
                       type="number"
                       placeholder={`Enter ${selectedItem.unit || 'units'}...`}
                       className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                       value={adjustmentValue}
                       onChange={(e) => setAdjustmentValue(e.target.value)}
                     />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                       {selectedItem.unit || 'Units'}
                     </span>
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest">Reason / Memo</label>
                   <select 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                     value={adjustmentReason}
                     onChange={(e) => setAdjustmentReason(e.target.value)}
                   >
                     {adjustmentType === 'add' ? (
                       <>
                         <option value="Purchase">Fresh Purchase</option>
                         <option value="Return">Customer Return</option>
                         <option value="Re-entry">Stock Count Correction</option>
                       </>
                     ) : (
                       <>
                         <option value="Damage">Damaged Goods</option>
                         <option value="Expired">Expired Items</option>
                         <option value="Disposed">Internal Disposal</option>
                         <option value="Return to Vendor">Vendor Return</option>
                       </>
                     )}
                   </select>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                   <div>
                     <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Impact Analysis</p>
                     <p className="text-sm font-bold text-slate-700">Projected stock will be {adjustmentType === 'add' ? 
                       (selectedItem.quantity + (parseInt(adjustmentValue) || 0)) : 
                       (selectedItem.quantity - (parseInt(adjustmentValue) || 0))
                     } {selectedItem.unit || 'units'}.</p>
                   </div>
                </div>

                <button 
                  onClick={handleStockAdjustment}
                  disabled={!adjustmentValue}
                  className={cn(
                    "w-full py-5 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-30",
                    adjustmentType === 'add' ? "bg-emerald-600 shadow-emerald-100" : "bg-rose-600 shadow-rose-100"
                  )}
                >
                  Finalize Adjustment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Upgrade Modal */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="grid md:grid-cols-2">
                <div className="p-12 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/30">
                      Inventory Cap Reached
                    </div>
                    <h2 className="text-4xl font-black tracking-tight leading-none">Expand Your Ledger Capacity.</h2>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed">
                      You've hit the 100 product limit on your Starter plan. Upgrade now to manage unlimited SKUs and categories.
                    </p>
                  </div>
                  
                  <div className="relative z-10 pt-12 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">Unlimited Product Listings</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">Advanced Stock Forecasting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">Bulk External Catalog Sync</span>
                    </div>
                  </div>

                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                </div>

                <div className="p-12 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Professional Plan</div>
                      <div className="text-3xl font-black text-slate-900">₹4,999<span className="text-xs text-slate-400">/year</span></div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-black text-slate-900">10x Scale Potential</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      navigate('/dashboard/plan');
                      setIsUpgradeModalOpen(false);
                    }}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-95"
                  >
                    Go Pro Now
                  </button>

                  <button 
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                  >
                    Manage Existing Only
                  </button>
                  
                  <div className="pt-4 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Your current 100 items are fully safe.<br />Registration of new stock resumes after upgrade.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Reuse icon for modal close
