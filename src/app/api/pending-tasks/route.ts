import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const createPendingTaskSchema = z.object({
  client_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  note_id: z.string().uuid(),
  assigned_profile_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
});

// GET - Listar pendências (opcionalmente filtrar por cliente ou etapa)
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
    const clientId = searchParams.get('client_id');
    const stageId = searchParams.get('stage_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('pending_tasks')
      .select(`
        id,
        title,
        status,
        created_at,
        resolved_at,
        client_id,
        stage_id,
        note_id,
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
        origin_note:notes!pending_tasks_note_id_fkey (
          id,
          content
        )
      `)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (stageId) {
      query = query.eq('stage_id', stageId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching pending tasks:', error);
      return NextResponse.json({ error: 'Erro ao buscar pendências' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Pending tasks GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar pendência
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

    const validation = createPendingTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: task, error } = await supabase
      .from('pending_tasks')
      .insert({
        ...validation.data,
        status: 'pending',
        created_by: payload.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pending task:', error);
      return NextResponse.json({ error: 'Erro ao criar pendência' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Pending tasks POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

