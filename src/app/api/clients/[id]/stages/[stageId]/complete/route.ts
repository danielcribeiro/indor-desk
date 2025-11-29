import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
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

    const { id: clientId, stageId } = await params;

    // Verificar se a etapa existe e está em andamento
    const { data: clientStage } = await supabase
      .from('client_stages')
      .select(`
        id, 
        status,
        stage:stages (
          id,
          name,
          order_index
        )
      `)
      .eq('client_id', clientId)
      .eq('stage_id', stageId)
      .single();

    if (!clientStage) {
      return NextResponse.json({ error: 'Etapa não encontrada para este cliente' }, { status: 404 });
    }

    if (clientStage.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Apenas etapas em andamento podem ser concluídas' },
        { status: 400 }
      );
    }

    // Verificar se todas as atividades foram concluídas
    const { data: allActivities } = await supabase
      .from('stage_activities')
      .select('id')
      .eq('stage_id', stageId);

    if (allActivities && allActivities.length > 0) {
      const { data: completedActivities } = await supabase
        .from('client_activities')
        .select('activity_id')
        .eq('client_id', clientId)
        .eq('is_completed', true)
        .in(
          'activity_id',
          allActivities.map((a) => a.id)
        );

      if (!completedActivities || completedActivities.length < allActivities.length) {
        return NextResponse.json(
          { error: 'Todas as atividades devem ser concluídas para finalizar a etapa' },
          { status: 400 }
        );
      }
    }

    // Verificar se existem pendências não resolvidas nesta etapa
    const { data: unresolvedTasks, error: tasksError } = await supabase
      .from('pending_tasks')
      .select('id')
      .eq('client_id', clientId)
      .eq('stage_id', stageId)
      .eq('status', 'pending');

    if (!tasksError && unresolvedTasks && unresolvedTasks.length > 0) {
      return NextResponse.json(
        { error: `Existem ${unresolvedTasks.length} pendência(s) não resolvida(s) nesta etapa` },
        { status: 400 }
      );
    }

    // Atualizar para concluído
    await supabase
      .from('client_stages')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: payload.userId,
      })
      .eq('id', clientStage.id);

    // Buscar nome do usuário para a nota
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', payload.userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageName = (clientStage.stage as any)?.name || 'Etapa';

    // Criar nota automática
    await supabase.from('notes').insert({
      client_id: clientId,
      stage_id: stageId,
      content: `Etapa "${stageName}" concluída por ${user?.name || 'usuário'}.`,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete stage error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

