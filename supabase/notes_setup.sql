
-- ==============================================================================
-- SETUP: CLIENT NOTES (Diário de Bordo)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- Função Helper para Org ID (caso não exista nesta sessão)
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

-- Políticas de Segurança (Isolamento Estrito)

DROP POLICY IF EXISTS "Strict Isolation" ON client_notes;

CREATE POLICY "Strict Isolation" ON client_notes 
USING (organization_id = get_my_org_id()) 
WITH CHECK (organization_id = get_my_org_id());

-- Trigger para auto-preencher organization_id
CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_my_org_id();
  END IF;
  
  IF NEW.organization_id IS NULL THEN
     RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Tentativa de criar registro sem Organização vinculada.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_org_notes ON client_notes;
CREATE TRIGGER tr_org_notes 
BEFORE INSERT ON client_notes 
FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

RAISE NOTICE 'Tabela client_notes configurada com sucesso.';
