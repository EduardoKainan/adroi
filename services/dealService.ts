import { supabase } from '../lib/supabase';
import { Deal } from '../types';

export const dealService = {
  // Fetch deals for a client
  async getDeals(clientId: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
    return data as Deal[];
  },

  // Add a new manual deal
  async createDeal(deal: Partial<Deal>) {
    // Calculate total value automatically to ensure backend consistency
    const total_value = (deal.quantity || 1) * (deal.unit_value || 0);

    const { data, error } = await supabase
      .from('deals')
      .insert([{
        client_id: deal.client_id,
        date: deal.date,
        description: deal.description,
        quantity: deal.quantity,
        unit_value: deal.unit_value,
        total_value: total_value
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  }
};