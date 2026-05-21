import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';

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
  logout: () => Promise<void>;
  
  // Funções de API conectadas ao Supabase
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

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Erro no logout do Supabase:', e);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        // Limpar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },

      signup: async (email, password, name) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name: name || '' },
            },
          });

          if (error) throw new Error(error.message);
          if (!data.user) throw new Error('Erro ao criar conta');

          const token = data.session?.access_token || null;

          get().setUser({
            id: data.user.id,
            email: data.user.email || email,
            name: name || '',
          }, token);
          
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw new Error(error.message);
          if (!data.user || !data.session) throw new Error('Erro ao fazer login');

          get().setUser({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || '',
          }, data.session.access_token);
          
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      verifyToken: async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) {
            get().logout();
            return;
          }

          get().setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: data.session.user.user_metadata?.name || '',
          }, data.session.access_token);
          
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
