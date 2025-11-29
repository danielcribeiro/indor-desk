export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

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

    // Total de clientes
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // Clientes por etapa (apenas etapa vigente de cada cliente)
    const { data: stages } = await supabase
      .from('stages')
      .select('id, name, order_index')
      .eq('is_active', true)
      .order('order_index');

    // Buscar todos os clientes com suas etapas
    const { data: allClients } = await supabase
      .from('clients')
      .select(`
        id,
        client_stages (
          stage_id,
          status,
          stage:stages (
            order_index
          )
        )
      `);

    // Para cada cliente, determinar a etapa vigente (atual)
    const clientCurrentStages = new Map<string, string>();

    allClients?.forEach((client) => {
      const clientStages = client.client_stages || [];

      // Primeiro, procurar uma etapa em andamento
      const inProgressStage = clientStages.find(
        (cs: { status: string }) => cs.status === 'in_progress'
      );

      if (inProgressStage) {
        clientCurrentStages.set(client.id, inProgressStage.stage_id);
      } else {
        // Se não tem em andamento, pegar a última etapa completada (maior order_index)
        const completedStages = clientStages
          .filter((cs: { status: string }) => cs.status === 'completed')
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const stageA = a.stage as { order_index: number }[] | { order_index: number };
            const stageB = b.stage as { order_index: number }[] | { order_index: number };
            const orderA = Array.isArray(stageA) ? stageA[0]?.order_index : stageA?.order_index;
            const orderB = Array.isArray(stageB) ? stageB[0]?.order_index : stageB?.order_index;
            return (orderB || 0) - (orderA || 0);
          });

        if (completedStages.length > 0) {
          clientCurrentStages.set(client.id, completedStages[0].stage_id as string);
        }
      }
    });

    // Contar clientes por etapa vigente
    const clientsByStage = [];

    if (stages) {
      for (const stage of stages) {
        let count = 0;
        clientCurrentStages.forEach((stageId) => {
          if (stageId === stage.id) {
            count++;
          }
        });

        clientsByStage.push({
          stageId: stage.id,
          stage: stage.name,
          count: count,
        });
      }
    }

    // Concluídos este mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: completedThisMonth } = await supabase
      .from('client_stages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth.toISOString());

    // Em andamento
    const { count: inProgress } = await supabase
      .from('client_stages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // Clientes recentes
    const { data: recentClientsData } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        updated_at,
        client_stages (
          status,
          stage:stages (
            name
          )
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(5);

    const recentClients = recentClientsData?.map((client) => {
      const activeStage = client.client_stages?.find(
        (cs: { status: string }) => cs.status === 'in_progress'
      );
      const lastStage = client.client_stages?.[client.client_stages.length - 1];
      const stageInfo = activeStage || lastStage;

      return {
        id: client.id,
        name: client.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentStage: (stageInfo?.stage as any)?.name || 'Sem etapa',
        status: stageInfo?.status || 'not_started',
        updatedAt: client.updated_at,
      };
    }) || [];

    return NextResponse.json({
      totalClients: totalClients || 0,
      clientsByStage,
      completedThisMonth: completedThisMonth || 0,
      inProgress: inProgress || 0,
      recentClients,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
