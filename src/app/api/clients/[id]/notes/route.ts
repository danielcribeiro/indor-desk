import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

const createNoteSchema = z.object({
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  stage_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: notes, error } = await supabase
      .from('notes')
      .select(`
        *,
        user:users!notes_created_by_fkey(name),
        stage:stages(name),
        attachments(*)
      `)
      .eq('client_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { notes },
    });
  } catch (error) {
    console.error('List notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar notas' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    
    const validation = createNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        client_id: params.id,
        content: validation.data.content,
        stage_id: validation.data.stage_id || null,
        is_auto_generated: false,
        created_by: userId,
      })
      .select(`
        *,
        user:users!notes_created_by_fkey(name),
        stage:stages(name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { note },
      message: 'Nota adicionada com sucesso',
    });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao adicionar nota' },
      { status: 500 }
    );
  }
}

