import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { createActivitySchema } from '@/lib/validators/stage';

// GET - Listar atividades (opcionalmente por etapa)
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
    const stageId = searchParams.get('stage_id');

    let query = supabase
      .from('stage_activities')
      .select(`
        *,
        stage:stages (
          id,
          name,
          order_index
        )
      `)
      .order('order_index');

    if (stageId) {
      query = query.eq('stage_id', stageId);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 });
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar atividade (admin only)
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

    const validation = createActivitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verificar se a etapa existe
    const { data: stage } = await supabase
      .from('stages')
      .select('id')
      .eq('id', validation.data.stage_id)
      .single();

    if (!stage) {
      return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });
    }

    const { data: activity, error } = await supabase
      .from('stage_activities')
      .insert({
        stage_id: validation.data.stage_id,
        name: validation.data.name,
        description: validation.data.description,
        order_index: validation.data.order_index,
        is_required: validation.data.is_required,
        allowed_profiles: body.allowed_profiles || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json({ error: 'Erro ao criar atividade' }, { status: 500 });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Activities POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

