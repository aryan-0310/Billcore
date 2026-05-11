import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart3, 
  Package, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Plus,
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  LayoutGrid,
  X,
  Sparkles,
  Zap,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAuth, PLAN_LIMITS } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { AnimatePresence, motion, Reorder } from 'motion/react';



import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Dashboard() {
  const { user, profile, businessId } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    if (!businessId) return;

    const qInv = query(collection(db, 'invoices'), where('businessId', '==', businessId));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
    });

    const qStock = query(collection(db, 'inventory'), where('businessId', '==', businessId));
    const unsubStock = onSnapshot(qStock, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'inventory');
    });

    return () => {
      unsubInv();
      unsubStock();
    };
  }, [businessId]);

  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';
  const canSeeFinancials = isAdmin || isAccountant;

  const totalSales = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalProfit = invoices.reduce((acc, i) => acc + (i.totalProfit || 0), 0);
  const totalGst = invoices.reduce((acc, i) => acc + (i.totalGst || 0), 0);

  const fixedWidgets = canSeeFinancials ? [
    'revenue-stat', 'profit-stat', 'stock-stat', 'tax-stat',
    'revenue-chart', 'activity-feed',
    'inventory-link', 'low-stock-stat'
  ] : [
    'stock-stat', 'low-stock-stat', 'inventory-link',
    'activity-feed'
  ];

  const getWidgetSpan = (widgetId: string) => {
    if (!canSeeFinancials) {
       switch (widgetId) {
         case 'activity-feed': return 'lg:col-span-4';
         case 'inventory-link': return 'lg:col-span-2';
         default: return 'lg:col-span-1';
       }
    }
    switch (widgetId) {
      case 'revenue-chart': return 'lg:col-span-3 lg:row-span-2';
      case 'activity-feed': return 'lg:col-span-1 lg:row-span-2';
      case 'inventory-link': return 'lg:col-span-2';
      default: return 'lg:col-span-1';
    }
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'revenue-stat':
        if (!canSeeFinancials) return null;
        return (
          <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm space-y-4 group transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-blue-600 hover:border-blue-500 cursor-pointer">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none group-hover:text-blue-100 transition-colors">Gross Revenue</p>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-white/20 group-hover:text-white transition-colors">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1 group-hover:text-white transition-colors">₹{totalSales.toLocaleString()}</p>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest group-hover:text-blue-100 transition-colors">+12.4% vs prev</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden group-hover:bg-white/20 transition-colors">
              <div className="h-full bg-emerald-500 w-[65%] group-hover:bg-white" />
            </div>
          </div>
        );
      case 'profit-stat':
        if (!canSeeFinancials) return null;
        return (
          <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm space-y-4 group transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-blue-600 hover:border-blue-500 cursor-pointer">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none group-hover:text-blue-100 transition-colors">Net Profit</p>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-white/20 group-hover:text-white transition-colors">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1 group-hover:text-white transition-colors">₹{totalProfit.toLocaleString()}</p>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-100 transition-colors">42.4% Margin</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden group-hover:bg-white/20 transition-colors">
              <div className="h-full bg-blue-600 w-full group-hover:bg-white" />
            </div>
          </div>
        );
      case 'stock-stat':
        return (
          <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm space-y-4 group transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-blue-600 hover:border-blue-500 cursor-pointer">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none group-hover:text-blue-100 transition-colors">Core Asset Inventory</p>
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-white/20 group-hover:text-white transition-colors">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1 group-hover:text-white transition-colors">{inventory.length}</p>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-100 transition-colors">Active Units</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden group-hover:bg-white/20 transition-colors">
              <div className="h-full bg-slate-900 w-[40%] group-hover:bg-white" />
            </div>
          </div>
        );
      case 'low-stock-stat':
        const lowStockCount = inventory.filter(i => i.quantity < 10).length;
        return (
          <motion.div 
            animate={lowStockCount > 0 ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              "p-8 border rounded-[2.5rem] shadow-sm space-y-4 group transition-all duration-500 cursor-pointer hover:shadow-2xl",
              lowStockCount > 0 
                ? "bg-rose-50 border-rose-100 hover:bg-blue-600 hover:border-blue-500" 
                : "bg-white border-slate-200/60 hover:bg-blue-600 hover:border-blue-500"
            )}
          >
            <div className="flex justify-between items-center">
              <p className={cn("text-[10px] font-black uppercase tracking-widest leading-none group-hover:text-blue-100 transition-colors", lowStockCount > 0 ? "text-rose-600" : "text-slate-400")}>
                Shortfall Alerts
              </p>
              <div className={cn("p-2 rounded-lg transition-colors", lowStockCount > 0 ? "bg-rose-100 text-rose-600 group-hover:bg-white/20 group-hover:text-white" : "bg-slate-50 text-slate-400 group-hover:bg-white/20 group-hover:text-white")}>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className={cn("text-3xl font-black tracking-tighter leading-none mb-1 transition-colors", lowStockCount > 0 ? "text-rose-900 group-hover:text-white" : "text-slate-900 group-hover:text-white")}>
                {lowStockCount}
              </p>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", lowStockCount > 0 ? "text-rose-600 group-hover:text-blue-100" : "text-slate-400 group-hover:text-blue-100")}>
                {lowStockCount > 0 ? 'Critical Attention' : 'Healthy Supply'}
              </span>
            </div>
          </motion.div>
        );
      case 'revenue-chart':
        if (!canSeeFinancials) return null;
        return (
          <div className="p-10 bg-white rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col h-full group hover:shadow-3xl hover:border-blue-100 transition-all duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase">Performance Vector</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Analytical data mapping over temporal scale</p>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shrink-0">
                <button 
                  onClick={() => setChartRange('7d')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    chartRange === '7d' 
                      ? "bg-white shadow-sm border border-slate-100 text-slate-900" 
                      : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  7 Days
                </button>
                <button 
                  onClick={() => setChartRange('30d')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    chartRange === '30d' 
                      ? "bg-white shadow-sm border border-slate-100 text-slate-900" 
                      : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  30 Days
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={invoices.length > 0 ? invoices.slice(0, chartRange === '7d' ? 7 : 30).reverse().map(i => ({ name: i.invoiceNumber, amount: i.totalAmount })) : [{ name: '', amount: 0 }]}>
                  <defs>
                    <linearGradient id="colorAmountV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis hide dataKey="name" />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: '1px solid rgb(241 245 249)', 
                      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
                      padding: '16px'
                    }} 
                    itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'normal' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmountV2)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'inventory-link':
        return (
          <div className="p-10 bg-slate-900 rounded-[3rem] text-white space-y-8 relative overflow-hidden group min-h-[250px] shadow-3xl shadow-slate-900/20">
             <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">Live Assets</div>
                </div>
                <h4 className="text-4xl font-black tracking-tighter leading-none">{inventory.length} Verified Products</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px]">Sovereign control over global dispatch and stock parameters.</p>
             </div>
             <button 
               onClick={() => navigate('/dashboard/inventory')}
               className="relative z-10 w-full py-5 bg-white text-slate-900 hover:bg-blue-600 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
             >
                Dispatch Command <ArrowUpRight className="w-5 h-5" />
             </button>
             <Package className="absolute -right-12 -bottom-12 w-64 h-64 text-white/[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
          </div>
        );
      case 'activity-feed':
        return (
          <div className="p-10 bg-white rounded-[3rem] border border-slate-200/60 shadow-sm space-y-10 flex flex-col h-full group hover:shadow-3xl transition-all duration-700">
             <div className="flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black text-slate-900 leading-none uppercase">Live Logs</h3>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 leading-none">Real-time state synchronization</p>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-4 border-emerald-100 shadow-sm"></div>
             </div>
             
             <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {[...invoices].reverse().slice(0, 10).map((inv, idx) => (
                  <div key={idx} className="flex gap-6 items-start group/log">
                     <div className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-100 border-2 border-white ring-2 ring-slate-50 shrink-0 group-hover/log:bg-blue-500 group-hover/log:ring-blue-100 transition-all duration-300"></div>
                     <div className="space-y-1">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tiny leading-none">Sale: {inv.customerName}</div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-80">
                           <Clock className="w-3 h-3" />
                           <span className="font-mono">{new Date(inv.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span className="text-blue-600 font-black">{inv.paymentMethod || 'Manual'}</span>
                        </div>
                        {canSeeFinancials && <div className="text-xs font-black text-blue-600 tracking-tighter">₹{inv.totalAmount.toLocaleString()}</div>}
                     </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="text-center py-20 text-slate-300 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                       <Clock className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-black uppercase text-[10px] tracking-[0.2em] opacity-40">Awaiting Signal</p>
                  </div>
                )}
             </div>
             
             <button className="w-full py-5 bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-900 hover:text-white transition-all group-hover:scale-[1.02] active:scale-95">
                Sync Network
             </button>
          </div>
        );
      case 'tax-stat':
        if (!canSeeFinancials) return null;
        return (
          <div className="p-8 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm space-y-4 group transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-blue-600 hover:border-blue-500 cursor-pointer">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none group-hover:text-blue-100 transition-colors">GST Liability</p>
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-white/20 group-hover:text-white transition-colors">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1 group-hover:text-white transition-colors">₹{totalGst.toLocaleString()}</p>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-100 transition-colors">Accrued (18%)</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden group-hover:bg-white/20 transition-colors">
               <div className="h-full bg-slate-400 w-[70%] group-hover:bg-white" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* Immersive Dashboard Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {profile?.businessName || 'BILLCORE'} <span className="text-blue-600 font-bold opacity-30 tracking-tight lowercase">center.</span>
              </h1>
            </div>
            
            <div className="hidden lg:flex items-center gap-8 pl-10 border-l border-slate-100">
               <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Auth Identity</div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-black">
                      {profile?.displayName?.[0] || 'U'}
                    </div>
                    <span className="text-sm font-bold text-slate-700 tracking-tight">{profile?.displayName}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-6 md:mt-10 space-y-6 md:space-y-10">
        {/* Plan Upgrade Banner - Sophisticated Floating Style */}
        <AnimatePresence>
          {(profile?.plan === 'starter' || !profile?.plan) && invoices.length >= 40 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 md:p-8 bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 shadow-3xl relative overflow-hidden ring-1 ring-white/10"
            >
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 shrink-0">
                  <Zap className="w-10 h-10 text-white fill-white animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full ring-1 ring-blue-500/30">Infrastructure Limit</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter leading-none">Registry Overload Imminent.</h3>
                  <p className="text-slate-400 text-sm font-medium opacity-80">You have utilized {invoices.length}/50 data slots. Upgrade to sovereign tier for infinite scaling.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/dashboard/plan')}
                className="w-full md:w-auto px-12 py-5 bg-white text-slate-900 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-95 shrink-0 relative z-10"
              >
                Claim Sovereignty
              </button>
              
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] -mr-64 -mt-64 rounded-full opacity-50" />
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {fixedWidgets.map((widgetId) => (
            <motion.div 
              key={widgetId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "h-full group hover:-translate-y-1 transition-transform duration-300",
                getWidgetSpan(widgetId)
              )}
            >
              {renderWidget(widgetId)}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
