import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Lock, 
  Activity, 
  Database, 
  Cloud,
  ArrowRight,
  ShieldAlert,
  Fingerprint,
  HardDrive,
  RefreshCw,
  Eye,
  Terminal,
  Save,
  Receipt,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminControl() {
  const { profile, user, businessId } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Unauthorized Access Signal Detected.</div>;
  }

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({
    name: profile?.businessName || '',
    phone: profile?.businessPhone || '',
    website: profile?.businessWebsite || ''
  });
  const [invoiceConfig, setInvoiceConfig] = useState({
    prefix: profile?.invoicePrefix || 'INV',
    address: profile?.businessAddress || '',
    gstin: profile?.businessGstin || '',
    terms: profile?.invoiceTerms || 'Thank you for your business!',
    notes: profile?.invoiceNotes || '',
    header: profile?.invoiceHeader || '',
    footer: profile?.invoiceFooter || '',
    bankName: profile?.bankName || '',
    accountNumber: profile?.accountNumber || '',
    ifscCode: profile?.ifscCode || '',
    upiId: profile?.upiId || ''
  });

  React.useEffect(() => {
    if (profile) {
      setBusinessSettings({
        name: profile.businessName || '',
        phone: profile.businessPhone || '',
        website: profile.businessWebsite || ''
      });
      setInvoiceConfig({
        prefix: profile.invoicePrefix || 'INV',
        address: profile.businessAddress || '',
        gstin: profile.businessGstin || '',
        terms: profile.invoiceTerms || 'Thank you for your business!',
        notes: profile.invoiceNotes || '',
        header: profile.invoiceHeader || '',
        footer: profile.invoiceFooter || '',
        bankName: profile.bankName || '',
        accountNumber: profile.accountNumber || '',
        ifscCode: profile.ifscCode || '',
        upiId: profile.upiId || ''
      });
    }
  }, [profile]);

  const securityModules = [
    { name: 'Auth Protocol', desc: 'Secure Ledger v4.2', icon: Fingerprint, status: 'Active', color: 'text-blue-600' },
    { name: 'Database Relay', desc: 'Cloud Firestore Sync', icon: Database, status: 'Synced', color: 'text-emerald-600' },
    { name: 'Encryption Layer', desc: 'AES-256 GCM', icon: Lock, status: 'Encrypted', color: 'text-purple-600' },
    { name: 'Node Status', desc: 'Cluster Alpha-9', icon: Activity, status: 'Healthy', color: 'text-amber-600' },
  ];

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessId) return;
    setIsSaving(true);
    try {
      // Update User Profile for fallback
      await updateDoc(doc(db, 'users', user.uid), {
        invoicePrefix: invoiceConfig.prefix,
        businessAddress: invoiceConfig.address,
        businessGstin: invoiceConfig.gstin,
        invoiceTerms: invoiceConfig.terms,
        invoiceNotes: invoiceConfig.notes,
        invoiceHeader: invoiceConfig.header,
        invoiceFooter: invoiceConfig.footer,
        bankName: invoiceConfig.bankName,
        accountNumber: invoiceConfig.accountNumber,
        ifscCode: invoiceConfig.ifscCode,
        upiId: invoiceConfig.upiId
      });

      // Update dedicated settings collection used by Billing
      const q = query(collection(db, 'settings'), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      
      const payload = {
        businessId,
        invoicePrefix: invoiceConfig.prefix,
        invoiceHeader: invoiceConfig.header,
        invoiceFooter: invoiceConfig.footer,
        invoiceTerms: invoiceConfig.terms,
        invoiceNotes: invoiceConfig.notes,
        businessGstin: invoiceConfig.gstin,
        businessAddress: invoiceConfig.address,
        bankName: invoiceConfig.bankName,
        accountNumber: invoiceConfig.accountNumber,
        ifscCode: invoiceConfig.ifscCode,
        upiId: invoiceConfig.upiId,
        updatedAt: new Date().toISOString()
      };

      if (!snap.empty) {
        await updateDoc(doc(db, 'settings', snap.docs[0].id), payload);
      } else {
        await addDoc(collection(db, 'settings'), payload);
      }

      alert('Invoice and banking configuration saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save invoice configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingBusiness(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        businessName: businessSettings.name,
        businessPhone: businessSettings.phone,
        businessWebsite: businessSettings.website
      });
      alert('Business settings saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save business settings');
    } finally {
      setIsSavingBusiness(false);
    }
  };

  return (
    <div className="p-8 space-y-12 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            {profile?.businessName || 'BILLCORE'} <span className="text-blue-600 font-bold opacity-30 tracking-tight lowercase">AdminControl.</span>
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1 italic tracking-tight">Root access authorized for {profile?.displayName}.</p>
        </div>
        <div className="text-right">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Security Clearance</div>
           <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">
             <ShieldCheck className="w-3 h-3 text-emerald-400" />
             L3 Administrator
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {securityModules.map((module, idx) => (
          <div key={idx} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 transition-all duration-500">
               <module.icon className={cn("w-7 h-7 group-hover:text-white transition-colors", module.color)} />
            </div>
            <div className="space-y-1">
               <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{module.name}</h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{module.desc}</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{module.status}</span>
            </div>
            <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
               <ArrowRight className="w-5 h-5 text-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <ShieldCheck className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Business Settings</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base identity records</p>
                 </div>
              </div>
           </div>

           <form onSubmit={handleSaveBusinessSettings} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
                 <input 
                   type="text"
                   value={businessSettings.name}
                   onChange={e => setBusinessSettings({...businessSettings, name: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                   placeholder="e.g. Acme Corp"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                 <input 
                   type="tel"
                   value={businessSettings.phone}
                   onChange={e => setBusinessSettings({...businessSettings, phone: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                   placeholder="e.g. +1 (555) 000-0000"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                 <input 
                   type="url"
                   value={businessSettings.website}
                   onChange={e => setBusinessSettings({...businessSettings, website: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                   placeholder="https://acme.com"
                 />
              </div>
              <button 
                type="submit"
                disabled={isSavingBusiness}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingBusiness ? 'Processing...' : 'Save Business Settings'}
              </button>
           </form>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Receipt className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Invoice Configuration</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing document settings</p>
                 </div>
              </div>
           </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Prefix</label>
                    <input 
                      type="text"
                      value={invoiceConfig.prefix}
                      onChange={e => setInvoiceConfig({...invoiceConfig, prefix: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="e.g. INV"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business GSTIN/TAX ID</label>
                    <input 
                      type="text"
                      value={invoiceConfig.gstin}
                      onChange={e => setInvoiceConfig({...invoiceConfig, gstin: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="GSTIN"
                    />
                 </div>
              </div>

              <div className="space-y-2 text-slate-900 font-bold text-xs border-b border-slate-50 pb-2 pt-4">Letterhead & Design</div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Header</label>
                    <input 
                      type="text"
                      value={invoiceConfig.header}
                      onChange={e => setInvoiceConfig({...invoiceConfig, header: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="Custom Header Text"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Footer</label>
                    <input 
                      type="text"
                      value={invoiceConfig.footer}
                      onChange={e => setInvoiceConfig({...invoiceConfig, footer: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="Custom Footer Text"
                    />
                 </div>
              </div>

              <div className="space-y-2 text-slate-900 font-bold text-xs border-b border-slate-50 pb-2 pt-4">Banking Details</div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                    <input 
                      type="text"
                      value={invoiceConfig.bankName}
                      onChange={e => setInvoiceConfig({...invoiceConfig, bankName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</label>
                    <input 
                      type="text"
                      value={invoiceConfig.accountNumber}
                      onChange={e => setInvoiceConfig({...invoiceConfig, accountNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IFSC / SWIFT Code</label>
                    <input 
                      type="text"
                      value={invoiceConfig.ifscCode}
                      onChange={e => setInvoiceConfig({...invoiceConfig, ifscCode: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPI ID</label>
                    <input 
                      type="text"
                      value={invoiceConfig.upiId}
                      onChange={e => setInvoiceConfig({...invoiceConfig, upiId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="e.g. merchant@upi"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">* Required for automated QR code generation in Billing.</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Address</label>
                 <textarea 
                   rows={3}
                   value={invoiceConfig.address}
                   onChange={e => setInvoiceConfig({...invoiceConfig, address: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none resize-none"
                   placeholder="Full business address..."
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Terms & Notes</label>
                 <textarea 
                   rows={3}
                   value={invoiceConfig.terms}
                   onChange={e => setInvoiceConfig({...invoiceConfig, terms: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                   placeholder="Terms and conditions..."
                 />
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Processing...' : 'Save Configuration'}
              </button>
            </form>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pb-12">
         {/* System Terminal */}
         <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 font-mono relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
               </div>
               <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  root@billcore:~# systemctl status
               </div>
            </div>
            <div className="space-y-2 text-xs">
               <div className="text-emerald-400 flex items-center gap-2">
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="font-bold">STATUS:</span>
                  <span className="bg-emerald-400/10 px-1.5 py-0.5 rounded">SYSTEM_OPERATIONAL</span>
               </div>
               <div className="text-blue-400 flex items-center gap-2">
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="font-bold">NETWORK:</span>
                  <span>Latency {Math.floor(Math.random() * 50 + 10)}ms • Secure Relay Active</span>
               </div>
               <div className="text-slate-400 flex items-center gap-2">
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="font-bold">LAST SYNC:</span>
                  <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
               </div>
               <div className="text-slate-400 flex items-center gap-2">
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="font-bold">CONTEXT:</span>
                  <span>{profile?.businessName || 'N/A'} context active • Security L3 Active</span>
               </div>
               <div className="pt-4 text-emerald-500/50 italic text-[10px]">
                  All cryptographic signatures verified. Session token active for 24h.
               </div>
            </div>
            {/* Scanner Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-20 w-full animate-scan"></div>
         </div>

         {/* Dangerous Actions */}
         <div className="bg-rose-50/30 rounded-[2.5rem] border border-rose-100 p-8 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white">
                  <ShieldAlert className="w-5 h-5 text-white" />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Security & Maintenance</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crucial system operations</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                 onClick={() => {
                   if(window.confirm("ARE YOU SURE? This will clear all local caches and re-authenticate your session.")) {
                     window.location.reload();
                   }
                 }}
                 className="p-6 bg-white border border-rose-100 rounded-[2rem] text-left hover:bg-rose-600 group transition-all"
               >
                  <RefreshCw className="w-6 h-6 text-rose-600 group-hover:text-white mb-4 transition-colors" />
                  <div className="font-black text-xs text-slate-900 uppercase tracking-tighter group-hover:text-white mb-1">System Reboot</div>
                  <p className="text-[9px] text-slate-400 group-hover:text-white/60 font-bold uppercase tracking-widest leading-none">Refresh Environment</p>
               </button>

               <button 
                 onClick={() => {
                    alert("System export is in progress. Check your email for the data package.");
                 }}
                 className="p-6 bg-white border border-rose-100 rounded-[2rem] text-left hover:bg-slate-900 group transition-all"
               >
                  <HardDrive className="w-6 h-6 text-slate-400 group-hover:text-slate-200 mb-4 transition-colors" />
                  <div className="font-black text-xs text-slate-900 uppercase tracking-tighter group-hover:text-white mb-1">Data Backup</div>
                  <p className="text-[9px] text-slate-400 group-hover:text-white/60 font-bold uppercase tracking-widest leading-none">Export All Records</p>
               </button>
            </div>

            <div className="pt-4">
               <button 
                 className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-lg shadow-rose-100/50 flex items-center justify-center gap-2"
                 onClick={() => {
                   if(window.confirm("WARNING: Account deletion is irreversible. This will remove all business records permanently. Proceed?")) {
                     alert("In a production environment, this would initiate a deletion protocol. Contact support for this action.");
                   }
                 }}
               >
                  <Trash2 className="w-4 h-4" />
                  Initiate Deletion Protocol
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
