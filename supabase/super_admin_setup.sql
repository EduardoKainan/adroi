
-- ==============================================================================
-- SUPER ADMIN SETUP (CORRIGIDO)
-- Permite que usuários especiais visualizem dados de todos os tenants
-- ==============================================================================

-- 1. Atualizar Constraint da coluna ROLE na tabela PROFILES
-- Precisamos permitir 'super_admin' na coluna role.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'manager', 'client'));

-- 2. Função de Segurança (RPC): Listar Métricas de Organizações (Global)
CREATE OR REPLACE FUNCTION sa_get_organizations_metrics()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  total_users BIGINT,
  total_clients BIGINT,
  total_projects BIGINT,
  status TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificação de Segurança (Com alias 'p' para evitar ambiguidade com retorno 'id')
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Super Admins podem executar esta função.';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.created_at,
    (SELECT count(*) FROM profiles p WHERE p.organization_id = o.id) as total_users,
    (SELECT count(*) FROM clients c WHERE c.organization_id = o.id) as total_clients,
    (SELECT count(*) FROM projects pj WHERE pj.organization_id = o.id) as total_projects,
    'active' as status
  FROM organizations o
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Função de Segurança (RPC): Listar Todos Usuários (Global)
CREATE OR REPLACE FUNCTION sa_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  organization_name TEXT,
  last_sign_in TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificação de Segurança (Com alias 'p' para evitar ambiguidade com retorno 'id'/'role')
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Super Admins podem executar esta função.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    o.name as organization_name,
    now() as last_sign_in
  FROM profiles p
  LEFT JOIN organizations o ON p.organization_id = o.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE 'Setup Super Admin (v2) concluído. Funções corrigidas.';
