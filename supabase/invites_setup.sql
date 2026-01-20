
-- ==============================================================================
-- SISTEMA DE CONVITES DE EQUIPE
-- ==============================================================================

-- 1. Tabela de Convites
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager')) DEFAULT 'manager',
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending'
);

-- Habilitar RLS
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Apenas Admins podem gerenciar convites da própria org)

-- VER
DROP POLICY IF EXISTS "Admins view invites" ON organization_invites;
CREATE POLICY "Admins view invites" ON organization_invites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERIR
DROP POLICY IF EXISTS "Admins insert invites" ON organization_invites;
CREATE POLICY "Admins insert invites" ON organization_invites
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETAR (Revogar convite)
DROP POLICY IF EXISTS "Admins delete invites" ON organization_invites;
CREATE POLICY "Admins delete invites" ON organization_invites
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==============================================================================
-- 2. ATUALIZAÇÃO DO TRIGGER DE CADASTRO (HANDLE NEW USER)
-- Agora verifica se existe convite antes de criar uma nova organização
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
  new_org_id UUID;
  org_name TEXT;
  user_full_name TEXT;
BEGIN
  -- Log para debug
  RAISE LOG 'Iniciando cadastro para usuário: % (Email: %)', new.id, new.email;

  -- 1. Verifica se existe convite pendente para este email
  SELECT * INTO invite_record 
  FROM public.organization_invites 
  WHERE email = new.email 
  LIMIT 1;

  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Usuário');

  IF invite_record IS NOT NULL THEN
    -- A) ENTRAR EM ORGANIZAÇÃO EXISTENTE (ACEITAR CONVITE)
    INSERT INTO public.profiles (id, organization_id, role, email, full_name)
    VALUES (
      new.id, 
      invite_record.organization_id, 
      invite_record.role, 
      new.email, 
      user_full_name
    );
    
    -- Remove o convite após aceito para limpar a tabela
    DELETE FROM public.organization_invites WHERE id = invite_record.id;
    
    RAISE LOG 'Usuário % entrou na organização % via convite.', new.email, invite_record.organization_id;

  ELSE
    -- B) CRIAR NOVA ORGANIZAÇÃO (FLUXO PADRÃO)
    org_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Agência');
    
    INSERT INTO public.organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;
    
    INSERT INTO public.profiles (id, organization_id, role, email, full_name)
    VALUES (
      new.id, 
      new_org_id, 
      'admin', 
      new.email, 
      user_full_name
    );
    
    RAISE LOG 'Nova organização criada para %', new.email;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garante que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE 'Sistema de convites configurado com sucesso.';
