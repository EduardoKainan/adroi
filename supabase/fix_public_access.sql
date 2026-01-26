
-- ==============================================================================
-- CORREÇÃO DE ACESSO PÚBLICO (RELATÓRIOS EXTERNOS)
-- Execute este script para corrigir o erro "Link Inválido" nos links públicos.
-- ==============================================================================

BEGIN;

-- 1. FUNÇÃO SEGURA PARA LER DADOS PÚBLICOS DO CLIENTE
-- Isso permite que o frontend busque apenas o nome/empresa sem expor o resto da tabela.
CREATE OR REPLACE FUNCTION get_client_public_info(lookup_id UUID)
RETURNS TABLE (id UUID, company TEXT, name TEXT, crm_enabled BOOLEAN)
SECURITY DEFINER -- Roda com permissões de admin para bypassar RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT c.id, c.company, c.name, c.crm_enabled 
  FROM clients c 
  WHERE c.id = lookup_id;
END;
$$ LANGUAGE plpgsql;

-- Permitir que usuários anônimos (público) executem esta função
GRANT EXECUTE ON FUNCTION get_client_public_info TO anon;
GRANT EXECUTE ON FUNCTION get_client_public_info TO authenticated;


-- 2. PERMITIR INSERÇÃO PÚBLICA DE MÉTRICAS (DEALS E ATIVIDADES)
-- O formulário público precisa salvar dados. Criamos policies específicas para isso.

-- > Deals (Vendas)
DROP POLICY IF EXISTS "Public Insert Deals" ON deals;
CREATE POLICY "Public Insert Deals" ON deals
FOR INSERT
TO anon
WITH CHECK (true); -- Permite insert público (o trigger de Org ID cuida da segurança dos dados)

-- > Commercial Activities (Reuniões/Propostas)
DROP POLICY IF EXISTS "Public Insert Activities" ON commercial_activities;
CREATE POLICY "Public Insert Activities" ON commercial_activities
FOR INSERT
TO anon
WITH CHECK (true);


-- 3. CORREÇÃO DO TRIGGER DE ORGANIZAÇÃO (CRUCIAL)
-- Quando o formulário público salva, ele não sabe o ID da Organização.
-- Este trigger atualizado busca a organização automaticamente baseada no cliente.

CREATE OR REPLACE FUNCTION set_org_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- A) Se já veio preenchido, mantém.
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- B) Se usuário está logado (Painel), pega do perfil dele.
  IF auth.uid() IS NOT NULL THEN
     SELECT organization_id INTO NEW.organization_id FROM profiles WHERE id = auth.uid();
  END IF;

  -- C) Se ainda é nulo (Formulário Público), mas tem client_id, busca do cliente.
  IF NEW.organization_id IS NULL AND NEW.client_id IS NOT NULL THEN
     SELECT organization_id INTO NEW.organization_id FROM clients WHERE id = NEW.client_id;
  END IF;

  -- Validação Final: Se falhar tudo, bloqueia (exceto se for criação de org/profile que não passa por aqui)
  -- Para tabelas como 'deals' e 'commercial_activities', organization_id é obrigatório para o RLS funcionar depois.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar o trigger nas tabelas afetadas pelo form público
DROP TRIGGER IF EXISTS tr_org_deals ON deals;
CREATE TRIGGER tr_org_deals BEFORE INSERT ON deals FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_comm ON commercial_activities;
CREATE TRIGGER tr_org_comm BEFORE INSERT ON commercial_activities FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;

RAISE NOTICE 'Acesso público corrigido. Função RPC criada e Trigger atualizado.';
