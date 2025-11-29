import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

const createActivitySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  order_index: z.number().optional(),
  is_required: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: activities, error } = await supabase
      .from('stage_activities')
      .select('*')
      .eq('stage_id', params.id)
      .order('order_index');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { activities },
    });
  } catch (error) {
    console.error('List activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar atividades' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get max order_index for this stage
    const { data: maxOrder } = await supabase
      .from('stage_activities')
      .select('order_index')
      .eq('stage_id', params.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const orderIndex = validation.data.order_index ?? (maxOrder?.order_index || 0) + 1;

    const { data: activity, error } = await supabase
      .from('stage_activities')
      .insert({
        ...validation.data,
        stage_id: params.id,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { activity },
      message: 'Atividade criada com sucesso',
    });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar atividade' },
      { status: 500 }
    );
  }
}

