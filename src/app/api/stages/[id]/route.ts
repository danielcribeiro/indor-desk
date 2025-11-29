export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { updateStageSchema } from '@/lib/validators/stage';

// GET - Obter etapa específica
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

    const { data: stage, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });
      }
      console.error('Error fetching stage:', error);
      return NextResponse.json({ error: 'Erro ao buscar etapa' }, { status: 500 });
    }

    return NextResponse.json({ stage });
  } catch (error) {
    console.error('Stage GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar etapa (admin only)
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
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = updateStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: stage, error } = await supabase
      .from('stages')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stage:', error);
      return NextResponse.json({ error: 'Erro ao atualizar etapa' }, { status: 500 });
    }

    return NextResponse.json({ stage });
  } catch (error) {
    console.error('Stage PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir etapa (admin only)
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

    // Verificar se há clientes usando esta etapa
    const { count } = await supabase
      .from('client_stages')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir uma etapa que está sendo usada por clientes' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting stage:', error);
      return NextResponse.json({ error: 'Erro ao excluir etapa' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stage DELETE error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
