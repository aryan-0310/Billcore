import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { OperationType, handleFirestoreError } from './firestore-utils';

export type InventoryLogType = 'stock_update' | 'price_update' | 'sale' | 'initial' | 'edit';

interface LogData {
  itemId: string;
  businessId: string;
  type: InventoryLogType;
  field?: string;
  oldValue: any;
  newValue: any;
  description: string;
  updatedBy: string;
}

/**
 * Logs a change to an inventory item.
 */
export async function logInventoryChange(data: LogData) {
  const path = 'inventoryLogs';
  try {
    await addDoc(collection(db, path), {
      ...data,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
