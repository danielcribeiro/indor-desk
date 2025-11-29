export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';
import { z } from 'zod';

const createCustomFieldSchema = z.object({
  name: z.string().min(2).max(100),
  field_type: z.enum(['text', 'number', 'date', 'select', 'boolean']),
  options: z.array(z.string()).optional().nullable(),
  is_required: z.boolean().default(false),
  order_index: z.number().int().min(1).default(1),
});

// GET - Listar campos personalizados
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

    const { data: fields, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching custom fields:', error);
      return NextResponse.json({ error: 'Erro ao buscar campos' }, { status: 500 });
    }

    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Custom fields GET error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar campo personalizado (admin only)
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

    const validation = createCustomFieldSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: field, error } = await supabase
      .from('custom_fields')
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error('Error creating custom field:', error);
      return NextResponse.json({ error: 'Erro ao criar campo' }, { status: 500 });
    }

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    console.error('Custom fields POST error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
