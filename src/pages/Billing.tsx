import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  increment,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  Download, 
  UserPlus,
  ArrowRight,
  FileText,
  Package,
  X,
  ShieldCheck,
  BarChart3,
  Camera,
  History,
  Settings,
  Save,
  ChevronRight,
  TrendingDown,
  Calendar,
  MessageCircle,
  QrCode,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { 
  PLAN_LIMITS,
  useAuth 
} from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { logInventoryChange } from '../lib/inventoryService';
import { Currency, formatCurrency } from '../lib/currencyService';
import BarcodeScanner, { ScannerStatus } from '../components/BarcodeScanner'; // Updated
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Billing() {
  const { profile, businessId } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';
  const isAccountant = profile?.role === 'accountant';
  const canCreateBills = isAdmin || isStaff;

  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '', id: '', address: '' });
  const [invoiceDates, setInvoiceDates] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft'>('all');
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this-month' | 'last-month' | 'custom'>('all');
  const [customRange, setCustomRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [discountGlobal, setDiscountGlobal] = useState({ value: 0, type: '%' as '%' | '₹' });
  const [useVat, setUseVat] = useState(true);
  const [useEarlyDiscount, setUseEarlyDiscount] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>(null);
  const [searchInventory, setSearchInventory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [gstType, setGstType] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [onlineMethod, setOnlineMethod] = useState<'UPI' | 'Card' | 'Net Banking' | 'Wallet' | 'EMI'>('UPI');
  const [invoiceTheme, setInvoiceTheme] = useState<'Classic' | 'Modern' | 'Professional'>('Modern');
  const [invoiceSettings, setInvoiceSettings] = useState({
    header: '',
    footer: '',
    terms: profile?.paymentTerms || '',
    notes: profile?.invoiceNotes || '',
    gstin: profile?.gstin || '',
    address: profile?.location || '',
    bankName: profile?.bankName || '',
    accountNo: profile?.accountNumber || '',
    ifsc: profile?.ifscCode || '',
    upiId: ''
  });
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!businessId) return;
    const qSettings = query(collection(db, 'settings'), where('businessId', '==', businessId));
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setInvoiceSettings({
          header: data.invoiceHeader || '',
          footer: data.invoiceFooter || '',
          terms: data.invoiceTerms || profile?.paymentTerms || '',
          notes: data.invoiceNotes || profile?.invoiceNotes || '',
          gstin: data.businessGstin || profile?.gstin || '',
          address: data.businessAddress || profile?.location || '',
          bankName: data.bankName || profile?.bankName || '',
          accountNo: data.accountNumber || profile?.accountNumber || '',
          ifsc: data.ifscCode || profile?.ifscCode || '',
          upiId: data.upiId || profile?.upiId || ''
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings');
    });

    const q = query(collection(db, 'inventory'), where('businessId', '==', businessId));
    const unsubscribeInv = onSnapshot(q, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'inventory');
    });

    const qCust = query(collection(db, 'parties'), where('businessId', '==', businessId), where('type', '==', 'customer'));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'parties');
    });

    const qInvoiceCount = query(collection(db, 'invoices'), where('businessId', '==', businessId));
    const unsubscribeInvoiceCount = onSnapshot(qInvoiceCount, (snapshot) => {
      setTotalInvoicesCount(snapshot.size);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
    });

    const qAllInvoices = query(collection(db, 'invoices'), where('businessId', '==', businessId));
    const unsubscribeAllInvoices = onSnapshot(qAllInvoices, (snapshot) => {
      setAllInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
    });

    return () => {
      unsubscribeSettings();
      unsubscribeInv();
      unsubscribeCust();
      unsubscribeInvoiceCount();
      unsubscribeAllInvoices();
    };
  }, [businessId]);

  const filteredInvoices = allInvoices.filter(inv => {
    // 1. Status Filter
    if (historyFilter !== 'all' && inv.status?.toLowerCase() !== historyFilter) return false;
    
    // 2. Search Filter
    const search = searchHistory.toLowerCase();
    if (search && !(
      inv.invoiceNumber?.toLowerCase().includes(search) || 
      inv.customerName?.toLowerCase().includes(search) ||
      inv.customerPhone?.toLowerCase().includes(search)
    )) return false;

    // 3. Date Range Filter
    const invDate = new Date(inv.createdAt);
    const now = new Date();
    
    if (dateFilter === 'this-month') {
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'last-month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return invDate.getMonth() === lastMonth.getMonth() && invDate.getFullYear() === lastMonth.getFullYear();
    } else if (dateFilter === 'custom') {
      if (!customRange.start || !customRange.end) return true;
      const start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return invDate >= start && invDate <= end;
    }
    
    return true;
  });

  useEffect(() => {
    if (customerInfo.phone && customerInfo.phone.length >= 10) {
      fetchCustomerHistory(customerInfo.phone);
    } else if (!customerInfo.phone) {
      setCustomerHistory([]);
    }
  }, [customerInfo.phone]);

  const fetchCustomerHistory = async (phone: string) => {
    if (!phone || phone.length < 5) return;
    try {
      const q = query(
        collection(db, 'invoices'), 
        where('businessId', '==', businessId),
        where('customerPhone', '==', phone)
      );
      const snap = await getDocs(q);
      setCustomerHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettingsSave = async () => {
    if (!businessId) return;
    try {
      const q = query(collection(db, 'settings'), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      
      const payload = {
        businessId,
        invoiceHeader: invoiceSettings.header,
        invoiceFooter: invoiceSettings.footer,
        invoiceTerms: invoiceSettings.terms,
        invoiceNotes: invoiceSettings.notes,
        businessGstin: invoiceSettings.gstin,
        businessAddress: invoiceSettings.address,
        bankName: invoiceSettings.bankName,
        accountNumber: invoiceSettings.accountNo,
        ifscCode: invoiceSettings.ifsc,
        upiId: invoiceSettings.upiId,
        updatedAt: new Date().toISOString()
      };

      if (!snap.empty) {
        await updateDoc(doc(db, 'settings', snap.docs[0].id), payload);
      } else {
        await addDoc(collection(db, 'settings'), payload);
      }
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['All', ...Array.from(new Set(inventory.map(item => item.category)))];

  const addItemToInvoice = (item: any) => {
    // Check Plan Limits
    const currentPlan = profile?.plan || 'starter';
    const limit = ((PLAN_LIMITS as any)[currentPlan] || PLAN_LIMITS.starter).invoices;
    
    if (totalInvoicesCount >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    if (item.quantity <= 0) {
      alert('This item is currently out of stock.');
      return;
    }
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      if (existing.qty >= item.quantity) {
        alert('Cannot add more than available stock.');
        return;
      }
      setSelectedItems(selectedItems.map(i => 
        i.id === item.id ? { ...i, qty: i.qty + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { 
        ...item, 
        qty: 1, 
        discount: 0, 
        discountType: '%' as '%' | '₹',
        sgst: (item.gstRate || 18) / 2,
        cgst: (item.gstRate || 18) / 2
      }]);
    }
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setSelectedItems(selectedItems.map(i => {
      if (i.id !== id) return i;
      
      const updated = { ...i, [field]: value };
      
      if (field === 'qty') {
        const inv = inventory.find(invItem => invItem.id === id);
        if (inv && value > inv.quantity) {
           alert(`Only ${inv.quantity} units available.`);
           return i;
        }
      }
      
      return updated;
    }));
  };

  const handleScan = (sku: string) => {
    const item = inventory.find(i => i.sku === sku);
    if (item) {
      if (item.quantity <= 0) {
        setScannerStatus({ type: 'error', message: 'Out of Stock' });
        return;
      }
      setScannerStatus({ type: 'success', message: `Added ${item.name}` });
      addItemToInvoice(item);
    } else {
      setScannerStatus({ type: 'error', message: 'SKU Not Found' });
    }
  };

  const calculateItemAmount = (item: any) => {
    return item.price * item.qty;
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((acc, i) => acc + calculateItemAmount(i), 0);
  };

  const calculateTax = () => {
    if (!useVat) return 0;
    return calculateSubtotal() * 0.15; // 15% VAT as per image
  };

  const calculateTotalDiscounts = () => {
    let total = manualDiscount;
    if (useEarlyDiscount) {
      total += calculateSubtotal() * 0.02;
    }
    return total;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discounts = calculateTotalDiscounts();
    return (subtotal + tax) - discounts;
  };
  
  const calculateProfit = () => selectedItems.reduce((acc, i) => acc + ((i.price - i.costPrice) * i.qty), 0);

  const clearCart = () => {
    if (selectedItems.length > 0 && window.confirm('Clear all items from current invoice?')) {
      setSelectedItems([]);
      setCustomerInfo({ name: '', phone: '', email: '', id: '', address: '' });
      setPaymentMethod('Cash');
      setManualDiscount(0);
      setUseEarlyDiscount(false);
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (selectedItems.length === 0 || !customerInfo.name) {
      alert('Please select items and customer info');
      return;
    }

    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const amount = Math.round(calculateTotal() * 100);

    const options = {
      key: (import.meta as any).env.VITE_RAZORPAY_KEY || 'rzp_test_So4JDdFZuK4Yns',
      amount: amount,
      currency: 'INR',
      name: profile?.businessName || 'Billcore Invoice',
      description: `Payment for Invoice by ${customerInfo.name}`,
      image: 'https://i.ibb.co/LdG3xQK/logo.png',
      handler: async function (response: any) {
        try {
          setAmountPaid(calculateTotal());
          handleGenerateInvoice('paid', response.razorpay_payment_id);
        } catch (error) {
          console.error(error);
          alert('Failed to generate invoice after payment.');
        }
      },
      prefill: {
        name: customerInfo.name || '',
        email: customerInfo.email || '',
        contact: customerInfo.phone || ''
      },
      theme: {
        color: '#2563eb'
      }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  const handleGenerateInvoice = async (forcedStatus?: string, razorpayPaymentId?: string) => {
    if (selectedItems.length === 0 || !customerInfo.name) {
      alert('Please select items and customer info');
      return;
    }

    // Check Plan Limits
    const currentPlan = profile?.plan || 'starter';
    const limit = ((PLAN_LIMITS as any)[currentPlan] || PLAN_LIMITS.starter).invoices;
    
    if (totalInvoicesCount >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      const total = calculateTotal();
      let status = 'pending';
      
      if (forcedStatus) {
        status = forcedStatus;
      } else {
        if (amountPaid >= total) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partially paid'; // Or just stick to pending as per user request
        } else {
          status = 'pending';
        }
      }

      const invoiceData = {
        businessId,
        invoiceNumber: `${profile?.invoicePrefix || 'INV'}-${Date.now().toString().slice(-6)}`,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        customerAddress: customerInfo.address,
        issueDate: invoiceDates.date,
        dueDate: invoiceDates.dueDate,
        items: selectedItems,
        subtotal: calculateSubtotal(),
        totalGst: calculateTax(),
        totalDiscount: calculateTotalDiscounts(),
        totalAmount: total,
        amountPaid: amountPaid,
        totalProfit: calculateProfit(),
        gstType,
        paymentMethod: paymentMethod === 'Online' ? `Online (${onlineMethod})` : 'Cash',
        theme: invoiceTheme,
        terms: invoiceSettings.terms,
        notes: invoiceSettings.notes,
        status: status.toLowerCase(),
        razorpayPaymentId: razorpayPaymentId || null,
        createdAt: new Date().toISOString(),
        updatedBy: profile?.displayName
      };

      // 1. Save Invoice
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      setLastInvoiceId(docRef.id);

      // 2. Sync Customer Data
      if (customerInfo.name) {
        const existingParty = customers.find(c => 
          c.name.toLowerCase() === customerInfo.name.toLowerCase() || 
          (customerInfo.id && c.id === customerInfo.id)
        );
        
        if (existingParty) {
          await updateDoc(doc(db, 'parties', existingParty.id), {
            phone: customerInfo.phone || existingParty.phone || '',
            email: customerInfo.email || existingParty.email || '',
            address: customerInfo.address || existingParty.address || '',
            updatedAt: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, 'parties'), {
            businessId,
            type: 'customer',
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email,
            address: customerInfo.address,
            openingBalance: '0',
            currentBalance: 0,
            totalTransactions: 0,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 3. Update Inventory levels and log changes
      for (const item of selectedItems) {
        const itemRef = doc(db, 'inventory', item.id);
        const currentQty = inventory.find(i => i.id === item.id)?.quantity || 0;
        
        await updateDoc(itemRef, {
          quantity: increment(-item.qty)
        });

        // Log the sale/stock reduction
        await logInventoryChange({
          itemId: item.id,
          businessId: businessId!,
          type: 'sale',
          field: 'quantity',
          oldValue: currentQty,
          newValue: currentQty - item.qty,
          description: `Sale recorded: Transaction #${invoiceData.invoiceNumber}`,
          updatedBy: profile?.displayName || 'System'
        });
      }

      setIsInvoiceOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhatsAppShare = () => {
    const phone = viewingInvoice ? viewingInvoice.customerPhone : customerInfo.phone;
    const name = viewingInvoice ? viewingInvoice.customerName : customerInfo.name;
    const total = viewingInvoice ? viewingInvoice.totalAmount : calculateTotal();
    const invoiceNum = viewingInvoice ? viewingInvoice.invoiceNumber : 'your recent purchase';
    
    if (!phone) {
      alert("Please enter a customer phone number first.");
      return;
    }
    const formattedTotal = formatCurrency(total);
    const message = `Hello ${name},\n\nThank you for your purchase from ${profile?.businessName || 'BILLCORE'}.\n\nYour invoice (${invoiceNum}) for ${formattedTotal} has been generated.`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailShare = () => {
    if (!customerInfo.email) return;
    const formattedTotal = formatCurrency(calculateTotal());
    const subject = `Invoice from ${profile?.businessName || 'BILLCORE'}`;
    const body = `Hello ${customerInfo.name},\n\nPlease find your invoice details for ${formattedTotal} attached or linked below.\n\nThank you for your business!`;
    window.location.href = `mailto:${customerInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const deleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      setIsInvoiceOpen(false);
      setViewingInvoice(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
      const element = invoiceRef.current;
      
      // html-to-image is more robust for modern CSS (like OKLCH)
      const canvas = await toCanvas(element, {
        quality: 1.0,
        pixelRatio: 3, // Higher ratio for sharper PDF
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          borderRadius: '0' // Remove rounded corners for export
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate content dimensions to fit A4
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const finalImgHeight = imgHeight * ratio;

      // Handle multi-page if content is too long
      let heightLeft = finalImgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - finalImgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      const fileName = `Invoice_${customerInfo.name.replace(/\s+/g, '_') || 'Customer'}_${Date.now().toString().slice(-6)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try the Print option.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const updateStoredPaymentMethod = async (newVal: any) => {
    setPaymentMethod(newVal);
    if (lastInvoiceId) {
      try {
        await updateDoc(doc(db, 'invoices', lastInvoiceId), { 
          paymentMethod: newVal === 'Online' ? `Online (${onlineMethod})` : newVal,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to update payment method in Firestore", err);
      }
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-12 font-sans overflow-y-auto">
      {/* Page Title & Usage Meter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            {canCreateBills ? 'New Billing Entry' : 'Invoices Ledger'}
          </h1>
          <p className="text-slate-400 font-bold opacity-80">
            {canCreateBills ? `Drafting Invoice #${profile?.invoicePrefix || 'INV'}-${Date.now().toString().slice(-6)}` : 'System wide transaction archives'}
          </p>
        </div>

        {/* Usage Meter */}
        {!isAccountant && (profile?.plan === 'starter' || !profile?.plan) && (
          <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm min-w-[280px] w-full md:w-auto">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{PLAN_LIMITS.starter.name} Usage</span>
                </div>
                <span className="text-xs font-black text-slate-900">{totalInvoicesCount}/{PLAN_LIMITS.starter.invoices}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalInvoicesCount / 50) * 100, 100)}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    totalInvoicesCount >= 45 ? "bg-rose-500" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  )}
                />
            </div>
            {totalInvoicesCount >= 40 && (
              <p className="mt-3 text-[9px] font-bold text-rose-500 uppercase tracking-widest text-center animate-bounce">
                  {50 - totalInvoicesCount} invoices left. <span className="underline cursor-pointer" onClick={() => setIsUpgradeModalOpen(true)}>Upgrade now</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left Column - Forms */}
        {canCreateBills ? (
          <div className="flex-1 space-y-10">
            
            {/* Customer Information Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                <div className="relative">
                  <input 
                    type="text" placeholder="e.g. Walk-in Customer"
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-100 outline-none transition-all"
                    value={customerInfo.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerInfo(prev => ({...prev, name: val}));
                      const match = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                      if (match) {
                        setCustomerInfo({
                          name: match.name,
                          phone: match.phone || '',
                          email: match.email || '',
                          id: match.id,
                          address: match.address || match.billingAddress || ''
                        });
                      }
                    }}
                    list="customers-list"
                  />
                  <datalist id="customers-list">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" placeholder="customer@email.com"
                  className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-100 outline-none transition-all"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="tel" placeholder="+91 9876543210"
                  className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-100 outline-none transition-all"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address</label>
                <textarea 
                  placeholder="123 business Road, Suite 400..."
                  className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-100 outline-none transition-all min-h-[120px] resize-none"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Inventory Selection Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventory Selection</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <input 
                      type="text" placeholder="Search inventory..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-slate-200 outline-none transition-all"
                      value={searchInventory}
                      onChange={(e) => setSearchInventory(e.target.value)}
                      list="inventory-list"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          const match = inventory.find(i => i.name.toLowerCase() === val.toLowerCase() || i.sku === val);
                          if (match) {
                            addItemToInvoice(match);
                            setSearchInventory('');
                          }
                        }
                      }}
                    />
                    <datalist id="inventory-list">
                      {inventory.map(i => <option key={i.id} value={i.name}>{i.sku}</option>)}
                    </datalist>
                  </div>
                  <button 
                    onClick={() => setIsItemModalOpen(true)}
                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center shrink-0"
                    title="Select from Inventory List"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="text-sm font-black text-blue-600 hover:text-blue-700 transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Scan SKU
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">
                <div className="col-span-6">Item Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="space-y-4">
                {selectedItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 rounded-2xl p-4 group transition-all hover:bg-slate-100/50">
                    <div className="col-span-6">
                      <div className="font-black text-slate-900">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400">Product SKU: {item.sku || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="bg-white rounded-lg border border-slate-200 p-2 flex items-center justify-center">
                        <input 
                          type="number" 
                          value={item.qty}
                          className="w-10 text-center font-bold outline-none bg-transparent"
                          onChange={(e) => updateItemField(item.id, 'qty', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-black text-slate-900">
                      {formatCurrency(item.price)}
                    </div>
                    <div className="col-span-2 text-right font-black text-slate-900">
                      {formatCurrency(calculateItemAmount(item))}
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {selectedItems.length === 0 && (
                  <div className="py-12 text-center">
                    <button 
                      onClick={() => setIsItemModalOpen(true)}
                      className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200 hover:text-slate-400 transition-all border-2 border-dashed border-slate-200"
                    >
                      <Plus className="w-8 h-8" />
                    </button>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Add item from inventory registry</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tax & Discounts & Payment Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <TrendingDown className="w-6 h-6 rotate-180" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Financial & Payment</h2>
            </div>
            
            <div className="flex flex-col gap-10">
              <div className="flex flex-wrap gap-10 items-start">
                <div className="flex items-center gap-10 border-r border-slate-100 pr-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-slate-900">Applied Tax (VAT 15%)</span>
                      <button 
                        onClick={() => setUseVat(!useVat)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          useVat ? "bg-rose-600" : "bg-slate-200"
                        )}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", useVat ? "right-1" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-slate-900">Early Payment Discount (2%)</span>
                      <button 
                        onClick={() => setUseEarlyDiscount(!useEarlyDiscount)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          useEarlyDiscount ? "bg-rose-600" : "bg-slate-200"
                        )}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", useEarlyDiscount ? "right-1" : "left-1")} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1 max-w-[300px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Discount Value</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                    <input 
                      type="number" 
                      className="w-full pl-10 pr-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 outline-none"
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Select Payment Method</label>
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {['Cash', 'Online'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as any)}
                        className={cn(
                          "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.1em] border transition-all flex items-center gap-3",
                          paymentMethod === method 
                            ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 scale-105" 
                            : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          paymentMethod === method ? "bg-blue-400 animate-pulse" : "bg-slate-300"
                        )} />
                        {method}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'Online' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-4"
                    >
                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1 block">Digital Channel</label>
                      <div className="flex flex-wrap gap-2">
                        {['UPI', 'Card'].map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setOnlineMethod(sub as any)}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                              onlineMethod === sub 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-white text-blue-400 hover:bg-blue-100"
                            )}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Terms (For this invoice)</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-100 outline-none transition-all min-h-[80px] resize-none"
                    value={invoiceSettings.terms}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, terms: e.target.value})}
                    placeholder="Custom payment terms..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Notes (For this invoice)</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-100 outline-none transition-all min-h-[80px] resize-none"
                    value={invoiceSettings.notes}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, notes: e.target.value})}
                    placeholder="Custom notes for client..."
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          /* Accountant View - Info Card */
          <div className="flex-1 space-y-10">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <ShieldCheck className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audit Access Mode</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Read-Only Financial Records</p>
                   </div>
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-xl">
                   You are currently in accountant view. You have authorization to view and export all transaction archives, however, creation of new billing entries is restricted to operations staff.
                </p>
             </div>
          </div>
        )}

        {/* Right Column - Sidebar & Preview */}
        <div className="w-full lg:w-96 space-y-8">
          
          {/* Live Preview Card */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="bg-[#1E293B] p-8 pb-10">
              <div className="flex justify-between items-start text-white mb-6">
                <div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Live Preview</div>
                  <div className="text-2xl font-black tracking-tight underline decoration-rose-600 decoration-4 underline-offset-8">Draft Invoice</div>
                </div>
                <div className="text-[10px] font-black text-white/40 text-right">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
            
            <div className="p-8 -mt-6 bg-white rounded-t-[2.5rem] flex-1 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-rose-600 font-black text-lg">{profile?.businessName || 'BILLCORE'}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{invoiceSettings.address || 'Business HQ'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">To:</div>
                  <div className="font-black text-slate-900 leading-tight">{customerInfo.name || 'Walk-in Customer'}</div>
                  <div className="text-[10px] font-bold text-slate-400">{customerInfo.email || 'Customer Email'}</div>
                </div>
              </div>

              <div className="h-px bg-slate-50 w-full"></div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-slate-900">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-400">
                  <span>Tax (15%)</span>
                  <span className="text-slate-900">{formatCurrency(calculateTax())}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-rose-600">
                  <span>Discounts</span>
                  <span>-{formatCurrency(calculateTotalDiscounts())}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Amount Due</div>
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(calculateTotal())}</div>
              </div>

              <div className="pt-8 space-y-4">
                {canCreateBills && (
                  <div className="flex justify-between items-center group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Received</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input 
                        type="number"
                        className="w-32 pl-7 pr-4 py-2 bg-slate-50 border-2 border-transparent rounded-xl text-right font-mono font-black text-slate-900 focus:bg-white focus:border-rose-600 outline-none transition-all"
                        value={amountPaid === 0 ? '' : amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Status</span>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    amountPaid >= calculateTotal() ? "bg-emerald-50 text-emerald-600" :
                    amountPaid > 0 ? "bg-amber-50 text-amber-600" :
                    "bg-rose-50 text-rose-600"
                  )}>
                    {amountPaid >= calculateTotal() ? 'Full Payment' :
                     amountPaid > 0 ? 'Partial Payment' : 'Unpaid / Pending'}
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <p className="text-[9px] text-slate-400 leading-relaxed italic">
                  * Payment is due within 30 days. Late payments are subject to a 1.5% monthly fee. Please include the invoice number in your bank transfer reference.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canCreateBills && (
            <div className="space-y-6">
              {paymentMethod === 'Online' && onlineMethod === 'UPI' && invoiceSettings.upiId && (
                <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 flex flex-col items-center justify-center shadow-lg shadow-blue-500/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                   <div className="flex items-center gap-3 mb-6 w-full justify-center">
                     <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                       <QrCode className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 tracking-tight">Accept UPI Payment</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan to Pay Exact Amount</p>
                     </div>
                   </div>
                   
                   <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                     <QRCodeSVG 
                       value={`upi://pay?pa=${invoiceSettings.upiId}&pn=${encodeURIComponent(profile?.businessName || 'Business')}&am=${calculateTotal()}&cu=INR`} 
                       size={180} 
                       level="H" 
                     />
                     <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center">
                       <Check className="w-3 h-3 text-white" />
                     </div>
                   </div>

                   <div className="mt-6 text-center space-y-1 relative z-10">
                     <div className="text-3xl font-black tracking-tighter text-blue-600">{formatCurrency(calculateTotal())}</div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{invoiceSettings.upiId}</div>
                   </div>
                </div>
              )}
              
              <div className="flex gap-4">
                <button 
                className="flex-1 h-16 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                onClick={() => handleGenerateInvoice('draft')}
              >
                <Save className="w-5 h-5" />
                Save Draft
              </button>
              {paymentMethod === 'Online' && onlineMethod === 'Card' ? (
                 <button 
                   className="flex-1 h-16 flex items-center justify-center gap-3 bg-[#0a2540] text-white rounded-2xl font-black hover:bg-black transition-all active:scale-95 shadow-lg"
                   onClick={handleRazorpayPayment}
                 >
                   <ArrowRight className="w-5 h-5" />
                   Pay via Razorpay & Generate
                 </button>
              ) : (
                 <button 
                   className="flex-1 h-16 flex items-center justify-center gap-3 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-100"
                   onClick={() => handleGenerateInvoice()}
                 >
                   <ArrowRight className="w-5 h-5" />
                   Generate Invoice
                 </button>
              )}
            </div>
            </div>
          )}

          <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex gap-4">
            <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
            <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
              {canCreateBills 
                ? "Generating this invoice will automatically update your inventory counts and sync with your connected bank account for reconciliation."
                : "Institutional records are synchronized in real-time. Contact administration for ledger corrections."}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice History & Archives */}
      <div className="mt-20 space-y-8">
        <div className="flex flex-col gap-6">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Financial Ledger</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction archives & Audit Logs</p>
              </div>
              <div className="flex flex-wrap gap-2">
                 {['all', 'this-month', 'last-month', 'custom'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setDateFilter(f as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        dateFilter === f 
                          ? "bg-slate-900 text-white shadow-lg" 
                          : "bg-white text-slate-400 border border-slate-100 hover:border-slate-200 shadow-sm"
                      )}
                    >
                      {f.replace('-', ' ')}
                    </button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="relative md:col-span-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by Invoice #, Client Name, Phone..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none cursor-pointer shadow-sm focus:border-blue-500"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="md:col-span-4">
                {dateFilter === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 items-center"
                  >
                    <input 
                        type="date"
                        className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black outline-none flex-1 shadow-sm focus:border-blue-500"
                        value={customRange.start}
                        onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                    />
                    <div className="w-4 h-0.5 bg-slate-200" />
                    <input 
                        type="date"
                        className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black outline-none flex-1 shadow-sm focus:border-blue-500"
                        value={customRange.end}
                        onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                    />
                  </motion.div>
                )}
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <div className="grid grid-cols-5 px-8 py-5 bg-slate-50/50 border-b border-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest col-span-1">Invoice ID</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest col-span-1">Client</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest col-span-1 text-center">Date</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest col-span-1 text-center">Status</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest col-span-1 text-right">Amount</span>
          </div>

          <div className="divide-y divide-slate-50">
            {filteredInvoices.length === 0 ? (
              <div className="px-8 py-20 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <History className="w-8 h-8 text-slate-200" />
                 </div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transactions match your current filters</p>
              </div>
            ) : (
              filteredInvoices
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((inv) => {
                  const status = inv.status?.toLowerCase();
                  const today = new Date();
                  const dueDate = new Date(inv.dueDate);
                  const isOverdue = dueDate < today && status !== 'paid';

                  return (
                    <div 
                      key={inv.id}
                      className="grid grid-cols-5 items-center px-8 py-6 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        setViewingInvoice(inv);
                        setIsInvoiceOpen(true);
                      }}
                    >
                      <div className="text-xs font-black text-[#1E293B] group-hover:text-blue-600 transition-colors uppercase tracking-tight col-span-1">
                        #{inv.invoiceNumber}
                      </div>
                      <div className="text-xs font-bold text-slate-500 col-span-1 truncate pr-4">
                        {inv.customerName}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 text-center col-span-1">
                        {new Date(inv.issueDate || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="flex justify-center col-span-1">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                          isOverdue ? "bg-rose-50 text-rose-600" :
                          status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {isOverdue ? 'Overdue' : inv.status}
                        </div>
                      </div>
                      <div className="text-sm font-black text-slate-900 font-mono text-right tracking-tight col-span-1 text-blue-600 group-hover:scale-110 transition-transform">
                        {formatCurrency(inv.totalAmount)}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Export Queue Banner */}
        <div className="bg-[#0F172A] p-4 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4 pl-2">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <div className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Export Queue</div>
              <div className="text-xs font-black text-white">
                Ready to download Invoice {allInvoices.length > 0 ? `#${allInvoices[0].invoiceNumber?.slice(-3)}` : 'None'}
              </div>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            Generate PDF
          </button>
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {isInvoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-12 relative shadow-2xl"
            >
              <button 
                onClick={() => {
                  setIsInvoiceOpen(false);
                  setViewingInvoice(null);
                }}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              <div ref={invoiceRef} className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto p-12 text-slate-900 flex flex-col font-sans shadow-2xl shrink-0 border border-slate-100 relative overflow-hidden">
                 {/* Header */}
                 <div className="flex justify-between items-start mb-12 relative z-10">
                   <div>
                     <h1 className="text-4xl font-black tracking-tighter uppercase text-blue-600 mb-2">
                       {profile?.businessName || 'BUSINESS'}
                     </h1>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-pre-line max-w-[250px] leading-relaxed">
                       {invoiceSettings.address || profile?.location || 'Business Address Not Configured'}
                     </p>
                     {invoiceSettings.gstin && (
                       <p className="text-[10px] font-bold text-slate-500 mt-2">
                         GSTIN: <span className="text-slate-900">{invoiceSettings.gstin}</span>
                       </p>
                     )}
                   </div>
                   <div className="text-right">
                     <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">TAX INVOICE</p>
                     <p className="text-2xl font-black font-mono tracking-tight text-slate-900">
                       #{viewingInvoice ? viewingInvoice.invoiceNumber : Date.now().toString().slice(-6)}
                     </p>
                     <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">
                       {new Date(viewingInvoice ? viewingInvoice.createdAt : Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                     </p>
                   </div>
                 </div>

                 {/* Bill To */}
                 <div className="bg-slate-50 p-8 rounded-3xl mb-12 border border-slate-100 relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Billed To</p>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      {viewingInvoice ? viewingInvoice.customerName : (customerInfo.name || 'Walk-in Customer')}
                    </h3>
                    {(viewingInvoice ? viewingInvoice.customerPhone : customerInfo.phone) && (
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {viewingInvoice ? viewingInvoice.customerPhone : customerInfo.phone}
                      </p>
                    )}
                    {(viewingInvoice ? viewingInvoice.customerEmail : customerInfo.email) && (
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {viewingInvoice ? viewingInvoice.customerEmail : customerInfo.email}
                      </p>
                    )}
                 </div>

                 {/* Items Table */}
                 <div className="flex-1 relative z-10">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400">
                         <th className="py-4 pl-4 w-12 text-slate-300">#</th>
                         <th className="py-4">Description</th>
                         <th className="py-4 text-center">Qty</th>
                         <th className="py-4 text-right">Rate</th>
                         <th className="py-4 text-right pr-4">Amount</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {(viewingInvoice ? viewingInvoice.items : selectedItems).map((item: any, i: number) => (
                         <tr key={i} className="text-sm font-bold hover:bg-slate-50/50 transition-colors">
                           <td className="py-5 pl-4 text-slate-300 font-mono text-xs">{(i + 1).toString().padStart(2, '0')}</td>
                           <td className="py-5">
                             <div className="text-slate-900">{item.name}</div>
                             {item.category && <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{item.category}</div>}
                           </td>
                           <td className="py-5 text-center text-slate-500">{item.qty}</td>
                           <td className="py-5 text-right text-slate-500">{formatCurrency(item.price)}</td>
                           <td className="py-5 text-right pr-4 text-slate-900 font-black">{formatCurrency(item.price * item.qty)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 {/* Totals & Footer */}
                 <div className="flex justify-between items-end mt-12 border-t-2 border-slate-900 pt-8 relative z-10">
                   <div className="space-y-6 max-w-[250px]">
                      {invoiceSettings.upiId && (
                         (viewingInvoice ? viewingInvoice.paymentMethod : paymentMethod)?.includes('UPI') ||
                         ((viewingInvoice ? viewingInvoice.paymentMethod : paymentMethod) === 'Online' && (viewingInvoice ? viewingInvoice.onlineMethod : onlineMethod) === 'UPI')
                      ) ? (
                         <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="bg-white p-1.5 rounded-xl shadow-sm">
                              <QRCodeSVG 
                                value={`upi://pay?pa=${invoiceSettings.upiId}&pn=${encodeURIComponent(profile?.businessName || 'Business')}&am=${viewingInvoice ? viewingInvoice.totalAmount : calculateTotal()}&cu=INR`} 
                                size={56} 
                                level="M" 
                              />
                            </div>
                            <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Scan & Pay</p>
                               <p className="text-[10px] font-bold font-mono text-slate-900 truncate max-w-[120px]">{invoiceSettings.upiId}</p>
                            </div>
                         </div>
                      ) : null}
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Mode</p>
                          <p className="text-xs font-bold uppercase text-slate-900">
                            {viewingInvoice ? viewingInvoice.paymentMethod : paymentMethod}
                          </p>
                        </div>
                        {((viewingInvoice ? viewingInvoice.paymentMethod : paymentMethod) === 'Online') && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Gateway</p>
                            <p className="text-xs font-bold uppercase text-slate-900">
                              {viewingInvoice ? viewingInvoice.onlineMethod : onlineMethod}
                            </p>
                          </div>
                        )}
                      </div>
                   </div>

                   <div className="w-72 space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span className="uppercase tracking-widest text-[10px]">Subtotal</span>
                        <span>{formatCurrency(viewingInvoice ? viewingInvoice.subtotal : calculateSubtotal())}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span className="uppercase tracking-widest text-[10px]">Tax ({gstType})</span>
                        <span>{formatCurrency(viewingInvoice ? viewingInvoice.totalGst : calculateTax())}</span>
                      </div>
                      {(viewingInvoice ? viewingInvoice.totalDiscount : calculateTotalDiscounts()) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-rose-500">
                          <span className="uppercase tracking-widest text-[10px]">Discount</span>
                          <span>-{formatCurrency(viewingInvoice ? viewingInvoice.totalDiscount : calculateTotalDiscounts())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-2xl font-black pt-4 border-t border-slate-200 mt-2">
                        <span>Total</span>
                        <span className="text-blue-600">
                          {formatCurrency(viewingInvoice ? viewingInvoice.totalAmount : calculateTotal())}
                        </span>
                      </div>
                   </div>
                 </div>

                 {/* Terms & Footer Note */}
                 <div className="mt-12 space-y-4 border-t border-slate-100 pt-8 relative z-10">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed whitespace-pre-line text-center max-w-sm mx-auto">
                     {viewingInvoice ? viewingInvoice.terms : (invoiceSettings.terms || profile?.invoiceTerms || "This is a computer-generated invoice and doesn't require a physical signature.")}
                   </p>
                   {invoiceSettings.footer && (
                     <div className="text-[10px] font-black text-center text-slate-900 uppercase tracking-widest leading-relaxed italic border-t border-slate-50 pt-4">
                       {invoiceSettings.footer}
                     </div>
                   )}
                 </div>
                 
                 {/* Decorative Background */}
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] -mr-[200px] -mt-[200px] opacity-50 pointer-events-none"></div>
              </div>

              <div className="mt-12 flex gap-4">
                  {isAdmin && viewingInvoice?.id && (
                    <button 
                      onClick={() => deleteInvoice(viewingInvoice.id)}
                      className="px-6 py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-rose-100 transition-all active:scale-95"
                    >
                       <Trash2 className="w-5 h-5" />
                       Delete
                    </button>
                  )}
                 <button 
                   onClick={handleWhatsAppShare}
                   className="px-6 py-4 bg-emerald-50 text-emerald-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all active:scale-95"
                 >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                 </button>
                 <button 
                   onClick={downloadPDF}
                   disabled={isGeneratingPDF}
                   className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
                 >
                    <Download className={cn("w-5 h-5", isGeneratingPDF && "animate-bounce")} />
                    {isGeneratingPDF ? 'Optimizing PDF...' : 'Download PDF'}
                 </button>
                 <button 
                   onClick={() => window.print()}
                   disabled={isGeneratingPDF}
                   className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                 >
                    <FileText className="w-5 h-5" />
                    Print Receipt
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => {
          setIsScannerOpen(false);
          setScannerStatus(null);
        }} 
        onScan={handleScan} 
        status={scannerStatus}
      />

      {/* History Modal */}
        <AnimatePresence>
          {isHistoryOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Fiscal Ledger</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customerInfo.name} • Purchase History</p>
                    </div>
                  </div>
                  <button onClick={() => setIsHistoryOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                  {customerHistory.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic text-slate-400">No previous transactions found for this identity.</div>
                  ) : (
                    customerHistory.map((bill) => (
                      <div key={bill.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-black text-slate-900">{bill.invoiceNumber}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {bill.paymentMethod || 'Cash'}
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-black text-blue-600 font-mono tracking-tighter">{formatCurrency(bill.totalAmount)}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {bill.items.map((it: any, idx: number) => (
                             <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 uppercase">
                               {it.name} <span className="text-blue-600">x{it.qty}</span>
                             </span>
                           ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Invoice Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Invoice Configuration</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Persona Overlay</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Architectural Profile (Theme)</label>
                     <div className="grid grid-cols-3 gap-3">
                        {['Modern', 'Classic', 'Professional'].map((t) => (
                           <button 
                             key={t}
                             onClick={() => setInvoiceTheme(t as any)}
                             className={cn(
                               "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                               invoiceTheme === t ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                             )}
                           >
                             {t}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business GSTIN</label>
                       <input 
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700"
                         value={invoiceSettings.gstin}
                         onChange={(e) => setInvoiceSettings({...invoiceSettings, gstin: e.target.value})}
                         placeholder="e.g. 07AAAAA0000A1Z5"
                       />
                    </div>
                    <div className="space-y-2 col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Address</label>
                       <textarea 
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 min-h-[60px]"
                         value={invoiceSettings.address}
                         onChange={(e) => setInvoiceSettings({...invoiceSettings, address: e.target.value})}
                         placeholder="Full registered business address..."
                       />
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Institutional Settlement (Bank)</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                        <input 
                          className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700"
                          value={invoiceSettings.bankName}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, bankName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Number</label>
                        <input 
                          className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700"
                          value={invoiceSettings.accountNo}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, accountNo: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</label>
                        <input 
                          className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700"
                          value={invoiceSettings.ifsc}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, ifsc: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital ID (UPI)</label>
                    <input 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700"
                      value={invoiceSettings.upiId}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, upiId: e.target.value})}
                      placeholder="e.g. mobile@upi"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Header Message</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      value={invoiceSettings.header}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, header: e.target.value})}
                      placeholder="e.g. Authorized Distributor for North Region..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms & Declarations</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      value={invoiceSettings.terms}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, terms: e.target.value})}
                      placeholder="Custom terms and conditions..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher Footer Text</label>
                    <input 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      value={invoiceSettings.footer}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, footer: e.target.value})}
                      placeholder="e.g. For support call +91-XXX..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Notes (Internal)</label>
                    <input 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      value={invoiceSettings.notes}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, notes: e.target.value})}
                      placeholder="Private invoice notes..."
                    />
                  </div>
                  <button 
                    onClick={handleSettingsSave}
                    className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    Commit Configuration
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Item Selection Modal */}
        <AnimatePresence>
          {isItemModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Select Items</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Registry Access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-64">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Filter items..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white outline-none transition-all"
                        value={searchInventory}
                        onChange={(e) => setSearchInventory(e.target.value)}
                      />
                    </div>
                    <button onClick={() => setIsItemModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventory
                      .filter(item => 
                        item.name.toLowerCase().includes(searchInventory.toLowerCase()) || 
                        item.sku?.toLowerCase().includes(searchInventory.toLowerCase())
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            addItemToInvoice(item);
                          }}
                          className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-left transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200 hover:-translate-y-1 relative"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black",
                              item.quantity <= 0 ? "bg-red-50 text-red-600" : "bg-white text-slate-400 shadow-sm"
                            )}>
                              {item.quantity}
                            </div>
                            <div className="text-sm font-black text-slate-900 tracking-tight">
                              {formatCurrency(item.price)}
                            </div>
                          </div>

                          <div className="font-black text-slate-900 leading-tight mb-1 truncate group-hover:text-rose-600 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            SKU: {item.sku || 'N/A'}
                          </div>

                          {selectedItems.find(i => i.id === item.id) && (
                            <div className="absolute top-4 right-4 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-rose-100">
                              {selectedItems.find(i => i.id === item.id).qty}
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Click to Add</span>
                            <Plus className="w-3 h-3 text-rose-600" />
                          </div>
                        </button>
                      ))}
                  </div>

                  {inventory.length === 0 && (
                    <div className="text-center py-20 opacity-30 italic text-slate-400">Inventory is currently empty.</div>
                  )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                   <div className="text-xs font-bold text-slate-400">
                      Total Items Selected: <span className="text-slate-900 font-black">{selectedItems.length}</span>
                   </div>
                   <button 
                     onClick={() => setIsItemModalOpen(false)}
                     className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                   >
                     Done Adding
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
                      Limit Reached
                    </div>
                    <h2 className="text-4xl font-black tracking-tight leading-none">Unlock the Full Power of Core.</h2>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed">
                      You've hit the {PLAN_LIMITS.starter.invoices} invoice limit on your {PLAN_LIMITS.starter.name}. Upgrade now to keep generating business and insights.
                    </p>
                  </div>
                  
                  <div className="relative z-10 pt-12 space-y-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">Unlimited Monthly Invoices</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">Priority 24/7 Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">Custom Branding & Reports</span>
                    </div>
                  </div>

                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
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
                          <Receipt className="w-4 h-4 text-rose-600" />
                        </div>
                        <span className="text-xs font-black text-slate-900 text-blue-600">Upgrade Required</span>
                      </div>
                      <TrendingDown className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      navigate('/dashboard/plan');
                      setIsUpgradeModalOpen(false);
                    }}
                    className="w-full py-5 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3 active:scale-95"
                  >
                    Go Pro Now
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                  >
                    Maybe Later
                  </button>
                  
                  <div className="pt-4 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      All existing invoices remain accessible.<br />New work resumes instantly after upgrade.
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

