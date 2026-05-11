import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send, CheckCircle2, Phone, Mail, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TalkToSales() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'direct'>('form');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 line-height-normal">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-3xl shadow-2xl border border-slate-200 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Request Received</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Thank you for reaching out. One of our specialists will call you back within 24 hours to discuss how BILLCORE can help your business.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <nav className="p-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-800 uppercase">BILLCORE</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center py-12 px-4 max-w-4xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-none">Choose Your <span className="text-blue-600 italic">Sales Channel.</span></h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">Select the most convenient way to connect with our enterprise solutions team.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full">
          {/* Option 1: Form Tab */}
          <div 
            onClick={() => setActiveTab('form')}
            className={`p-8 bg-white border-2 rounded-[2rem] cursor-pointer transition-all ${activeTab === 'form' ? 'border-blue-600 shadow-xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeTab === 'form' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 tracking-tight">Request Callback</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Best for Custom Setup</p>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">Leave your details and a specialist will prepare a personalized demo for your business.</p>
          </div>

          {/* Option 2: Direct Tab */}
          <div 
            onClick={() => setActiveTab('direct')}
            className={`p-8 bg-white border-2 rounded-[2rem] cursor-pointer transition-all ${activeTab === 'direct' ? 'border-blue-600 shadow-xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeTab === 'direct' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 tracking-tight">Direct Contact</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Best for Quick Queries</p>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">Reach our sales floor directly via phone or email during business hours for instant assistance.</p>
          </div>
        </div>

        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white p-10 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-200"
        >
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Business Name</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    placeholder="Acme Corp"
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Work Email</label>
                  <input 
                    type="email" required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Phone Number</label>
                  <input 
                    type="tel" required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    placeholder="+91 99999 99999"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">How can we help?</label>
                <textarea 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium h-32 resize-none"
                  placeholder="Briefly describe your business needs..."
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100"
              >
                Request Callback
                <Send className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="space-y-12">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">Available Now</span>
                  </div>
                  <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">Call Our Hotlines</h4>
                  <p className="text-slate-500 font-medium">Business Hours: Mon - Fri, 9:00 AM - 6:00 PM IST</p>
                  
                  <div className="space-y-4 pt-4">
                    <a href="tel:+911800123456" className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toll Free (India)</div>
                        <div className="text-lg font-bold text-slate-900 tracking-tight">+91 1800 123 456</div>
                      </div>
                    </a>
                    <a href="tel:+919876543210" className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Direct Line</div>
                        <div className="text-lg font-bold text-slate-900 tracking-tight">+91 98765 43210</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="space-y-6 lg:border-l border-slate-100 lg:pl-12">
                  <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight pt-8 lg:pt-0">Email Correspondence</h4>
                  <p className="text-slate-500 font-medium">For comprehensive inquiries or bulk partnership proposals.</p>
                  
                  <div className="space-y-4 pt-4">
                    <a href="mailto:sales@billcore.com" className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">General Inquiries</div>
                        <div className="text-lg font-bold text-slate-900 tracking-tight">sales@billcore.com</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
