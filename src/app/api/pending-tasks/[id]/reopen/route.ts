export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || (await cookies()).get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Buscar a pendência
    const { data: task, error: taskError } = await supabase
      .from('pending_tasks')
      .select(`
        *,
        assigned_profile:profiles!pending_tasks_assigned_profile_id_fkey(id, name, is_system)
      `)
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Pendência não encontrada' }, { status: 404 });
    }

    if (task.status !== 'resolved') {
      return NextResponse.json({ error: 'A pendência não está resolvida' }, { status: 400 });
    }

    // Reabrir a pendência
    const { data: updatedTask, error: updateError } = await supabase
      .from('pending_tasks')
      .update({
        status: 'pending',
        resolved_at: null,
        resolved_by: null,
        resolution_note_id: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error reopening pending task:', updateError);
      return NextResponse.json({ error: 'Erro ao reabrir pendência' }, { status: 500 });
    }

    // Registrar nota automática
    await supabase.from('notes').insert({
      client_id: task.client_id,
      stage_id: task.stage_id,
      content: `Pendência reaberta: "${task.title}"`,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    // Verificar se a etapa está concluída e reabrir se necessário
    const { data: clientStage } = await supabase
      .from('client_stages')
      .select('*')
      .eq('client_id', task.client_id)
      .eq('stage_id', task.stage_id)
      .single();

    if (clientStage && clientStage.status === 'completed') {
      await supabase
        .from('client_stages')
        .update({
          status: 'in_progress',
          completed_at: null,
          completed_by: null,
        })
        .eq('id', clientStage.id);

      // Registrar nota sobre a reabertura da etapa
      await supabase.from('notes').insert({
        client_id: task.client_id,
        stage_id: task.stage_id,
        content: `Etapa reaberta automaticamente devido à reabertura de pendência.`,
        is_auto_generated: true,
        created_by: payload.userId,
      });
    }

    return NextResponse.json({
      message: 'Pendência reaberta com sucesso',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error reopening pending task:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

