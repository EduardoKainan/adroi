
-- ==============================================================================
-- CORREÇÃO DE SEGURANÇA: ISOLAMENTO DE DADOS & ACESSO N8N
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

BEGIN;

-- 1. Habilitar RLS nas tabelas principais
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Função segura para obter ID da organização do usuário
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Limpar políticas antigas que possam estar vazando dados
DROP POLICY IF EXISTS "Tenant Isolation Select" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Strict Isolation" ON clients;

-- 4. Criar novas políticas de isolamento estrito para CLIENTES
-- Nota: O n8n usando a Service Role Key ignora automaticamente estas regras (Bypass RLS).
-- Estas regras se aplicam APENAS a usuários logados via interface.

CREATE POLICY "Tenant Isolation Select" ON clients
FOR SELECT
USING (
  organization_id = get_my_org_id()
);

CREATE POLICY "Tenant Isolation Insert" ON clients
FOR INSERT
WITH CHECK (
  organization_id = get_my_org_id()
);

CREATE POLICY "Tenant Isolation Update" ON clients
FOR UPDATE
USING (
  organization_id = get_my_org_id()
);

CREATE POLICY "Tenant Isolation Delete" ON clients
FOR DELETE
USING (
  organization_id = get_my_org_id()
);

-- 5. Trigger melhorado para inserção segura
-- Permite que o n8n insira dados mesmo sem usuário logado, desde que forneça o organization_id
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário estiver logado e não mandou org_id, preenchemos automaticamente
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;

  -- Se for o n8n inserindo via Service Role, ele DEVE enviar o organization_id no JSON.
  -- Se não enviar, e não tiver usuário logado, permitimos a inserção mas o dado ficará "órfão"
  -- (visível apenas para admins globais ou n8n), evitando erro de bloqueio.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar o trigger
DROP TRIGGER IF EXISTS tr_org_clients ON clients;
CREATE TRIGGER tr_org_clients 
BEFORE INSERT ON clients 
FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;
