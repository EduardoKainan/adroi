import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { contractService } from '../services/contractService';
import { Client, Contract } from '../types';
import { Search, Plus, Filter, MoreVertical, TrendingUp, AlertTriangle, Loader2, RefreshCw, Copy, Check, Calendar, ChevronRight, Trash2, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { NewClientModal } from './NewClientModal';

interface DashboardProps {
  onSelectClient: (client: Client) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // Default 30 days
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsData, contractsData] = await Promise.all([
        clientService.getClients(selectedPeriod),
        contractService.getActiveContracts()
      ]);
      
      setClients(clientsData);

      const contractsMap: Record<string, Contract> = {};
      contractsData.forEach(c => {
        contractsMap[c.client_id] = c;
      });
      setContracts(contractsMap);

    } catch (error) {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenuId]);

  const handleCopyReport = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setCopyingId(client.id);
    
    try {
      const campaigns = await clientService.getCampaigns(client.id, selectedPeriod);
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - selectedPeriod);
      const periodStr = `${start.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - ${today.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;

      let text = `Olá, boa tarde doutor @${client.name || 'Cliente'}\n` +
        `Tudo bem?\n\n` +
        `📊 Passando aqui para compartilhar o relatório (${selectedPeriod} dias) da nossa campanha de tráfego. Segue um resumo dos principais resultados\n\n` +
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
    } catch (err) {
      console.error("Erro ao gerar relatório", err);
    } finally {
      setCopyingId(null);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    // Se clicar no mesmo botão, fecha. Se for outro, abre o outro.
    setActiveMenuId(prev => prev === clientId ? null : clientId);
  };

  const handleStatusChange = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    // Fechar menu primeiro para evitar conflitos de UI
    setActiveMenuId(null);

    // Pequeno timeout para garantir que a UI atualizou antes do confirm travar a thread
    setTimeout(async () => {
        const newStatus = client.status === 'active' ? 'paused' : 'active';
        const actionName = newStatus === 'active' ? 'ativar' : 'pausar';
        
        if (!window.confirm(`Deseja realmente ${actionName} o cliente ${client.company}?`)) return;

        try {
          await clientService.updateClientStatus(client.id, newStatus);
          fetchData(); 
        } catch (error) {
          alert(`Erro ao atualizar status: ${error}`);
        }
    }, 100);
  };

  const handleDeleteClient = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    // Fechar menu primeiro
    setActiveMenuId(null);

    // Timeout para evitar que o clique se perca
    setTimeout(async () => {
        if (!window.confirm(`ATENÇÃO: Deseja EXCLUIR PERMANENTEMENTE o cliente ${client.company}?\n\nIsso removerá todos os dados e histórico associado (Campanhas, Métricas, Tarefas, Contratos). Essa ação não pode ser desfeita.`)) return;

        try {
          await clientService.deleteClient(client.id);
          fetchData(); // Atualiza a lista
        } catch (error: any) {
          console.error(error);
          alert(`Erro ao excluir cliente: ${error.message || error}`);
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

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />

      {/* Header Stats - Grid adaptável */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-indigo-600 rounded-xl p-5 md:p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-start mb-1">
             <p className="text-indigo-100 text-xs md:text-sm font-medium">Receita Gerada</p>
             <span className="text-[10px] bg-indigo-500/50 px-2 py-0.5 rounded text-indigo-100 flex items-center gap-1">
               <Calendar size={10} /> {selectedPeriod} dias
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 md:p-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">Carteira de Clientes</h3>
                {loading && <Loader2 className="animate-spin text-indigo-600" size={18} />}
             </div>
             <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar">
                <RefreshCw size={18} />
             </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
                {/* Seletor de Período */}
                <div className="relative w-full sm:w-auto">
                   <select 
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      className="appearance-none w-full bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                   >
                      <option value={1}>Último dia</option>
                      <option value={7}>Últimos 7 dias</option>
                      <option value={15}>Últimos 15 dias</option>
                      <option value={30}>Últimos 30 dias</option>
                      <option value={60}>Últimos 60 dias</option>
                      <option value={90}>Últimos 90 dias</option>
                   </select>
                   <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
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
              onClick={() => setIsModalOpen(true)}
              className="w-full lg:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"
            >
               <Plus size={18} />
               <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Desktop Table - Hidden on Mobile */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente / Contato</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">CPL</th>
                <th className="px-6 py-4 text-right">Invest.</th>
                <th className="px-6 py-4 text-right">Receita</th>
                <th className="px-6 py-4 text-right">ROAS</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && filteredClients.map((client) => {
                const roas = client.total_spend > 0 ? client.total_revenue / client.total_spend : 0;
                const cpl = client.total_leads > 0 ? client.total_spend / client.total_leads : 0;
                const isCopying = copyingId === client.id;
                const isCopied = copiedId === client.id;
                
                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelectClient(client)}>
                    <td className="px-6 py-4">
                      <div className={client.status === 'paused' ? 'opacity-50' : ''}>
                        <p className="font-semibold text-slate-800">{client.company}</p>
                        <p className="text-xs text-slate-500">{client.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block w-2.5 h-2.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} title={client.status}></span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-indigo-600">
                      {client.total_leads?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                       R$ {cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">R$ {client.total_spend?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">R$ {client.total_revenue?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${roas >= 4 ? 'bg-green-100 text-green-700' : roas >= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                         {roas.toFixed(2)}x
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleCopyReport(e, client)}
                          disabled={isCopying}
                          className={`p-2 rounded-full transition-colors ${isCopied ? 'bg-green-100 text-green-600' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                        >
                          {isCopying ? <Loader2 size={18} className="animate-spin" /> : isCopied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => handleMenuToggle(e, client.id)}
                            className={`p-2 rounded-full transition-colors ${activeMenuId === client.id ? 'bg-slate-200 text-slate-700' : 'hover:bg-slate-100 text-slate-400'}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {activeMenuId === client.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Cards Layout */}
        <div className="md:hidden divide-y divide-slate-100 pb-10">
          {!loading && filteredClients.map((client) => {
             const roas = client.total_spend > 0 ? client.total_revenue / client.total_spend : 0;
             const cpl = client.total_leads > 0 ? client.total_spend / client.total_leads : 0;
             const isCopied = copiedId === client.id;

             return (
               <div key={client.id} className={`p-4 active:bg-slate-50 relative ${client.status === 'paused' ? 'bg-slate-50' : ''}`} onClick={() => onSelectClient(client)}>
                  <div className="flex justify-between items-start mb-3 pr-8">
                    <div className={client.status === 'paused' ? 'opacity-60' : ''}>
                      <h4 className="font-bold text-slate-800">{client.company}</h4>
                      <p className="text-xs text-slate-500">{client.name}</p>
                    </div>
                    
                    {/* Action Menu Mobile */}
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                       <button 
                        onClick={(e) => handleCopyReport(e, client)}
                        className={`p-2 rounded-lg ${isCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                       >
                         {isCopied ? <Check size={16} /> : <Copy size={16} />}
                       </button>

                       <div className="relative">
                          <button 
                            onClick={(e) => handleMenuToggle(e, client.id)}
                            className="p-2 rounded-lg bg-slate-100 text-slate-500"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeMenuId === client.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden">
                              <button 
                                onClick={(e) => handleStatusChange(e, client)}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                {client.status === 'active' ? <PauseCircle size={16} className="text-amber-500" /> : <PlayCircle size={16} className="text-green-500" />}
                                {client.status === 'active' ? 'Pausar' : 'Reativar'}
                              </button>
                              <button 
                                onClick={(e) => handleDeleteClient(e, client)}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                              >
                                <Trash2 size={16} />
                                Excluir
                              </button>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                  
                  <div className={`grid grid-cols-2 gap-y-3 gap-x-4 bg-slate-50 p-3 rounded-lg border border-slate-100 ${client.status === 'paused' ? 'opacity-60' : ''}`}>
                     <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Investimento</p>
                        <p className="text-sm font-bold text-slate-700">R$ {client.total_spend?.toLocaleString('pt-BR')}</p>
                     </div>
                     <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Receita</p>
                        <p className="text-sm font-bold text-slate-800">R$ {client.total_revenue?.toLocaleString('pt-BR')}</p>
                     </div>
                     <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Leads / CPL</p>
                        <p className="text-sm font-bold text-indigo-600">{client.total_leads} / R${cpl.toFixed(2)}</p>
                     </div>
                     <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ROAS</p>
                        <p className={`text-sm font-extrabold ${roas >= 2 ? 'text-green-600' : 'text-amber-600'}`}>{roas.toFixed(2)}x</p>
                     </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className={`inline-block w-2 h-2 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                       <span className="text-xs text-slate-400 capitalize">{client.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                     </div>
                     <div className="flex items-center text-xs text-indigo-600 font-bold gap-1">
                        Ver Detalhes <ChevronRight size={14} />
                     </div>
                  </div>
               </div>
             );
          })}
        </div>

        {loading && (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-2" size={30} />
              <p className="text-sm">Carregando carteira...</p>
           </div>
        )}

        {!loading && filteredClients.length === 0 && (
          <div className="p-10 md:p-20 text-center text-slate-500">
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};