/**
 * User-friendly error messages for common Firebase Auth and Firestore errors.
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication Errors
  'auth/user-not-found': 'No account found with this email. Please check your spelling or sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
  'auth/invalid-credential': 'Invalid credentials. This usually means the email/password is incorrect, the account doesn\'t exist, or Google Login isn\'t enabled yet.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/email-already-in-use': 'An account already exists with this email address.',
  'auth/operation-not-allowed': 'This sign-in method is currently disabled.',
  'auth/weak-password': 'Your password is too weak. Please use a stronger password.',
  'auth/network-request-failed': 'Network connection failed. This usually happens if you are offline or if the current domain is not added to "Authorized Domains" in your Firebase console.',
  'auth/popup-closed-by-user': 'Sign-in popup closed. Please keep the window open until the process completes.',
  'auth/internal-error': 'A system error occurred. Please refresh the page or try again in a few minutes.',
  
  // Firestore Errors
  'permission-denied': 'Access denied. You may need to sign in again or you lack sufficient permissions for this account.',
  'unavailable': 'Database unreachable. Please check your internet connection or firewall settings.',
  'deadline-exceeded': 'The request took too long. Please check your connection.',
  'not-found': 'The requested document was not found.',
  'already-exists': 'This record already exists.',
  'resource-exhausted': 'System limits reached. Please try again later (or check your quota).',
  'failed-precondition': 'The operation could not be completed in the current state.',
  'unauthenticated': 'Your session has expired. Please sign in again.',
};

// Mapping Firebase Error Codes to Better Guidance
const GUIDANCE_TIPS: Record<string, string> = {
  'auth/network-request-failed': 'Pro Tip: Check if your domain is authorized in Firebase Auth > Settings > Authorized Domains.',
  'auth/invalid-credential': 'Pro Tip: If you are using Google Login, ensure it is enabled in the Firebase Console under Authentication > Providers. If you are using email/password, check your spelling.',
  'permission-denied': 'Pro Tip: Ensure your user role has the required permissions in the Admin panel.',
  'resource-exhausted': 'Pro Tip: You might be hitting your Firebase Spark plan limits.',
};

/**
 * Maps a Firebase error code or message to a human-readable string.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  const code = error.code || (error.message && error.message.includes('code=') ? error.message.split('code=')[1].split(']')[0] : null);
  
  let baseMessage = 'Something went wrong. Please try again.';

  if (code && ERROR_MESSAGES[code]) {
    baseMessage = ERROR_MESSAGES[code];
  } else {
    // Handle common string-based error patterns
    const msg = error.message || String(error);
    
    if (msg.includes('offline') || msg.includes('network')) {
      baseMessage = ERROR_MESSAGES['auth/network-request-failed'];
    } else if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
      baseMessage = ERROR_MESSAGES['permission-denied'];
    } else if (msg.includes('quota')) {
      baseMessage = 'The system is temporarily over capacity. Please try again in 24 hours.';
    } else if (msg.includes('invalid-credential')) {
      baseMessage = ERROR_MESSAGES['auth/invalid-credential'];
    } else {
      baseMessage = msg || baseMessage;
    }
  }

  // Add guidance tip if available
  const tipCode = code || (baseMessage.includes('credentials') ? 'auth/invalid-credential' : null);
  if (tipCode && GUIDANCE_TIPS[tipCode]) {
    let message = `${baseMessage} ${GUIDANCE_TIPS[tipCode]}`;
    
    // Add current domain information to help with authorization
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (tipCode === 'auth/network-request-failed' || tipCode === 'auth/invalid-credential') {
        message += ` Also, ensure that the domain "${hostname}" is added to your Firebase Console under "Authorized Domains".`;
      }
    }
    
    return message;
  }

  return baseMessage;
}
