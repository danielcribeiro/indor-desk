export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { updateClientSchema } from '@/lib/validators/client';

// GET - Obter cliente específico
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

    // Buscar cliente com todas as informações relacionadas
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_stages (
          id,
          status,
          started_at,
          completed_at,
          started_by,
          completed_by,
          stage:stages (
            id,
            name,
            description,
            order_index
          )
        ),
        notes (
          id,
          content,
          is_auto_generated,
          created_at,
          activity_id,
          stage:stages (
            id,
            name
          ),
          created_by_user:users!notes_created_by_fkey (
            id,
            name
          ),
          attachments (
            id,
            file_name,
            file_path,
            file_type,
            file_size
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
      }
      console.error('Error fetching client:', error);
      return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
    }

    // Buscar todas as etapas para montar o roadmap completo
    const { data: allStages, error: stagesError } = await supabase
      .from('stages')
      .select(`
        id,
        name,
        description,
        order_index,
        is_active,
        stage_activities (
          id,
          name,
          description,
          order_index,
          is_required
        )
      `)
      .order('order_index');


    // Filtrar etapas ativas (ou todas se o campo não existir)
    const activeStages = allStages?.filter(stage => stage.is_active !== false) || [];

    // Buscar atividades completadas do cliente
    const { data: clientActivities } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', id);

    // Buscar pendências do cliente
    const { data: pendingTasks } = await supabase
      .from('pending_tasks')
      .select(`
        id,
        title,
        status,
        stage_id,
        created_at,
        resolved_at,
        resolution_note_id,
        assigned_profile:profiles!pending_tasks_assigned_profile_id_fkey (
          id,
          name
        ),
        created_by_user:users!pending_tasks_created_by_fkey (
          id,
          name
        ),
        resolved_by_user:users!pending_tasks_resolved_by_fkey (
          id,
          name
        ),
        resolution_note:notes!pending_tasks_resolution_note_id_fkey (
          content
        )
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: true });

    // Processar e ordenar notas (mais recentes primeiro)
    const processedNotes = (client.notes || [])
      .map((note: Record<string, unknown>) => ({
        ...note,
        activity_id: note.activity_id ?? null,
      }))
      .sort((a: { created_at: string }, b: { created_at: string }) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    // Montar roadmap
    const roadmap = activeStages.map((stage) => {
      const clientStage = client.client_stages?.find(
        (cs: { stage: { id: string } }) => cs.stage.id === stage.id
      );

      const stageActivities = stage.stage_activities || [];
      const activities = stageActivities
        .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((activity: { id: string; name: string; description: string; order_index: number; is_required: boolean }) => {
          const clientActivity = clientActivities?.find(
            (ca) => ca.activity_id === activity.id
          );
          return {
            ...activity,
            requires_note: false,
            allowed_profiles: [],
            isCompleted: clientActivity?.is_completed || false,
            completedAt: clientActivity?.completed_at,
            completedBy: clientActivity?.completed_by,
          };
        });

      // Filtrar pendências desta etapa
      const stagePendingTasks = (pendingTasks || []).filter(
        (task: { stage_id: string }) => task.stage_id === stage.id
      );

      return {
        ...stage,
        status: clientStage?.status || 'not_started',
        startedAt: clientStage?.started_at,
        completedAt: clientStage?.completed_at,
        activities,
        pendingTasks: stagePendingTasks,
      };
    });

    return NextResponse.json({
      client: {
        ...client,
        notes: processedNotes,
        roadmap,
      },
    });
  } catch (error) {
    console.error('Client GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar cliente
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
    const body = await request.json();

    const validation = updateClientSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir cliente
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

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client DELETE error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
