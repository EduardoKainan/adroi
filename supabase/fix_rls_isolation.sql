
-- ==============================================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA - ISOLAMENTO MULTI-TENANT (ADROI)
-- Execute este script para garantir que novos usuários NÃO vejam dados de outros.
-- ==============================================================================

BEGIN;

-- 1. Função auxiliar para garantir o ID da organização
-- (Recriamos para garantir que seja SECURITY DEFINER e acesse a tabela profiles corretamente)
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

-- ==============================================================================
-- 2. RESETAR POLÍTICAS (Limpeza Profunda)
-- Removemos TODAS as políticas existentes para evitar regras "permissivas" (public access)
-- ==============================================================================

-- Helper macro para resetar tabela
DO $$ 
DECLARE 
  tables TEXT[] := ARRAY['clients', 'projects', 'tasks', 'deals', 'campaigns', 'campaign_metrics', 'goals', 'contracts', 'commercial_activities', 'insights'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Habilita RLS (caso tenha sido desativado)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Remove TODAS as políticas da tabela para começar do zero
    -- Isso mata políticas como "Enable read access for all users" criada pelo UI
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Clients" ON %I;', t); -- Política antiga do script anterior
    EXECUTE format('DROP POLICY IF EXISTS "Org Projects" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Tasks" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Deals" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Campaigns" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Metrics" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Goals" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Contracts" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Commercial" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Org Insights" ON %I;', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 3. APLICAR POLÍTICAS ESTRITAS (Tenant Isolation)
-- ==============================================================================

-- > CLIENTS
CREATE POLICY "Tenant Isolation Select" ON clients FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON clients FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON clients FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON clients FOR DELETE USING (organization_id = get_my_org_id());

-- > PROJECTS
CREATE POLICY "Tenant Isolation Select" ON projects FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON projects FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON projects FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON projects FOR DELETE USING (organization_id = get_my_org_id());

-- > TASKS
CREATE POLICY "Tenant Isolation Select" ON tasks FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON tasks FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON tasks FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON tasks FOR DELETE USING (organization_id = get_my_org_id());

-- > DEALS
CREATE POLICY "Tenant Isolation Select" ON deals FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON deals FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON deals FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON deals FOR DELETE USING (organization_id = get_my_org_id());

-- > CAMPAIGNS
CREATE POLICY "Tenant Isolation Select" ON campaigns FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON campaigns FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON campaigns FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON campaigns FOR DELETE USING (organization_id = get_my_org_id());

-- > CAMPAIGN METRICS
CREATE POLICY "Tenant Isolation Select" ON campaign_metrics FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON campaign_metrics FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON campaign_metrics FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON campaign_metrics FOR DELETE USING (organization_id = get_my_org_id());

-- > GOALS
CREATE POLICY "Tenant Isolation Select" ON goals FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON goals FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON goals FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON goals FOR DELETE USING (organization_id = get_my_org_id());

-- > CONTRACTS
CREATE POLICY "Tenant Isolation Select" ON contracts FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON contracts FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON contracts FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON contracts FOR DELETE USING (organization_id = get_my_org_id());

-- > COMMERCIAL ACTIVITIES
CREATE POLICY "Tenant Isolation Select" ON commercial_activities FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON commercial_activities FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON commercial_activities FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON commercial_activities FOR DELETE USING (organization_id = get_my_org_id());

-- > INSIGHTS
CREATE POLICY "Tenant Isolation Select" ON insights FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Insert" ON insights FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Update" ON insights FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "Tenant Isolation Delete" ON insights FOR DELETE USING (organization_id = get_my_org_id());

-- ==============================================================================
-- 4. ATUALIZAR TRIGGER DE AUTO-COMPLETE (Garantia Extra)
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o campo organization_id vier nulo, preenchemos automaticamente
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;
  
  -- Se mesmo assim for nulo (usuário sem org), levantamos erro para não criar registro órfão
  IF NEW.organization_id IS NULL THEN
     RAISE EXCEPTION 'Não é possível criar registro: Usuário não pertence a uma organização.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar triggers (caso tenham sido removidos)
DROP TRIGGER IF EXISTS tr_org_clients ON clients;
CREATE TRIGGER tr_org_clients BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_projects ON projects;
CREATE TRIGGER tr_org_projects BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_tasks ON tasks;
CREATE TRIGGER tr_org_tasks BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_deals ON deals;
CREATE TRIGGER tr_org_deals BEFORE INSERT ON deals FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_campaigns ON campaigns;
CREATE TRIGGER tr_org_campaigns BEFORE INSERT ON campaigns FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;

RAISE NOTICE 'Segurança Multi-tenant aplicada com sucesso. Isolamento ativo.';
