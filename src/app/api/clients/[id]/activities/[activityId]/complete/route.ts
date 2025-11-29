import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> }
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

    const { id: clientId, activityId } = await params;

    // Verificar se a atividade existe
    const { data: activity } = await supabase
      .from('stage_activities')
      .select(`
        id, 
        name,
        stage:stages (
          id,
          name
        )
      `)
      .eq('id', activityId)
      .single();

    if (!activity) {
      return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageId = (activity.stage as any)?.id;

    // Verificar se a etapa está em andamento
    const { data: clientStage } = await supabase
      .from('client_stages')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('stage_id', stageId)
      .single();

    if (!clientStage || clientStage.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'A etapa precisa estar em andamento para concluir atividades' },
        { status: 400 }
      );
    }

    // Verificar se já existe registro da atividade
    const { data: existingActivity } = await supabase
      .from('client_activities')
      .select('id, is_completed')
      .eq('client_id', clientId)
      .eq('activity_id', activityId)
      .single();

    if (existingActivity) {
      if (existingActivity.is_completed) {
        return NextResponse.json(
          { error: 'Esta atividade já foi concluída' },
          { status: 400 }
        );
      }

      // Atualizar
      await supabase
        .from('client_activities')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: payload.userId,
        })
        .eq('id', existingActivity.id);
    } else {
      // Criar novo registro
      await supabase.from('client_activities').insert({
        client_id: clientId,
        activity_id: activityId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: payload.userId,
      });
    }

    // Buscar nome do usuário para a nota
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', payload.userId)
      .single();

    // Criar nota automática
    await supabase.from('notes').insert({
      client_id: clientId,
      stage_id: stageId,
      content: `Atividade "${activity.name}" concluída por ${user?.name || 'usuário'}.`,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete activity error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

