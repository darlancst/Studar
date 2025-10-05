import { useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  updateProfile
} from 'firebase/auth';
import { getAuthInstance, isFirebaseConfigured } from '@/lib/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const setupAuthListener = async () => {
      // Tenta obter a instância do auth repetidamente por curto período
      let attempts = 0;
      let auth = getAuthInstance();
      while (!auth && attempts < 20) {
        await new Promise((r) => setTimeout(r, 100));
        auth = getAuthInstance();
        attempts++;
      }

      if (!auth || isCancelled) {
        setLoading(false);
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (isCancelled) return;
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    };

    setupAuthListener();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase não configurado');
    }

    const auth = getAuthInstance();
    if (!auth) {
      throw new Error('Firebase não inicializado');
    }

    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase não configurado');
    }

    const auth = getAuthInstance();
    if (!auth) {
      throw new Error('Firebase não inicializado');
    }

    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const ensureAuth = async () => {
      let attempts = 0;
      let auth = getAuthInstance();
      while (!auth && attempts < 20) {
        await new Promise((r) => setTimeout(r, 100));
        auth = getAuthInstance();
        attempts++;
      }
      return auth;
    };

    const auth = await ensureAuth();
    if (!auth) throw new Error('Firebase não inicializado');

    try {
      setError(null);
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Fallback para navegadores que bloqueiam popup (ex.: anônimo/Firefox)
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        return;
      }
      setError(getErrorMessage(error.code));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const auth = getAuthInstance();
    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user,
    isFirebaseAvailable: isFirebaseConfigured(),
  };
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuário não encontrado';
    case 'auth/wrong-password':
      return 'Senha incorreta';
    case 'auth/email-already-in-use':
      return 'Email já está sendo usado';
    case 'auth/weak-password':
      return 'Senha muito fraca (mínimo 6 caracteres)';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado pelo usuário';
    case 'auth/popup-blocked':
      return 'Popup bloqueado. Permita popups para este site';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Verifique configuração do Firebase';
    default:
      return 'Erro desconhecido. Tente novamente';
  }
}
