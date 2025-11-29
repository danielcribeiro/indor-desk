# INDOR Desk

Sistema de Gestão para Clínica de Avaliação Infantil - Instituto Dra. Olzeni Ribeiro

![INDOR Desk](https://sprmtggtqctxusgsamxp.supabase.co/storage/v1/object/public/publico/INDOR_Desk_logo2-removebg-preview.png)

## 📋 Sobre o Sistema

O INDOR Desk é um sistema CRM desenvolvido para gerenciar o processo de avaliação infantil, permitindo:

- **Gestão de Clientes**: Cadastro completo de pacientes e responsáveis
- **Jornada em Etapas**: Acompanhamento visual (roadmap) do progresso de cada cliente
- **Atividades por Etapa**: Checklist de tarefas a serem realizadas
- **Notas e Anexos**: Registro de observações e documentos
- **Dashboard**: Visão consolidada com métricas e gráficos
- **Campos Personalizados**: Flexibilidade para adicionar campos extras

## 🚀 Tecnologias

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT customizado (username/senha)
- **Containerização**: Docker + Docker Compose

## 📦 Instalação

### Pré-requisitos

- Node.js 20+
- npm ou yarn
- Conta no Supabase (ou instância local)

### Configuração

1. Clone o repositório:
```bash
git clone <repository-url>
cd indor-desk
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite o `.env.local` com suas credenciais do Supabase.

4. Execute as migrations no Supabase:
   - Acesse o SQL Editor do Supabase
   - Execute o conteúdo de `supabase/migrations/001_initial_schema.sql`
   - Execute o conteúdo de `supabase/migrations/002_seed_data.sql`

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse http://localhost:3000

### Login Inicial

- **Usuário**: admin
- **Senha**: admin@123

## 🐳 Docker

### Desenvolvimento

```bash
docker-compose --profile dev up
```

### Produção

```bash
docker-compose up -d
```

## 📁 Estrutura do Projeto

```
indor-desk/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Páginas de autenticação
│   │   ├── (dashboard)/        # Páginas autenticadas
│   │   │   ├── dashboard/      # Dashboard principal
│   │   │   ├── clientes/       # Gestão de clientes
│   │   │   └── admin/          # Área administrativa
│   │   └── api/                # Backend API Routes
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base (Button, Input, etc.)
│   │   ├── layout/             # Layout (Sidebar, Header)
│   │   └── flow/               # Componentes do roadmap
│   ├── lib/                    # Lógica de negócio
│   │   ├── auth/               # Autenticação (JWT, Password)
│   │   ├── supabase/           # Cliente Supabase
│   │   ├── validators/         # Validações Zod
│   │   └── utils/              # Utilitários
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── supabase/
│   └── migrations/             # SQL migrations
├── docker-compose.yml
└── Dockerfile
```

## 🔐 Segurança

O sistema implementa diversas camadas de segurança:

- **Rate Limiting**: Limite de 100 requisições/minuto por IP
- **Bloqueio de Login**: Após 5 tentativas falhas, bloqueio de 15 minutos
- **JWT Seguro**: Access token (1h) + Refresh token (7d)
- **Headers de Segurança**: XSS, CSRF, Clickjacking protection
- **Validação de Entrada**: Todas as entradas são validadas com Zod
- **Logs de Auditoria**: Registro de todas as ações sensíveis

## 📊 Etapas do Processo

O sistema vem pré-configurado com 6 etapas:

1. **Atendimento Inicial e Esclarecimento de Dúvidas**
2. **Marcação da Avaliação**
3. **Preparação da Documentação**
4. **Execução da Avaliação**
5. **Análise de Resultados**
6. **Devolutiva e Entrega**

Cada etapa possui atividades específicas que podem ser configuradas pelo administrador.

## 🎨 Design

O design segue a identidade visual do INDOR:

- **Cor Principal**: Azul Ciano (#00BCD4)
- **Cor Secundária**: Azul Marinho (#1A5A6C)
- **Tipografia**: Outfit (corpo) + Plus Jakarta Sans (títulos)
- **Estilo**: Clean, leve e profissional

## 📱 Funcionalidades

### Para Operadores
- Cadastrar e gerenciar clientes
- Acompanhar jornada do cliente (roadmap)
- Marcar atividades como concluídas
- Adicionar notas e anexos
- Visualizar dashboard

### Para Administradores
- Todas as funcionalidades de operador
- Gerenciar usuários do sistema
- Configurar etapas do processo
- Configurar atividades de cada etapa
- Criar campos personalizados

## 🛠️ Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Iniciar em produção
npm run lint     # Verificar código
```

## 📄 Licença

Desenvolvido exclusivamente para o Instituto Dra. Olzeni Ribeiro.

---

Desenvolvido com ❤️ para o Instituto Dra. Olzeni Ribeiro
