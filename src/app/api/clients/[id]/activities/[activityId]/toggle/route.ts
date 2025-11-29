export const dynamic = "force-dynamic";
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

    // Obter corpo da requisição (pode ter nota)
    let noteContent: string | null = null;
    try {
      const body = await request.json();
      noteContent = body.note_content || null;
    } catch {
      // Corpo vazio ou inválido, continuar sem nota
    }

    // Verificar se a atividade existe
    const { data: activity, error: activityError } = await supabase
      .from('stage_activities')
      .select(`
        id, 
        name,
        allowed_profiles,
        stage:stages (
          id,
          name
        )
      `)
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      console.error('Error fetching activity:', activityError);
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

    if (!clientStage) {
      return NextResponse.json(
        { error: 'Etapa não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe registro da atividade para saber se é um uncheck
    const { data: existingActivity } = await supabase
      .from('client_activities')
      .select('id, is_completed')
      .eq('client_id', clientId)
      .eq('activity_id', activityId)
      .single();

    const isUnchecking = existingActivity?.is_completed;

    // Se a etapa estiver concluída, só permite se for para desmarcar (reabrir)
    if (clientStage.status === 'completed' && !isUnchecking) {
      return NextResponse.json(
        { error: 'A etapa está concluída. Reabra a etapa para fazer alterações.' },
        { status: 400 }
      );
    }

    // Se a etapa não estiver em andamento nem concluída (ex: não iniciada), erro
    if (clientStage.status !== 'in_progress' && clientStage.status !== 'completed') {
      return NextResponse.json(
        { error: 'A etapa precisa estar em andamento para alterar atividades' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem permissão (se houver perfis configurados)
    if (activity.allowed_profiles && activity.allowed_profiles.length > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('profile_id, role')
        .eq('id', payload.userId)
        .single();

      // Admin sempre pode
      if (user?.role !== 'admin') {
        const userProfileId = user?.profile_id;
        if (!userProfileId || !activity.allowed_profiles.includes(userProfileId)) {
          // Buscar nomes dos perfis permitidos
          const { data: allowedProfiles } = await supabase
            .from('profiles')
            .select('name')
            .in('id', activity.allowed_profiles);

          const profileNames = allowedProfiles?.map(p => p.name).join(', ') || 'perfis específicos';

          return NextResponse.json(
            { error: `Apenas usuários com os perfis "${profileNames}" podem realizar esta atividade` },
            { status: 403 }
          );
        }
      }
    }

    // Verificar se já existe registro da atividade (já buscado anteriormente)
    // const { data: existingActivity } = ... (removido pois já temos a variável)

    // Buscar nome do usuário para a nota
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', payload.userId)
      .single();

    let newStatus: boolean;
    let autoNoteContent: string;

    if (existingActivity) {
      // Toggle do status
      newStatus = !existingActivity.is_completed;

      await supabase
        .from('client_activities')
        .update({
          is_completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
          completed_by: newStatus ? payload.userId : null,
        })
        .eq('id', existingActivity.id);

      autoNoteContent = newStatus
        ? `Atividade "${activity.name}" concluída por ${user?.name || 'usuário'}.`
        : `Atividade "${activity.name}" desmarcada por ${user?.name || 'usuário'}.`;

      // Se desmarcou uma atividade e a etapa estava concluída, reabrir a etapa
      if (!newStatus && clientStage.status === 'completed') {
        await supabase
          .from('client_stages')
          .update({
            status: 'in_progress',
            completed_at: null,
            completed_by: null,
          })
          .eq('id', clientStage.id);

        autoNoteContent += `\nEtapa reaberta automaticamente.`;
      }
    } else {
      // Criar novo registro como concluído
      newStatus = true;

      await supabase.from('client_activities').insert({
        client_id: clientId,
        activity_id: activityId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: payload.userId,
      });

      autoNoteContent = `Atividade "${activity.name}" concluída por ${user?.name || 'usuário'}.`;
    }

    // Se foi fornecida uma nota vinculada à atividade, adicionar ao conteúdo
    if (noteContent && newStatus) {
      autoNoteContent += `\n\nObservação: ${noteContent}`;
    }

    // Criar nota automática
    await supabase.from('notes').insert({
      client_id: clientId,
      stage_id: stageId,
      content: autoNoteContent,
      is_auto_generated: true,
      created_by: payload.userId,
    });

    return NextResponse.json({
      success: true,
      is_completed: newStatus
    });
  } catch (error) {
    console.error('Toggle activity error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

