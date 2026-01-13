import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { clientService } from '../services/clientService';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    ad_account_id: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await clientService.createClient(formData);
      onSuccess();
      onClose();
      setFormData({ name: '', company: '', email: '', ad_account_id: '' });
    } catch (error: any) {
      console.error('Error creating client:', error);
      
      let message = 'Erro desconhecido';
      
      // Tratamento robusto para extrair a mensagem de erro correta
      if (error?.message) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        try {
          message = JSON.stringify(error);
          if (message === '{}') message = 'Erro de servidor (resposta vazia).';
        } catch (e) {
          message = 'Erro ao processar resposta do servidor';
        }
      }

      // Mensagem amigável para erro de coluna inexistente
      if (message.includes('column') && message.includes('does not exist')) {
        const columnName = message.split('"')[1] || 'desconhecida';
        message = `Erro de Banco de Dados: A coluna '${columnName}' não existe na tabela. O código foi ajustado, tente novamente.`;
      }

      alert(`Erro ao criar cliente: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Novo Cliente</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Gestor/Contato</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Ex: Roberto Silva"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Ex: E-commerce Moda Ltda"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              required
              type="email" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="cliente@empresa.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID da Conta de Anúncios (Meta)</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              placeholder="act_123456789"
              value={formData.ad_account_id}
              onChange={e => setFormData({...formData, ad_account_id: e.target.value})}
            />
            <p className="text-xs text-slate-500 mt-1">Necessário para automação do ROI.</p>
          </div>

          <div className="pt-4 flex gap-3">
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
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};