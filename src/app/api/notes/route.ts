import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { createNoteSchema } from '@/lib/validators/note';

// GET - Listar notas (opcionalmente filtrar por cliente)
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

    let query = supabase
      .from('notes')
      .select(`
        id,
        content,
        is_auto_generated,
        created_at,
        client_id,
        stage_id,
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
      `)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Notes GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nota
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

    const validation = createNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verificar se o cliente existe
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validation.data.client_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Extrair campos de pendência
    const { creates_pending_task, pending_task_profile_id, ...noteData } = validation.data;

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        ...noteData,
        is_auto_generated: false,
        created_by: payload.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 });
    }

    // Se a nota gera uma pendência
    let pendingTask = null;
    if (creates_pending_task && noteData.stage_id) {
      // Criar título da pendência (primeiros 100 caracteres da nota)
      const title = noteData.content.substring(0, 100) + (noteData.content.length > 100 ? '...' : '');
      
      const { data: task, error: taskError } = await supabase
        .from('pending_tasks')
        .insert({
          client_id: noteData.client_id,
          stage_id: noteData.stage_id,
          note_id: note.id,
          assigned_profile_id: pending_task_profile_id || null,
          title,
          status: 'pending',
          created_by: payload.userId,
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating pending task:', taskError);
        // Não retornamos erro, pois a nota foi criada com sucesso
      } else {
        pendingTask = task;
      }
    }

    return NextResponse.json({ note, pendingTask }, { status: 201 });
  } catch (error) {
    console.error('Notes POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

