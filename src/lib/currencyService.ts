import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { OperationType, handleFirestoreError } from './firestore-utils';

export interface Currency {
  id?: string;
  code: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  businessId: string;
}

export function formatCurrency(amount: number, symbol: string = '₹') {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
