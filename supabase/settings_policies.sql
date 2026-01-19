
-- ==============================================================================
-- SETTINGS & PERMISSIONS UPDATE
-- Execute este script para permitir a edição de Organizações pelo Admin
-- ==============================================================================

-- 1. Política para ATUALIZAR Organização (Apenas Admins da própria org)
-- Verifica se o usuário tem um profile vinculado à org com role 'admin'
DROP POLICY IF EXISTS "Admin update own org" ON organizations;
CREATE POLICY "Admin update own org" ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. Política para ATUALIZAR o próprio Profile (Nome, etc)
-- Já existia, mas reforçando para garantir
DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

RAISE NOTICE 'Políticas de Configurações atualizadas.';
