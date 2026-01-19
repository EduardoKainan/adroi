import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, ShoppingBag } from 'lucide-react';
import { dealService } from '../services/dealService';
import { Deal } from '../types';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  dealToEdit?: Deal | null; // Prop opcional para edição
}

// Helper para data local YYYY-MM-DD
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSuccess, clientId, dealToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayLocal(), 
    description: '',
    quantity: 1,
    unit_value: '' as string | number
  });

  // Efeito para preencher o formulário se estiver editando
  useEffect(() => {
    if (isOpen) {
        if (dealToEdit) {
            setFormData({
                date: dealToEdit.date,
                description: dealToEdit.description,
                quantity: dealToEdit.quantity || 1,
                unit_value: dealToEdit.unit_value || (dealToEdit.total_value / (dealToEdit.quantity || 1))
            });
        } else {
            // Reset para nova venda
            setFormData({
                date: getTodayLocal(),
                description: '',
                quantity: 1,
                unit_value: ''
            });
        }
    }
  }, [isOpen, dealToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (dealToEdit) {
        // Atualizar
        await dealService.updateDeal(dealToEdit.id, {
            date: formData.date,
            description: formData.description,
            quantity: Number(formData.quantity),
            unit_value: Number(formData.unit_value)
        });
      } else {
        // Criar
        await dealService.createDeal({
            client_id: clientId,
            date: formData.date,
            description: formData.description,
            quantity: Number(formData.quantity),
            unit_value: Number(formData.unit_value)
        });
      }
      
      onSuccess();
      onClose();
      // Reset handled by useEffect on next open
    } catch (error: any) {
      console.error('Erro ao registrar venda:', error);
      
      // Tratamento específico para erro de Schema Cache (PGRST204)
      if (error?.code === 'PGRST204' || (error?.message && error.message.includes('schema cache'))) {
         alert('ERRO DE BANCO DE DADOS (PGRST204):\n\nA tabela "deals" existe mas faltam colunas (quantity) ou o cache do Supabase está desatualizado.\n\nSOLUÇÃO: Vá no SQL Editor do Supabase e execute o script "fix_missing_columns.sql".');
         setLoading(false);
         return;
      }
      
      let message = 'Erro desconhecido';
      if (typeof error === 'string') message = error;
      else if (error?.message) message = error.message;
      else if (error instanceof Error) message = error.message;
      else try { message = JSON.stringify(error); } catch(e) {}

      alert(`Erro ao registrar venda: ${message}. Verifique o console para mais detalhes.`);
    } finally {
      setLoading(false);
    }
  };

  const total = Number(formData.quantity) * Number(formData.unit_value || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{dealToEdit ? 'Editar Venda' : 'Registrar Venda'}</h3>
            <p className="text-xs text-slate-500">{dealToEdit ? 'Alterar dados do registro' : 'Adicione vendas manuais/offline'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Produto</label>
            <div className="relative">
              <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="text" 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: Consultoria Premium"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                   required
                   type="date" 
                   className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.date}
                   onChange={e => setFormData({...formData, date: e.target.value})}
                   />
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                <input 
                   required
                   type="number" 
                   min="1"
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.quantity}
                   onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Unitário (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="number" 
                step="0.01"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0,00"
                value={formData.unit_value}
                onChange={e => setFormData({...formData, unit_value: e.target.value})}
              />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center border border-indigo-100">
             <span className="text-indigo-800 font-medium">Valor Total</span>
             <span className="text-xl font-bold text-indigo-700">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
              {dealToEdit ? 'Salvar Alterações' : 'Salvar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};