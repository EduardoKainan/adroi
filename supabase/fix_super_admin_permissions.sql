
-- ==============================================================================
-- CORREÇÃO PERMISSÕES SUPER ADMIN
-- Permite que super_admin atualize sua organização e gerencie convites.
-- ==============================================================================

BEGIN;

-- 1. Organizations Update Policy
DROP POLICY IF EXISTS "Admin update own org" ON organizations;
CREATE POLICY "Admin update own org" ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  )
);

-- 2. Invites Policies
-- View
DROP POLICY IF EXISTS "Admins view invites" ON organization_invites;
CREATE POLICY "Admins view invites" ON organization_invites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Insert
DROP POLICY IF EXISTS "Admins insert invites" ON organization_invites;
CREATE POLICY "Admins insert invites" ON organization_invites
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Delete
DROP POLICY IF EXISTS "Admins delete invites" ON organization_invites;
CREATE POLICY "Admins delete invites" ON organization_invites
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

COMMIT;

RAISE NOTICE 'Permissões de Super Admin atualizadas. Agora podem editar configurações da org.';
