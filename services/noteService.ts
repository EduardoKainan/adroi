
import { supabase } from '../lib/supabase';
import { ClientNote } from '../types';

export const noteService = {
  // Buscar notas de um cliente
  async getNotes(clientId: string) {
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
    return data as ClientNote[];
  },

  // Criar nota
  async createNote(note: Partial<ClientNote>) {
    const { data, error } = await supabase
      .from('client_notes')
      .insert([{
        client_id: note.client_id,
        title: note.title,
        content: note.content,
        date: note.date,
        is_pinned: note.is_pinned || false
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ClientNote;
  },

  // Atualizar nota
  async updateNote(noteId: string, updates: Partial<ClientNote>) {
    const { data, error } = await supabase
      .from('client_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data as ClientNote;
  },

  // Deletar nota
  async deleteNote(noteId: string) {
    const { error } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }
};
