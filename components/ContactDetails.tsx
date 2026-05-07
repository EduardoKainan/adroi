
import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, MessageSquare, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { CRMContact, CRMInteraction } from '../types';
import { crmService } from '../services/crmService';
import { toast } from 'sonner';
import { NewInteractionModal } from './NewInteractionModal';

interface ContactDetailsProps {
  contact: CRMContact;
  onBack: () => void;
}

export const ContactDetails: React.FC<ContactDetailsProps> = ({ contact, onBack }) => {
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const data = await crmService.getInteractions(contact.id);
      setInteractions(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar interações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [contact.id]);

  const handleDeleteInteraction = async (id: string) => {
    if (!confirm('Excluir esta interação?')) return;
    try {
      await crmService.deleteInteraction(id);
      setInteractions(prev => prev.filter(i => i.id !== id));
      toast.success('Interação excluída.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir interação.');
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={14} className="text-blue-500" />;
      case 'email': return <Mail size={14} className="text-purple-500" />;
      case 'meeting': return <User size={14} className="text-green-500" />;
      case 'whatsapp': return <MessageSquare size={14} className="text-green-600" />;
      default: return <FileText size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">{contact.name}</h3>
          <p className="text-xs text-slate-500">{contact.role || 'Sem cargo'}</p>
        </div>
        <div className="ml-auto flex gap-2">
            <button 
                onClick={() => setIsInteractionModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
                <Plus size={14} /> Registrar
            </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
            <Mail size={14} className="text-slate-400" />
            <span className="truncate">{contact.email || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
            <Phone size={14} className="text-slate-400" />
            <span>{contact.phone || '-'}</span>
        </div>
        {contact.notes && (
            <div className="col-span-2 mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-slate-600 italic">
                "{contact.notes}"
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Clock size={12} /> Histórico de Interações
        </h4>
        
        {loading ? (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-slate-300" size={24} />
            </div>
        ) : interactions.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {interactions.map((interaction) => (
                    <div key={interaction.id} className="relative pl-8 group">
                        <div className="absolute left-3 top-2 w-4 h-4 rounded-full bg-white border-2 border-slate-200 z-10 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group/item">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    {getInteractionIcon(interaction.type)}
                                    <span className="text-xs font-bold text-slate-700 capitalize">{interaction.type === 'note' ? 'Nota' : interaction.type}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{new Date(interaction.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{interaction.description}</p>
                            
                            <button 
                                onClick={() => handleDeleteInteraction(interaction.id)}
                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover/item:opacity-100 transition-all"
                                title="Excluir"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-slate-400 text-xs italic">
                Nenhuma interação registrada.
            </div>
        )}
      </div>

      <NewInteractionModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        onSuccess={fetchInteractions}
        contactId={contact.id}
      />
    </div>
  );
};
