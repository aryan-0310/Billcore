import React from 'react';
import { motion } from 'motion/react';
import { 
  HelpCircle, 
  MessageCircle, 
  Book, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  LifeBuoy,
  FileText
} from 'lucide-react';

export default function HelpAndSupport() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const faqs = [
    { q: "How do I update my inventory?", a: "Go to the Inventory page and click either the 'Add Product' button for new items or the 'Stock Adjust' button on an existing item." },
    { q: "Can I export invoices as PDF?", a: "Yes, in the Billing section, after creating an invoice, you will see a 'Download PDF' option in the receipt view." },
    { q: "How to manage multi-user access?", a: "Admins can go to the 'Staff' page to invite new users and assign them specific roles like Manager or Staff." },
    { q: "What is GST compliance?", a: "The system automatically calculates SGST/CGST or IGST based on your business location and the customer's state, provided you have configured your GSTIN in the Account settings." },
    { q: "Is my data secure?", a: "We use Enterprise-grade Cloud Firestore with hardened security rules and real-time audit logging for every single change." }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const categories = [
    { title: 'Getting Started', icon: Book, items: 12, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Billing & Invoices', icon: FileText, items: 5, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'System Security', icon: ShieldCheck, items: 8, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'User Management', icon: LifeBuoy, items: 4, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  return (
    <div className="p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
            <HelpCircle className="w-3 h-3" />
            Support Center
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">How can we help?</h1>
          <p className="text-slate-500 font-bold max-w-xl mx-auto">
            Search our knowledge base or get in touch with our specialist support team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 group cursor-pointer"
            >
              <div className={`w-12 h-12 ${cat.bg} ${cat.color} rounded-2xl flex items-center justify-center`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 tracking-tight leading-none mb-1">{cat.title}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat.items} Articles</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-12 pt-8">
          <div className="md:col-span-2 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-rose-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search help topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-6 py-2.5 bg-white border border-slate-100 rounded-full text-xs font-bold shadow-sm outline-none focus:border-rose-200 transition-all w-full md:w-64"
                />
                <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredFaqs.length > 0 ? filteredFaqs.map((faq, idx) => (
                <details key={idx} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/20">
                  <summary className="list-none px-8 py-6 cursor-pointer flex items-center justify-between">
                    <span className="font-black text-slate-800 tracking-tight">{faq.q}</span>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-open:rotate-90 transition-all" />
                  </summary>
                  <div className="px-8 pb-8 text-sm font-bold text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                    {faq.a}
                  </div>
                </details>
              )) : (
                <div className="p-12 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <HelpCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-sm tracking-tight">No matching help articles found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                     <MessageCircle className="w-5 h-5 text-rose-600" />
                   </div>
                   <h3 className="text-lg font-black tracking-tight">Direct Support</h3>
                 </div>
                 
                 {submitted ? (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-6 bg-emerald-50 rounded-2xl text-center space-y-3"
                   >
                     <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                       <ShieldCheck className="w-6 h-6" />
                     </div>
                     <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Message Sent</p>
                     <p className="text-[10px] text-emerald-600 font-bold">We'll get back to you via your registered email within 24 hours.</p>
                     <button 
                       onClick={() => setSubmitted(false)}
                       className="text-[10px] font-black text-emerald-700 underline"
                     >
                       Send another
                     </button>
                   </motion.div>
                 ) : (
                   <form onSubmit={handleContactSubmit} className="space-y-4">
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Subject</label>
                       <input 
                         required
                         type="text" 
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-slate-200"
                         placeholder="Billing Inquiry"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Message</label>
                       <textarea 
                         required
                         rows={4}
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-slate-200 resize-none"
                         placeholder="How can we help?"
                       />
                     </div>
                     <button 
                       type="submit"
                       disabled={isSubmitting}
                       className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                     >
                       {isSubmitting ? (
                         <>
                           <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                           Sending...
                         </>
                       ) : (
                         <>Send Message</>
                       )}
                     </button>
                   </form>
                 )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-400">
               <div className="relative z-10 space-y-4">
                  <h3 className="text-lg font-black tracking-tight">Enterprise Hotline</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">Priority support for high-volume accounts.</p>
                  <p className="text-xl font-mono font-black text-rose-500">1-800-BILL-CORE</p>
               </div>
               <LifeBuoy className="absolute -bottom-8 -right-8 w-32 h-32 text-white/5 -rotate-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
