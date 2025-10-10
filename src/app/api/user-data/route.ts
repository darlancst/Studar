import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Minimal interface to keep route independent from client code
interface UserData {
  subjects: any[];
  topics: any[];
  reviews: any[];
  pomodoroSessions: any[];
  simulados: any[];
  settings: any;
  lastSync: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return new Response(JSON.stringify({ data: data ? data.payload : null }), { status: 200 });
  } catch (error: any) {
    console.error('❌ Supabase GET error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'DB read error' }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId: string | undefined = body?.userId;
    const data: UserData | undefined = body?.data;
    if (!userId || !data) {
      return new Response(JSON.stringify({ error: 'Missing userId or data' }), { status: 400 });
    }

    const payload: UserData = { ...data, lastSync: Date.now() };
    const { error } = await supabaseAdmin
      .from('user_data')
      .upsert({ user_id: userId, payload }, { onConflict: 'user_id' });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: any) {
    console.error('❌ Supabase SET error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'DB write error' }), { status: 500 });
  }
}


