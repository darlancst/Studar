import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export async function POST(req: Request) {
  try {
    const body: SignupRequest = await req.json();
    const { email, password, name } = body;

    // Validações básicas
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }),
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: 'Serviço de autenticação indisponível (Banco de dados não configurado)' }),
        { status: 503 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Verificar se usuário já existe no Supabase
    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Email já está em uso' }),
        { status: 409 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gerar ID único para o usuário
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Salvar usuário no Supabase
    const user = {
      id: userId,
      email: emailLower,
      name: name || emailLower.split('@')[0],
      password_hash: hashedPassword,
      created_at: new Date().toISOString(),
    } as const;

    const { error: insertError } = await supabaseAdmin
      .from('app_users')
      .insert(user);
    if (insertError) throw insertError;

    // Gerar token JWT
    const token = jwt.sign(
      { userId, email: emailLower },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✅ Usuário criado: ${emailLower}`);

    return new Response(
      JSON.stringify({
        token,
        user: {
          id: userId,
          email: emailLower,
          name: user.name,
        },
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Erro no signup:', error);
    const errorMessage = error?.message || 'Erro ao criar conta';
    console.error('Detalhes:', errorMessage);
    return new Response(
      JSON.stringify({
        error: 'Erro ao criar conta',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { status: 500 }
    );
  }
}
