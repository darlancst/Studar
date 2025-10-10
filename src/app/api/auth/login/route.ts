import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(req: Request) {
  try {
    // Verificar variáveis de ambiente
    if (!process.env.REDIS_URL && !process.env.KV_REST_API_URL) {
      console.error('❌ REDIS_URL não configurada');
      return new Response(
        JSON.stringify({ error: 'Banco de dados não configurado' }),
        { status: 500 }
      );
    }

    const body: LoginRequest = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Buscar usuário no Supabase
    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .eq('email', emailLower)
      .maybeSingle();
    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401 }
      );
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✅ Login bem-sucedido: ${emailLower}`);

    return new Response(
      JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Erro no login:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao fazer login' }),
      { status: 500 }
    );
  }
}

