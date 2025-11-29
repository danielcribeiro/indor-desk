/**
 * INDOR Desk - Database Seed Script
 * 
 * Este script cria os dados iniciais do sistema:
 * - Usuário administrador (admin / admin@123)
 * - 6 Etapas do processo de avaliação
 * - Atividades de cada etapa
 * 
 * Execute com: npm run db:seed
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Carregar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    // ============================================
    // 1. Criar usuário admin
    // ============================================
    console.log('👤 Criando usuário administrador...');
    
    const passwordHash = await bcrypt.hash('admin@123', 12);
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (!existingUser) {
      const { error: userError } = await supabase.from('users').insert({
        username: 'admin',
        password_hash: passwordHash,
        name: 'Administrador',
        role: 'admin',
        is_active: true,
      });

      if (userError) throw userError;
      console.log('   ✅ Usuário admin criado');
    } else {
      console.log('   ⏭️  Usuário admin já existe');
    }

    // ============================================
    // 2. Criar etapas
    // ============================================
    console.log('\n📋 Criando etapas do processo...');

    const stages = [
      {
        name: 'Atendimento Inicial e Esclarecimento de Dúvidas',
        description: 'Primeiro contato com a família para entender as necessidades e esclarecer o processo de avaliação.',
        objective: 'Realizar o acolhimento inicial da família, coletar informações preliminares e esclarecer dúvidas sobre o processo.',
        prerequisites: 'Nenhum pré-requisito.',
        order_index: 1,
      },
      {
        name: 'Marcação da Avaliação',
        description: 'Agendamento das sessões de avaliação com a família.',
        objective: 'Definir datas e horários para as sessões de avaliação.',
        prerequisites: 'Atendimento inicial realizado.',
        order_index: 2,
      },
      {
        name: 'Preparação da Documentação',
        description: 'Coleta e organização de toda documentação necessária para a avaliação.',
        objective: 'Reunir todos os documentos, laudos anteriores e relatórios escolares.',
        prerequisites: 'Avaliação agendada.',
        order_index: 3,
      },
      {
        name: 'Execução da Avaliação',
        description: 'Realização das sessões de avaliação com a criança.',
        objective: 'Aplicar os testes e avaliações necessárias.',
        prerequisites: 'Documentação preparada e organizada.',
        order_index: 4,
      },
      {
        name: 'Análise de Resultados',
        description: 'Análise dos dados coletados e elaboração do laudo.',
        objective: 'Processar os resultados e elaborar o relatório técnico.',
        prerequisites: 'Todas as sessões de avaliação concluídas.',
        order_index: 5,
      },
      {
        name: 'Devolutiva e Entrega',
        description: 'Apresentação dos resultados à família e entrega do laudo final.',
        objective: 'Realizar a devolutiva e entregar o laudo oficial.',
        prerequisites: 'Laudo elaborado e revisado.',
        order_index: 6,
      },
    ];

    const stageIds: string[] = [];

    for (const stage of stages) {
      const { data: existing } = await supabase
        .from('stages')
        .select('id')
        .eq('order_index', stage.order_index)
        .single();

      if (existing) {
        stageIds.push(existing.id);
        console.log(`   ⏭️  Etapa ${stage.order_index} já existe`);
      } else {
        const { data, error } = await supabase
          .from('stages')
          .insert(stage)
          .select('id')
          .single();

        if (error) throw error;
        stageIds.push(data.id);
        console.log(`   ✅ Etapa ${stage.order_index}: ${stage.name}`);
      }
    }

    // ============================================
    // 3. Criar atividades
    // ============================================
    console.log('\n📝 Criando atividades das etapas...');

    const activitiesByStage = [
      // Etapa 1
      [
        { name: 'Receber contato inicial da família', description: 'Registrar o primeiro contato', order_index: 1, is_required: true },
        { name: 'Coletar dados básicos do responsável', description: 'Nome, telefone, email', order_index: 2, is_required: true },
        { name: 'Coletar dados básicos da criança', description: 'Nome, idade, escola', order_index: 3, is_required: true },
        { name: 'Identificar a demanda principal', description: 'Entender o motivo da busca pela avaliação', order_index: 4, is_required: true },
        { name: 'Esclarecer sobre o processo de avaliação', description: 'Explicar as etapas, tempo e investimento', order_index: 5, is_required: true },
        { name: 'Enviar material informativo', description: 'Enviar folder ou documento explicativo', order_index: 6, is_required: false },
      ],
      // Etapa 2
      [
        { name: 'Verificar disponibilidade de agenda', description: 'Consultar horários disponíveis', order_index: 1, is_required: true },
        { name: 'Confirmar disponibilidade da família', description: 'Validar datas e horários', order_index: 2, is_required: true },
        { name: 'Agendar sessões de avaliação', description: 'Registrar as datas no sistema', order_index: 3, is_required: true },
        { name: 'Enviar confirmação do agendamento', description: 'Enviar email ou mensagem', order_index: 4, is_required: true },
        { name: 'Solicitar documentação prévia', description: 'Informar documentos necessários', order_index: 5, is_required: true },
      ],
      // Etapa 3
      [
        { name: 'Receber documentos da família', description: 'Coletar todos os documentos', order_index: 1, is_required: true },
        { name: 'Solicitar relatórios escolares', description: 'Pedir relatórios da escola', order_index: 2, is_required: false },
        { name: 'Coletar laudos anteriores', description: 'Reunir avaliações prévias', order_index: 3, is_required: false },
        { name: 'Organizar prontuário do paciente', description: 'Criar dossiê com documentação', order_index: 4, is_required: true },
        { name: 'Preparar materiais de avaliação', description: 'Separar testes e materiais', order_index: 5, is_required: true },
      ],
      // Etapa 4
      [
        { name: 'Realizar anamnese com os responsáveis', description: 'Entrevista detalhada', order_index: 1, is_required: true },
        { name: 'Aplicar avaliação cognitiva', description: 'Testes de inteligência/cognição', order_index: 2, is_required: true },
        { name: 'Aplicar avaliação comportamental', description: 'Observação e testes comportamentais', order_index: 3, is_required: true },
        { name: 'Realizar observação clínica', description: 'Registrar observações das sessões', order_index: 4, is_required: true },
        { name: 'Coletar informações complementares', description: 'Contato com escola se necessário', order_index: 5, is_required: false },
        { name: 'Registrar todas as sessões', description: 'Documentar cada sessão', order_index: 6, is_required: true },
      ],
      // Etapa 5
      [
        { name: 'Corrigir testes aplicados', description: 'Correção dos instrumentos', order_index: 1, is_required: true },
        { name: 'Analisar resultados obtidos', description: 'Interpretar os dados', order_index: 2, is_required: true },
        { name: 'Elaborar hipótese diagnóstica', description: 'Formular conclusões', order_index: 3, is_required: true },
        { name: 'Redigir laudo/relatório', description: 'Escrever documento técnico', order_index: 4, is_required: true },
        { name: 'Revisar laudo', description: 'Fazer revisão do documento', order_index: 5, is_required: true },
        { name: 'Preparar material da devolutiva', description: 'Organizar apresentação', order_index: 6, is_required: true },
      ],
      // Etapa 6
      [
        { name: 'Agendar sessão de devolutiva', description: 'Marcar data para apresentação', order_index: 1, is_required: true },
        { name: 'Realizar devolutiva com a família', description: 'Apresentar os resultados', order_index: 2, is_required: true },
        { name: 'Esclarecer dúvidas dos responsáveis', description: 'Responder perguntas', order_index: 3, is_required: true },
        { name: 'Fornecer orientações', description: 'Dar encaminhamentos', order_index: 4, is_required: true },
        { name: 'Entregar laudo oficial', description: 'Entregar documento final', order_index: 5, is_required: true },
        { name: 'Registrar encerramento do caso', description: 'Finalizar no sistema', order_index: 6, is_required: true },
      ],
    ];

    for (let i = 0; i < stageIds.length; i++) {
      const stageId = stageIds[i];
      const activities = activitiesByStage[i];

      // Check if activities already exist
      const { count } = await supabase
        .from('stage_activities')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', stageId);

      if (count && count > 0) {
        console.log(`   ⏭️  Atividades da Etapa ${i + 1} já existem`);
        continue;
      }

      const activitiesWithStageId = activities.map(a => ({
        ...a,
        stage_id: stageId,
      }));

      const { error } = await supabase
        .from('stage_activities')
        .insert(activitiesWithStageId);

      if (error) throw error;
      console.log(`   ✅ ${activities.length} atividades criadas para Etapa ${i + 1}`);
    }

    console.log('\n✨ Seed concluído com sucesso!\n');
    console.log('📌 Credenciais do administrador:');
    console.log('   Usuário: admin');
    console.log('   Senha:   admin@123\n');

  } catch (error) {
    console.error('\n❌ Erro durante o seed:', error);
    process.exit(1);
  }
}

seed();

