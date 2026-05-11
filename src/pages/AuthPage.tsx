import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, Chrome, Building2, MapPin, Briefcase, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

import { getFriendlyErrorMessage } from '../lib/error-mapping';

export default function AuthPage({ isLogin = true }: { isLogin?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (isResetMode) {
      try {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Please check your inbox.');
        setIsResetMode(false);
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          displayName: name,
          businessName,
          businessType,
          location,
          role: 'admin', // First user is admin for demo
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Upsert profile
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        role: 'admin',
        createdAt: new Date().toISOString()
      }, { merge: true });

      navigate('/dashboard');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl border border-slate-200 relative"
      >
        <Link 
          to="/" 
          className="absolute left-6 top-6 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        <div className="text-center space-y-4 pt-4">
          <Link 
            to="/"
            className="mx-auto w-12 h-12 bg-blue-600 rounded flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
          >
            <div className="w-6 h-6 border-2 border-white rotate-45"></div>
          </Link>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isResetMode ? 'Reset Password' : (isLogin ? 'Sign in to dashboard' : 'Join BILLCORE')}
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            {isResetMode ? 'Enter your email to receive a reset link.' : (isLogin ? 'Access your professional business tools instantly.' : 'Get started with our free Growth Plan.')}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-tight">Access Restricted</p>
                <p className="text-[11px] font-medium leading-relaxed opacity-90">{error}</p>
                {error.includes('Authorized Domains') && (
                  <div className="mt-3 p-2 bg-white/50 rounded-lg border border-rose-200/50">
                    <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest mb-1">Copy this Domain:</p>
                    <code className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200 block truncate">
                      {window.location.hostname}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 italic">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isResetMode && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Owner Name"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Business Name"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Business Type"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Location"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Email address"
              required
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {!isResetMode && (
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {isLogin && !isResetMode && (
            <div className="flex justify-end pr-1">
              <button 
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isResetMode && (
             <div className="flex justify-end pr-1">
              <button 
                type="button"
                onClick={() => setIsResetMode(false)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isResetMode ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account'))}
          </button>
        </form>

        <div className="relative flex items-center gap-4 py-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full py-4 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-sm shadow-sm"
        >
          <Chrome className="w-5 h-5 text-blue-600" />
          Continue with Google
        </button>

        <div className="text-center text-sm font-medium text-slate-500 pt-4">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link to={isLogin ? '/signup' : '/login'} className="text-blue-600 font-bold hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
