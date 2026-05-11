import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Globe, 
  Shield, 
  Save, 
  Camera,
  Briefcase,
  FileText,
  X,
  RotateCcw,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';
import { PLAN_LIMITS } from '../context/AuthContext';

export default function Account() {
  const { profile, user, businessId } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    photoURL: profile?.photoURL || '',
    businessName: profile?.businessName || '',
    businessPhone: profile?.businessPhone || '',
    businessWebsite: profile?.businessWebsite || '',
    location: profile?.location || '',
    gstin: profile?.gstin || '',
    bankName: profile?.bankName || '',
    accountNumber: profile?.accountNumber || '',
    ifscCode: profile?.ifscCode || '',
    paymentTerms: profile?.paymentTerms || '',
    invoiceNotes: profile?.invoiceNotes || ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        email: profile.email || '',
        photoURL: profile.photoURL || '',
        businessName: profile.businessName || '',
        businessPhone: profile.businessPhone || '',
        businessWebsite: profile.businessWebsite || '',
        location: profile.location || '',
        gstin: profile.gstin || '',
        bankName: profile.bankName || '',
        accountNumber: profile.accountNumber || '',
        ifscCode: profile.ifscCode || '',
        paymentTerms: profile.paymentTerms || '',
        invoiceNotes: profile.invoiceNotes || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, 'invoices'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalInvoices(snapshot.size);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
    });
    return () => unsubscribe();
  }, [businessId]);

  const isAdmin = profile?.role === 'admin';
  
  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        plan: 'professional',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString()
      });
      alert('Congratulations! You have been upgraded to the Professional Plan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpgrading(false);
    }
  };
  
  const processImage = async (file: File | Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const dataUrl = await processImage(file);
        setFormData(prev => ({ ...prev, photoURL: dataUrl }));
      } catch (err) {
        console.error('Error processing image:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Could not access camera. Please check permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const streams = (videoRef.current.srcObject as MediaStream).getTracks();
      streams.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      setIsUploading(true);
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      try {
        const dataUrl = await processImage(await new Promise<Blob>((res) => {
          canvasRef.current?.toBlob((blob) => res(blob!), 'image/jpeg', 0.8);
        }));
        
        setFormData(prev => ({ ...prev, photoURL: dataUrl }));
        stopCamera();
      } catch (err) {
        console.error('Error capturing photo:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      const updateData: any = {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
        updatedAt: new Date().toISOString()
      };

      // Only allow admins to update business-critical fields
      if (isAdmin) {
        updateData.businessName = formData.businessName;
        updateData.businessPhone = formData.businessPhone;
        updateData.businessWebsite = formData.businessWebsite;
        updateData.location = formData.location;
        updateData.gstin = formData.gstin;
        updateData.bankName = formData.bankName;
        updateData.accountNumber = formData.accountNumber;
        updateData.ifscCode = formData.ifscCode;
        updateData.paymentTerms = formData.paymentTerms;
        updateData.invoiceNotes = formData.invoiceNotes;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      alert('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {!isAdmin && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-800 text-sm font-bold">
            <Shield className="w-4 h-4 shrink-0" />
            Note: Only administrators can modify business-level information.
          </div>
        )}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Profile</h1>
            <p className="text-slate-500 font-bold">Manage your personal and business identity</p>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
               <Shield className="w-3 h-3" />
               {profile?.role || 'User'} Access
             </div>
             {(profile?.role === 'staff' || profile?.role === 'accountant') && (
               <div className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                 Authorized Personnel Only
               </div>
             )}
          </div>
        </div>

        {profile?.role && profile.role !== 'admin' && (
           <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                       <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black tracking-tight">Assigned Role: {profile.role.toUpperCase()}</h3>
                       <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Security clearance verified</p>
                    </div>
                 </div>
                 <p className="text-sm font-medium leading-relaxed opacity-90 max-w-xl">
                    {profile.role === 'accountant' 
                       ? "You have full access to financial analytics and transaction ledgers. You are authorized to review profit margins and audit business performance metrics."
                       : "You are authorized for operational tasks including customer management and inventory updates. Billing creation privileges are active for your credential set."
                    }
                 </p>
              </div>
              <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12" />
           </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-slate-50 overflow-hidden bg-slate-100 shadow-xl shadow-slate-200/50">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName || 'Felix'}`} alt="Avatar" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="absolute -bottom-2 right-0 flex gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center border-4 border-white transition-all hover:scale-110 active:scale-95"
                    title="Upload from Gallery"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={startCamera}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center border-4 border-white transition-all hover:scale-110 active:scale-95"
                    title="Take Live Picture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{profile?.displayName}</h2>
              <p className="text-sm font-bold text-slate-400 mb-6">{profile?.email}</p>
              
              <div className="w-full space-y-3 pt-6 border-t border-slate-50">
                {/* Subscription Status - Only for Admins */}
                {isAdmin && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Plan</span>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        profile?.plan === 'professional' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {profile?.plan || 'Starter'}
                      </span>
                    </div>
                    
                    {(!profile?.plan || profile.plan === 'starter') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400">Invoices</span>
                          <span className={cn(totalInvoices >= 50 ? "text-rose-500" : "text-slate-900")}>
                            {totalInvoices} / 50
                          </span>
                        </div>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all", totalInvoices >= 50 ? "bg-rose-500" : "bg-blue-500")}
                            style={{ width: `${Math.min((totalInvoices / 50) * 100, 100)}%` }}
                          />
                        </div>
                        {totalInvoices >= 40 && (
                          <button 
                            onClick={handleUpgrade}
                            disabled={isUpgrading}
                            className="w-full mt-2 py-2 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
                          >
                            {isUpgrading ? 'Upgrading...' : 'Upgrade Path'}
                          </button>
                        )}
                      </div>
                    )}

                    {profile?.plan === 'professional' && (
                      <div className="items-center gap-2 text-emerald-600 flex">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Unlimited Usage</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-xs font-bold pt-2 px-1">
                  <span className="text-slate-400 uppercase tracking-widest">Joined</span>
                  <span className="text-slate-900">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                  <h3 className="text-lg font-black tracking-tight">Need help?</h3>
                  <p className="text-slate-400 text-sm font-bold leading-relaxed">Our support team is available 24/7 for Enterprise customers.</p>
                  <button 
                    onClick={() => navigate('/dashboard/help')}
                    className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all font-sans"
                  >
                    Contact Support
                  </button>
               </div>
               <Shield className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
            </div>
          </div>

          {/* Edit Form */}
          <div className="md:col-span-2 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Personal Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your identity within the organization</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text"
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full pl-12 pr-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Business Profile</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public business information and contact</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Business Name</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text"
                        value={formData.businessName}
                        onChange={e => setFormData({...formData, businessName: e.target.value})}
                        disabled={!isAdmin}
                        className={cn(
                          "w-full pl-12 pr-6 py-4 border rounded-2xl text-sm font-bold transition-all",
                          isAdmin 
                            ? "bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 outline-none" 
                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                        placeholder="Your registered business name"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="tel"
                        value={formData.businessPhone}
                        onChange={e => setFormData({...formData, businessPhone: e.target.value})}
                        disabled={!isAdmin}
                        className={cn(
                          "w-full pl-12 pr-6 py-4 border rounded-2xl text-sm font-bold transition-all",
                          isAdmin 
                            ? "bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 outline-none" 
                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="url"
                          value={formData.businessWebsite}
                          onChange={e => setFormData({...formData, businessWebsite: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                          placeholder="https://yourbusiness.com"
                        />
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">GSTIN Number</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text"
                        value={formData.gstin}
                        onChange={e => setFormData({...formData, gstin: e.target.value})}
                        disabled={!isAdmin}
                        className={cn(
                          "w-full pl-12 pr-6 py-4 border rounded-2xl text-sm font-bold transition-all",
                          isAdmin 
                            ? "bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 outline-none" 
                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                        placeholder="VAT / GST Registration"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location / Address</label>
                    <textarea 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      disabled={!isAdmin}
                      rows={2}
                      className={cn(
                        "w-full px-6 py-4 border rounded-2xl text-sm font-bold transition-all resize-none",
                        isAdmin 
                          ? "bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 outline-none" 
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      )}
                      placeholder="Headquarters address"
                    />
                  </div>
                </div>
              </div>

              {/* Banking & Financial Section - Admin Only */}
              {isAdmin && (
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Banking Details</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial routing for invoice payments</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Bank Name</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          value={formData.bankName}
                          onChange={e => setFormData({...formData, bankName: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                          placeholder="Primary Banking Branch"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Account Number</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          value={formData.accountNumber}
                          onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                          placeholder="Official Account ID"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">IFSC / Swift Code</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          value={formData.ifscCode}
                          onChange={e => setFormData({...formData, ifscCode: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                          placeholder="Bank Branch Code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Section - Admin Only */}
              {isAdmin && (
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Billing Prefs</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global defaults for future invoices</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Default Payment Terms</label>
                      <textarea 
                        value={formData.paymentTerms}
                        onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
                        rows={2}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none placeholder:text-slate-300"
                        placeholder="e.g. Payment due within 15 days"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Default Invoice Notes (Footer)</label>
                      <textarea 
                        value={formData.invoiceNotes}
                        onChange={e => setFormData({...formData, invoiceNotes: e.target.value})}
                        rows={2}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none placeholder:text-slate-300"
                        placeholder="e.g. Thank you for your business!"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end p-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Synchronizing...' : 'Update Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopCamera}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Camera className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Live Capture</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust yourself for the perfect shot</p>
                  </div>
                </div>
                <button 
                  onClick={stopCamera} 
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 relative">
                <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-900">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/20 rounded-full border-dashed" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={stopCamera}
                  className="flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={capturePhoto}
                  className="flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
