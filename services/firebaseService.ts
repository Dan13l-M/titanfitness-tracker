import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId
  );
};

// Initialize Firebase only if configured
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { auth, db };

// Auth helper functions
export const firebaseSignIn = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase not configured');
  return signInWithEmailAndPassword(auth, email, password);
};

export const firebaseSignUp = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase not configured');
  return createUserWithEmailAndPassword(auth, email, password);
};

export const firebaseSignOut = async () => {
  if (!auth) throw new Error('Firebase not configured');
  return signOut(auth);
};

export const firebaseResetPassword = async (email: string) => {
  if (!auth) throw new Error('Firebase not configured');
  return sendPasswordResetEmail(auth, email);
};

export const onFirebaseAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Firestore data helpers
export const saveUserData = async (userId: string, key: string, data: any) => {
  if (!db) throw new Error('Firebase not configured');
  const docRef = doc(db, 'users', userId, 'data', key);
  await setDoc(docRef, { value: data, updatedAt: Date.now() });
};

export const loadUserData = async (userId: string): Promise<Record<string, any>> => {
  if (!db) throw new Error('Firebase not configured');
  
  const keys = [
    'titan_exercises',
    'titan_routines', 
    'titan_history',
    'titan_metrics',
    'titan_chats',
    'titan_unit',
    'titan_profile',
    'titan_active_session'
  ];
  
  const result: Record<string, any> = {};
  
  for (const key of keys) {
    try {
      const docRef = doc(db, 'users', userId, 'data', key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        result[key] = docSnap.data().value;
      }
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
    }
  }
  
  return result;
};

export const deleteUserData = async (userId: string, key: string) => {
  if (!db) throw new Error('Firebase not configured');
  const docRef = doc(db, 'users', userId, 'data', key);
  await deleteDoc(docRef);
};
