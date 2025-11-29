-- =====================================================
-- INDOR Desk - Schema Completo
-- Sistema de Gestão para Clínica Infantil
-- Instituto Dra. Olzeni Ribeiro
-- =====================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: profiles (Perfis de usuário)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: users (Usuários do sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
    profile_id UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: stages (Etapas do processo)
-- =====================================================
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: stage_activities (Atividades de cada etapa)
-- =====================================================
CREATE TABLE IF NOT EXISTS stage_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    allowed_profiles UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: custom_fields (Campos personalizados)
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')),
    options TEXT[],
    is_required BOOLEAN DEFAULT false,
    order_index INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: clients (Clientes/Pacientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender VARCHAR(20),
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(100),
    address TEXT,
    google_drive_link VARCHAR(500),
    notes TEXT,
    custom_fields JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: client_stages (Progresso do cliente nas etapas)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id),
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    started_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    UNIQUE(client_id, stage_id)
);

-- =====================================================
-- TABELA: client_activities (Progresso das atividades)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES stage_activities(id),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    UNIQUE(client_id, activity_id)
);

-- =====================================================
-- TABELA: notes (Notas e observações)
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES stages(id),
    activity_id UUID REFERENCES stage_activities(id),
    content TEXT NOT NULL,
    is_auto_generated BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: pending_tasks (Pendências geradas por notas)
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    assigned_profile_id UUID REFERENCES profiles(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_note_id UUID REFERENCES notes(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: attachments (Arquivos anexos)
-- =====================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: access_logs (Logs de acesso - Segurança)
-- =====================================================
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_guardian_name ON clients(guardian_name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_stages_client ON client_stages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_stages_stage ON client_stages(stage_id);
CREATE INDEX IF NOT EXISTS idx_client_stages_status ON client_stages(status);
CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_activity ON notes(activity_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages(order_index);
CREATE INDEX IF NOT EXISTS idx_stage_activities_stage ON stage_activities(stage_id);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_client ON pending_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_stage ON pending_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_status ON pending_tasks(status);

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stages_updated_at
    BEFORE UPDATE ON stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) - Segurança
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para o service role (API)
CREATE POLICY "Service role full access on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Service role full access on stages" ON stages FOR ALL USING (true);
CREATE POLICY "Service role full access on stage_activities" ON stage_activities FOR ALL USING (true);
CREATE POLICY "Service role full access on client_stages" ON client_stages FOR ALL USING (true);
CREATE POLICY "Service role full access on client_activities" ON client_activities FOR ALL USING (true);
CREATE POLICY "Service role full access on notes" ON notes FOR ALL USING (true);
CREATE POLICY "Service role full access on attachments" ON attachments FOR ALL USING (true);
CREATE POLICY "Service role full access on access_logs" ON access_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on custom_fields" ON custom_fields FOR ALL USING (true);
CREATE POLICY "Service role full access on pending_tasks" ON pending_tasks FOR ALL USING (true);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Perfil Administrador (sistema - não pode ser excluído ou alterado)
INSERT INTO profiles (id, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Administrador', 'Acesso total ao sistema. Não pode ser excluído.', true)
ON CONFLICT (name) DO NOTHING;

-- Perfis padrão
INSERT INTO profiles (name, description) VALUES
    ('Avaliador', 'Profissional responsável por realizar avaliações'),
    ('Atendente', 'Profissional de atendimento inicial'),
    ('Coordenador', 'Coordenador de equipe')
ON CONFLICT (name) DO NOTHING;

-- Usuário administrador inicial (Username: admin | Senha: admin@123)
INSERT INTO users (username, password_hash, name, phone, role, profile_id, is_active)
VALUES (
    'admin',
    '$2a$12$f61/vgMI.Obw9geX6sCQrupsMBrjwByxzTYh2IXqok4jHYFrMgFJ2',
    'Administrador',
    NULL,
    'admin',
    '00000000-0000-0000-0000-000000000001',
    true
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- ETAPAS DO PROCESSO DE AVALIAÇÃO INFANTIL
-- =====================================================

INSERT INTO stages (id, name, description, order_index, is_active) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Atendimento Inicial e Esclarecimento de Dúvidas', 'Primeiro contato com a família para esclarecimento sobre o processo de avaliação, metodologia utilizada e expectativas.', 1, true),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Marcação da Avaliação', 'Agendamento das sessões de avaliação conforme disponibilidade da família e da equipe.', 2, true),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Preparação da Documentação', 'Coleta e organização de documentos necessários: relatórios escolares, laudos anteriores, exames médicos.', 3, true),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Execução da Avaliação', 'Realização das sessões de avaliação com a criança, aplicação de testes e observações clínicas.', 4, true),
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Análise de Resultados', 'Análise e interpretação dos dados coletados, elaboração do relatório técnico.', 5, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Devolutiva e Entrega', 'Reunião de devolutiva com a família para apresentação dos resultados e entrega do laudo.', 6, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ATIVIDADES DAS ETAPAS
-- =====================================================

-- Etapa 01 - Atendimento Inicial
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Realizar primeiro contato com a família', 'Atender ligação ou mensagem inicial da família interessada.', 1, true),
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Explicar o processo de avaliação', 'Detalhar as etapas, tempo estimado e metodologia utilizada.', 2, true),
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Esclarecer dúvidas sobre valores e formas de pagamento', 'Informar sobre investimento, parcelamento e formas de pagamento aceitas.', 3, true),
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Cadastrar dados do cliente', 'Registrar informações básicas da criança e responsáveis no sistema.', 4, true),
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Enviar material informativo', 'Enviar por email ou WhatsApp material explicativo sobre a avaliação.', 5, false)
ON CONFLICT DO NOTHING;

-- Etapa 02 - Marcação da Avaliação
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Verificar disponibilidade da agenda', 'Consultar horários disponíveis para as sessões de avaliação.', 1, true),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Confirmar datas com a família', 'Alinhar as datas propostas com a disponibilidade da família.', 2, true),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Agendar sessões no sistema', 'Registrar os agendamentos confirmados no calendário do sistema.', 3, true),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Enviar confirmação de agendamento', 'Enviar lembrete com datas, horários e orientações para a família.', 4, true),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Confirmar recebimento do sinal/pagamento', 'Verificar se o pagamento inicial foi realizado.', 5, true)
ON CONFLICT DO NOTHING;

-- Etapa 03 - Preparação da Documentação
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Enviar lista de documentos necessários', 'Informar à família quais documentos devem ser providenciados.', 1, true),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Receber documentos da família', 'Coletar relatórios escolares, laudos anteriores e documentos pessoais.', 2, true),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Organizar prontuário do paciente', 'Criar pasta física e/ou digital com toda documentação recebida.', 3, true),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Analisar histórico prévio', 'Revisar documentos recebidos para preparar a avaliação.', 4, true),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Solicitar informações complementares', 'Se necessário, pedir documentos ou informações adicionais.', 5, false)
ON CONFLICT DO NOTHING;

-- Etapa 04 - Execução da Avaliação
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Realizar anamnese com responsáveis', 'Entrevista detalhada com os pais sobre história de vida e desenvolvimento.', 1, true),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Aplicar testes padronizados', 'Realizar aplicação dos instrumentos de avaliação selecionados.', 2, true),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Realizar observação clínica', 'Observar comportamento, interação e respostas da criança.', 3, true),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Documentar as sessões', 'Registrar observações e resultados de cada sessão realizada.', 4, true),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Realizar feedback parcial à família', 'Se apropriado, compartilhar observações iniciais com os responsáveis.', 5, false)
ON CONFLICT DO NOTHING;

-- Etapa 05 - Análise de Resultados
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Corrigir e pontuar testes', 'Realizar correção dos instrumentos aplicados conforme manuais.', 1, true),
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Interpretar resultados', 'Analisar os dados obtidos e estabelecer hipóteses diagnósticas.', 2, true),
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Elaborar relatório técnico', 'Redigir o laudo/relatório de avaliação psicológica.', 3, true),
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Revisar e formatar documento', 'Fazer revisão final do relatório e adequar formatação.', 4, true),
    ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Preparar material para devolutiva', 'Organizar apresentação e pontos principais para a reunião.', 5, true)
ON CONFLICT DO NOTHING;

-- Etapa 06 - Devolutiva e Entrega
INSERT INTO stage_activities (stage_id, name, description, order_index, is_required) VALUES 
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Agendar reunião de devolutiva', 'Marcar data e horário para a reunião de devolutiva com a família.', 1, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Realizar reunião de devolutiva', 'Apresentar e explicar os resultados da avaliação aos responsáveis.', 2, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Entregar laudo impresso', 'Fornecer cópia física do relatório de avaliação.', 3, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Orientar sobre encaminhamentos', 'Indicar profissionais e intervenções recomendadas.', 4, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Verificar quitação financeira', 'Confirmar que todos os pagamentos foram realizados.', 5, true),
    ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'Solicitar avaliação de satisfação', 'Pedir feedback da família sobre o atendimento.', 6, false)
ON CONFLICT DO NOTHING;
