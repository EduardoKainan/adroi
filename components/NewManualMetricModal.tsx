
import React, { useState } from 'react';
import { X, Save, Loader2, Calendar, DollarSign, MousePointer2, Eye, Users, BarChart3, Globe } from 'lucide-react';
import { clientService } from '../services/clientService';
import { toast } from 'sonner';

interface NewManualMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export const NewManualMetricModal: React.FC<NewManualMetricModalProps> = ({ isOpen, onClose, onSuccess, clientId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayLocal(),
    platform: 'Google Ads',
    spend: '',
    impressions: '',
    clicks: '',
    leads: '',
    revenue: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await clientService.addManualPlatformMetric(clientId, {
        platform: formData.platform,
        date: formData.date,
        spend: Number(formData.spend) || 0,
        impressions: Number(formData.impressions) || 0,
        clicks: Number(formData.clicks) || 0,
        leads: Number(formData.leads) || 0,
        revenue: Number(formData.revenue) || 0
      });

      toast.success("Métricas importadas com sucesso.");
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        date: getTodayLocal(),
        platform: 'Google Ads',
        spend: '',
        impressions: '',
        clicks: '',
        leads: '',
        revenue: ''
      });
    } catch (error: any) {
      console.error('Erro ao salvar métrica:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Globe size={20} className="text-blue-500" />
                Métricas Externas
            </h3>
            <p className="text-xs text-slate-500">Adicione dados de outras fontes manualmente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                   required
                   type="date" 
                   className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                   value={formData.date}
                   onChange={e => setFormData({...formData, date: e.target.value})}
                   />
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plataforma</label>
                <select 
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                   value={formData.platform}
                   onChange={e => setFormData({...formData, platform: e.target.value})}
                >
                   <option value="Google Ads">Google Ads</option>
                   <option value="TikTok Ads">TikTok Ads</option>
                   <option value="LinkedIn Ads">LinkedIn Ads</option>
                   <option value="Pinterest Ads">Pinterest Ads</option>
                   <option value="Outros">Outros</option>
                </select>
             </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Investimento (R$)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="number"
                            step="0.01"
                            className="w-full pl-9 pr-4 py-2 border border-blue-200 bg-blue-50/30 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                            placeholder="0.00"
                            value={formData.spend}
                            onChange={e => setFormData({...formData, spend: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Receita Gerada (R$)</label>
                    <div className="relative">
                        <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="number"
                            step="0.01"
                            className="w-full pl-9 pr-4 py-2 border border-green-200 bg-green-50/30 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm font-bold text-slate-700"
                            placeholder="0.00"
                            value={formData.revenue}
                            onChange={e => setFormData({...formData, revenue: e.target.value})}
                        />
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Impressões</label>
                <div className="relative">
                    <Eye className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                        type="number"
                        className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="0"
                        value={formData.impressions}
                        onChange={e => setFormData({...formData, impressions: e.target.value})}
                    />
                </div>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cliques</label>
                <div className="relative">
                    <MousePointer2 className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                        type="number"
                        className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="0"
                        value={formData.clicks}
                        onChange={e => setFormData({...formData, clicks: e.target.value})}
                    />
                </div>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Leads</label>
                <div className="relative">
                    <Users className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                        type="number"
                        className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="0"
                        value={formData.leads}
                        onChange={e => setFormData({...formData, leads: e.target.value})}
                    />
                </div>
             </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[10px] text-amber-800">
             Isso criará ou atualizará uma campanha chamada <b>[Manual] {formData.platform}</b> e somará aos relatórios gerais.
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
              className="flex-1 py-2.5 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Dados
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
