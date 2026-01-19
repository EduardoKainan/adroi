
-- ==============================================================================
-- MIGRAÇÃO SAAS MULTI-TENANT (ADROI) - VERSÃO CORRIGIDA E IDEMPOTENTE
-- ==============================================================================

-- 1. Estrutura Base (Organizações e Perfis)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'manager', 'client')) DEFAULT 'admin',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar coluna organization_id em TODAS as tabelas de negócio
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE commercial_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE insights ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. Habilitar RLS (Row Level Security) em TODAS as tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- 4. Função Helper: Pegar ID da Organização do usuário logado
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. POLÍTICAS DE SEGURANÇA (RLS Policies)
-- Nota: Usamos DROP POLICY IF EXISTS para evitar erros se rodar o script novamente

-- > Profiles
DROP POLICY IF EXISTS "View org members" ON profiles;
CREATE POLICY "View org members" ON profiles FOR SELECT USING (organization_id = get_current_org_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- > Organizations
DROP POLICY IF EXISTS "View own org" ON organizations;
CREATE POLICY "View own org" ON organizations FOR SELECT USING (id = get_current_org_id());

-- > Clients
DROP POLICY IF EXISTS "Org Clients" ON clients;
CREATE POLICY "Org Clients" ON clients FOR ALL USING (organization_id = get_current_org_id());

-- > Projects
DROP POLICY IF EXISTS "Org Projects" ON projects;
CREATE POLICY "Org Projects" ON projects FOR ALL USING (organization_id = get_current_org_id());

-- > Tasks
DROP POLICY IF EXISTS "Org Tasks" ON tasks;
CREATE POLICY "Org Tasks" ON tasks FOR ALL USING (organization_id = get_current_org_id());

-- > Deals
DROP POLICY IF EXISTS "Org Deals" ON deals;
CREATE POLICY "Org Deals" ON deals FOR ALL USING (organization_id = get_current_org_id());

-- > Campaigns
DROP POLICY IF EXISTS "Org Campaigns" ON campaigns;
CREATE POLICY "Org Campaigns" ON campaigns FOR ALL USING (organization_id = get_current_org_id());

-- > Campaign Metrics
DROP POLICY IF EXISTS "Org Metrics" ON campaign_metrics;
CREATE POLICY "Org Metrics" ON campaign_metrics FOR ALL USING (organization_id = get_current_org_id());

-- > Goals
DROP POLICY IF EXISTS "Org Goals" ON goals;
CREATE POLICY "Org Goals" ON goals FOR ALL USING (organization_id = get_current_org_id());

-- > Contracts
DROP POLICY IF EXISTS "Org Contracts" ON contracts;
CREATE POLICY "Org Contracts" ON contracts FOR ALL USING (organization_id = get_current_org_id());

-- > Commercial Activities
DROP POLICY IF EXISTS "Org Commercial" ON commercial_activities;
CREATE POLICY "Org Commercial" ON commercial_activities FOR ALL USING (organization_id = get_current_org_id());

-- > Insights
DROP POLICY IF EXISTS "Org Insights" ON insights;
CREATE POLICY "Org Insights" ON insights FOR ALL USING (organization_id = get_current_org_id());


-- 6. AUTOMAÇÃO: Trigger para preencher organization_id automaticamente
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não foi passado um ID, tenta pegar do usuário logado
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_current_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o trigger em todas as tabelas (remover antes de recriar)
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

DROP TRIGGER IF EXISTS tr_org_metrics ON campaign_metrics;
CREATE TRIGGER tr_org_metrics BEFORE INSERT ON campaign_metrics FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_goals ON goals;
CREATE TRIGGER tr_org_goals BEFORE INSERT ON goals FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_contracts ON contracts;
CREATE TRIGGER tr_org_contracts BEFORE INSERT ON contracts FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_comm ON commercial_activities;
CREATE TRIGGER tr_org_comm BEFORE INSERT ON commercial_activities FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_insights ON insights;
CREATE TRIGGER tr_org_insights BEFORE INSERT ON insights FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();


-- 7. AUTOMAÇÃO: Trigger de Novo Cadastro (Sign Up)
-- CORRIGIDO: Usa SECURITY DEFINER e search_path public para evitar erros de permissão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_full_name TEXT;
BEGIN
  -- Log para debug
  RAISE LOG 'Iniciando cadastro para usuário: %', new.id;

  org_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Agência');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Admin');
  
  -- 1. Cria a Organização
  INSERT INTO public.organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;
  
  -- 2. Cria o Perfil vinculado
  INSERT INTO public.profiles (id, organization_id, role, email, full_name)
  VALUES (
    new.id, 
    new_org_id, 
    'admin', 
    new.email, 
    user_full_name
  );
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro no handle_new_user: %', SQLERRM;
    RAISE EXCEPTION 'Erro interno ao configurar conta: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Vincula ao evento de criação de usuário do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir permissões no schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

RAISE NOTICE 'Migração SaaS concluída com sucesso!';
