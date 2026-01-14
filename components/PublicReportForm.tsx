import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { dealService } from '../services/dealService';
import { commercialService } from '../services/commercialService'; // Novo service
import { Loader2, CheckCircle2, ShoppingBag, Calendar, DollarSign, Send, Users, FileText, ArrowLeft, Briefcase, ListChecks, Star } from 'lucide-react';

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

type FormMode = 'MENU' | 'MEETING' | 'PROPOSAL' | 'SALE' | 'WEEKLY';

export const PublicReportForm: React.FC<PublicReportFormProps> = ({ clientId }) => {
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [mode, setMode] = useState<FormMode>('MENU');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State Unificado
  const [formData, setFormData] = useState({
    date: getTodayLocal(),
    description: '', // Nome do Prospect ou Produto
    quantity: 1,
    unit_value: '',
    notes: '', // Para observações rápidas
    
    // Novos campos para Weekly Batch
    weeklyMeetings: 0,
    weeklyProposals: 0,
    weeklyLeadQuality: 3,
    // Novos campos de Fechamento (Sales)
    weeklySalesCount: 0,
    weeklySalesTotalValue: ''
  });

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const info = await clientService.getClientPublicInfo(clientId);
        if (info) {
          setClientInfo(info);
          // Se o CRM não estiver ativado, vai direto para a tela de Venda (comportamento antigo)
          if (!info.crm_enabled) {
             setMode('SALE');
          }
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
      if (mode === 'SALE') {
        // Venda Individual (mantém lógica antiga)
        await dealService.createDeal({
          client_id: clientId,
          date: formData.date,
          description: formData.description,
          quantity: Number(formData.quantity),
          unit_value: Number(formData.unit_value)
        });
      } else if (mode === 'MEETING') {
        // Reunião Individual
        await commercialService.addActivity({
            client_id: clientId,
            type: 'meeting',
            date: formData.date,
            prospect_name: formData.description,
            notes: formData.notes || '' 
        });
      } else if (mode === 'PROPOSAL') {
        // Proposta Individual
        await commercialService.addActivity({
            client_id: clientId,
            type: 'proposal',
            date: formData.date,
            prospect_name: formData.description,
            value: Number(formData.unit_value),
            notes: formData.notes || ''
        });
      } else if (mode === 'WEEKLY') {
         // --- LÓGICA DE ENVIO EM LOTE (BATCH) ---
         const promises = [];
         
         // 1. Salvar Reuniões (com feedback qualitativo)
         if (Number(formData.weeklyMeetings) > 0) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'meeting',
                date: formData.date,
                prospect_name: 'Resumo Semanal',
                notes: formData.notes, // Feedback qualitativo
                quantity: Number(formData.weeklyMeetings),
                lead_quality_score: Number(formData.weeklyLeadQuality)
            }));
         }
         
         // 2. Salvar Propostas (apenas quantidade, sem valor aqui)
         if (Number(formData.weeklyProposals) > 0) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'proposal',
                date: formData.date,
                prospect_name: 'Resumo Semanal',
                quantity: Number(formData.weeklyProposals),
                value: 0 // Valor ignorado no lote de propostas conforme solicitado
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
         
         // Caso especial: Apenas feedback qualitativo sem números
         if (promises.length === 0 && formData.notes) {
            promises.push(commercialService.addActivity({
                client_id: clientId,
                type: 'meeting',
                date: formData.date,
                prospect_name: 'Feedback Semanal (Sem Dados)',
                notes: formData.notes,
                quantity: 0,
                lead_quality_score: Number(formData.weeklyLeadQuality)
            }));
         }
         
         await Promise.all(promises);
      }

      setSuccess(true);
      // Reset
      setFormData({ 
          date: getTodayLocal(), 
          description: '', 
          quantity: 1, 
          unit_value: '', 
          notes: '',
          weeklyMeetings: 0,
          weeklyProposals: 0,
          weeklyLeadQuality: 3,
          weeklySalesCount: 0,
          weeklySalesTotalValue: ''
      });
      
      setTimeout(() => {
          setSuccess(false);
          if (clientInfo?.crm_enabled) {
              setMode('MENU');
          }
      }, 3000);

    } catch (err: any) {
      console.error("Erro no formulário público:", err);
      let msg = 'Erro ao salvar.';
      if (err?.message) msg = err.message;
      alert(`${msg}\n\nVerifique sua conexão ou contate o suporte.`);
    } finally {
      setSubmitting(false);
    }
  };

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

  // --- MODO MENU (Para clientes com CRM Ativo) ---
  if (mode === 'MENU') {
      return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center">
             <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg mx-auto mb-4">
                    AR
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Olá, {clientInfo.name.split(' ')[0]}</h1>
                <p className="text-slate-500 mt-1">O que aconteceu hoje na <span className="font-semibold text-indigo-600">{clientInfo.company}</span>?</p>
            </div>

            <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-8 delay-100">
                {/* --- NOVO BOTÃO: CHECK-IN SEMANAL --- */}
                <button 
                  onClick={() => setMode('WEEKLY')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg border border-transparent hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-4 group text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                        <ListChecks size={24} />
                    </div>
                    <div className="text-left flex-1 relative z-10">
                        <h3 className="font-bold text-lg">Resumo Semanal</h3>
                        <p className="text-xs text-indigo-100 opacity-90">Enviar tudo de uma vez (Sexta)</p>
                    </div>
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-300"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">Ou registre individualmente</span>
                    <div className="flex-grow border-t border-slate-300"></div>
                </div>

                <button 
                  onClick={() => setMode('MEETING')}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-4 group"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-700 text-base">Nova Reunião</h3>
                    </div>
                </button>

                <button 
                  onClick={() => setMode('PROPOSAL')}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all flex items-center gap-4 group"
                >
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-700 text-base">Proposta Enviada</h3>
                    </div>
                </button>

                <button 
                  onClick={() => setMode('SALE')}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-center gap-4 group"
                >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Briefcase size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-700 text-base">Venda Fechada</h3>
                    </div>
                </button>
            </div>
             
             <p className="text-center text-xs text-slate-400 mt-12 opacity-60">
                AdRoi Intelligence
            </p>
        </div>
      );
  }

  // --- MODO FORMULÁRIO (Reunião, Proposta, Venda, SEMANAL) ---
  const getTitle = () => {
      if (mode === 'WEEKLY') return { title: 'Resumo da Semana', icon: <ListChecks size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-600' };
      if (mode === 'MEETING') return { title: 'Registrar Reunião', icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-600' };
      if (mode === 'PROPOSAL') return { title: 'Registrar Proposta', icon: <FileText size={20} />, color: 'text-purple-600', bg: 'bg-purple-600' };
      return { title: 'Registrar Venda', icon: <DollarSign size={20} />, color: 'text-emerald-600', bg: 'bg-indigo-600' };
  };

  const info = getTitle();
  const total = Number(formData.quantity) * Number(formData.unit_value || 0);

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Nav Back */}
        {clientInfo.crm_enabled && (
            <button 
                onClick={() => setMode('MENU')}
                className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium transition-colors"
            >
                <ArrowLeft size={16} /> Voltar ao menu
            </button>
        )}

        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
               <span className={`${info.color} bg-white p-2 rounded-lg shadow-sm`}>{info.icon}</span>
               {info.title}
            </h1>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
           {success ? (
               <div className="p-10 text-center animate-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                       <CheckCircle2 size={32} />
                   </div>
                   <h2 className="text-xl font-bold text-slate-800">Registrado!</h2>
                   <p className="text-slate-500 mt-2">Informação salva com sucesso.</p>
                   {!clientInfo.crm_enabled && (
                       <button 
                         onClick={() => setSuccess(false)}
                         className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                       >
                           Registrar Novo
                       </button>
                   )}
               </div>
           ) : (
             <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                
                {mode === 'WEEKLY' ? (
                  // --- FORMULÁRIO SEMANAL (ATUALIZADO) ---
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
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
                      
                      {/* Bloco Quantitativo - ATUALIZADO 2x2 GRID */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Números da Semana</h4>
                         
                         <div className="grid grid-cols-2 gap-4">
                            {/* Reuniões */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Reuniões</label>
                                <input 
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    placeholder="0"
                                    value={formData.weeklyMeetings}
                                    onChange={e => setFormData({...formData, weeklyMeetings: Number(e.target.value)})}
                                />
                            </div>
                            {/* Propostas */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Propostas</label>
                                <input 
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
                                <label className="block text-xs font-bold text-emerald-700 mb-1">Contratos</label>
                                <input 
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50"
                                    placeholder="0"
                                    value={formData.weeklySalesCount}
                                    onChange={e => setFormData({...formData, weeklySalesCount: Number(e.target.value)})}
                                />
                            </div>
                            {/* Vendas (Valor Total) */}
                            <div>
                                <label className="block text-xs font-bold text-emerald-700 mb-1">Valor Total (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50"
                                    placeholder="0,00"
                                    value={formData.weeklySalesTotalValue}
                                    onChange={e => setFormData({...formData, weeklySalesTotalValue: e.target.value})}
                                />
                            </div>
                         </div>
                      </div>

                      {/* Bloco Qualitativo */}
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                         <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Feedback Qualitativo</h4>
                         
                         <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-2">Qualidade dos Leads</label>
                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setFormData({...formData, weeklyLeadQuality: star})}
                                        className="p-1 focus:outline-none transform transition-transform hover:scale-110"
                                    >
                                        <Star 
                                            size={28} 
                                            className={`${star <= formData.weeklyLeadQuality ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-300'}`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-indigo-400 mt-1 px-1">
                                <span>Péssimos</span>
                                <span>Excelentes</span>
                            </div>
                         </div>

                         <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-2">Observações / Por que não fechou?</label>
                            <textarea 
                                className="w-full p-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]"
                                placeholder="Ex: Leads qualificados mas achando caro..."
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                            />
                         </div>
                      </div>
                  </div>
                ) : (
                  // --- FORMULÁRIO PADRÃO (INDIVIDUAL) ---
                  <>
                    {/* Campo 1: Nome do Prospect / Descrição */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            {mode === 'SALE' ? 'O que foi vendido?' : 'Nome do Cliente/Prospect'}
                        </label>
                        <div className="relative">
                            <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                required
                                type="text" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder={mode === 'SALE' ? "Ex: Consultoria" : "Ex: Dr. João da Silva"}
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Data */}
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

                    {/* Campos Financeiros (Apenas para SALE e PROPOSAL) */}
                    {(mode === 'SALE' || mode === 'PROPOSAL') && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Valor Estimado (R$)</label>
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
                    )}
                    
                    {/* Notas (Apenas Reunião) */}
                    {mode === 'MEETING' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Observação (Opcional)</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                rows={2}
                                placeholder="Ex: Cliente interessado em divórcio..."
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    )}

                    {/* Resumo Total (Apenas Sale com Qtd) */}
                    {mode === 'SALE' && formData.unit_value && (
                        <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
                            <span className="text-indigo-800 font-medium">Total</span>
                            <span className="text-xl font-bold text-indigo-700">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                  </>
                )}

                <button 
                    type="submit" 
                    disabled={submitting}
                    className={`w-full py-4 ${info.bg} rounded-xl text-white font-bold text-lg hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none`}
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    Confirmar
                </button>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};