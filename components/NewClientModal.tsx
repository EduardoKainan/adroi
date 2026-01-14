import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Target, DollarSign, Wallet, Briefcase } from 'lucide-react';
import { clientService } from '../services/clientService';
import { Client } from '../types';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onSuccess, clientToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    ad_account_id: '',
    target_roas: '',
    target_cpa: '',
    budget_limit: '',
    crm_enabled: false // Novo campo
  });

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setFormData({
          name: clientToEdit.name || '',
          company: clientToEdit.company || '',
          email: clientToEdit.email || '',
          ad_account_id: clientToEdit.ad_account_id || '',
          target_roas: clientToEdit.target_roas?.toString() || '',
          target_cpa: clientToEdit.target_cpa?.toString() || '',
          budget_limit: clientToEdit.budget_limit?.toString() || '',
          crm_enabled: clientToEdit.crm_enabled || false
        });
      } else {
        setFormData({ 
          name: '', company: '', email: '', ad_account_id: '', 
          target_roas: '', target_cpa: '', budget_limit: '',
          crm_enabled: false
        });
      }
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        target_roas: formData.target_roas ? Number(formData.target_roas) : undefined,
        target_cpa: formData.target_cpa ? Number(formData.target_cpa) : undefined,
        budget_limit: formData.budget_limit ? Number(formData.budget_limit) : undefined
      };

      if (clientToEdit) {
        await clientService.updateClient(clientToEdit.id, payload);
      } else {
        await clientService.createClient(payload);
      }
      
      onSuccess();
      onClose();
      if (!clientToEdit) setFormData({ 
        name: '', company: '', email: '', ad_account_id: '', 
        target_roas: '', target_cpa: '', budget_limit: '', crm_enabled: false
      });
      
    } catch (error: any) {
      console.error('Error saving client:', error);
      
      let message = 'Erro desconhecido';
      
      if (error?.message) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }

      if (message.includes('column') && message.includes('does not exist')) {
        message = `Erro de Banco de Dados: Colunas novas ausentes (target_roas ou crm_enabled).`;
      }

      alert(`Erro ao ${clientToEdit ? 'atualizar' : 'criar'} cliente: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto py-10">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">
            {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Seção Dados Gerais */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dados Cadastrais</h4>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  required
                  type="email" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="email@cliente.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Anúncios (ID)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  placeholder="act_123456789"
                  value={formData.ad_account_id}
                  onChange={e => setFormData({...formData, ad_account_id: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Seção Metas de Performance */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
               <Target size={14} /> Metas & KPIs (Para IA)
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
               <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Meta ROAS</label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">x</span>
                     <input 
                      type="number" 
                      step="0.1"
                      className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="4.0"
                      value={formData.target_roas}
                      onChange={e => setFormData({...formData, target_roas: e.target.value})}
                     />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CPA Máximo</label>
                  <div className="relative">
                     <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                      type="number" 
                      step="0.01"
                      className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="50.00"
                      value={formData.target_cpa}
                      onChange={e => setFormData({...formData, target_cpa: e.target.value})}
                     />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Verba Mensal</label>
                  <div className="relative">
                     <Wallet size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                      type="number" 
                      step="100"
                      className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="5000"
                      value={formData.budget_limit}
                      onChange={e => setFormData({...formData, budget_limit: e.target.value})}
                     />
                  </div>
               </div>
            </div>
            <p className="text-[10px] text-slate-400">Estes parâmetros serão usados pela Inteligência Artificial para gerar alertas.</p>
          </div>

          {/* CRM LITE TOGGLE */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-start gap-2 max-w-[70%]">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600 mt-0.5">
                   <Briefcase size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Ativar CRM Lite</h4>
                  <p className="text-xs text-slate-500">Para advogados e negócios locais. Habilita o rastreamento de Reuniões e Propostas no link público.</p>
                </div>
             </div>
             
             <label className="relative inline-flex items-center cursor-pointer">
               <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.crm_enabled}
                  onChange={e => setFormData({...formData, crm_enabled: e.target.checked})}
               />
               <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
             </label>
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
              {clientToEdit ? 'Salvar Alterações' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};