import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('include_count') === 'true';

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      // Se a tabela não existe, retornar array vazio
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ profiles: [] });
      }
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ profiles: [] });
    }

    // Se precisa incluir a contagem de usuários
    let profilesWithCount = profiles || [];
    if (includeCount && profiles) {
      const { data: users } = await supabase
        .from('users')
        .select('profile_id');
      
      profilesWithCount = profiles.map(profile => ({
        ...profile,
        is_system: profile.is_system || false,
        user_count: users?.filter(u => u.profile_id === profile.id).length || 0,
      }));
    }

    return NextResponse.json({ profiles: profilesWithCount });
  } catch (error) {
    console.error('Profiles GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = profileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verificar se o nome já existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', validation.data.name)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Já existe um perfil com este nome' },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        name: validation.data.name,
        description: validation.data.description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      // Verificar se a tabela não existe
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'A tabela de perfis não existe. Execute a migração 003_add_profiles.sql no Supabase.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Erro ao criar perfil: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

