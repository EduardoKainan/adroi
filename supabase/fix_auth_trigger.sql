
-- ==============================================================================
-- FIX AUTH TRIGGER (CORREÇÃO DE ERRO NO CADASTRO)
-- Execute este script para corrigir o erro "Database error saving new user".
-- ==============================================================================

-- 1. Remover Trigger e Funções Antigas (Limpeza)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar Função com permissões explícitas (SECURITY DEFINER + search_path)
-- Isso garante que a função tenha acesso às tabelas public.organizations e public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_full_name TEXT;
BEGIN
  -- Log para debug (visível no Dashboard > Database > Postgres Logs)
  RAISE LOG 'Iniciando cadastro para usuário: %', new.id;

  -- Fallbacks para evitar erro de NULL
  org_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Agência');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Admin');

  -- 1. Criar Organização
  INSERT INTO public.organizations (name) 
  VALUES (org_name) 
  RETURNING id INTO new_org_id;

  RAISE LOG 'Organização criada com ID: %', new_org_id;

  -- 2. Criar Perfil Admin vinculado
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
    -- Em caso de erro, loga o detalhe e repassa o erro para o frontend
    RAISE LOG 'Erro no handle_new_user: %', SQLERRM;
    RAISE EXCEPTION 'Erro interno ao configurar conta: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Reativar o Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Garantir permissões básicas no schema public (Prevenção)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

RAISE NOTICE 'Correção aplicada com sucesso. Tente se cadastrar novamente.';
