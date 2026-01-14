import { supabase } from '../lib/supabase';
import { CommercialActivity } from '../types';

export const commercialService = {
  // Registrar uma nova atividade (Reunião ou Proposta)
  async addActivity(activity: Omit<CommercialActivity, 'id' | 'created_at'>) {
    
    // Tratamento para garantir compatibilidade com o banco se colunas forem nullable
    const payload = {
        client_id: activity.client_id,
        type: activity.type,
        date: activity.date,
        prospect_name: activity.prospect_name || null,
        value: activity.value || null,
        notes: activity.notes || null,
        quantity: activity.quantity || 1, // Default 1 para registros individuais
        lead_quality_score: activity.lead_quality_score || null
    };

    const { data, error } = await supabase
      .from('commercial_activities')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Buscar atividades recentes de um cliente
  async getActivities(clientId: string, type?: 'meeting' | 'proposal') {
    let query = supabase
      .from('commercial_activities')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
    return data as CommercialActivity[];
  },

  // Contagem para KPIs (Últimos 30 dias)
  async getFunnelStats(clientId: string) {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Busca atividades recentes
    const { data, error } = await supabase
      .from('commercial_activities')
      .select('type, value, quantity')
      .eq('client_id', clientId)
      .gte('date', dateStr);

    if (error) return { meetings: 0, proposals: 0, pipelineValue: 0 };

    // Agora soma a coluna quantity (ou assume 1 se nulo)
    const meetings = data
      .filter(a => a.type === 'meeting')
      .reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      
    const proposals = data.filter(a => a.type === 'proposal');
    const proposalsCount = proposals.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    const pipelineValue = proposals.reduce((acc, curr) => acc + (curr.value || 0), 0);

    return {
      meetings,
      proposals: proposalsCount,
      pipelineValue
    };
  }
};