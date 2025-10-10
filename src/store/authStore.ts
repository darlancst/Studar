import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  setUser: (user: AuthUser | null, token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Funções de API
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  verifyToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      setUser: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: !!user,
          error: null,
        });
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error, loading: false }),

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        // Limpar localStorage (opcional)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },

      signup: async (email, password, name) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Erro ao criar conta');
          }

          get().setUser(data.user, data.token);
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
          }

          get().setUser(data.user, data.token);
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      verifyToken: async () => {
        const token = get().token;
        if (!token) {
          get().logout();
          return;
        }

        try {
          const res = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            get().logout();
            return;
          }

          const data = await res.json();
          set({ user: data.user, isAuthenticated: true });
        } catch (error) {
          console.error('Erro ao verificar token:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

