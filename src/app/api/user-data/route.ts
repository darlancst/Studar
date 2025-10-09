import { kv } from '@vercel/kv';

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
    const data = await kv.get<UserData>(`user:${userId}`);
    return new Response(JSON.stringify({ data: data || null }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'KV read error' }), { status: 500 });
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
    await kv.set(`user:${userId}`, payload);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'KV write error' }), { status: 500 });
  }
}


