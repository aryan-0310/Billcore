import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Package, 
  Users, 
  Receipt, 
  BarChart3, 
  ChevronRight,
  Play,
  ArrowRight,
  Menu,
  X,
  CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const handlePlanSelect = (plan: string) => {
    localStorage.setItem('intended_plan', plan);
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rotate-45"></div>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">BILLCORE</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] px-3 py-1 rounded-lg transition-all">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] px-3 py-1 rounded-lg transition-all">Pricing</a>
              <Link to="/talk-to-sales" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] px-3 py-1 rounded-lg transition-all">Talk to Sales</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:shadow-[0_0_25px_rgba(37,99,235,0.2)] hover:border-blue-200 transition-all border border-slate-200 rounded-lg bg-white">Login</Link>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4">
            <a href="#features" className="block text-slate-600 font-medium">Features</a>
            <a href="#pricing" className="block text-slate-600 font-medium">Pricing</a>
            <Link to="/talk-to-sales" className="block text-slate-600 font-medium">Talk to Sales</Link>
            <Link to="/login" className="block text-slate-600 font-medium">Login</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full w-fit">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">GST Ready System</span>
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.1] text-slate-900 tracking-tight">
                Inventory & Billing <br />
                <span className="text-blue-600 text-4xl">Built for Growth.</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-md">
                Automate your business workflows with real-time profit tracking, advanced GST calculation, and role-based access controls.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                {[
                  'One-Click Invoicing', 'Sales Analytics', 
                  'Profit Metrics', 'Multi-user Roles'
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-4">
                <Link to="/signup" className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">
                  Setup Dashboard Now
                </Link>
                <Link to="/talk-to-sales" className="px-8 py-4 border border-slate-200 bg-white font-semibold rounded-xl text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                  Talk to Sales
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 relative"
            >
              <div className="w-full aspect-[4/3] bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                  <div className="flex gap-4">
                    <div className="h-8 w-24 bg-slate-100 rounded"></div>
                    <div className="h-8 w-24 bg-blue-50 border border-blue-100 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-6 h-6 bg-slate-100 rounded-full"></div>
                    <span className="text-xs font-semibold uppercase">Admin Access</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 shrink-0">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales</p>
                    <p className="text-xl font-bold text-slate-900 font-mono tracking-tighter">₹42,904.50</p>
                    <p className="text-[10px] text-emerald-600 font-semibold tracking-tight">↑ 12.5% from last week</p>
                  </div>
                  <div className="p-4 bg-blue-600 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-blue-200 uppercase">Net Profit</p>
                    <p className="text-xl font-bold text-white font-mono tracking-tighter">₹18,210.00</p>
                    <p className="text-[10px] text-blue-200 font-semibold tracking-tight">Margin: 42.4%</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">GST Accrued</p>
                    <p className="text-xl font-bold text-slate-900 font-mono tracking-tighter">₹3,211.80</p>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-200 rounded text-slate-600 font-bold">Standard 18%</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Recent Invoices</h3>
                    <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">View All Records</button>
                  </div>
                  <div className="flex-1 border border-slate-100 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="w-1/4">Invoice ID</span>
                      <span className="w-1/4">Client</span>
                      <span className="w-1/4">Status</span>
                      <span className="w-1/4 text-right">Amount</span>
                    </div>
                    {[
                      { id: '#INV-2024-001', name: 'Apex Solutions Ltd', status: 'Paid', amount: '₹1,240.00', color: 'emerald' },
                      { id: '#INV-2024-002', name: 'Global Logistics', status: 'Pending', amount: '₹4,900.50', color: 'amber' },
                      { id: '#INV-2024-003', name: 'Pixel Craft Studio', status: 'Paid', amount: '₹890.00', color: 'emerald' },
                      { id: '#INV-2024-004', name: 'Nexa Systems', status: 'Overdue', amount: '₹12,400.00', color: 'rose' }
                    ].map((row, idx) => (
                      <div key={idx} className={cn("px-4 py-3 flex text-xs border-b border-slate-50 items-center transition-colors hover:bg-slate-50/50", idx%2 !== 0 && "bg-slate-50/20")}>
                        <span className="w-1/4 font-mono font-bold text-slate-600">{row.id}</span>
                        <span className="w-1/4 font-medium text-slate-700">{row.name}</span>
                        <span className="w-1/4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            row.color === 'emerald' ? "bg-emerald-100 text-emerald-700" : 
                            row.color === 'amber' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {row.status}
                          </span>
                        </span>
                        <span className="w-1/4 text-right font-black text-slate-900">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto shrink-0 flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white font-bold text-xs font-mono">PDF</div>
                    <div className="text-white">
                      <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest leading-none mb-0.5">Export Queue</p>
                      <p className="text-xs font-semibold">Ready to download Invoice #001</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider hover:bg-blue-700 transition-colors">Generate PDF</button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trusted In Section */}
          <div className="pt-20 text-center space-y-8">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trusted by over 500+ small businesses</p>
            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-40 grayscale">
              <span className="text-2xl font-black tracking-tighter">LUMINA</span>
              <span className="text-2xl font-black tracking-tighter">NEXUS</span>
              <span className="text-2xl font-black tracking-tighter">VERTIC</span>
              <span className="text-2xl font-black tracking-tighter">QUANTUM</span>
              <span className="text-2xl font-black tracking-tighter">STARK</span>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 space-y-16">
          <div className="space-y-4">
            <h3 className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full w-fit">Capabilities</h3>
            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight italic">Everything you need to <span className="font-serif font-medium text-blue-600">scale.</span></h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Receipt className="text-blue-600 w-5 h-5" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">GST Automated Billing</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Generate tax-compliant invoices in seconds. Our engine handles complex GST calculations automatically.
              </p>
              <div className="flex flex-wrap gap-2 pt-4">
                <span className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase rounded group-hover:border-blue-100">Tally Sync</span>
                <span className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase rounded">Digital Sign</span>
              </div>
            </div>

            {/* Feature 2 (Blue variant) */}
            <div className="p-8 bg-blue-600 rounded-[2rem] text-white flex flex-col justify-between shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="space-y-6">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center border border-white/10 group-hover:bg-white/30 transition-all">
                  <Package className="text-white w-5 h-5" />
                </div>
                <h4 className="text-xl font-bold tracking-tight">Inventory Tracking</h4>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Stock levels update in real-time with predictive low-stock alerts and multi-warehouse support.
                </p>
              </div>
              <div className="flex items-center justify-between pt-12">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Live Sync Enabled</span>
                <Play className="w-4 h-4 text-blue-200 animate-pulse" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6 lg:row-span-1 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
               <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="text-emerald-600 w-5 h-5" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Customer Management</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Centralized CRM to track payment history, credit limits, and purchase patterns for every client.
              </p>
              <button className="flex items-center gap-2 text-xs font-bold text-blue-600 pt-4 hover:gap-3 transition-all">
                Manage leads <ArrowRight className="w-3 h-3" />
              </button>
            </div>

             {/* Feature 4 (Large Card) */}
             <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6 relative overflow-hidden flex flex-col lg:row-span-1 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
               <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center transition-colors group-hover:bg-blue-100">
                <BarChart3 className="text-slate-600 w-5 h-5 group-hover:text-blue-600 transition-colors" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Expense Tracking</h4>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
                Capture receipts and categorize expenses on the go. Bridge the gap between what you spend and what you earn.
              </p>
              
              <div className="mt-auto bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 group-hover:border-blue-100 transition-all">
                <div className="flex justify-between text-[10px] items-center">
                   <span className="font-bold text-slate-400 uppercase tracking-widest">Monthly Budget</span>
                   <span className="font-bold text-blue-600">72%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 space-y-16">
          <div className="text-center space-y-4">
            <h3 className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 border border-blue-100 rounded-full w-fit mx-auto">Plans & Pricing</h3>
            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-none">Scalable plans for <span className="text-blue-600">every business.</span></h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Choose the tier that fits your current needs and scale as your transaction volume grows.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-8">
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 shrink-0">Growth Plan</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Free Forever</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹0</span>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  '50 Invoices / mo',
                  '100 Inventory Items',
                  'PDF Exports',
                  'Single User',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="w-full py-4 bg-slate-50 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-center">
                Get Started
              </Link>
            </div>

            {/* Monthly Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-8">
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 shrink-0">Monthly Pro</h4>
                <p className="text-rose-600 text-[10px] font-bold uppercase tracking-widest">Non-Commitment</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹499</span>
                <span className="text-slate-400 font-bold text-xs">/mo</span>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  'Unlimited Invoices',
                  'Full Warehouse Mgmt',
                  'Auto-Reminders',
                  'Analytics Suite',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePlanSelect('professional')}
                className="w-full py-4 bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-rose-700 transition-all text-center shadow-xl shadow-rose-100"
              >
                Experience Now
              </button>
            </div>

            {/* Annual Pro Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-600 shadow-2xl shadow-blue-100 relative overflow-hidden flex flex-col space-y-8">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-xl">Popular</div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 shrink-0">Pro Annual</h4>
                <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest">Best Value</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹4,999</span>
                <span className="text-slate-400 font-bold text-xs">/year</span>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  'Unlimited Invoices',
                  'Full Warehouse Mgmt',
                  'Bento Dashboards',
                  '24/7 Phone Support',
                  'GST Automation',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePlanSelect('professional')}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-center"
              >
                Select Pro
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col space-y-8">
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 shrink-0">Scale Alpha</h4>
                <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest">Corporate</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹14,999</span>
                <span className="text-slate-400 font-bold text-xs">/year</span>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  'Multi-Business Support',
                  'Advanced Staff Roles',
                  'Custom Logic Layer',
                  'Account Manager',
                  'P&L Advanced Engine',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/talk-to-sales" className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-800 transition-all text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center space-y-10 relative overflow-hidden shadow-2xl">
            <div className="space-y-6 relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to simplify your ledger?</h2>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                Join thousands of businesses who have replaced complex spreadsheets with BILLCORE.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              <Link to="/signup" className="px-10 py-5 bg-white text-blue-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-xl">
                Setup Dashboard Now
              </Link>
              <Link to="/talk-to-sales" className="px-10 py-5 bg-transparent text-white font-bold rounded-2xl border border-white/30 hover:bg-white/10 transition-all text-center">
                Talk to Sales
              </Link>
            </div>
            
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20"></div>
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="py-20 px-4 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="flex gap-12">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Security</p>
              <p className="text-xs font-semibold text-slate-700">256-bit AES Encryption</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Compliance</p>
              <p className="text-xs font-semibold text-slate-700">GST/HST Registered</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Inventory</p>
              <p className="text-xs font-semibold text-slate-700">Low Stock Alerts (Active)</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium italic">Trusted by over 12,000 global businesses.</p>
        </div>
        
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
           <span>© 2024 BILLCORE Ledger. All rights reserved.</span>
           <span>Made with Precision Engineering.</span>
        </div>
      </footer>
    </div>
  );
}
