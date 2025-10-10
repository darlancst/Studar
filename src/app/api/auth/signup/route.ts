import { kv } from '@vercel/kv';
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
    // Verificar variáveis de ambiente
    if (!process.env.REDIS_URL && !process.env.KV_REST_API_URL) {
      console.error('❌ REDIS_URL não configurada');
      return new Response(
        JSON.stringify({ error: 'Banco de dados não configurado. Configure REDIS_URL no Vercel.' }),
        { status: 500 }
      );
    }

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

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Verificar se usuário já existe
    const existingUser = await kv.get(`user:email:${emailLower}`);
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

    // Salvar usuário no KV
    const user = {
      id: userId,
      email: emailLower,
      name: name || emailLower.split('@')[0],
      passwordHash: hashedPassword,
      createdAt: Date.now(),
    };

    // Salvar em duas chaves: por ID e por email
    await kv.set(`user:${userId}`, user);
    await kv.set(`user:email:${emailLower}`, userId);

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

