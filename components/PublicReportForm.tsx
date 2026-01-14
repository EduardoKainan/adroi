import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { dealService } from '../services/dealService';
import { Loader2, CheckCircle2, ShoppingBag, Calendar, DollarSign, Send } from 'lucide-react';

interface PublicReportFormProps {
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

export const PublicReportForm: React.FC<PublicReportFormProps> = ({ clientId }) => {
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: getTodayLocal(),
    description: '',
    quantity: 1,
    unit_value: ''
  });

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const info = await clientService.getClientPublicInfo(clientId);
        if (info) {
          setClientInfo(info);
        } else {
          setError('Cliente não encontrado ou link inválido.');
        }
      } catch (err) {
        setError('Erro ao carregar informações do cliente.');
      } finally {
        setLoadingInfo(false);
      }
    };
    loadInfo();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dealService.createDeal({
        client_id: clientId,
        date: formData.date,
        description: formData.description,
        quantity: Number(formData.quantity),
        unit_value: Number(formData.unit_value)
      });
      setSuccess(true);
      setFormData(prev => ({ ...prev, description: '', quantity: 1, unit_value: '' }));
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar relatório. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = Number(formData.quantity) * Number(formData.unit_value || 0);

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Link Inválido</h2>
            <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg mx-auto mb-4">
                AR
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Reportar Venda</h1>
            <p className="text-slate-500 mt-1">Portal do Cliente: <span className="font-semibold text-indigo-600">{clientInfo.company}</span></p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
           {success ? (
               <div className="p-10 text-center animate-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                       <CheckCircle2 size={32} />
                   </div>
                   <h2 className="text-xl font-bold text-slate-800">Sucesso!</h2>
                   <p className="text-slate-500 mt-2">Venda registrada no sistema.</p>
                   <button 
                     onClick={() => setSuccess(false)}
                     className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                   >
                       Registrar Nova Venda
                   </button>
               </div>
           ) : (
             <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">O que foi vendido?</label>
                    <div className="relative">
                        <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            required
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="Ex: Serviço de Consultoria"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                required
                                type="date" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Qtd.</label>
                        <input 
                            required
                            type="number" 
                            min="1"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Valor Unitário (R$)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            required
                            type="number" 
                            step="0.01"
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium"
                            placeholder="0,00"
                            value={formData.unit_value}
                            onChange={e => setFormData({...formData, unit_value: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
                    <span className="text-indigo-800 font-medium">Total da Venda</span>
                    <span className="text-xl font-bold text-indigo-700">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    Confirmar Venda
                </button>
             </form>
           )}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8">
            AdRoi Intelligence &copy; {new Date().getFullYear()} <br/> Plataforma de Performance
        </p>
      </div>
    </div>
  );
};