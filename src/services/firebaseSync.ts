import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  enableNetwork, 
  disableNetwork 
} from 'firebase/firestore';
import { getDbInstance, isFirebaseConfigured } from '@/lib/firebase';
import { AuthUser } from '@/hooks/useAuth';

// Interface para dados do usuário no Firebase
export interface UserData {
  subjects: any[];
  topics: any[];
  reviews: any[];
  pomodoroSessions: any[];
  simulados: any[];
  settings: any;
  lastSync: number;
}

export class FirebaseSync {
  private userId: string | null = null;
  private unsubscribes: (() => void)[] = [];

  // Configurar usuário para sincronização
  setUser(user: AuthUser | null) {
    this.userId = user?.uid || null;
    
    // Limpar listeners anteriores
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  // Verificar se pode sincronizar
  private canSync(): boolean {
    return !!(isFirebaseConfigured() && this.userId && getDbInstance());
  }

  // Sincronizar dados do localStorage para Firebase
  async syncToCloud() {
    if (!this.canSync()) return false;

    try {
      const db = getDbInstance();
      if (!db) return false;

      const userData: UserData = {
        subjects: JSON.parse(localStorage.getItem('subjects') || '[]'),
        topics: JSON.parse(localStorage.getItem('topics') || '[]'),
        reviews: JSON.parse(localStorage.getItem('reviews') || '[]'),
        pomodoroSessions: JSON.parse(localStorage.getItem('pomodoroSessions') || '[]'),
        simulados: JSON.parse(localStorage.getItem('simulados') || '[]'),
        settings: JSON.parse(localStorage.getItem('settings') || '{}'),
        lastSync: Date.now()
      };

      const userDocRef = doc(db, 'users', this.userId!);
      await setDoc(userDocRef, userData, { merge: true });
      
      console.log('✅ Dados sincronizados com sucesso para a nuvem');
      return true;
    } catch (error) {
      console.error('❌ Erro ao sincronizar para nuvem:', error);
      return false;
    }
  }

  // Sincronizar dados do Firebase para localStorage
  async syncFromCloud() {
    if (!this.canSync()) return false;

    try {
      const db = getDbInstance();
      if (!db) return false;

      const userDocRef = doc(db, 'users', this.userId!);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        
        // Atualizar localStorage com dados da nuvem
        localStorage.setItem('subjects', JSON.stringify(userData.subjects || []));
        localStorage.setItem('topics', JSON.stringify(userData.topics || []));
        localStorage.setItem('reviews', JSON.stringify(userData.reviews || []));
        localStorage.setItem('pomodoroSessions', JSON.stringify(userData.pomodoroSessions || []));
        localStorage.setItem('simulados', JSON.stringify(userData.simulados || []));
        localStorage.setItem('settings', JSON.stringify(userData.settings || {}));

        console.log('✅ Dados baixados da nuvem com sucesso');
        
        // Disparar evento para atualizar UI
        window.dispatchEvent(new CustomEvent('dataSync'));
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao baixar dados da nuvem:', error);
      return false;
    }
    return false;
  }

  // Configurar sincronização em tempo real
  startRealtimeSync() {
    if (!this.canSync()) return;

    const db = getDbInstance();
    if (!db) return;

    const userDocRef = doc(db, 'users', this.userId!);
    
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserData;
        const localLastSync = parseInt(localStorage.getItem('lastSync') || '0');
        
        // Só atualizar se os dados da nuvem são mais recentes
        if (userData.lastSync > localLastSync) {
          this.syncFromCloud();
        }
      }
    }, (error) => {
      console.error('❌ Erro na sincronização em tempo real:', error);
    });

    this.unsubscribes.push(unsubscribe);
  }

  // Sincronização inicial ao fazer login
  async initialSync() {
    if (!this.canSync()) return false;

    try {
      // Primeiro, tenta baixar dados da nuvem
      const cloudSyncSuccess = await this.syncFromCloud();
      
      if (!cloudSyncSuccess) {
        // Se não há dados na nuvem, envia dados locais
        await this.syncToCloud();
      }

      // Inicia sincronização em tempo real
      this.startRealtimeSync();
      
      return true;
    } catch (error) {
      console.error('❌ Erro na sincronização inicial:', error);
      return false;
    }
  }

  // Função para salvar dados localmente E na nuvem
  async saveData(key: string, data: any) {
    // Salva localmente primeiro (para funcionar offline)
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem('lastSync', Date.now().toString());
    
    // Tenta sincronizar com a nuvem (só se Firebase estiver disponível)
    if (this.canSync()) {
      await this.syncToCloud();
    }
    
    // Disparar evento para atualizar UI
    window.dispatchEvent(new CustomEvent('dataSync'));
  }

  // Limpar todos os listeners
  cleanup() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  // Verificar status de conexão
  async checkConnection() {
    if (!isFirebaseConfigured() || !getDbInstance()) {
      return false;
    }

    try {
      const db = getDbInstance();
      if (!db) return false;
      
      await enableNetwork(db);
      return true;
    } catch {
      return false;
    }
  }
}

// Instância singleton
export const firebaseSync = new FirebaseSync();
