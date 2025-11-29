export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { updateUserSchema } from '@/lib/validators/auth';

// GET - Obter usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    // Apenas admin pode ver outros usuários
    if (payload.role !== 'admin' && payload.userId !== id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, phone, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    // Apenas admin pode editar outros usuários
    if (payload.role !== 'admin' && payload.userId !== id) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const body = await request.json();

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Preparar dados de atualização
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validation.data.name) updateData.name = validation.data.name;
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone;
    
    // Apenas admin pode alterar role e is_active
    if (payload.role === 'admin') {
      if (validation.data.role) updateData.role = validation.data.role;
      if (validation.data.is_active !== undefined) updateData.is_active = validation.data.is_active;
    }

    // Se alterar senha, fazer hash
    if (validation.data.password) {
      updateData.password_hash = await hashPassword(validation.data.password);
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, phone, role, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir usuário (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Não pode deletar a si mesmo
    if (payload.userId === id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    // Soft delete - apenas desativar
    const { error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
