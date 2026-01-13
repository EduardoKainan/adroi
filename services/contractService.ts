import { supabase } from '../lib/supabase';
import { Contract } from '../types';

export const contractService = {
  // Fetch all active contracts (useful for Dashboard)
  async getActiveContracts() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .neq('status', 'cancelled'); // Fetch active and expired, but not cancelled
    
    if (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
    
    return (data || []).map((c: any) => ({
      ...c,
      days_remaining: calculateDaysRemaining(c.end_date)
    })) as Contract[];
  },

  // Fetch contract for a specific client
  async getClientContract(clientId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('end_date', { ascending: false }) // Get the latest one if multiple exist
      .limit(1)
      .single();

    if (error) {
      // It's common for a client not to have a contract yet, so we don't always throw
      return null;
    }

    return {
      ...data,
      days_remaining: calculateDaysRemaining(data.end_date)
    } as Contract;
  }
};

// Helper to calculate days diff
const calculateDaysRemaining = (endDateStr: string): number => {
  const end = new Date(endDateStr);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};