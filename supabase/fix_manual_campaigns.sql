
-- ==============================================================================
-- PREPARAÇÃO PARA CAMPANHAS MANUAIS E MÉTRICAS EXTERNAS
-- ==============================================================================

BEGIN;

-- 1. ADICIONAR COLUNAS DE MÉTRICAS DETALHADAS (Se não existirem)
-- Necessário para salvar dados do Google Ads, TikTok, etc.

-- Tabela: campaign_metrics
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS impressions NUMERIC DEFAULT 0;
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS clicks NUMERIC DEFAULT 0;
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS roas NUMERIC DEFAULT 0;

-- Tabela: campaigns (Para cache/totais)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS roas NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS purchases NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS leads NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spend NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0;


-- 2. ATUALIZAR TRIGGER DE ORGANIZAÇÃO (MAIS INTELIGENTE)
-- O trigger anterior só olhava 'client_id'. Agora ele aprendeu a olhar 'campaign_id'
-- para descobrir a organização ao inserir métricas.

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
     
     -- Se achou, retorna. Se não, continua tentando as outras lógicas (caso de user system/admin)
     IF NEW.organization_id IS NOT NULL THEN
        RETURN NEW;
     END IF;
  END IF;

  -- C) Tenta descobrir via CLIENT_ID (Para tabelas: deals, tasks, projects, campaigns)
  BEGIN
    IF NEW.client_id IS NOT NULL THEN
       SELECT organization_id INTO NEW.organization_id FROM clients WHERE id = NEW.client_id;
       IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- D) Tenta descobrir via CAMPAIGN_ID (Para tabela: campaign_metrics)
  -- Esta é a parte nova que conserta a inserção de métricas manuais se o user context falhar
  BEGIN
    IF NEW.campaign_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM campaigns WHERE id = NEW.campaign_id;
        IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar o trigger atualizado nas tabelas relevantes
DROP TRIGGER IF EXISTS tr_org_metrics ON campaign_metrics;
CREATE TRIGGER tr_org_metrics BEFORE INSERT ON campaign_metrics FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

DROP TRIGGER IF EXISTS tr_org_campaigns ON campaigns;
CREATE TRIGGER tr_org_campaigns BEFORE INSERT ON campaigns FOR EACH ROW EXECUTE FUNCTION set_org_id_on_insert();

COMMIT;

RAISE NOTICE 'Banco de dados preparado para Campanhas Manuais.';
