export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const { id: clientId, activityId } = params;
    const body = await request.json();
    const { is_completed } = body;

    // Get activity info
    const { data: activity } = await supabase
      .from('stage_activities')
      .select('name, stage_id, stage:stages(name)')
      .eq('id', activityId)
      .single();

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('client_activities')
      .update({
        is_completed,
        completed_at: is_completed ? now : null,
        completed_by: is_completed ? userId : null,
      })
      .eq('client_id', clientId)
      .eq('activity_id', activityId);

    if (error) throw error;

    // Create auto note when completing
    if (is_completed) {
      await supabase.from('notes').insert({
        client_id: clientId,
        stage_id: activity.stage_id,
        content: `Atividade "${activity.name}" concluída por ${userName}`,
        is_auto_generated: true,
        created_by: userId,
      });
    }

    return NextResponse.json({
      success: true,
      message: is_completed ? 'Atividade concluída' : 'Atividade desmarcada',
    });
  } catch (error) {
    console.error('Update activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar atividade' },
      { status: 500 }
    );
  }
}

