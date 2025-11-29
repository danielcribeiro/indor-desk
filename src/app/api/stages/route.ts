export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { createStageSchema } from '@/lib/validators/stage';

// GET - Listar etapas
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
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const { data: stages, error } = await supabase
      .from('stages')
      .select(`
        *,
        stage_activities (
          id,
          name,
          description,
          order_index,
          is_required
        )
      `)
      .order('order_index');

    if (error) {
      console.error('Error fetching stages:', error);
      return NextResponse.json({ error: 'Erro ao buscar etapas' }, { status: 500 });
    }

    // Filtrar etapas ativas se necessário
    const filteredStages = includeInactive 
      ? stages 
      : stages?.filter(s => s.is_active !== false) || [];
    

    // Ordenar atividades por order_index
    const processedStages = filteredStages.map((stage) => ({
      ...stage,
      stage_activities: stage.stage_activities?.sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
      ) || [],
    }));

    return NextResponse.json({ stages: processedStages });
  } catch (error) {
    console.error('Stages GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar etapa (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const validation = createStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: stage, error } = await supabase
      .from('stages')
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error('Error creating stage:', error);
      return NextResponse.json({ error: 'Erro ao criar etapa' }, { status: 500 });
    }

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error('Stages POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
