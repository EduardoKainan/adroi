
-- ==============================================================================
-- SOLUÇÃO DEFINITIVA DE SEGURANÇA (MODO NUCLEAR)
-- Este script detecta e deleta dinamicamente QUALQUER política existente 
-- para garantir que regras permissivas antigas sejam exterminadas.
-- ==============================================================================

BEGIN;

-- 1. Função de utilidade para garantir acesso à org
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Security Definer permite que esta função leia a tabela profiles 
  -- mesmo que o usuário ainda não tenha permissão direta
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 2. LIMPEZA DINÂMICA (O Grande Reset)
-- Itera sobre as tabelas do sistema e deleta TODAS as policies encontradas no catálogo do Postgres.
-- ==============================================================================
DO $$ 
DECLARE 
  r RECORD;
  -- Lista de tabelas sensíveis que devem ser isoladas
  target_tables TEXT[] := ARRAY[
    'clients', 'projects', 'tasks', 'deals', 'campaigns', 
    'campaign_metrics', 'goals', 'contracts', 'commercial_activities', 'insights'
  ];
BEGIN 
  -- Loop através de todas as policies existentes nessas tabelas
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE tablename = ANY(target_tables)
  LOOP 
    -- Deleta a política independente do nome dela (ex: "Enable read for all", "Policy 1", etc)
    RAISE NOTICE 'Deletando política antiga: % na tabela %', r.policyname, r.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename); 
  END LOOP;
  
  -- Garante que RLS está ATIVO em todas elas
  FOR i IN 1 .. array_upper(target_tables, 1) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', target_tables[i]);
  END LOOP;
END $$;

-- ==============================================================================
-- 3. REAPLICAR ISOLAMENTO ESTRITO (Apenas 1 regra por tabela)
-- ==============================================================================

-- > CLIENTS
CREATE POLICY "Strict Isolation" ON clients 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > PROJECTS
CREATE POLICY "Strict Isolation" ON projects 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > TASKS
CREATE POLICY "Strict Isolation" ON tasks 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > DEALS
CREATE POLICY "Strict Isolation" ON deals 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > CAMPAIGNS
CREATE POLICY "Strict Isolation" ON campaigns 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > CAMPAIGN METRICS
CREATE POLICY "Strict Isolation" ON campaign_metrics 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > GOALS
CREATE POLICY "Strict Isolation" ON goals 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > CONTRACTS
CREATE POLICY "Strict Isolation" ON contracts 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > COMMERCIAL ACTIVITIES
CREATE POLICY "Strict Isolation" ON commercial_activities 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- > INSIGHTS
CREATE POLICY "Strict Isolation" ON insights 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- ==============================================================================
-- 4. TRIGGER DE SEGURANÇA PARA INSERÇÃO
-- Garante que nada seja salvo sem ID de organização (evita dados órfãos)
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Preenchimento automático
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;
  
  -- Bloqueio de segurança
  IF NEW.organization_id IS NULL THEN
     RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Tentativa de criar registro sem Organização vinculada.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar triggers nas tabelas principais
DROP TRIGGER IF EXISTS tr_org_clients ON clients;
CREATE TRIGGER tr_org_clients BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_projects ON projects;
CREATE TRIGGER tr_org_projects BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;

RAISE NOTICE 'Isolamento Multi-tenant FORÇADO com sucesso. Todas as políticas antigas foram removidas.';
