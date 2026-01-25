
-- 1. Garantir que a coluna existe
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS meta_api_token TEXT;

-- 2. Habilitar RLS (caso não esteja)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admin update own org" ON organizations;
DROP POLICY IF EXISTS "View own org" ON organizations;

-- 4. Criar política de Leitura (Todos os membros da org podem ver o nome, etc)
CREATE POLICY "View own org" ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- 5. Criar política de Atualização (Apenas ADMINS da org podem alterar)
CREATE POLICY "Admin update own org" ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

RAISE NOTICE 'Coluna meta_api_token verificada e permissões de organização atualizadas.';
