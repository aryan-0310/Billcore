import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Zap,
  Star,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Info,
  ChevronDown,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

interface PlanProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  color: string;
  buttonText: string;
  isPopular?: boolean;
  onUpgrade: (planId: string) => void;
  planId: string;
  currentPlan?: string;
  key?: string;
}

const PlanCard = ({
  name,
  price,
  period,
  description,
  features,
  color,
  buttonText,
  isPopular,
  onUpgrade,
  planId,
  currentPlan
}: PlanProps) => {
  const isCurrent = currentPlan === planId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={cn(
        "relative p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border transition-all duration-500 flex flex-col h-full bg-white",
        isPopular ? "border-blue-600 shadow-2xl shadow-blue-100" : "border-slate-100 shadow-sm hover:shadow-xl",
        isCurrent && "ring-4 ring-blue-500/20"
      )}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
          Most Popular
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-8 right-8 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200">
          Active Plan
        </div>
      )}

      <div className="mb-8">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", color)}>
          {planId === 'starter' && <Rocket className="w-7 h-7" />}
          {planId === 'professional' && <Zap className="w-7 h-7" />}
          {planId === 'enterprise' && <Star className="w-7 h-7" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2 underline decoration-blue-600/20 underline-offset-4">{name}</h3>
        <p className="text-slate-400 text-xs font-bold leading-relaxed">{description}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-slate-900 tracking-tighter">{price}</span>
          <span className="text-slate-400 text-sm font-bold pb-1">{period}</span>
        </div>
      </div>

      <div className="space-y-4 mb-10 flex-1">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-slate-600 leading-tight">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onUpgrade(planId)}
        disabled={isCurrent}
        className={cn(
          "w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
          isCurrent
            ? "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
            : isPopular
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100"
              : "bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-100"
        )}
      >
        {isCurrent ? 'Current Selection' : buttonText}
        {!isCurrent && <ArrowRight className="w-4 h-4 ml-1" />}
      </button>
    </motion.div>
  );
};

export default function Plan() {
  const { profile, user } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    if (planId === 'starter' && profile?.plan === 'starter') return;

    // For free plans or downgrades to starter, no need for payment
    if (planId === 'starter') {
      setIsUpgrading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          plan: planId,
          subscriptionStatus: 'active',
          updatedAt: new Date().toISOString()
        });
        alert(`Successfully switched to the ${planId.toUpperCase()} plan! Welcome aboard.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      } finally {
        setIsUpgrading(false);
      }
      return;
    }

    setIsUpgrading(true);

    const res = await loadRazorpay();

    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      setIsUpgrading(false);
      return;
    }

    const planData = plans.find(p => p.planId === planId);
    const priceStr = planData?.price.replace(/[^0-9]/g, '');
    const amount = parseInt(priceStr || '0') * 100;

    const options = {
      key: (import.meta as any).env.VITE_RAZORPAY_KEY || 'rzp_test_So4JDdFZuK4Yns', // Replace via .env for production
      amount: amount,
      currency: 'INR',
      name: 'Billcore Platforms',
      description: `Upgrade to ${planData?.name}`,
      image: 'https://i.ibb.co/LdG3xQK/logo.png', // Placeholder logo
      handler: async function (response: any) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            plan: planId,
            subscriptionStatus: 'active',
            razorpayPaymentId: response.razorpay_payment_id,
            updatedAt: new Date().toISOString()
          });
          alert(`Payment Successful! Successfully switched to the ${planId.toUpperCase()} plan! Welcome aboard.`);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        } finally {
          setIsUpgrading(false);
        }
      },
      prefill: {
        name: profile?.displayName || '',
        email: user?.email || '',
        contact: profile?.phone || ''
      },
      theme: {
        color: '#2563eb'
      },
      modal: {
        ondismiss: function () {
          setIsUpgrading(false);
        }
      }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  const plans = [
    {
      planId: 'starter',
      name: 'Growth Plan',
      price: '₹0',
      period: '/forever',
      description: 'Perfect for startups and tiny kiosks testing the waters.',
      features: [
        'Up to 50 Invoices / mo',
        'Basic Inventory Tracking (100 items)',
        'Classy Invoice PDF Export',
        'Single User Access',
        'Standard Email Support'
      ],
      color: 'bg-emerald-50 text-emerald-600',
      buttonText: 'Get Started'
    },
    {
      planId: 'monthly',
      name: 'Monthly Experience',
      price: '₹499',
      period: '/month',
      description: 'Test the full spectrum of Pro features with zero commitment.',
      features: [
        'Unlimited Invoices & Billing',
        'Full Warehouse Management',
        'Automatic Payment Reminders',
        'Full Analytics Suite',
        'Standard Email Support'
      ],
      color: 'bg-rose-50 text-rose-600',
      buttonText: 'Buy Monthly'
    },
    {
      planId: 'professional',
      name: 'Pro Annual',
      price: '₹4,999',
      period: '/year',
      description: 'The sweet spot for established retail & distribution units.',
      features: [
        'Unlimited Invoices & Billing',
        'Full Warehouse Management',
        'Automatic Payment Reminders',
        'Bento-style Dashboards',
        'Priority Phone Support (24/7)'
      ],
      color: 'bg-blue-50 text-blue-600',
      buttonText: 'Unlock Potential',
      isPopular: true
    },
    {
      planId: 'enterprise',
      name: 'Scale Alpha',
      price: '₹14,999',
      period: '/year',
      description: 'High-volume operations requiring deep scale & custom logic.',
      features: [
        'Everything in Professional Plan',
        'Multi-Business Node Support',
        'Custom Staff Permissions Layer',
        'Advanced Analytics & P&L',
        'Dedicated Account Manager'
      ],
      color: 'bg-indigo-50 text-indigo-600',
      buttonText: 'Go Enterprise'
    }
  ];

  const faqs = [
    {
      q: "Can I move between plans later?",
      a: "Absolutely. You can scale up to Professional or Enterprise at any point. Your data remains fully intact and instantly unlocks the new features."
    },
    {
      q: "Is my financial data encrypted?",
      a: "Every transaction is sealed with AES-256 bank-level encryption. We use secure cloud relays to ensure your nodes are never compromised."
    },
    {
      q: "Do you offer localized tax support?",
      a: "Yes. Billcore is built with deep GST and localized tax engine support for 15+ regions, ensuring your billing remains legally compliant."
    }
  ];

  return (
    <div className="p-4 md:p-12 space-y-10 md:space-y-16 bg-slate-50/30 min-h-screen">
      {/* Header Section */}
      <div className="max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-blue-100">
          Subscription Hub
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">
          Architect Your <span className="text-blue-600">Business Scaling.</span>
        </h1>
        <p className="text-slate-500 text-lg font-bold leading-relaxed max-w-2xl">
          Choose a ledger capacity that matches your current velocity. Switch anytime as your commerce node expands.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.planId}
            name={plan.name}
            price={plan.price}
            period={plan.period}
            description={plan.description}
            features={plan.features}
            color={plan.color}
            buttonText={plan.buttonText}
            isPopular={plan.isPopular}
            onUpgrade={handleUpgrade}
            planId={plan.planId}
            currentPlan={profile?.plan || 'starter'}
          />
        ))}
      </div>

      {/* Trust Banner */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 space-y-4 text-center md:text-left">
          <div className="flex justify-center md:justify-start items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="text-sm font-black uppercase tracking-widest text-emerald-400">Zero-Risk Commerce</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-none">Ready to deploy at scale?</h2>
          <p className="text-slate-400 text-sm font-bold max-w-md">Upgrade now and receive a dedicated onboarding session with our deployment architects.</p>
        </div>
        <button className="relative z-10 px-10 py-5 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-50 transition-all shadow-2xl active:scale-95 shrink-0">
          Chat with Experts
        </button>

        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -ml-32 -mb-32 rounded-full" />
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-10 pb-20">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Common Queries.</h2>
          <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden transition-all shadow-sm">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full p-8 text-left flex justify-between items-center group"
              >
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{faq.q}</span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-slate-400 transition-transform duration-300",
                  activeFaq === i ? "rotate-180 text-blue-600" : "group-hover:text-slate-600"
                )} />
              </button>
              <AnimatePresence>
                {activeFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 pt-0 text-slate-500 text-sm font-bold leading-relaxed border-t border-slate-50 bg-slate-50/20">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 pt-10">
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-105">
            <Info className="w-5 h-5 text-blue-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">All plans include automatic cloud backup nodes.</p>
          </div>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">© 2024 Billcore Architecture • All Protocols Reserved</p>
        </div>
      </div>

      <AnimatePresence>
        {isUpgrading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 max-w-sm w-full border border-slate-100"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-50 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <ShieldCheck className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Processing Payment...</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Connecting to Secure Gateway</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
