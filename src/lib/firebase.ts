import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';

// Configuração do Firebase - só inicializa no cliente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Só inicializar Firebase se estiver no cliente E se houver configuração
let app: any = null;
let auth: any = null;
let db: any = null;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  // Verificar se Firebase já foi inicializado
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // Inicializar Auth e Firestore
  auth = getAuth(app);
  db = getFirestore(app);
}

// Funções utilitárias para modo offline (só funcionam no cliente)
export const enableOffline = () => {
  if (db && typeof window !== 'undefined') {
    return disableNetwork(db);
  }
  return Promise.resolve();
};

export const enableOnline = () => {
  if (db && typeof window !== 'undefined') {
    return enableNetwork(db);
  }
  return Promise.resolve();
};

// Verificar se Firebase está configurado
export const isFirebaseConfigured = () => {
  return !!(firebaseConfig.apiKey && app && auth && db);
};

export { auth, db };
export default app; 