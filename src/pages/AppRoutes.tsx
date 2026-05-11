import React from 'react';
import { useLocation, Link, Route, Routes, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Receipt, 
  BarChart3, 
  Users, 
  ChevronDown,
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Contact,
  HelpCircle,
  User as UserIcon,
  Building,
  Zap,
  AlertTriangle,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth, PLAN_LIMITS } from '../context/AuthContext';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import TalkToSales from './TalkToSales';

import Dashboard from './Dashboard';
import Inventory from './Inventory';
import Billing from './Billing';
import Analytics from './Analytics';
import Staff from './Staff';
import Parties from './Parties';
import AdminControl from './AdminControl';
import Account from './Account';
import HelpAndSupport from './HelpAndSupport';
import Plan from './Plan';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function DashboardLayout() {
  const { signOut, profile, businessId } = useAuth();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [counts, setCounts] = React.useState({ invoices: 0, inventory: 0 });

  React.useEffect(() => {
    if (!businessId) return;
    
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('businessId', '==', businessId)), (snap) => {
      setCounts(prev => ({ ...prev, invoices: snap.size }));
    });
    
    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), where('businessId', '==', businessId)), (snap) => {
      setCounts(prev => ({ ...prev, inventory: snap.size }));
    });

    return () => {
      unsubInvoices();
      unsubInventory();
    };
  }, [businessId]);

  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';
  const isAccountant = profile?.role === 'accountant';

  const plan = profile?.plan || 'starter';
  const limits = (PLAN_LIMITS as any)[plan] || PLAN_LIMITS.starter;
  const isOverLimit = counts.invoices >= limits.invoices || counts.inventory >= limits.inventory;
  const isNearLimit = !isOverLimit && (counts.invoices >= limits.invoices * 0.8 || counts.inventory >= limits.inventory * 0.8);

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package },
    { name: 'Invoices', path: '/dashboard/billing', icon: Receipt },
    { name: 'Customers', path: '/dashboard/parties', icon: Contact },
    { name: isAccountant ? 'Financial Reports' : 'Reports', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Staff', path: '/dashboard/staff', icon: Users },
    { name: 'Subscription', path: '/dashboard/plan', icon: Zap },
  ].filter(item => {
    if (isAdmin) return true;
    if (isStaff) {
      return ['Dashboard', 'Inventory', 'Invoices', 'Customers'].includes(item.name);
    }
    if (isAccountant) {
      return ['Dashboard', 'Invoices', 'Reports'].includes(item.name);
    }
    return ['Dashboard'].includes(item.name);
  });

  const mainNavItems = allNavItems.filter(item => !['Customers', 'Reports', 'Staff'].includes(item.name));
  const moreItems = allNavItems.filter(item => ['Customers', 'Reports', 'Staff'].includes(item.name));

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Plan Limit Banner */}
      <AnimatePresence>
        {(isOverLimit || isNearLimit) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "w-full px-8 py-3 flex items-center justify-between z-50 sticky top-0 border-b",
              isOverLimit ? "bg-rose-600 text-white border-rose-700" : "bg-blue-600 text-white border-blue-700"
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {isOverLimit 
                  ? `${limits.name} limits exhausted. Upgrade now to continue operations.` 
                  : `Approaching your ${limits.name} limits. Upgrade to avoid disruption.`}
              </p>
            </div>
            <Link 
              to="/dashboard/plan" 
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-slate-900 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Upgrade Now <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className={cn(
        "h-20 border-b border-slate-100 px-4 md:px-12 flex items-center justify-between bg-white/80 backdrop-blur-md z-50 sticky p-0",
        (isOverLimit || isNearLimit) ? "top-[45px]" : "top-0"
      )}>
        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white text-xl font-black">
              {profile?.businessName?.[0] || profile?.displayName?.[0] || 'L'}
            </div>
            <div className="text-xl font-black tracking-tighter text-slate-900 hidden sm:block">
              {profile?.businessName || 'Billcore'}
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {mainNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={cn(
                  "text-sm font-black transition-all relative py-2",
                  location.pathname === item.path ? "text-rose-600" : "text-slate-400 hover:text-slate-900"
                )}
              >
                {item.name}
                {location.pathname === item.path && (
                  <motion.div layoutId="header-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                )}
              </Link>
            ))}

            {moreItems.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={cn(
                    "text-sm font-black transition-all py-2 flex items-center gap-1.5",
                    moreItems.some(item => location.pathname === item.path) ? "text-rose-600" : "text-slate-400 hover:text-slate-900",
                    isMoreOpen && "text-slate-900"
                  )}
                >
                  More
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isMoreOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isMoreOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsMoreOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 mt-4 w-56 bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/50 p-3 z-40"
                      >
                        <div className="space-y-1">
                          {moreItems.map((item) => (
                            <Link 
                              key={item.path}
                              to={item.path} 
                              onClick={() => setIsMoreOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                location.pathname === item.path 
                                  ? "bg-rose-50 text-rose-600" 
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              )}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-6 relative">
          <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  "text-slate-400 hover:text-slate-900 transition-all p-2 rounded-full",
                  isSettingsOpen && "bg-slate-100 text-slate-900"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsSettingsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-64 bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/50 p-3 z-40"
                    >
                      <div className="px-4 py-3 border-b border-slate-50 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</p>
                      </div>
                      
                      <div className="space-y-1">
                        {isAdmin && (
                          <Link 
                            to="/dashboard/manage-business" 
                            onClick={() => setIsSettingsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-bold text-sm"
                          >
                            <Building className="w-4 h-4" />
                            Manage Business
                          </Link>
                        )}
                        
                        <Link 
                          to="/dashboard/help" 
                          onClick={() => setIsSettingsOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-bold text-sm"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Help and Support
                        </Link>
                        
                        <Link 
                          to="/dashboard/account" 
                          onClick={() => setIsSettingsOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-bold text-sm"
                        >
                          <UserIcon className="w-4 h-4" />
                          Account
                        </Link>

                        <Link 
                          to="/dashboard/plan" 
                          onClick={() => setIsSettingsOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-bold text-sm"
                        >
                          <Zap className="w-4 h-4" />
                          Software Plans
                        </Link>

                        <div className="h-px bg-slate-50 my-2" />

                        <button 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-100 shrink-0">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName || 'Felix'}`} alt="User" />
              )}
            </div>
          </div>
        </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-[70] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white text-xl font-black">
                    {profile?.businessName?.[0] || profile?.displayName?.[0] || 'L'}
                  </div>
                  <div className="text-xl font-black tracking-tighter text-slate-900">
                    {profile?.businessName || 'Billcore'}
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-2 flex-1 overflow-y-auto">
                {allNavItems.map((item) => (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-black text-sm",
                      location.pathname === item.path 
                        ? "bg-rose-50 text-rose-600" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-100">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName || 'Felix'}`} alt="User" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{profile?.displayName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{profile?.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto min-h-full">
           <Routes>
              <Route index element={<Dashboard />} />
              
              {(isAdmin || isStaff || isAccountant) && <Route path="billing" element={<Billing />} />}
              {(isAdmin || isStaff) && <Route path="inventory" element={<Inventory />} />}
              {(isAdmin || isStaff) && <Route path="parties" element={<Parties />} />}
              {(isAdmin || isAccountant) && <Route path="analytics" element={<Analytics />} />}
              
              {isAdmin && (
                <>
                  <Route path="staff" element={<Staff />} />
                  <Route path="manage-business" element={<AdminControl />} />
                </>
              )}
              
              <Route path="account" element={<Account />} />
              <Route path="plan" element={<Plan />} />
              <Route path="help" element={<HelpAndSupport />} />
              
              {/* Fallback for unauthorized route access within dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
           </Routes>
        </div>
      </main>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage isLogin={true} />} />
      <Route path="/signup" element={<AuthPage isLogin={false} />} />
      <Route path="/talk-to-sales" element={<TalkToSales />} />
      <Route 
        path="/dashboard/*" 
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}
