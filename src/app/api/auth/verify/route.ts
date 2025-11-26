import { supabaseAdmin } from '@/lib/supabaseAdmin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: 'Serviço de autenticação indisponível' }),
        { status: 503 }
      );
    }

    const token = authHeader.substring(7);

    // Verificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    // Buscar dados do usuário no Supabase
    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .eq('id', decoded.userId)
      .maybeSingle();
    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name },
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Erro na verificação:', error);
    return new Response(
      JSON.stringify({ error: 'Token inválido' }),
      { status: 401 }
    );
  }
}
