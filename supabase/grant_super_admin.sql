
-- ==============================================================================
-- PROMOVER USUÁRIO A SUPER ADMIN
-- Substitua o email abaixo pelo seu email de login
-- ==============================================================================

UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'seu_email@exemplo.com'; -- <--- COLOQUE SEU EMAIL AQUI

-- Verifica se deu certo
SELECT email, role FROM public.profiles WHERE role = 'super_admin';
