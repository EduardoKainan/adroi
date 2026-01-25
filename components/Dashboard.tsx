
import React, { useState, useEffect } from 'react';
import { clientService, getLocalDateString } from '../services/clientService';
import { contractService } from '../services/contractService';
import { Client, Contract } from '../types';
import { Search, Plus, MoreVertical, TrendingUp, AlertTriangle, Loader2, RefreshCw, Copy, Check, Calendar, ChevronRight, Trash2, PauseCircle, PlayCircle, PenLine, ChevronDown, DollarSign, Users, PieChart } from 'lucide-react';
import { NewClientModal } from './NewClientModal';
import { OnboardingGuide } from './OnboardingGuide';
import { toast } from 'sonner';

interface DashboardProps {
  onSelectClient: (client: Client) => void;
}

type DateRangeOption = '7D' | '14D' | '30D' | 'CUSTOM';

export const Dashboard: React.FC<DashboardProps> = ({ onSelectClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Date State
  const [dateOption, setDateOption] = useState<DateRangeOption>('30D');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Calcula as datas iniciais baseadas na opção selecionada
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date(); // Hoje

    if (dateOption === 'CUSTOM') {
       // Se for customizado, não altera automaticamente os inputs
       return;
    }

    switch (dateOption) {
      case '7D':
        start.setDate(today.getDate() - 7);
        break;
      case '14D':
        start.setDate(today.getDate() - 14);
        break;
      case '30D':
        start.setDate(today.getDate() - 30);
        break;
    }

    setDateRange({
      start: getLocalDateString(start),
      end: getLocalDateString(end)
    });
  }, [dateOption]);

  const fetchData = async () => {
    if (!dateRange.start || !dateRange.end) return;

    setLoading(true);
    try {
      const [clientsData, contractsData] = await Promise.all([
        clientService.getClients(dateRange.start, dateRange.end),
        contractService.getActiveContracts()
      ]);
      
      setClients(clientsData);

      // Lógica de Onboarding: Se carregou e não tem clientes, e o usuário não fechou manualmente antes
      if (clientsData.length === 0) {
         // Verifica localStorage para não mostrar se o usuário já dispensou explicitamente
         const hasSeenOnboarding = localStorage.getItem('adroi_onboarding_seen');
         if (!hasSeenOnboarding) {
             setShowOnboarding(true);
         }
      }

      const contractsMap: Record<string, Contract> = {};
      contractsData.forEach(c => {
        contractsMap[c.client_id] = c;
      });
      setContracts(contractsMap);

    } catch (error) {
      console.error("Failed to load dashboard data");
      toast.error("Falha ao carregar dados do painel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]); // Recarrega sempre que o range de datas mudar

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Fecha o date picker se clicar fora dele
      const target = e.target as HTMLElement;
      
      if (!target.closest('#date-picker-container')) {
        setShowDatePicker(false);
      }

      // Fecha menus de dropdown dos cards
      if (!target.closest('.card-menu-trigger')) {
         setActiveMenuId(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleOpenNewClientModal = () => {
    setClientToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseOnboarding = () => {
      setShowOnboarding(false);
      localStorage.setItem('adroi_onboarding_seen', 'true');
  };

  const handleOnboardingAction = () => {
      handleCloseOnboarding();
      handleOpenNewClientModal();
  };

  const handleEditClient = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleCopyReport = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setCopyingId(client.id);
    
    try {
      const campaigns = await clientService.getCampaigns(client.id, dateRange.start, dateRange.end);
      
      // Formata data bonita para o relatório
      const startDateParts = dateRange.start.split('-');
      const endDateParts = dateRange.end.split('-');
      const periodStr = `${startDateParts[2]}/${startDateParts[1]} - ${endDateParts[2]}/${endDateParts[1]}`;

      let text = `Olá, boa tarde doutor @${client.name || 'Cliente'}\n` +
        `Tudo bem?\n\n` +
        `📊 Passando aqui para compartilhar o relatório da nossa campanha de tráfego. Segue um resumo dos principais resultados\n\n` +
        `Período (${periodStr}).\n\n`;

      const activeCampaigns = campaigns.filter(c => c.spend > 0);
      
      if (activeCampaigns.length > 0) {
        activeCampaigns.forEach(c => {
          const cpl = c.leads > 0 ? c.spend / c.leads : 0;
          text += `${c.name}\n\n` +
            `* Investimento: R$ ${c.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `* Leads: ${c.leads}\n` +
            `* Custo por leads: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
        });
      } else {
        text += `_Sem campanhas ativas com investimento no período._\n\n`;
      }

      text += `Valor total investido: R$ ${client.total_spend?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      await navigator.clipboard.writeText(text);
      setCopiedId(client.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Relatório copiado para a área de transferência!');
    } catch (err) {
      console.error("Erro ao gerar relatório", err);
      toast.error('Erro ao gerar relatório.');
    } finally {
      setCopyingId(null);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setActiveMenuId(prev => prev === clientId ? null : clientId);
  };

  const handleStatusChange = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setActiveMenuId(null);

    setTimeout(async () => {
        const newStatus = client.status === 'active' ? 'paused' : 'active';
        const actionName = newStatus === 'active' ? 'ativar' : 'pausar';
        
        if (!window.confirm(`Deseja realmente ${actionName} o cliente ${client.company}?`)) return;

        try {
          await clientService.updateClientStatus(client.id, newStatus);
          toast.success(`Cliente ${newStatus === 'active' ? 'ativado' : 'pausado'} com sucesso.`);
          fetchData(); 
        } catch (error) {
          toast.error(`Erro ao atualizar status: ${error}`);
        }
    }, 100);
  };

  const handleDeleteClient = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setActiveMenuId(null);

    setTimeout(async () => {
        if (!window.confirm(`ATENÇÃO: Deseja EXCLUIR PERMANENTEMENTE o cliente ${client.company}?\n\nIsso removerá todos os dados e histórico associado (Campanhas, Métricas, Tarefas, Contratos). Essa ação não pode ser desfeita.`)) return;

        try {
          await clientService.deleteClient(client.id);
          toast.success('Cliente excluído com sucesso.');
          fetchData(); 
        } catch (error: any) {
          console.error(error);
          toast.error(`Erro ao excluir cliente: ${error.message || error}`);
        }
    }, 100);
  };

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(filter.toLowerCase()) || 
    (c.company?.toLowerCase() || '').includes(filter.toLowerCase())
  );

  const totalRevenue = clients.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0);
  const activeClients = clients.filter(c => c.status === 'active').length;
  const contractsExpiringSoon = Object.values(contracts).filter(
    (c: Contract) => (c.days_remaining !== undefined) && c.days_remaining >= 0 && c.days_remaining <= 30
  ).length;

  // Labels map for display
  const dateOptionLabels: Record<string, string> = {
    '7D': 'Últimos 7 dias',
    '14D': 'Últimos 14 dias',
    '30D': 'Últimos 30 dias',
    'CUSTOM': 'Personalizado'
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
      
      {/* Onboarding Wizard */}
      <OnboardingGuide 
        isOpen={showOnboarding} 
        onClose={handleCloseOnboarding} 
        onStartAction={handleOnboardingAction} 
      />

      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
        clientToEdit={clientToEdit}
      />

      {/* Header Stats - Grid adaptável */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-indigo-600 rounded-xl p-5 md:p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-start mb-1">
             <p className="text-indigo-100 text-xs md:text-sm font-medium">Receita Gerada</p>
             <span className="text-[10px] bg-indigo-500/50 px-2 py-0.5 rounded text-indigo-100 flex items-center gap-1">
               <Calendar size={10} /> {dateOption === 'CUSTOM' ? 'Período' : dateOptionLabels[dateOption]}
             </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</h2>
          <div className="flex items-center gap-2 mt-3 md:mt-4 text-xs md:text-sm bg-indigo-500/30 w-fit px-2 py-1 rounded">
             <TrendingUp size={14} className="md:size-16" />
             <span>Dados em tempo real</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Clientes Ativos</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{activeClients}</h2>
          <div className="flex items-center gap-2 mt-3 md:mt-4 text-xs md:text-sm text-green-600">
             <span>{clients.length} cadastrados</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 shadow-sm sm:col-span-2 md:col-span-1">
          <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Contratos a Renovar</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{contractsExpiringSoon}</h2>
          <div className="flex items-center gap-2 mt-3 md:mt-4 text-xs md:text-sm text-yellow-600">
             <AlertTriangle size={14} className="md:size-16" />
             <span>Nos próximos 30 dias</span>
          </div>
        </div>
      </div>

      {/* Client Portfolio Section */}
      <div className="min-h-[400px]">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">Carteira de Clientes</h3>
                {loading && <Loader2 className="animate-spin text-indigo-600" size={18} />}
             </div>
             <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar">
                <RefreshCw size={18} />
             </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1 z-10">
                {/* Seletor de Data Customizado */}
                <div className="relative w-full sm:w-auto" id="date-picker-container">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(!showDatePicker);
                    }}
                    className="w-full sm:w-[220px] bg-slate-50 border border-slate-300 text-slate-700 py-2.5 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between font-medium hover:bg-slate-100 transition-colors"
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <Calendar size={16} className="text-slate-500 shrink-0" />
                       <span className="truncate">
                         {dateOption === 'CUSTOM' 
                            ? `${dateRange.start.split('-')[2]}/${dateRange.start.split('-')[1]} - ${dateRange.end.split('-')[2]}/${dateRange.end.split('-')[1]}` 
                            : dateOptionLabels[dateOption]
                         }
                       </span>
                     </div>
                     <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {/* Dropdown de Datas e Calendário */}
                   {showDatePicker && (
                     <div className="absolute top-full left-0 mt-2 w-[320px] bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                       
                       {/* Seção 1: Inputs de Data (Calendário) */}
                       <div className="grid grid-cols-2 gap-3 mb-4">
                           <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Início</label>
                             <input 
                              type="date" 
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={dateRange.start}
                              onChange={(e) => {
                                setDateOption('CUSTOM');
                                setDateRange(prev => ({ ...prev, start: e.target.value }));
                              }}
                             />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Fim</label>
                             <input 
                              type="date" 
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={dateRange.end}
                              onChange={(e) => {
                                setDateOption('CUSTOM');
                                setDateRange(prev => ({ ...prev, end: e.target.value }));
                              }}
                             />
                           </div>
                       </div>

                       {/* Seção 2: Filtros Rápidos */}
                       <div className="border-t border-slate-100 pt-3">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Períodos Rápidos</p>
                         <div className="grid grid-cols-3 gap-2">
                           <button
                            onClick={() => setDateOption('7D')}
                            className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '7D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                           >
                             7 dias
                           </button>
                           <button
                            onClick={() => setDateOption('14D')}
                            className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '14D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                           >
                             14 dias
                           </button>
                           <button
                            onClick={() => setDateOption('30D')}
                            className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '30D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                           >
                             30 dias
                           </button>
                         </div>
                       </div>
                       
                       <button 
                        onClick={() => setShowDatePicker(false)}
                        className="w-full mt-4 bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
                       >
                         Aplicar Filtro
                       </button>
                     </div>
                   )}
                </div>

                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por empresa..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
            </div>
            
            <button 
              onClick={handleOpenNewClientModal}
              className="w-full lg:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"
            >
               <Plus size={18} />
               <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* CLIENTS GRID VIEW (3 COLUMNS) */}
        {!loading && filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
             {filteredClients.map((client) => {
                const roas = client.total_spend > 0 ? client.total_revenue / client.total_spend : 0;
                const cpl = client.total_leads > 0 ? client.total_spend / client.total_leads : 0;
                const isCopying = copyingId === client.id;
                const isCopied = copiedId === client.id;

                return (
                  <div 
                    key={client.id} 
                    onClick={() => onSelectClient(client)}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer group flex flex-col relative overflow-hidden"
                  >
                     {/* Status Line Top */}
                     <div className={`h-1 w-full ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                     
                     {/* Card Body */}
                     <div className="p-5 flex-1">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h3 className={`font-bold text-lg text-slate-800 line-clamp-1 ${client.status === 'paused' ? 'opacity-60' : ''}`}>{client.company}</h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                {client.name}
                                {client.status === 'paused' && <span className="bg-slate-100 text-slate-500 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider">Pausado</span>}
                              </p>
                           </div>
                           
                           <div className="card-menu-trigger relative">
                              <button 
                                onClick={(e) => handleMenuToggle(e, client.id)}
                                className={`p-1.5 rounded-lg transition-colors ${activeMenuId === client.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {activeMenuId === client.id && (
                                <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                  <button 
                                    onClick={(e) => handleEditClient(e, client)}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <PenLine size={16} className="text-indigo-600" />
                                    Editar Cliente
                                  </button>
                                  <button 
                                    onClick={(e) => handleStatusChange(e, client)}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    {client.status === 'active' ? <PauseCircle size={16} className="text-amber-500" /> : <PlayCircle size={16} className="text-green-500" />}
                                    {client.status === 'active' ? 'Pausar Cliente' : 'Reativar Cliente'}
                                  </button>
                                  <button 
                                    onClick={(e) => handleDeleteClient(e, client)}
                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                                  >
                                    <Trash2 size={16} />
                                    Excluir Cliente
                                  </button>
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className={`grid grid-cols-2 gap-3 mb-2 ${client.status === 'paused' ? 'opacity-60' : ''}`}>
                           {/* Investimento */}
                           <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                 <div className="p-1 rounded bg-blue-100 text-blue-600">
                                    <DollarSign size={12} />
                                 </div>
                                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Investimento</span>
                              </div>
                              <p className="text-sm font-bold text-slate-800">R$ {client.total_spend?.toLocaleString('pt-BR')}</p>
                           </div>

                           {/* Leads */}
                           <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                 <div className="p-1 rounded bg-orange-100 text-orange-600">
                                    <Users size={12} />
                                 </div>
                                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Leads</span>
                              </div>
                              <p className="text-sm font-bold text-slate-800">{client.total_leads.toLocaleString()}</p>
                           </div>

                           {/* CPL */}
                           <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                 <div className="p-1 rounded bg-purple-100 text-purple-600">
                                    <TrendingUp size={12} />
                                 </div>
                                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Custo/Lead</span>
                              </div>
                              <p className="text-sm font-bold text-slate-800">R$ {cpl.toFixed(2)}</p>
                           </div>

                            {/* ROAS (Mantido para ROI context) */}
                           <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                 <div className="p-1 rounded bg-emerald-100 text-emerald-600">
                                    <PieChart size={12} />
                                 </div>
                                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ROAS</span>
                              </div>
                              <p className={`text-sm font-bold ${roas >= 4 ? 'text-emerald-600' : 'text-slate-800'}`}>{roas.toFixed(2)}x</p>
                           </div>
                        </div>
                     </div>

                     {/* Footer Actions */}
                     <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
                        <button 
                           onClick={(e) => handleCopyReport(e, client)}
                           disabled={isCopying}
                           className={`text-xs font-bold flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${isCopied ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm'}`}
                        >
                           {isCopying ? <Loader2 size={12} className="animate-spin" /> : isCopied ? <Check size={12} /> : <Copy size={12} />}
                           {isCopied ? 'Copiado' : 'Relatório'}
                        </button>

                        <div className="flex items-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                           Ver Dashboard <ChevronRight size={14} />
                        </div>
                     </div>
                  </div>
                );
             })}
          </div>
        ) : (
          !loading && (
             <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center">
               <p className="text-slate-500 font-medium mb-3">Sua carteira está vazia.</p>
               <button 
                  onClick={handleOpenNewClientModal} 
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
               >
                  + Cadastrar Primeiro Cliente
               </button>
               <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
                 Cadastre um cliente para começar a acompanhar métricas de Ads e Offline.
               </p>
             </div>
          )
        )}

        {loading && (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-2" size={30} />
              <p className="text-sm">Carregando carteira...</p>
           </div>
        )}
      </div>
    </div>
  );
};
