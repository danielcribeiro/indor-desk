export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { createClientSchema } from '@/lib/validators/client';

// GET - Listar clientes
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const stageId = searchParams.get('stage_id');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_stages (
          id,
          status,
          started_at,
          completed_at,
          stage:stages (
            id,
            name,
            order_index
          )
        )
      `, { count: 'exact' });

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,guardian_name.ilike.%${search}%,guardian_phone.ilike.%${search}%`);
    }

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: clients, error, count } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
    }

    // Processar para incluir a etapa atual
    let processedClients = clients?.map((client) => {
      const stages = client.client_stages || [];
      const activeStage = stages.find((s: { status: string }) => s.status === 'in_progress');
      const lastCompletedStage = stages
        .filter((s: { status: string }) => s.status === 'completed')
        .sort((a: { stage: { order_index: number } }, b: { stage: { order_index: number } }) =>
          b.stage.order_index - a.stage.order_index
        )[0];

      return {
        ...client,
        currentStage: activeStage?.stage || lastCompletedStage?.stage || null,
        currentStageStatus: activeStage?.status || lastCompletedStage?.status || 'not_started',
      };
    });

    // Filtrar por etapa se especificado
    if (stageId) {
      processedClients = processedClients?.filter((client) =>
        client.currentStage?.id === stageId
      );
    }

    // Filtrar por status se especificado
    if (status) {
      processedClients = processedClients?.filter((client) =>
        client.currentStageStatus === status
      );
    }

    // Recalcular total após filtros
    const filteredCount = (stageId || status) ? processedClients?.length || 0 : count || 0;

    return NextResponse.json({
      clients: processedClients,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / limit),
      },
    });
  } catch (error) {
    console.error('Clients GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar cliente
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

    const body = await request.json();

    // Validar dados
    const validation = createClientSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Criar cliente
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        ...validation.data,
        guardian_email: validation.data.guardian_email || null,
        created_by: payload.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
    }

    // Buscar primeira etapa para iniciar automaticamente
    const { data: firstStage } = await supabase
      .from('stages')
      .select('id')
      .eq('is_active', true)
      .order('order_index')
      .limit(1)
      .single();

    if (firstStage) {
      // Iniciar cliente na primeira etapa
      await supabase.from('client_stages').insert({
        client_id: client.id,
        stage_id: firstStage.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        started_by: payload.userId,
      });

      // Criar nota automática
      await supabase.from('notes').insert({
        client_id: client.id,
        stage_id: firstStage.id,
        content: `Cliente cadastrado e iniciado na primeira etapa.`,
        is_auto_generated: true,
        created_by: payload.userId,
      });
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Clients POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
