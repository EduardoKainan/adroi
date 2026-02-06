
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Users, DollarSign, FileText, Star } from 'lucide-react';
import { commercialService } from '../services/commercialService';
import { CommercialActivity } from '../types';
import { toast } from 'sonner';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  activityToEdit?: CommercialActivity | null;
}

// Helper para data local YYYY-MM-DD
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const NewActivityModal: React.FC<NewActivityModalProps> = ({ isOpen, onClose, onSuccess, clientId, activityToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'meeting' as 'meeting' | 'proposal',
    date: getTodayLocal(),
    prospect_name: '',
    quantity: 1,
    value: '' as string | number,
    notes: '',
    lead_quality_score: 0
  });

  useEffect(() => {
    if (isOpen) {
      if (activityToEdit) {
        setFormData({
          type: activityToEdit.type,
          date: activityToEdit.date,
          prospect_name: activityToEdit.prospect_name || '',
          quantity: activityToEdit.quantity || 1,
          value: activityToEdit.value || '',
          notes: activityToEdit.notes || '',
          lead_quality_score: activityToEdit.lead_quality_score || 0
        });
      } else {
        setFormData({
          type: 'meeting',
          date: getTodayLocal(),
          prospect_name: '',
          quantity: 1,
          value: '',
          notes: '',
          lead_quality_score: 0
        });
      }
    }
  }, [isOpen, activityToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        value: formData.value ? Number(formData.value) : undefined,
        quantity: Number(formData.quantity)
      };

      if (activityToEdit) {
        await commercialService.updateActivity(activityToEdit.id, payload);
        toast.success("Atividade atualizada.");
      } else {
        await commercialService.addActivity({
            client_id: clientId,
            ...payload
        });
        toast.success("Atividade criada.");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar atividade:', error);
      toast.error('Erro ao salvar atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{activityToEdit ? 'Editar Atividade' : 'Nova Atividade'}</h3>
            <p className="text-xs text-slate-500">Gestão do Funil CRM</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <div className="relative">
                   <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as 'meeting' | 'proposal'})}
                   >
                      <option value="meeting">Reunião</option>
                      <option value="proposal">Proposta</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </div>
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <div className="relative">
                   <input 
                   required
                   type="date" 
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.date}
                   onChange={e => setFormData({...formData, date: e.target.value})}
                   />
                </div>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Prospect / Cliente</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Ex: Dr. João Silva"
                value={formData.prospect_name}
                onChange={e => setFormData({...formData, prospect_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                <input 
                   type="number"
                   min="1"
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.quantity}
                   onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (Opcional)</label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                   type="number"
                   step="0.01"
                   className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   placeholder="0.00"
                   value={formData.value}
                   onChange={e => setFormData({...formData, value: e.target.value})}
                   disabled={formData.type !== 'proposal'}
                   />
                </div>
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Qualidade do Lead</label>
             <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, lead_quality_score: star})}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        <Star 
                            size={24} 
                            className={`${star <= formData.lead_quality_score ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-200'}`} 
                        />
                    </button>
                ))}
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas / Detalhes</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none min-h-[80px]"
                placeholder="Detalhes da reunião ou proposta..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {activityToEdit ? 'Salvar Alterações' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
