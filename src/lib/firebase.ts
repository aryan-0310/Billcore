/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  browserPopupRedirectResolver,
  initializeAuth
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { getFriendlyErrorMessage } from './error-mapping';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with a specific resolver to mitigate iframe issues
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence.');
  }
});

// Validate Connection to Firestore on Boot
async function testConnection() {
  try {
    // Attempting a read on a non-existent document that is allowed by rules
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      // If rules are still propagating or blocked, we avoid spamming the console with a friendly message
      // since the developer might still be configuring rules.
      process.env.NODE_ENV !== 'production' && console.debug("Firestore: Permission check on health endpoint.");
      return;
    }

    const friendly = getFriendlyErrorMessage(error);
    
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable' || error?.code === 'auth/network-request-failed' || error?.message?.includes('unauthorized-domain')) {
      console.error(`Firebase Connection Issue: ${friendly}`);
      
      // Specifically target Firestore unavailable
      if (error?.code === 'unavailable') {
        console.error("─── FIRESTORE ERROR ───");
        console.error(`Status: Database unreachable (${firebaseConfig.firestoreDatabaseId}).`);
        console.error("Possible Causes:");
        console.error("1. The custom database is still provisioning (wait 1-2 minutes).");
        console.error("2. Your internet connection is blocking the specific Firestore endpoint.");
        console.error("3. The database was deleted or permissions are misconfigured.");
        console.error(`Action: Double check Firestore at -> https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
        console.error("────────────────────────");
      }

      // Restore Authentication Error section
      if (error?.code === 'auth/network-request-failed' || error?.message?.includes('unauthorized-domain')) {
        const domain = window.location.hostname;
        console.error("─── AUTHENTICATION ERROR ───");
        console.error(`Status: Domain "${domain}" is blocked.`);
        console.error(`Action: Add it here -> https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`);
        console.error("─────────────────────────────");
      }
      
      console.warn("Guidance: Ensure you have a stable network and that Firebase hosting/firestore is enabled.");
    }
  }
}
testConnection();

export default app;
