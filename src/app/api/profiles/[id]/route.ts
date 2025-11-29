import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

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

    // Verificar se é admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', payload.userId)
      .single();

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verificar se o perfil existe e se é do sistema
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, is_system')
      .eq('id', id)
      .single();

    if (!existingProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    // Não permitir alterar perfil do sistema
    if (existingProfile.is_system) {
      return NextResponse.json(
        { error: 'Não é permitido alterar um perfil do sistema' },
        { status: 403 }
      );
    }

    // Se estiver atualizando o nome, verificar duplicatas
    if (validation.data.name) {
      const { data: duplicateName } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', validation.data.name)
        .neq('id', id)
        .single();

      if (duplicateName) {
        return NextResponse.json(
          { error: 'Já existe um perfil com este nome' },
          { status: 400 }
        );
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

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
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', payload.userId)
      .single();

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se é perfil do sistema
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_system')
      .eq('id', id)
      .single();

    if (profile?.is_system) {
      return NextResponse.json(
        { error: 'Não é permitido excluir um perfil do sistema' },
        { status: 403 }
      );
    }

    // Verificar se há usuários usando este perfil
    const { data: usersWithProfile } = await supabase
      .from('users')
      .select('id')
      .eq('profile_id', id);

    if (usersWithProfile && usersWithProfile.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um perfil que está sendo usado por usuários' },
        { status: 400 }
      );
    }

    // Soft delete (desativar)
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting profile:', error);
      return NextResponse.json({ error: 'Erro ao excluir perfil' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

