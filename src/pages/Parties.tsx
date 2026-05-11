import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc,
  where,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, 
  Search, 
  Users, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  History,
  X,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Receipt,
  Download,
  Package,
  Calendar,
  ChevronRight,
  Printer,
  Star,
  ExternalLink,
  MessageSquare,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/currencyService';
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Parties() {
  const { businessId } = useAuth();
  const [parties, setParties] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'vendor'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [partyType, setPartyType] = useState<'customer' | 'vendor'>('customer');
  const [newParty, setNewParty] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    openingBalance: '0',
    type: 'customer'
  });
  const [editingParty, setEditingParty] = useState<any>(null);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [partyInvoices, setPartyInvoices] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'activity'>('overview');

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, 'parties'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParties(data);
      if (data.length > 0 && !selectedParty) {
        setSelectedParty(data[0]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'parties');
    });
    return () => unsubscribe();
  }, [businessId]);

  useEffect(() => {
    if (selectedParty && businessId) {
      const fetchInvoices = async () => {
        setIsLoadingHistory(true);
        const q = query(
          collection(db, 'invoices'),
          where('businessId', '==', businessId),
          where('customerPhone', '==', selectedParty.phone)
        );
        
        onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPartyInvoices(docs);
          setIsLoadingHistory(false);
        });
      };
      
      fetchInvoices();
    }
  }, [selectedParty?.id, businessId]);

  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'parties'), {
        ...newParty,
        type: partyType,
        businessId,
        createdAt: new Date().toISOString(),
        totalTransactions: 0,
        currentBalance: parseFloat(newParty.openingBalance || '0')
      });
      setIsAddModalOpen(false);
      setNewParty({
        name: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        openingBalance: '0',
        type: 'customer'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'parties');
    }
  };

  const deleteParty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this contact? All transaction links will be preserved in invoices.')) {
      try {
        await deleteDoc(doc(db, 'parties', id));
        if (selectedParty?.id === id) setSelectedParty(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'parties');
      }
    }
  };

  const handleEditParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParty) return;
    try {
      await updateDoc(doc(db, 'parties', editingParty.id), {
        name: editingParty.name,
        phone: editingParty.phone,
        email: editingParty.email,
        address: editingParty.address,
        gstin: editingParty.gstin,
        type: editingParty.type
      });
      setIsEditModalOpen(false);
      
      // Update selected party if it was the one being edited
      if (selectedParty?.id === editingParty.id) {
        setSelectedParty({ ...selectedParty, ...editingParty });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'parties');
    }
  };

  const openEditModal = (party: any) => {
    setEditingParty(party);
    setIsEditModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const filteredParties = parties.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)) &&
    (filterType === 'all' || p.type === filterType)
  );

  const calculateStats = (party: any) => {
    if (!party) return { totalSales: 0, totalPaid: 0, totalDue: 0, count: 0, totalOutstanding: 0 };
    const relevantInvoices = partyInvoices;
    const totalSales = relevantInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = relevantInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = totalSales - totalPaid;
    
    // totalDue is legacy, we'll use totalOutstanding for more accuracy
    return { 
      totalSales, 
      totalPaid, 
      totalDue: totalOutstanding, 
      totalOutstanding, 
      count: relevantInvoices.length 
    };
  };

  const partyStats = calculateStats(selectedParty);

  const handleExportCSV = () => {
    if (!selectedParty || partyInvoices.length === 0) return;
    
    const headers = ['Date', 'Invoice No', 'Status', 'Payment Method', 'Total Amount'];
    const rows = partyInvoices.map(inv => [
      new Date(inv.createdAt).toLocaleDateString(),
      inv.invoiceNumber,
      inv.status.toUpperCase(),
      inv.paymentMethod || 'Manual',
      inv.totalAmount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedParty.name}_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/30">
      {/* Header Area */}
      <div className="p-4 md:p-8 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              Stakeholder <span className="text-blue-600 opacity-30">Registry.</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] italic underline decoration-blue-600/20 underline-offset-4">
              {parties.length} Nodes Synchronized in Network
            </p>
          </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 mr-2">
            {(['all', 'customer', 'vendor'] as const).map((type) => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                  filterType === type 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Enlist Entity
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Panel - Party List */}
        <div className={cn(
          "w-full lg:w-80 border-r border-slate-100 bg-white flex flex-col shrink-0",
          selectedParty ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-4 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Find stakeholder..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {filteredParties.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto opacity-40">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No entries found</p>
              </div>
            ) : (
              filteredParties.map((party) => (
                <button
                  key={party.id}
                  onClick={() => setSelectedParty(party)}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left transition-all border group relative overflow-hidden",
                    selectedParty?.id === party.id 
                      ? "bg-slate-900 border-slate-900 shadow-xl shadow-slate-200" 
                      : "bg-white border-transparent hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all",
                      selectedParty?.id === party.id
                        ? "bg-white/10 text-white"
                        : party.type === 'customer' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {party.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "text-xs font-black truncate uppercase tracking-tight",
                        selectedParty?.id === party.id ? "text-white" : "text-slate-900"
                      )}>
                        {party.name}
                      </h3>
                      <div className={cn(
                        "text-[9px] font-bold truncate mt-0.5",
                        selectedParty?.id === party.id ? "text-slate-400" : "text-slate-400"
                      )}>
                        {party.phone}
                      </div>
                    </div>
                    {selectedParty?.id === party.id && (
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Intelligence Panel */}
        <div className={cn(
          "flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar",
          !selectedParty ? "hidden lg:block" : "block"
        )}>
          {selectedParty && (
            <button 
              onClick={() => setSelectedParty(null)}
              className="lg:hidden m-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Registry
            </button>
          )}
          <div className="p-4 md:p-8">
          {selectedParty ? (
             <div className="max-w-5xl mx-auto space-y-8 pb-20">
               {/* Party Hero Card */}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />
                 
                 <div className="relative flex justify-between items-start">
                   <div className="flex gap-8">
                     <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                       {selectedParty.name[0].toUpperCase()}
                     </div>
                     <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedParty.name}</h2>
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                           selectedParty.type === 'customer' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                         )}>
                           {selectedParty.type}
                         </span>
                       </div>
                       <p className="text-xs font-bold text-slate-400 max-w-md leading-relaxed">{selectedParty.address || 'Geographic logistics data not provisioned for this entity node.'}</p>
                       <div className="flex items-center gap-6 pt-2">
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tight">
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            {selectedParty.phone}
                          </div>
                          {selectedParty.email && (
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tight">
                              <Mail className="w-3.5 h-3.5 text-blue-600" />
                              {selectedParty.email}
                            </div>
                          )}
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex flex-col gap-2 relative">
                     <button 
                       onClick={(e) => deleteParty(selectedParty.id, e)}
                       title="Delete Entity"
                       className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all shadow-sm border border-rose-100 active:scale-95"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                     <div className="relative">
                       <button 
                         onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                         className={cn(
                           "p-4 rounded-2xl transition-all shadow-sm border active:scale-95",
                           isMoreMenuOpen ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:text-blue-600"
                         )}
                       >
                         <MoreVertical className="w-5 h-5" />
                       </button>

                       <AnimatePresence>
                         {isMoreMenuOpen && (
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.95, y: 10 }}
                             animate={{ opacity: 1, scale: 1, y: 0 }}
                             exit={{ opacity: 0, scale: 0.95, y: 10 }}
                             className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                           >
                             <button 
                               onClick={() => openEditModal(selectedParty)}
                               className="w-full px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
                             >
                               <MessageSquare className="w-4 h-4" />
                               Edit Profile
                             </button>
                             <button 
                               onClick={(e) => deleteParty(selectedParty.id, e).then(() => setIsMoreMenuOpen(false))}
                               className="w-full px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                               Terminate Node
                             </button>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Intelligence Bento Grid */}
               <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                 <div className="md:col-span-6 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                   <div className="absolute top-4 right-8 opacity-20"><TrendingUp className="w-24 h-24" /></div>
                   <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lifetime Asset Throughput</p>
                    <div className="text-5xl font-black tracking-tighter mb-2">{formatCurrency(partyStats.totalSales)}</div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                      <ArrowUpRightIcon className="w-3 h-3" />
                      Verified Revenue Flow
                    </div>
                   </div>
                 </div>
                 
                 <div className="md:col-span-6 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full translate-x-16 -translate-y-16 opacity-50" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Outstanding Balance</p>
                      <div className={cn(
                        "text-5xl font-black tracking-tighter mb-2",
                        partyStats.totalOutstanding > 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(partyStats.totalOutstanding)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        {partyStats.totalOutstanding > 0 ? (
                          <span className="text-rose-400 flex items-center gap-1.5 font-sans">
                            <Clock className="w-3 h-3" />
                            Awaiting Liquidation
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1.5 font-sans">
                            <ShieldCheck className="w-3 h-3" />
                            Account Cleared
                          </span>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="md:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">Transaction Frequency</p>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{partyStats.count}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Invoices Synchronized</div>
                 </div>

                 <div className="md:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans font-sans">Settled Assets</p>
                    <div className="text-3xl font-black text-emerald-600 tracking-tighter mb-1">
                      {formatCurrency(partyStats.totalPaid)}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Realized Liquidity</div>
                 </div>

                 <div className="md:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">Avg Ticket Size</p>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                      {formatCurrency(partyStats.count > 0 ? partyStats.totalSales / partyStats.count : 0)}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Mean Order Payload</div>
                 </div>
               </div>

               {/* Transaction Ledger */}
               <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                          <History className="w-5 h-5" />
                       </div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction Ledger</h3>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={handleExportCSV}
                         className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                       >
                         Export .CSV
                       </button>
                       <button 
                         onClick={handlePrintLedger}
                         className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                       >
                         Print Ledger
                       </button>
                    </div>
                  </div>

                   <div className="divide-y divide-slate-50">
                    {partyInvoices.length === 0 ? (
                      <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                          <Receipt className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">No Transactional records provisioned</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50/50">
                            <tr>
                              <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                              <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Paid</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-600">Balance</th>
                              <th className="px-10 py-5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {partyInvoices.map((invoice) => {
                              const balance = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
                              return (
                                <React.Fragment key={invoice.id}>
                                  <tr 
                                    className="group hover:bg-slate-50/30 transition-colors cursor-pointer"
                                    onClick={() => setExpandedInvoiceId(expandedInvoiceId === invoice.id ? null : invoice.id)}
                                  >
                                    <td className="px-10 py-6">
                                      <div className="flex items-center gap-4">
                                        <div className={cn(
                                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                          invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                        )}>
                                          <Receipt className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-black text-slate-900 tracking-tight uppercase mb-0.5">{invoice.invoiceNumber}</div>
                                          <div className="text-[10px] font-bold text-slate-400 font-sans">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                      <span className={cn(
                                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm",
                                        invoice.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                      )}>
                                        {invoice.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-6 text-right font-black text-slate-900 text-xs">
                                      {formatCurrency(invoice.totalAmount)}
                                    </td>
                                    <td className="px-6 py-6 text-right font-bold text-emerald-600 text-xs">
                                      {formatCurrency(invoice.amountPaid || 0)}
                                    </td>
                                    <td className="px-6 py-6 text-right font-black text-rose-600 text-xs">
                                      {formatCurrency(balance)}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all mx-auto",
                                        expandedInvoiceId === invoice.id ? "bg-slate-900 text-white" : "text-slate-300 group-hover:text-slate-500"
                                      )}>
                                        <ChevronRight className={cn("w-4 h-4 transition-transform", expandedInvoiceId === invoice.id ? "rotate-90" : "")} />
                                      </div>
                                    </td>
                                  </tr>
                                  
                                  {expandedInvoiceId === invoice.id && (
                                    <tr>
                                      <td colSpan={6} className="p-0">
                                        <motion.div 
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
                                        >
                                          <div className="px-10 py-8">
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                              {invoice.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                                  <div>
                                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">{item.units} Units x {formatCurrency(item.price)}</div>
                                                  </div>
                                                  <div className="text-[10px] font-black text-slate-900">{formatCurrency(item.units * item.price)}</div>
                                                </div>
                                              ))}
                                            </div>
                                            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                               <div className="flex gap-6">
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Payment Method: <span className="text-slate-900 ml-1">{invoice.paymentMethod || 'Manual Entry'}</span>
                                                  </div>
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Due Date: <span className="text-slate-900 ml-1">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                                                  </div>
                                               </div>
                                               <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200">
                                                  <Download className="w-3 h-3" />
                                                  Retrieve PDF
                                               </button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
               </div>
             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-30">
              <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center">
                <Users className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Select an entity to reveal intelligence</p>
            </div>
          )}
        </div>
      </div>

      {/* Party History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] max-w-4xl w-full h-[85vh] shadow-2xl relative border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
                    <History className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase underline decoration-blue-600 decoration-2 underline-offset-4">{selectedParty?.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Ledger & Itemized History</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:shadow-sm"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* History Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-6">
                {isLoadingHistory ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : partyInvoices.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                      <Receipt className="w-10 h-10 text-slate-200" />
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-lg">No records found for this party.</p>
                      <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mt-1">Registry is currently empty.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partyInvoices.map((invoice) => (
                      <div key={invoice.id} className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div 
                          className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                          onClick={() => setExpandedInvoiceId(expandedInvoiceId === invoice.id ? null : invoice.id)}
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                              <Receipt className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-slate-900">{invoice.invoiceNumber}</span>
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                  invoice.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                )}>
                                  {invoice.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                <span className="flex items-center gap-1.5 font-sans">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(invoice.createdAt).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1.5 font-sans">
                                  <CreditCard className="w-3 h-3" />
                                  {invoice.paymentMethod || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-10">
                            <div className="text-right">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</div>
                              <div className="text-sm font-black text-slate-400 tracking-tighter line-through opacity-50">{formatCurrency(invoice.totalAmount)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Balance Due</div>
                              <div className="text-lg font-black tracking-tighter text-slate-900">
                                {formatCurrency((invoice.totalAmount || 0) - (invoice.amountPaid || 0))}
                              </div>
                            </div>
                            <ChevronRight className={cn(
                              "w-5 h-5 text-slate-300 transition-transform duration-300",
                              expandedInvoiceId === invoice.id ? "rotate-90 text-blue-600" : ""
                            )} />
                          </div>
                        </div>

                        {/* Expanded Items Drawer */}
                        <AnimatePresence>
                          {expandedInvoiceId === invoice.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-slate-50/50 border-t border-slate-50"
                            >
                              <div className="p-8">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Package className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Purchased Items ({invoice.items?.length || 0})</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {invoice.items?.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                        <div>
                                          <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                                          <div className="text-[10px] font-bold text-slate-400 mt-1">
                                            {item.units} x {formatCurrency(item.price)}
                                          </div>
                                        </div>
                                        <div className="text-[11px] font-black text-slate-900">
                                          {formatCurrency(item.units * item.price)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-6 p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center">
                                    <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                                      <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</div>
                                        <div className="text-sm font-black">{formatCurrency(invoice.subtotal)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax (GST)</div>
                                        <div className="text-sm font-black text-blue-400">+{formatCurrency(invoice.totalGst)}</div>
                                      </div>
                                      {invoice.totalDiscount > 0 && (
                                        <div>
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount</div>
                                          <div className="text-sm font-black text-rose-400">-{formatCurrency(invoice.totalDiscount)}</div>
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert('Initiating invoice print engine...');
                                      }}
                                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 flex items-center gap-2 group"
                                    >
                                      <Printer className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Re-Print</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between font-sans">
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-3">
                      {partyInvoices.slice(0, 3).map((inv, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                          {inv.invoiceNumber.slice(0, 2)}
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     Authorized digital signatures verified across {partyInvoices.length} nodes.
                   </p>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  Close Records
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Party Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative border border-slate-200 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6 mb-10">
                 <div className="w-16 h-16 bg-slate-900 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                    <UserPlus className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase">Enlist Entity</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Provisioning new node in sovereign network</p>
                 </div>
              </div>

              <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8 font-black text-[10px] uppercase tracking-widest">
                 <button 
                   onClick={() => setPartyType('customer')}
                   className={cn(
                     "flex-1 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3",
                     partyType === 'customer' ? "bg-white text-slate-900 shadow-xl border border-slate-100 shadow-slate-200" : "text-slate-400"
                   )}
                 >
                    <UserPlus className="w-4 h-4" />
                    Customer Record
                 </button>
                 <button 
                   onClick={() => setPartyType('vendor')}
                   className={cn(
                     "flex-1 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3",
                     partyType === 'vendor' ? "bg-white text-slate-900 shadow-xl border border-slate-100 shadow-slate-200" : "text-slate-400"
                   )}
                 >
                    <ShieldCheck className="w-4 h-4" />
                    Supplier Record
                 </button>
              </div>

              <form onSubmit={handleAddParty} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Entity Identity</label>
                      <input 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-200"
                        placeholder="Full Legal Name"
                        value={newParty.name}
                        onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Secure Line</label>
                      <input 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-200"
                        placeholder="+91-0000000000"
                        value={newParty.phone}
                        onChange={(e) => setNewParty({...newParty, phone: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Digital Portal</label>
                      <input 
                        type="email"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-200"
                        placeholder="contact@entity.com"
                        value={newParty.email}
                        onChange={(e) => setNewParty({...newParty, email: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Fiscal (GSTIN)</label>
                      <input 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-200"
                        placeholder="22AAAAA0000A1Z5"
                        value={newParty.gstin}
                        onChange={(e) => setNewParty({...newParty, gstin: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Asset Location (Address)</label>
                   <textarea 
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[100px] placeholder:text-slate-200"
                     placeholder="Physical logistics and dispatch coordinates..."
                     value={newParty.address}
                     onChange={(e) => setNewParty({...newParty, address: e.target.value})}
                   />
                </div>

                <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 border-dashed space-y-4">
                   <div className="flex justify-between items-center">
                     <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 italic">
                       <Wallet className="w-3.5 h-3.5" />
                       Fiscal Initialization
                     </h4>
                   </div>
                   <div className="flex items-center gap-6">
                       <div className="flex-1 space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Registry Credit (₹)</label>
                           <input 
                             type="number"
                             className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xl font-black tracking-tighter text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                             value={newParty.openingBalance}
                             onChange={(e) => setNewParty({...newParty, openingBalance: e.target.value})}
                           />
                       </div>
                   </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-[2rem] hover:bg-blue-600 transition-all shadow-2xl shadow-blue-100 active:scale-95"
                >
                  Confirm Registry Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Edit Party Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingParty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative border border-slate-200 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6 mb-10">
                 <div className="w-16 h-16 bg-slate-900 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                    <MessageSquare className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase">Modify Profile</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Updating node parameters in registry</p>
                 </div>
              </div>

              <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8 font-black text-[10px] uppercase tracking-widest">
                 <button 
                   onClick={() => setEditingParty({...editingParty, type: 'customer'})}
                   className={cn(
                     "flex-1 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3",
                     editingParty.type === 'customer' ? "bg-white text-slate-900 shadow-xl border border-slate-100 shadow-slate-200" : "text-slate-400"
                   )}
                 >
                    <UserPlus className="w-4 h-4" />
                    Customer
                 </button>
                 <button 
                   onClick={() => setEditingParty({...editingParty, type: 'vendor'})}
                   className={cn(
                     "flex-1 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3",
                     editingParty.type === 'vendor' ? "bg-white text-slate-900 shadow-xl border border-slate-100 shadow-slate-200" : "text-slate-400"
                   )}
                 >
                    <ShieldCheck className="w-4 h-4" />
                    Vendor
                 </button>
              </div>

              <form onSubmit={handleEditParty} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Entity Identity</label>
                      <input 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        value={editingParty.name}
                        onChange={(e) => setEditingParty({...editingParty, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Secure Line</label>
                      <input 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        value={editingParty.phone}
                        onChange={(e) => setEditingParty({...editingParty, phone: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Digital Portal</label>
                      <input 
                        type="email"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        value={editingParty.email}
                        onChange={(e) => setEditingParty({...editingParty, email: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Fiscal (GSTIN)</label>
                      <input 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        value={editingParty.gstin}
                        onChange={(e) => setEditingParty({...editingParty, gstin: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Asset Location (Address)</label>
                   <textarea 
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[100px]"
                     value={editingParty.address}
                     onChange={(e) => setEditingParty({...editingParty, address: e.target.value})}
                   />
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-[2rem] hover:bg-blue-600 transition-all shadow-2xl shadow-blue-100 active:scale-95"
                >
                  Update Registry Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
