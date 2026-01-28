
import { supabase } from '../lib/supabase';
import { AdminOrgMetric, AdminUserMetric } from '../types';

export const superAdminService = {
  // Busca métricas de todas as organizações (Tenant List)
  async getAllOrganizations() {
    const { data, error } = await supabase.rpc('sa_get_organizations_metrics');
    
    if (error) {
      console.error('Erro ao buscar organizações:', error);
      throw error;
    }
    return data as AdminOrgMetric[];
  },

  // Busca lista global de usuários
  async getAllUsers() {
    const { data, error } = await supabase.rpc('sa_get_all_users');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
    return data as AdminUserMetric[];
  },

  // Atualizar Role de um usuário (ex: promover a admin ou super_admin)
  async updateUserRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
  }
};
