
-- ==============================================================================
-- CORREÇÃO DE ISOLAMENTO DE DADOS (RLS) & SUPORTE N8N
-- ==============================================================================

-- 1. Habilitar RLS nas tabelas críticas (Garante que ninguém acesse sem permissão)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Função Helper Performática (Cacheia o ID da Org do usuário atual)
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

-- 3. Limpar Políticas Antigas (Evita conflitos ou regras permissivas "TRUE")
DROP POLICY IF EXISTS "Tenant Isolation Select" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON clients;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Public Access" ON clients;

-- 4. Criar Políticas Estritas para CLIENTES
-- Usuários Logados: Só veem dados da própria organização.
-- N8N (Service Role): Ignora essas regras automaticamente e vê TUDO.

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

-- 5. Trigger de Segurança para Novos Clientes
-- Garante que se o frontend esquecer de mandar o ID da org, o banco preenche.
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for inserção via usuário logado, preenche com a org dele
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;

  -- Se for inserção via N8N (Service Role sem usuário logado), 
  -- o N8N DEVE enviar o organization_id no JSON de insert, 
  -- caso contrário ficará NULL (o que é ok, pois admins veem tudo, mas idealmente deve ter org).
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_org_clients ON clients;
CREATE TRIGGER tr_org_clients 
BEFORE INSERT ON clients 
FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

-- 6. Correção de Dados Órfãos (Opcional)
-- Se você tem clientes criados anteriormente sem organization_id que agora sumiram,
-- este comando atribui eles à organização do usuário que está rodando este script agora.
-- Descomente a linha abaixo se precisar recuperar dados sumidos:

-- UPDATE clients SET organization_id = get_my_org_id() WHERE organization_id IS NULL;

