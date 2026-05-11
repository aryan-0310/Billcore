import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  IndianRupee, 
  ShoppingBag, 
  ArrowUpRight,
  Target,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Analytics() {
  const { profile, businessId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!businessId) return;

    const q = query(
      collection(db, 'invoices'), 
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [businessId]);

  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';

  const filteredInvoices = React.useMemo(() => {
    const now = new Date();
    if (timeRange === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return invoices.filter(i => i.createdAt && new Date(i.createdAt) >= startOfDay);
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return invoices.filter(i => i.createdAt && new Date(i.createdAt) >= startOfMonth);
    } else if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return invoices.filter(i => i.createdAt && new Date(i.createdAt) >= startOfYear);
    }
    return invoices;
  }, [invoices, timeRange]);

  const totalRevenue = filteredInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalProfit = filteredInvoices.reduce((acc, i) => acc + (i.totalProfit || 0), 0);
  const averageTicket = filteredInvoices.length ? totalRevenue / filteredInvoices.length : 0;

  // Data aggregation for charts
  const aggregatedData = React.useMemo(() => {
    const data: { [key: string]: { revenue: number, profit: number, count: number } } = {};
    
    filteredInvoices.forEach(inv => {
      const invDate = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!invDate) return;

      let key = '';
      if (timeRange === 'day') {
        key = invDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      } else if (timeRange === 'month') {
        key = invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      } else if (timeRange === 'year') {
        key = invDate.toLocaleDateString('en-IN', { month: 'long' });
      }
      
      if (!data[key]) {
        data[key] = { revenue: 0, profit: 0, count: 0 };
      }
      
      data[key].revenue += inv.totalAmount || 0;
      data[key].profit += inv.totalProfit || 0;
      data[key].count += 1;
    });

    return Object.entries(data)
      .map(([name, values]) => ({
        name,
        ...values
      }))
      .sort((a, b) => {
        // Simple sorting for months if year
        if (timeRange === 'year') {
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          return months.indexOf(a.name) - months.indexOf(b.name);
        }
        return 0; // Natural sorting usually works for day strings and time strings
      });
  }, [filteredInvoices, timeRange]);

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, trend: '+12.5%', isUp: true, icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Net Profit', value: `₹${totalProfit.toLocaleString()}`, trend: '+8.2%', isUp: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Sales', value: filteredInvoices.length, trend: '+5.4%', isUp: true, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Sale', value: `₹${averageTicket.toFixed(0)}`, trend: '-2.1%', isUp: false, icon: Target, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[160px]">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{entry.name}:</span>
                <span className="text-sm font-black text-slate-900">₹{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {profile?.businessName || 'BILLCORE'} <span className="text-blue-600 font-bold opacity-30 tracking-tight lowercase">
              {isAccountant ? 'Profit & Sales Ledger' : 'Analytics.'}
            </span>
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-2 italic tracking-tight">
            {isAccountant ? 'Audit-ready financial summaries.' : `Intelligence report for ${profile?.displayName}.`}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm self-start md:self-auto">
           {(['day', 'month', 'year'] as const).map((range) => (
             <button 
               key={range}
               onClick={() => setTimeRange(range)}
               className={cn(
                 "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 timeRange === range ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
               )}
             >
               {range}
             </button>
           ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className={cn("p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 transition-all hover:shadow-md", stat.bg)}>
            <div className="flex justify-between items-start">
               <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
               </div>
               <div className={cn(
                 "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                 stat.isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
               )}>
                 {stat.isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                 {stat.trend}
               </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Trend Area Chart */}
        <div className="p-5 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm space-y-8">
           <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Revenue Trends</h3>
                 <p className="text-slate-400 text-xs font-semibold tracking-tight italic">Analyzing chronological financial growth vectors.</p>
              </div>
              <div className="hidden sm:flex gap-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Revenue
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-200"></span> Profit
                 </div>
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={aggregatedData}>
                    <defs>
                       <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                       dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      name="Revenue"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                    <Area 
                      name="Profit"
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#93c5fd" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Performance Bar Chart */}
          <div className="p-5 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="space-y-1">
               <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Daily Performance</h3>
               <p className="text-slate-400 text-xs font-semibold tracking-tight italic">Side-by-side comparison of daily revenue and net profit.</p>
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar name="Revenue" dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar name="Profit" dataKey="profit" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Activity List */}
          <div className="p-5 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-xl font-extrabold text-slate-900 mb-8 tracking-tight">Recent Invoices</h3>
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 min-h-[300px] custom-scrollbar">
               {filteredInvoices.slice(0, 10).map((inv) => (
                 <div key={inv.id} className="flex justify-between items-center group bg-slate-50/30 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center font-bold text-blue-600 group-hover:scale-110 transition-transform">
                          {inv.customerName[0]}
                       </div>
                       <div>
                          <div className="text-sm font-extrabold text-slate-900 truncate max-w-[140px] tracking-tight">{inv.customerName}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inv.invoiceNumber}</div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-black text-slate-900 tracking-tighter italic">₹{inv.totalAmount.toLocaleString()}</div>
                       <div className="text-[9px] font-black text-emerald-600 uppercase">Profit: ₹{inv.totalProfit?.toLocaleString()}</div>
                    </div>
                 </div>
               ))}
            </div>
            
            <button className="mt-8 w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
               Generate Detailed Report  <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
