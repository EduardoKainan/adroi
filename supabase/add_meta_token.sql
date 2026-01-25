
-- Adiciona a coluna meta_api_token na tabela organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS meta_api_token TEXT;

-- Nota: As políticas de RLS existentes para "Admin update own org" já devem cobrir
-- a atualização desta coluna, pois ela pertence à tabela organizations.
