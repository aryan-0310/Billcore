import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  businessName?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessType?: string;
  location?: string;
  role: 'admin' | 'staff' | 'accountant';
  parentBusinessId?: string; // For staff members
  invoicePrefix?: string;
  gstin?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  invoiceTerms?: string;
  dashboardWidgets?: string[]; // Array of widget IDs in preferred order
  photoURL?: string;
  plan?: 'starter' | 'professional' | 'enterprise' | 'monthly';
  subscriptionStatus?: 'active' | 'past_due' | 'canceled';
  createdAt?: string;
  paymentTerms?: string;
  invoiceNotes?: string;
}

export const PLAN_LIMITS = {
  starter: {
    invoices: 50,
    inventory: 100,
    name: 'Growth Plan'
  },
  monthly: {
    invoices: Infinity,
    inventory: Infinity,
    name: 'Monthly Experience'
  },
  professional: {
    invoices: Infinity,
    inventory: Infinity,
    name: 'Professional'
  },
  enterprise: {
    invoices: Infinity,
    inventory: Infinity,
    name: 'Enterprise'
  }
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  businessId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { 
  OperationType, 
  handleFirestoreError 
} from '../lib/firestore-utils';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(user);
      
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setLoading(false);
          } else {
            console.log("Profile not found, creating one...");
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              role: 'admin',
              plan: 'starter',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString()
            } as any;
            
            setDoc(docRef, newProfile).then(() => {
              setProfile(newProfile);
              setLoading(false);
            }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
              setLoading(false);
            });
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    }, (err) => {
      console.error("Auth state change error:", err);
      // Not throwing here to allow recovery, but logging is essential
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const businessId = profile?.parentBusinessId || profile?.uid || null;

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, businessId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
