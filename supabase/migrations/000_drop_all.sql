-- =====================================================
-- INDOR Desk - Drop All Tables
-- ATENÇÃO: Este script irá APAGAR TODOS OS DADOS!
-- Use apenas para recriar o banco do zero.
-- =====================================================

-- Desabilitar verificações de foreign key temporariamente
SET session_replication_role = replica;

-- Drop das tabelas na ordem correta (dependências primeiro)
DROP TABLE IF EXISTS pending_tasks CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS client_activities CASCADE;
DROP TABLE IF EXISTS client_stages CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS stage_activities CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS custom_fields CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Reabilitar verificações de foreign key
SET session_replication_role = DEFAULT;

-- =====================================================
-- Após executar este script, execute na ordem:
-- 1. 001_initial_schema.sql
-- =====================================================

