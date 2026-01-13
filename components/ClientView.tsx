import React, { useEffect, useState } from 'react';
import { Client, Contract, Campaign, DailyMetric, Deal } from '../types';
import { clientService } from '../services/clientService';
import { contractService } from '../services/contractService';
import { dealService } from '../services/dealService';
import { ArrowUpRight, ArrowDownRight, DollarSign, Target, TrendingUp, AlertTriangle, Calendar, Download, Loader2, Users, ShoppingBag, Plus, Copy, Check, BarChart3, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { NewSaleModal } from './NewSaleModal';

interface ClientViewProps {
  client: Client;
  onBack: () => void;
}

export const ClientView: React.FC<ClientViewProps> = ({ client, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chartData, setChartData] = useState<DailyMetric[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // Default 30 days
  
  // Specific Campaign Analysis State
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignMetrics, setSelectedCampaignMetrics] = useState<DailyMetric[]>([]);
  const [loadingCampaignMetrics, setLoadingCampaignMetrics] = useState(false);

  // Use local state for client to allow instant updates
  const [currentClient, setCurrentClient] = useState<Client>(client);

  // Recalculate KPIs based on current filtered data
  const calculateFilteredStats = () => {
     const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
     const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenue || 0), 0);
     const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
     const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
     const roi = totalSpend > 0 ? (totalRevenue - totalSpend) / totalSpend : 0;

     return { totalSpend, totalRevenue, totalLeads, roas, roi };
  };

  const filteredStats = calculateFilteredStats();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campData, metricsData, contractData, dealsData] = await Promise.all([
        clientService.getCampaigns(currentClient.id, selectedPeriod),
        clientService.getClientMetrics(currentClient.id, selectedPeriod),
        contractService.getClientContract(currentClient.id),
        dealService.getDeals(currentClient.id)
      ]);
      
      setCampaigns(campData);
      setChartData(metricsData);
      setContract(contractData);
      setDeals(dealsData);
      
      // If a campaign was previously selected, refresh its data too
      if (selectedCampaign) {
        handleViewCampaign(selectedCampaign);
      }
      
    } catch (error: any) {
      console.error("Failed to load client details:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCampaign = async (campaign: Campaign) => {
    // If clicking the same campaign, toggle off? No, let's keep it and allow X close.
    // If we click a different one, we switch.
    setLoadingCampaignMetrics(true);
    setSelectedCampaign(campaign);
    try {
      const metrics = await clientService.getSingleCampaignMetrics(campaign.id, selectedPeriod);
      setSelectedCampaignMetrics(metrics);
    } catch (err) {
      console.error("Erro ao carregar métricas da campanha", err);
    } finally {
      setLoadingCampaignMetrics(false);
    }
  };

  // Re-fetch only deals when a new sale is added
  const handleSaleAdded = async () => {
    const dealsData = await dealService.getDeals(currentClient.id);
    setDeals(dealsData);
  };

  useEffect(() => {
    fetchData();
  }, [client.id, selectedPeriod]);

  // If period changes, clear selected campaign to avoid confusion or refetch (handled in fetchData)
  useEffect(() => {
    setSelectedCampaign(null);
  }, [selectedPeriod]);

  const handleCopyReport = () => {
    // Define datas
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - selectedPeriod);
    const periodStr = `${start.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - ${today.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;

    let text = `Olá, boa tarde doutor @${currentClient.name || 'Cliente'}\n` +
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

    text += `Valor total investido: R$ ${filteredStats.totalSpend?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpis = [
    { label: 'Leads (No Período)', value: filteredStats.totalLeads.toLocaleString('pt-BR'), sub: `${selectedPeriod} dias`, trend: 'up', icon: Users, color: 'text-orange-500' },
    { label: 'Investimento', value: `R$ ${filteredStats.totalSpend.toLocaleString('pt-BR')}`, sub: `${selectedPeriod} dias`, trend: 'up', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Receita Gerada', value: `R$ ${filteredStats.totalRevenue.toLocaleString('pt-BR')}`, sub: `${selectedPeriod} dias`, trend: 'up', icon: Target, color: 'text-green-500' },
    { label: 'ROAS Global', value: `${(filteredStats.roas || 0).toFixed(2)}x`, sub: 'Meta: 4.0x', trend: (filteredStats.roas || 0) > 4 ? 'up' : 'down', icon: TrendingUp, color: 'text-purple-500' },
    { label: 'ROI Real', value: `${((filteredStats.roi || 0) * 100).toFixed(1)}%`, sub: 'Desc. custos', trend: 'up', icon: BarChart, color: 'text-emerald-500' },
  ];

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="animate-spin mb-4 text-indigo-600" size={40} />
        <p>Carregando dados do cliente e métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <NewSaleModal 
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSuccess={handleSaleAdded}
        clientId={currentClient.id}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600 mb-2 flex items-center gap-1">
             &larr; Voltar para Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{currentClient.company}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${currentClient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {currentClient.status.toUpperCase()}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Conta de Anúncios: {currentClient.ad_account_id || 'Não vinculado'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
           
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

           {contract && contract.days_remaining !== undefined && contract.days_remaining < 30 && (
             <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-100 whitespace-nowrap">
                <AlertTriangle size={16} />
                <b>{contract.days_remaining < 0 ? 'Contrato Vencido' : `Vence em ${contract.days_remaining} dias`}</b>
             </div>
           )}
           <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleCopyReport}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
                  copied 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title="Copiar resumo para WhatsApp"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Resumo'}
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm whitespace-nowrap">
                <Download size={16} />
                PDF
              </button>
           </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg bg-slate-50 ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
              <span className={`flex items-center text-xs font-medium ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.sub}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium">{kpi.label}</h3>
              <p className="text-2xl font-bold text-slate-800 mt-1">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Conditional Specific Campaign Chart */}
      {selectedCampaign && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-lg relative animate-in slide-in-from-top-4 duration-300">
           <button 
             onClick={() => setSelectedCampaign(null)}
             className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
           >
             <XCircle size={24} />
           </button>
           
           <div className="flex flex-col mb-6">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Análise Detalhada</span>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {selectedCampaign.name}
              </h3>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                 <span>ROAS Médio: <b>{selectedCampaign.roas.toFixed(2)}x</b></span>
                 <span>Investimento Total: <b>R$ {selectedCampaign.spend.toLocaleString('pt-BR')}</b></span>
              </div>
           </div>

           {loadingCampaignMetrics ? (
             <div className="h-64 flex items-center justify-center text-slate-400">
               <Loader2 className="animate-spin mb-2" size={32} />
             </div>
           ) : selectedCampaignMetrics.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedCampaignMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCampRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCampSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [`R$ ${value}`, '']}
                  />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCampRev)" />
                  <Area type="monotone" dataKey="spend" name="Investimento" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorCampSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
           ) : (
             <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
               <p>Sem dados históricos para esta campanha no período selecionado.</p>
             </div>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts (Aggregated) - Only show if no specific campaign selected to save space, OR keep it? Let's keep it but maybe dim it if focussed on campaign. For now, keep as is. */}
        <div className={`lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-opacity ${selectedCampaign ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Receita vs Investimento (Global)</h3>
            <span className="text-xs font-medium text-slate-400">Últimos {selectedPeriod} dias</span>
          </div>
          
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`R$ ${value}`, '']}
                  />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="spend" name="Investimento" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
               <p>Sem dados de métricas para este período.</p>
             </div>
          )}
        </div>

        {/* Manual Sales Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag size={20} className="text-indigo-600" />
                Vendas Manuais
              </h3>
              <button 
                onClick={() => setIsSaleModalOpen(true)}
                className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                title="Registrar Venda"
              >
                <Plus size={20} />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 max-h-80 custom-scrollbar">
              {deals.length > 0 ? (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <div key={deal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-slate-700">{deal.description}</span>
                          <span className="text-green-600 font-bold text-sm">R$ {deal.total_value.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-slate-500">
                          <span>{new Date(deal.date).toLocaleDateString('pt-BR')}</span>
                          <span>{deal.quantity}x R$ {deal.unit_value}</span>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center text-sm">
                   <ShoppingBag size={32} className="mb-2 opacity-30" />
                   <p>Nenhuma venda manual registrada.</p>
                   <button onClick={() => setIsSaleModalOpen(true)} className="text-indigo-600 font-medium hover:underline mt-2">Registrar agora</button>
                </div>
              )}
           </div>
           
           {deals.length > 0 && (
             <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Vendas Manuais</span>
                <span className="font-bold text-slate-800">
                   R$ {deals.reduce((acc, d) => acc + d.total_value, 0).toLocaleString()}
                </span>
             </div>
           )}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Campanhas Ativas</h3>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{selectedPeriod} dias</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-4">Campanha</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Leads</th>
                     <th className="px-6 py-4 text-right">CPL</th>
                     <th className="px-6 py-4 text-right">Compras</th>
                     <th className="px-6 py-4 text-right">Custo/Compra</th>
                     <th className="px-6 py-4 text-right">Invest.</th>
                     <th className="px-6 py-4 text-right">Receita (Ads)</th>
                     <th className="px-6 py-4 text-right">ROAS</th>
                     <th className="px-6 py-4 text-right">CTR</th>
                     <th className="px-6 py-4 text-center">Gráfico</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {campaigns.length > 0 ? campaigns.map((camp) => {
                     const cpl = camp.leads > 0 ? camp.spend / camp.leads : 0;
                     const cps = camp.purchases > 0 ? camp.spend / camp.purchases : 0;
                     const isSelected = selectedCampaign?.id === camp.id;

                     return (
                     <tr 
                        key={camp.id} 
                        className={`transition-colors ${isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-slate-50'}`}
                     >
                        <td className="px-6 py-4 font-medium text-slate-700">{camp.name}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-semibold ${camp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {camp.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right text-indigo-600 font-medium">{camp.leads?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right text-slate-600">R$ {cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        
                        <td className="px-6 py-4 text-right text-emerald-600 font-medium">{camp.purchases?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right text-slate-600">R$ {cps.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                        <td className="px-6 py-4 text-right">R$ {camp.spend?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right">R$ {camp.revenue?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right">
                           <span className={`font-bold ${camp.roas >= 4 ? 'text-green-600' : camp.roas >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {Number(camp.roas).toFixed(2)}x
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500">
                           {camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(2) : 0}%
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => handleViewCampaign(camp)}
                             className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                             title="Ver Performance Histórica"
                           >
                             <BarChart3 size={18} />
                           </button>
                        </td>
                     </tr>
                  );}) : (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-slate-500">
                        Nenhuma campanha encontrada para este cliente neste período.
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};