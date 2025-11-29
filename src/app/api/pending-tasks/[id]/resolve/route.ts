import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const resolveTaskSchema = z.object({
  resolution_note: z.string().min(1, 'A nota de resolução é obrigatória'),
});

// POST - Resolver pendência
export async function POST(
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
    const body = await request.json();

    const validation = resolveTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Buscar a pendência
    const { data: task, error: taskError } = await supabase
      .from('pending_tasks')
      .select('*, stage:stages(id, name), assigned_profile:profiles(id, name)')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Pendência não encontrada' }, { status: 404 });
    }

    if (task.status === 'resolved') {
      return NextResponse.json({ error: 'Pendência já foi resolvida' }, { status: 400 });
    }

    // Verificar se o usuário tem permissão para resolver esta pendência
    if (task.assigned_profile_id) {
      // Buscar o perfil do usuário logado
      const { data: user } = await supabase
        .from('users')
        .select('profile_id, role')
        .eq('id', payload.userId)
        .single();

      // Administradores podem resolver qualquer pendência
      const isAdmin = user?.role === 'admin';
      const hasRequiredProfile = user?.profile_id === task.assigned_profile_id;

      if (!isAdmin && !hasRequiredProfile) {
        const profileName = (task.assigned_profile as { name: string })?.name || 'especificado';
        return NextResponse.json(
          { error: `Apenas usuários com perfil "${profileName}" podem resolver esta pendência` },
          { status: 403 }
        );
      }
    }

    // Criar nota de resolução
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        client_id: task.client_id,
        stage_id: task.stage_id,
        content: `[Resolução de Pendência] ${validation.data.resolution_note}`,
        is_auto_generated: false,
        created_by: payload.userId,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating resolution note:', noteError);
      return NextResponse.json({ error: 'Erro ao criar nota de resolução' }, { status: 500 });
    }

    // Atualizar a pendência como resolvida
    const { data: updatedTask, error: updateError } = await supabase
      .from('pending_tasks')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: payload.userId,
        resolution_note_id: note.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pending task:', updateError);
      return NextResponse.json({ error: 'Erro ao resolver pendência' }, { status: 500 });
    }

    return NextResponse.json({ 
      task: updatedTask, 
      note,
      message: 'Pendência resolvida com sucesso!'
    });
  } catch (error) {
    console.error('Resolve pending task error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

