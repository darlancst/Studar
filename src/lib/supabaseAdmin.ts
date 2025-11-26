import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = (() => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('⚠️ Supabase não configurado. Sincronização na nuvem desativada.');
    return null;
  }

  return createClient(url, key);
})();


