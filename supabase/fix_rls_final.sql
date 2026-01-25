
-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE RLS (ISOLAMENTO DE DADOS)
-- Execute este script no SQL Editor do Supabase para corrigir a visualização de clientes.
-- ==============================================================================

BEGIN;

-- 1. Habilitar RLS nas tabelas principais (Garantia)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 2. Função segura para obter ID da organização do usuário logado
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Busca a organização do usuário atual na tabela profiles
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. REMOVER TODAS AS POLÍTICAS ANTIGAS (Limpeza Total para evitar conflitos)
-- Isso remove qualquer regra que possa estar permitindo "ver tudo"
DROP POLICY IF EXISTS "Tenant Isolation Select" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Public Access" ON clients;
DROP POLICY IF EXISTS "Strict Isolation" ON clients;
DROP POLICY IF EXISTS "Org Clients" ON clients;

-- 4. CRIAR POLÍTICAS ESTRITAS PARA CLIENTES
-- Como funciona:
-- Usuários Autenticados (Frontend): O filtro `organization_id = get_my_org_id()` é aplicado.
-- N8N (Service Role): A chave de serviço (service_role key) IGNORA RLS por padrão. O n8n terá acesso total.

CREATE POLICY "Strict Tenant Select" ON clients
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
);

CREATE POLICY "Strict Tenant Insert" ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_my_org_id()
);

CREATE POLICY "Strict Tenant Update" ON clients
FOR UPDATE
TO authenticated
USING (
  organization_id = get_my_org_id()
);

CREATE POLICY "Strict Tenant Delete" ON clients
FOR DELETE
TO authenticated
USING (
  organization_id = get_my_org_id()
);

-- 5. TRIGGER DE SEGURANÇA PARA NOVAS INSERÇÕES
-- Garante que se o Frontend (ou n8n) enviar um dado, ele seja tratado corretamente.
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário está logado (Frontend) e não enviou ID, preenchemos auto.
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;

  -- Se for N8N (Service Role sem user logado), ele DEVE mandar o organization_id no JSON.
  -- Se não mandar, permitimos a inserção (para não quebrar a automação), mas o dado ficará sem org.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_org_clients ON clients;
CREATE TRIGGER tr_org_clients 
BEFORE INSERT ON clients 
FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;

-- Confirmação
RAISE NOTICE 'Políticas de isolamento aplicadas. O Frontend agora só vê dados da própria org. O N8N continua com acesso total via Service Role.';
