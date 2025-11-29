export const dynamic = "force-dynamic";
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

    // Verificar se a etapa existe
    const { data: stage } = await supabase
      .from('stages')
      .select('id, name, order_index')
      .eq('id', stageId)
      .single();

    if (!stage) {
      return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });
    }

    // Verificar se a etapa anterior foi iniciada
    if (stage.order_index > 1) {
      const { data: prevStage } = await supabase
        .from('stages')
        .select('id')
        .eq('order_index', stage.order_index - 1)
        .single();

      if (prevStage) {
        const { data: prevClientStage } = await supabase
          .from('client_stages')
          .select('id, status')
          .eq('client_id', clientId)
          .eq('stage_id', prevStage.id)
          .single();

        if (!prevClientStage || prevClientStage.status === 'not_started') {
          return NextResponse.json(
            { error: 'Não é possível iniciar esta etapa sem iniciar a anterior' },
            { status: 400 }
          );
        }
      }
    }

    // Verificar se já existe registro
    const { data: existingClientStage } = await supabase
      .from('client_stages')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('stage_id', stageId)
      .single();

    if (existingClientStage) {
      if (existingClientStage.status !== 'not_started') {
        return NextResponse.json(
          { error: 'Esta etapa já foi iniciada' },
          { status: 400 }
        );
      }

      // Atualizar para em andamento
      await supabase
        .from('client_stages')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          started_by: payload.userId,
        })
        .eq('id', existingClientStage.id);
    } else {
      // Criar novo registro
      await supabase.from('client_stages').insert({
        client_id: clientId,
        stage_id: stageId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        started_by: payload.userId,
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
      content: `Etapa "${stage.name}" iniciada por ${user?.name || 'usuário'}.`,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start stage error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

