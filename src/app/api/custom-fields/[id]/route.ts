import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const updateCustomFieldSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  field_type: z.enum(['text', 'number', 'date', 'select', 'boolean']).optional(),
  options: z.array(z.string()).optional().nullable(),
  is_required: z.boolean().optional(),
  order_index: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

// GET - Obter campo específico
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

    const { data: field, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campo não encontrado' }, { status: 404 });
      }
      console.error('Error fetching custom field:', error);
      return NextResponse.json({ error: 'Erro ao buscar campo' }, { status: 500 });
    }

    return NextResponse.json({ field });
  } catch (error) {
    console.error('Custom field GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar campo (admin only)
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

    const validation = updateCustomFieldSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: field, error } = await supabase
      .from('custom_fields')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom field:', error);
      return NextResponse.json({ error: 'Erro ao atualizar campo' }, { status: 500 });
    }

    return NextResponse.json({ field });
  } catch (error) {
    console.error('Custom field PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir campo (admin only)
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

    // Soft delete - apenas desativar
    const { error } = await supabase
      .from('custom_fields')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting custom field:', error);
      return NextResponse.json({ error: 'Erro ao excluir campo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Custom field DELETE error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
