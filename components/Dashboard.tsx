import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { contractService } from '../services/contractService';
import { Client, Contract } from '../types';
import { Search, Plus, Filter, MoreVertical, TrendingUp, AlertTriangle, Loader2, RefreshCw, Copy, Check, Calendar } from 'lucide-react';
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Passa o período selecionado para o serviço
      const [clientsData, contractsData] = await Promise.all([
        clientService.getClients(selectedPeriod),
        contractService.getActiveContracts()
      ]);
      
      setClients(clientsData);

      // Map contracts by client_id for easy lookup
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

  // Refetch when selectedPeriod changes
  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const handleCopyReport = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation(); // Evita abrir o detalhe do cliente
    setCopyingId(client.id);
    
    try {
      // Busca detalhes das campanhas para montar o relatório detalhado
      const campaigns = await clientService.getCampaigns(client.id, selectedPeriod);
      
      // Define datas
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - selectedPeriod);
      const periodStr = `${start.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - ${today.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;

      let text = `Olá, boa tarde doutor @${client.name || 'Cliente'}\n` +
        `Tudo bem?\n\n` +
        `📊 Passando aqui para compartilhar o relatório (${selectedPeriod} dias) da nossa campanha de tráfego. Segue um resumo dos principais resultados\n\n` +
        `Período (${periodStr}).\n\n`;

      // Adiciona bloco por campanha
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
      
      // Feedback visual
      setCopiedId(client.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Erro ao gerar relatório", err);
    } finally {
      setCopyingId(null);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(filter.toLowerCase()) || 
    (c.company?.toLowerCase() || '').includes(filter.toLowerCase())
  );

  const totalRevenue = clients.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0);
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  // Calculate contracts expiring soon (less than 30 days)
  const contractsExpiringSoon = Object.values(contracts).filter(
    (c: Contract) => (c.days_remaining !== undefined) && c.days_remaining >= 0 && c.days_remaining <= 30
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-start mb-1">
             <p className="text-indigo-100 text-sm font-medium">Receita Gerada</p>
             <span className="text-[10px] bg-indigo-500/50 px-2 py-0.5 rounded text-indigo-100 flex items-center gap-1">
               <Calendar size={10} /> {selectedPeriod} dias
             </span>
          </div>
          <h2 className="text-3xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</h2>
          <div className="flex items-center gap-2 mt-4 text-sm bg-indigo-500/30 w-fit px-2 py-1 rounded">
             <TrendingUp size={16} />
             <span>Baseado em dados reais</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Clientes Ativos</p>
          <h2 className="text-3xl font-bold text-slate-800">{activeClients}</h2>
          <div className="flex items-center gap-2 mt-4 text-sm text-green-600">
             <span>{clients.length} cadastrados</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Contratos a Renovar</p>
          <h2 className="text-3xl font-bold text-slate-800">{contractsExpiringSoon}</h2>
          <div className="flex items-center gap-2 mt-4 text-sm text-yellow-600">
             <AlertTriangle size={16} />
             <span>Nos próximos 30 dias</span>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <h3 className="text-xl font-bold text-slate-800">Carteira de Clientes</h3>
             {loading && <Loader2 className="animate-spin text-indigo-600" size={20} />}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Seletor de Período */}
            <div className="relative w-full sm:w-auto">
               <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="appearance-none w-full bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
               >
                  <option value={1}>Último dia</option>
                  <option value={7}>Últimos 7 dias</option>
                  <option value={15}>Últimos 15 dias</option>
                  <option value={30}>Últimos 30 dias</option>
                  <option value={60}>Últimos 60 dias</option>
                  <option value={90}>Últimos 90 dias</option>
                  <option value={365}>Este ano</option>
               </select>
               <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
            </div>

            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar">
              <RefreshCw size={18} />
            </button>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"
            >
               <Plus size={18} />
               <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente / Empresa</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">Custo/Lead</th>
                <th className="px-6 py-4 text-right">Invest.</th>
                <th className="px-6 py-4 text-right">Receita</th>
                <th className="px-6 py-4 text-right">ROAS</th>
                <th className="px-6 py-4 text-right">Contrato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && filteredClients.length > 0 && filteredClients.map((client) => {
                const contract = contracts[client.id] || null;
                const roas = client.total_spend > 0 ? client.total_revenue / client.total_spend : 0;
                const cpl = client.total_leads > 0 ? client.total_spend / client.total_leads : 0;
                const isCopying = copyingId === client.id;
                const isCopied = copiedId === client.id;
                
                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelectClient(client)}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{client.company}</p>
                        <p className="text-xs text-slate-500">{client.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block w-2.5 h-2.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-indigo-600">
                      {client.total_leads?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                       R$ {cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">R$ {client.total_spend?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">R$ {client.total_revenue?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${
                         roas >= 4 ? 'bg-green-100 text-green-700' : 
                         roas >= 2 ? 'bg-yellow-100 text-yellow-700' : 
                         'bg-slate-100 text-slate-600'
                       }`}>
                         {roas.toFixed(2)}x
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs">
                      {contract && contract.days_remaining !== undefined && contract.days_remaining < 30 ? (
                        <span className={`font-medium ${contract.days_remaining < 0 ? 'text-red-700' : 'text-red-600'}`}>
                          {contract.days_remaining < 0 ? 'Vencido' : `${contract.days_remaining} dias`}
                        </span>
                      ) : contract ? (
                         <span className="text-green-600 font-medium">Ativo</span>
                      ) : (
                        <span className="text-slate-400 italic">Sem contrato</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => handleCopyReport(e, client)}
                          disabled={isCopying}
                          title="Copiar relatório para WhatsApp"
                          className={`p-2 rounded-full transition-colors ${
                            isCopied 
                            ? 'bg-green-100 text-green-600' 
                            : isCopying 
                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'
                          }`}
                        >
                          {isCopying ? <Loader2 size={18} className="animate-spin" /> : isCopied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        <button className="p-2 hover:bg-slate-200 rounded-full text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
             <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-2" size={30} />
                <p>Carregando carteira de clientes...</p>
             </div>
          )}

          {!loading && filteredClients.length === 0 && (
            <div className="p-20 text-center text-slate-500">
              <p className="mb-4">Nenhum cliente encontrado.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-indigo-600 hover:underline font-medium"
              >
                Cadastre seu primeiro cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};