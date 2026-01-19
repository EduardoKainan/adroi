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
    // Calculate total value automatically ONLY IF total_value is not provided explicitly
    const total_value = deal.total_value !== undefined 
      ? deal.total_value 
      : (deal.quantity || 1) * (deal.unit_value || 0);

    const unit_value = deal.unit_value !== undefined
      ? deal.unit_value
      : (deal.quantity && deal.quantity > 0 ? total_value / deal.quantity : total_value);

    const { data, error } = await supabase
      .from('deals')
      .insert([{
        client_id: deal.client_id,
        date: deal.date,
        description: deal.description,
        quantity: deal.quantity,
        unit_value: unit_value,
        total_value: total_value
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  },

  // Update an existing deal
  async updateDeal(dealId: string, deal: Partial<Deal>) {
    // Recalculate values if provided
    let updatePayload: any = {
        date: deal.date,
        description: deal.description,
        quantity: deal.quantity,
        unit_value: deal.unit_value
    };

    if (deal.quantity !== undefined && deal.unit_value !== undefined) {
        updatePayload.total_value = deal.quantity * deal.unit_value;
    }

    // Remove keys that are undefined
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const { data, error } = await supabase
      .from('deals')
      .update(updatePayload)
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  },

  // Delete a deal
  async deleteDeal(dealId: string) {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId);

    if (error) throw error;
  }
};