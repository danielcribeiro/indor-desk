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

    if (clientStage.status === 'not_started') {
      return NextResponse.json(
        { error: 'Esta etapa já está pendente' },
        { status: 400 }
      );
    }

    // Buscar nome do usuário para a nota
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', payload.userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageName = (clientStage.stage as any)?.name || 'Etapa';

    // Se etapa está concluída, reverter para em andamento
    if (clientStage.status === 'completed') {
      await supabase
        .from('client_stages')
        .update({
          status: 'in_progress',
          completed_at: null,
          completed_by: null,
        })
        .eq('id', clientStage.id);

      // Criar nota automática
      await supabase.from('notes').insert({
        client_id: clientId,
        stage_id: stageId,
        content: `Etapa "${stageName}" reaberta (revertida de concluída para em andamento) por ${user?.name || 'usuário'}.`,
        is_auto_generated: true,
        created_by: payload.userId,
      });

      return NextResponse.json({ success: true, newStatus: 'in_progress' });
    }

    // Se etapa está em andamento, verificar se pode reverter para pendente
    // Verificar se há atividades marcadas
    const { data: activities } = await supabase
      .from('stage_activities')
      .select('id')
      .eq('stage_id', stageId);

    if (activities && activities.length > 0) {
      const activityIds = activities.map(a => a.id);
      
      const { data: completedActivities } = await supabase
        .from('client_activities')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_completed', true)
        .in('activity_id', activityIds);

      if (completedActivities && completedActivities.length > 0) {
        return NextResponse.json(
          { error: 'Desmarque todas as atividades antes de reverter a etapa para pendente' },
          { status: 400 }
        );
      }
    }

    // Reverter para pendente
    await supabase
      .from('client_stages')
      .update({
        status: 'not_started',
        started_at: null,
        started_by: null,
        completed_at: null,
        completed_by: null,
      })
      .eq('id', clientStage.id);

    // Criar nota automática
    await supabase.from('notes').insert({
      client_id: clientId,
      stage_id: stageId,
      content: `Etapa "${stageName}" revertida para pendente por ${user?.name || 'usuário'}.`,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revert stage error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

