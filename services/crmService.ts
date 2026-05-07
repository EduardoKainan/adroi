
import { supabase } from '../lib/supabase';
import { CRMContact, CRMInteraction } from '../types';

export const crmService = {
  async getContacts(clientId: string) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CRMContact[];
  },

  async createContact(contact: Omit<CRMContact, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;
    return data as CRMContact;
  },

  async updateContact(id: string, updates: Partial<CRMContact>) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CRMContact;
  },

  async deleteContact(id: string) {
    const { error } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getInteractions(contactId: string) {
    const { data, error } = await supabase
      .from('crm_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as CRMInteraction[];
  },

  async createInteraction(interaction: Omit<CRMInteraction, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_interactions')
      .insert(interaction)
      .select()
      .single();

    if (error) throw error;
    return data as CRMInteraction;
  },

  async deleteInteraction(id: string) {
    const { error } = await supabase
      .from('crm_interactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
