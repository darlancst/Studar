import { firebaseSync } from '@/services/firebaseSync';

// Função helper para salvar dados com sync
export const saveWithSync = async (key: string, data: any) => {
  try {
    // Salvar localmente primeiro (para funcionar offline)
    localStorage.setItem(key, JSON.stringify(data));
    
    // Tentar sincronizar com Firebase
    await firebaseSync.saveData(key, data);
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    // Se falhar, pelo menos os dados locais foram salvos
  }
};

// Função para atualizar stores quando dados sync chegam do Firebase
export const setupSyncListener = (storeName: string, updateCallback: (data: any) => void) => {
  const handleDataSync = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storeName) || 'null');
      if (data) {
        updateCallback(data);
      }
    } catch (error) {
      console.error(`Erro ao sincronizar store ${storeName}:`, error);
    }
  };

  // Escutar eventos de sync
  window.addEventListener('dataSync', handleDataSync);
  
  // Retornar função para remover listener
  return () => window.removeEventListener('dataSync', handleDataSync);
};

// Mapear nomes de stores para chaves do localStorage
export const STORE_KEYS = {
  subjects: 'subjects',
  topics: 'topics', 
  reviews: 'reviews',
  pomodoroSessions: 'pomodoroSessions',
  simulados: 'simulados',
  settings: 'settings'
} as const;

// Função para inicializar sync em um store
export const initStoreSync = (storeName: keyof typeof STORE_KEYS, setState: (state: any) => void) => {
  // Configurar listener para sync
  const cleanup = setupSyncListener(STORE_KEYS[storeName], (data) => {
    setState(data);
  });

  // Retornar função de cleanup
  return cleanup;
}; 