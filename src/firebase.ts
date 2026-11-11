import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

import rootConfig from '../firebase-applet-config.json';

const env = (import.meta as any).env || {};
const winConfig = typeof window !== 'undefined' ? (window as any).__FIREBASE_CONFIG__ : null;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || winConfig?.apiKey || (rootConfig as any).apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || winConfig?.authDomain || (rootConfig as any).authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || winConfig?.projectId || (rootConfig as any).projectId,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || winConfig?.databaseURL || (rootConfig as any).databaseURL,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || winConfig?.storageBucket || (rootConfig as any).storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || winConfig?.messagingSenderId || (rootConfig as any).messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || winConfig?.appId || (rootConfig as any).appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || winConfig?.measurementId || (rootConfig as any).measurementId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || (
    (!winConfig?.projectId || winConfig.projectId === (rootConfig as any).projectId)
      ? (rootConfig as any).firestoreDatabaseId
      : undefined
  ),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (firebaseConfig as any).firestoreDatabaseId && 
                  (firebaseConfig as any).firestoreDatabaseId !== '(default)' && 
                  (firebaseConfig as any).firestoreDatabaseId !== ''
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const rtdb = firebaseConfig.databaseURL ? getDatabase(app, firebaseConfig.databaseURL) : getDatabase(app);

export const auth = getAuth(app);

// Safe Analytics initialization
export let analytics: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics initialization ignored if blocked by ad-blocker
      }
    }
  }).catch(() => {});
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.warn("Firebase Connection Warning: Client is offline or Firestore is initializing.");
      } else {
        console.warn("Firebase Connection Warning:", error.message);
      }
    }
  }
}

testConnection();
