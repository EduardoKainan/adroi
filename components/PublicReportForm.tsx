
import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { dealService } from '../services/dealService';
import { commercialService } from '../services/commercialService';
import { Loader2, CheckCircle2, Calendar, ListChecks, Star, Send, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

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

  // Form State Unificado (Focado no Semanal)
  const [formData, setFormData] = useState({
    date: getTodayLocal(),
    weeklyMeetings: 0,
    weeklyProposals: 0,
    weeklyLeadQuality: 3,
    weeklySalesCount: 0,
    weeklySalesTotalValue: '',
    notes: '' // Observações qualitativas
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
         // --- LÓGICA DE ENVIO EM LOTE (BATCH) ---
         const promises = [];
         
         // 1. Salvar Reuniões (com feedback qualitativo anexado)
         if (Number(formData.weeklyMeetings) > 0) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'meeting',
                date: formData.date,
                prospect_name: 'Resumo Semanal',
                notes: formData.notes, // Feedback qualitativo principal
                quantity: Number(formData.weeklyMeetings),
                lead_quality_score: Number(formData.weeklyLeadQuality)
            }));
         }
         
         // 2. Salvar Propostas
         if (Number(formData.weeklyProposals) > 0) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'proposal',
                date: formData.date,
                prospect_name: 'Resumo Semanal',
                quantity: Number(formData.weeklyProposals),
                value: 0 
            }));
         }

         // 3. Salvar Vendas/Contratos (na tabela de Deals)
         if (Number(formData.weeklySalesCount) > 0) {
            promises.push(dealService.createDeal({
                client_id: clientId,
                date: formData.date,
                description: 'Resumo Semanal - Fechamentos',
                quantity: Number(formData.weeklySalesCount),
                total_value: Number(formData.weeklySalesTotalValue) || 0
            }));
         }
         
         // Caso especial: Apenas feedback qualitativo sem números (Zero Reuniões/Vendas)
         // Precisamos salvar o feedback e a nota de qualidade mesmo assim
         const hasNumbers = Number(formData.weeklyMeetings) > 0 || Number(formData.weeklyProposals) > 0 || Number(formData.weeklySalesCount) > 0;
         
         if (!hasNumbers) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'meeting', // Container para o feedback
                date: formData.date,
                prospect_name: 'Feedback Semanal (Sem Dados)',
                notes: formData.notes,
                quantity: 0,
                lead_quality_score: Number(formData.weeklyLeadQuality)
            }));
         }
         
         await Promise.all(promises);

         setSuccess(true);
         toast.success("Resumo enviado com sucesso!");
         
         // Reset form
         setFormData({ 
            date: getTodayLocal(), 
            weeklyMeetings: 0,
            weeklyProposals: 0,
            weeklyLeadQuality: 3,
            weeklySalesCount: 0,
            weeklySalesTotalValue: '',
            notes: ''
         });
         
         // Oculta mensagem de sucesso após 5s
         setTimeout(() => {
             setSuccess(false);
         }, 5000);

    } catch (err: any) {
      console.error("Erro no formulário público:", err);
      let msg = 'Erro ao salvar.';
      if (err?.message) msg = err.message;
      toast.error(`${msg}. Verifique sua conexão ou contate o suporte.`);
    } finally {
      setSubmitting(false);
    }
  };

  const logoUrl = "https://file-service-full-211029272365.us-central1.run.app/static/1f2c6946-b6b8-472e-85b5-442b32252723/image.png";

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
        
        {/* Header Fixo */}
        <div className="text-center mb-8">
            <img src={logoUrl} alt="AdRoi Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-slate-800">Olá, {clientInfo.name.split(' ')[0]}</h1>
            <p className="text-slate-500 mt-1">Check-in semanal da <span className="font-semibold text-indigo-600">{clientInfo.company}</span></p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
           
           {/* Header do Formulário */}
           <div className="bg-indigo-600 p-6 text-white text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <ListChecks size={24} className="text-indigo-200" />
                Resumo da Semana
              </h2>
              <p className="text-indigo-100 text-xs mt-1">Preencha os resultados consolidados</p>
           </div>

           {success ? (
               <div className="p-10 text-center animate-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                       <CheckCircle2 size={32} />
                   </div>
                   <h2 className="text-xl font-bold text-slate-800">Registrado!</h2>
                   <p className="text-slate-500 mt-2">Seu resumo semanal foi salvo com sucesso.</p>
                   <button 
                     onClick={() => setSuccess(false)}
                     className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                   >
                       Enviar outro registro
                   </button>
               </div>
           ) : (
             <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                
                {/* Data de Referência */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Referente à semana de:</label>
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
                
                {/* Bloco Quantitativo */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Funil Comercial</h4>
                   
                   <div className="grid grid-cols-2 gap-4">
                      {/* Reuniões */}
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Reuniões Realizadas</label>
                          <input 
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                              placeholder="0"
                              value={formData.weeklyMeetings}
                              onChange={e => setFormData({...formData, weeklyMeetings: Number(e.target.value)})}
                          />
                      </div>
                      {/* Propostas */}
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Propostas Enviadas</label>
                          <input 
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                              placeholder="0"
                              value={formData.weeklyProposals}
                              onChange={e => setFormData({...formData, weeklyProposals: Number(e.target.value)})}
                          />
                      </div>
                   </div>

                   <div className="h-px bg-slate-200 w-full my-2"></div>

                   <div className="grid grid-cols-2 gap-4">
                      {/* Vendas (Quantidade) */}
                      <div>
                          <label className="block text-xs font-bold text-emerald-700 mb-1">Contratos Fechados</label>
                          <input 
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50 font-bold text-emerald-800"
                              placeholder="0"
                              value={formData.weeklySalesCount}
                              onChange={e => setFormData({...formData, weeklySalesCount: Number(e.target.value)})}
                          />
                      </div>
                      {/* Vendas (Valor Total) */}
                      <div>
                          <label className="block text-xs font-bold text-emerald-700 mb-1">Valor Total (R$)</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">R$</span>
                            <input 
                                type="number"
                                step="0.01"
                                className="w-full pl-7 pr-2 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50 font-bold text-emerald-800"
                                placeholder="0,00"
                                value={formData.weeklySalesTotalValue}
                                onChange={e => setFormData({...formData, weeklySalesTotalValue: e.target.value})}
                            />
                          </div>
                      </div>
                   </div>
                </div>

                {/* Bloco Qualitativo */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                   <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Feedback Qualitativo</h4>
                   
                   <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">Qualidade dos Leads</label>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                          {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                  key={star}
                                  type="button"
                                  onClick={() => setFormData({...formData, weeklyLeadQuality: star})}
                                  className="p-1 focus:outline-none transform transition-transform hover:scale-110 active:scale-95"
                              >
                                  <Star 
                                      size={32} 
                                      className={`${star <= formData.weeklyLeadQuality ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-200'}`} 
                                  />
                              </button>
                          ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-indigo-400 mt-1 px-1 font-medium">
                          <span>Ruins</span>
                          <span>Excelentes</span>
                      </div>
                   </div>

                   <div>
                      <label className="block text-sm font-bold text-indigo-900 mb-2">Observações / Motivos de Perda</label>
                      <textarea 
                          className="w-full p-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] resize-none"
                          placeholder="Ex: Leads qualificados, mas achando o preço alto. Dois clientes agendaram retorno para próxima semana..."
                          value={formData.notes}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                      />
                   </div>
                </div>

                <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none disabled:cursor-not-allowed"
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    Enviar Resumo
                </button>
             </form>
           )}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8 opacity-60">
           AdRoi Intelligence • Performance BI
        </p>
      </div>
    </div>
  );
};
