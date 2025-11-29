export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { createUserSchema } from '@/lib/validators/auth';

// GET - Listar usuários (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, name, phone, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar usuário (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const body = await request.json();

    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verificar se username já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', validation.data.username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este nome de usuário já está em uso' },
        { status: 400 }
      );
    }

    // Hash da senha
    const password_hash = await hashPassword(validation.data.password);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: validation.data.username,
        password_hash,
        name: validation.data.name,
        phone: validation.data.phone,
        role: validation.data.role,
      })
      .select('id, username, name, phone, role, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
