
import React, { useState, useEffect } from 'react';
import { noteService } from '../services/noteService';
import { ClientNote } from '../types';
import { Plus, Calendar, Save, Trash2, StickyNote, ChevronDown, ChevronUp, PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientNotesProps {
  clientId: string;
}

// Helper para data local YYYY-MM-DD
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ClientNotes: React.FC<ClientNotesProps> = ({ clientId }) => {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: getTodayLocal()
  });

  const fetchNotes = async () => {
    try {
      const data = await noteService.getNotes(clientId);
      setNotes(data);
      // Expande a nota mais recente por padrão se houver
      if (data.length > 0 && !expandedId) {
          setExpandedId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [clientId]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
        toast.error("O título é obrigatório");
        return;
    }

    try {
        if (editingId) {
            await noteService.updateNote(editingId, {
                title: formData.title,
                content: formData.content,
                date: formData.date
            });
            toast.success("Nota atualizada");
        } else {
            await noteService.createNote({
                client_id: clientId,
                title: formData.title,
                content: formData.content,
                date: formData.date
            });
            toast.success("Nota criada");
        }
        
        setIsEditing(false);
        setEditingId(null);
        setFormData({ title: '', content: '', date: getTodayLocal() });
        fetchNotes();

    } catch (error) {
        toast.error("Erro ao salvar nota");
    }
  };

  const handleEdit = (note: ClientNote) => {
      setEditingId(note.id);
      setFormData({
          title: note.title,
          content: note.content,
          date: note.date
      });
      setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;
      try {
          await noteService.deleteNote(id);
          setNotes(prev => prev.filter(n => n.id !== id));
          toast.success("Nota excluída");
      } catch (error) {
          toast.error("Erro ao excluir");
      }
  };

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-3 bg-white border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <StickyNote size={16} className="text-amber-500" />
                Diário de Bordo
            </h3>
            {!isEditing && (
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ title: '', content: '', date: getTodayLocal() });
                        setIsEditing(true);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium transition-colors flex items-center gap-1"
                >
                    <Plus size={14} /> Nova Nota
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            
            {isEditing && (
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm mb-4 animate-in slide-in-from-top-2">
                    <div className="mb-2">
                        <input 
                            type="text" 
                            placeholder="Título (Ex: Reunião de Alinhamento)"
                            className="w-full text-sm font-bold text-slate-800 placeholder-slate-400 outline-none border-b border-transparent focus:border-indigo-200 pb-1 transition-colors"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            autoFocus
                        />
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <input 
                            type="date" 
                            className="text-xs text-slate-500 outline-none bg-transparent"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                    <textarea 
                        className="w-full text-xs text-slate-600 leading-relaxed min-h-[100px] outline-none resize-none bg-slate-50 p-2 rounded"
                        placeholder="Digite os detalhes aqui..."
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="text-xs text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1"
                        >
                            <Save size={12} /> Salvar
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-4 text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                </div>
            ) : notes.length === 0 && !isEditing ? (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                    <p>Nenhuma anotação registrada.</p>
                    <p>Registre reuniões e alinhamentos importantes.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notes.map(note => {
                        const isExpanded = expandedId === note.id;
                        return (
                            <div key={note.id} className="bg-white rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md group">
                                <div 
                                    className="p-3 cursor-pointer flex items-start gap-3"
                                    onClick={() => toggleExpand(note.id)}
                                >
                                    <div className="flex flex-col items-center min-w-[40px] pt-0.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            {new Date(note.date).toLocaleDateString('pt-BR', { month: 'short' })}
                                        </span>
                                        <span className="text-lg font-bold text-slate-700 leading-none">
                                            {new Date(note.date).getDate()}
                                        </span>
                                        <span className="text-[9px] text-slate-300">
                                            {new Date(note.date).getFullYear()}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{note.title}</h4>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(note); }}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                                >
                                                    <PenLine size={12} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className={`text-xs text-slate-500 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {note.content || <span className="italic text-slate-300">Sem descrição...</span>}
                                        </p>
                                    </div>
                                    
                                    <div className="text-slate-300 pt-1">
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
