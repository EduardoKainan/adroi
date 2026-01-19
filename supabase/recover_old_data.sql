
-- ==============================================================================
-- SCRIPT DE RECUPERAÇÃO DE DADOS ANTIGOS
-- Use isso para vincular dados criados ANTES do sistema de login ao seu novo usuário.
-- ==============================================================================

DO $$
DECLARE
  -- 1. SUBSTITUA PELO E-MAIL QUE VOCÊ CADASTROU NO APP AGORA
  target_email TEXT := 'SEU_EMAIL_AQUI@EXEMPLO.COM'; 
  
  target_org_id UUID;
BEGIN
  -- Busca a organização vinculada ao e-mail fornecido
  SELECT organization_id INTO target_org_id
  FROM profiles
  WHERE email = target_email
  LIMIT 1;

  IF target_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com e-mail % não encontrado ou sem organização.', target_email;
  END IF;

  RAISE NOTICE 'Movendo dados órfãos para a organização ID: %', target_org_id;

  -- 2. Atualiza tabelas principais onde organization_id é NULO
  
  -- Clientes
  UPDATE clients SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Projetos
  UPDATE projects SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Tarefas
  UPDATE tasks SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Deals (Vendas CRM)
  UPDATE deals SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Campanhas
  UPDATE campaigns SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Métricas de Campanha
  UPDATE campaign_metrics SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Metas
  UPDATE goals SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Contratos
  UPDATE contracts SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Atividades Comerciais
  UPDATE commercial_activities SET organization_id = target_org_id WHERE organization_id IS NULL;
  
  -- Insights IA
  UPDATE insights SET organization_id = target_org_id WHERE organization_id IS NULL;

  RAISE NOTICE 'Dados recuperados com sucesso para %!', target_email;
END $$;
