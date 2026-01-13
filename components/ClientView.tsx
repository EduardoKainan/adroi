import React, { useEffect, useState } from 'react';
import { Client, Contract, Campaign, DailyMetric, Deal } from '../types';
import { clientService, getLocalDateString } from '../services/clientService';
import { contractService } from '../services/contractService';
import { dealService } from '../services/dealService';
import { ArrowUpRight, ArrowDownRight, DollarSign, Target, TrendingUp, AlertTriangle, Calendar, Download, Loader2, Users, ShoppingBag, Plus, Copy, Check, BarChart, PieChart, Filter, ChevronLeft, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar, Line, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { NewSaleModal } from './NewSaleModal';

interface ClientViewProps {
  client: Client;
  onBack: () => void;
}

type DateRangeOption = '7D' | '14D' | '30D' | 'CUSTOM';

export const ClientView: React.FC<ClientViewProps> = ({ client, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chartData, setChartData] = useState<DailyMetric[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeChart, setActiveChart] = useState<'finance' | 'acquisition' | 'funnel'>('finance');
  
  const [currentClient, setCurrentClient] = useState<Client>(client);

  // Date State
  const [dateOption, setDateOption] = useState<DateRangeOption>('30D');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calcula datas iniciais
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (dateOption === 'CUSTOM') return;

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

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#date-picker-container')) {
            setShowDatePicker(false);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    if (!dateRange.start || !dateRange.end) return;
    
    setLoading(true);
    try {
      const startDateStr = dateRange.start;
      const endDateStr = dateRange.end;

      const [campData, metricsData, contractData, dealsData] = await Promise.all([
        clientService.getCampaigns(currentClient.id, startDateStr, endDateStr),
        clientService.getClientMetrics(currentClient.id, startDateStr, endDateStr),
        contractService.getClientContract(currentClient.id),
        dealService.getDeals(currentClient.id)
      ]);
      
      setCampaigns(campData);
      setChartData(metricsData);
      setContract(contractData);
      setDeals(dealsData);
    } catch (error: any) {
      console.error("Failed to load client details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleAdded = async () => {
    const dealsData = await dealService.getDeals(currentClient.id);
    setDeals(dealsData);
  };

  useEffect(() => {
    fetchData();
  }, [client.id, dateRange]);

  const acquisitionChartData = chartData.map(item => ({
    ...item,
    cpl: item.leads > 0 ? item.spend / item.leads : 0
  }));

  const funnelData = [
    { name: 'Impressões', value: campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0), fill: 'url(#gradImpressions)' },
    { name: 'Cliques', value: campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0), fill: 'url(#gradClicks)' },
    { name: 'Leads', value: campaigns.reduce((acc, c) => acc + (c.leads || 0), 0), fill: 'url(#gradLeads)' },
    { name: 'Vendas', value: campaigns.reduce((acc, c) => acc + (c.purchases || 0), 0), fill: 'url(#gradSales)' }
  ];

  const handleCopyReport = () => {
    const startDateParts = dateRange.start.split('-');
    const endDateParts = dateRange.end.split('-');
    const periodStr = `${startDateParts[2]}/${startDateParts[1]} - ${endDateParts[2]}/${endDateParts[1]}`;
    const daysDiff = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 3600 * 24));

    let text = `Olá, @${currentClient.name || 'Cliente'}\n` +
      `📊 Relatório (${daysDiff} dias)\n\n` +
      `Período: ${periodStr}\n\n`;

    const activeCampaigns = campaigns.filter(c => c.spend > 0);
    if (activeCampaigns.length > 0) {
      activeCampaigns.forEach(c => {
        const cpl = c.leads > 0 ? c.spend / c.leads : 0;
        text += `*${c.name}*\n` +
          `- Investimento: R$ ${c.spend.toLocaleString('pt-BR')}\n` +
          `- Leads: ${c.leads}\n` +
          `- CPL: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
      });
    }

    text += `Total Investido: R$ ${filteredStats.totalSpend?.toLocaleString('pt-BR')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calcula a diferença de dias para exibir nos KPIs
  const daysDiff = dateRange.start && dateRange.end 
    ? Math.max(0, Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 3600 * 24)))
    : 30;

  const kpis = [
    { label: 'Leads', value: filteredStats.totalLeads.toLocaleString('pt-BR'), sub: `${daysDiff}d`, trend: 'up', icon: Users, color: 'text-orange-500' },
    { label: 'Investido', value: `R$ ${filteredStats.totalSpend.toLocaleString('pt-BR')}`, sub: `${daysDiff}d`, trend: 'up', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Receita', value: `R$ ${filteredStats.totalRevenue.toLocaleString('pt-BR')}`, sub: `${daysDiff}d`, trend: 'up', icon: Target, color: 'text-green-500' },
    { label: 'ROAS', value: `${(filteredStats.roas || 0).toFixed(2)}x`, sub: 'Meta 4x', trend: (filteredStats.roas || 0) > 4 ? 'up' : 'down', icon: TrendingUp, color: 'text-purple-500' },
    { label: 'ROI Real', value: `${((filteredStats.roi || 0) * 100).toFixed(1)}%`, sub: 'Final', trend: 'up', icon: BarChart, color: 'text-emerald-500' },
  ];

  const CustomFunnelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const index = funnelData.findIndex(item => item.name === data.name);
      const prevItem = index > 0 ? funnelData[index - 1] : null;
      let conversionRate = prevItem && prevItem.value > 0 ? (data.value / prevItem.value) * 100 : 0;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-slate-800">{data.name}</p>
          <p className="text-indigo-600 font-semibold">{data.value.toLocaleString()}</p>
          {prevItem && <p className="mt-1 text-[10px] text-slate-500 border-t pt-1">Conversão: {conversionRate.toFixed(2)}%</p>}
        </div>
      );
    }
    return null;
  };

  const dateOptionLabels: Record<string, string> = {
    '7D': 'Últimos 7 dias',
    '14D': 'Últimos 14 dias',
    '30D': 'Últimos 30 dias',
    'CUSTOM': 'Personalizado'
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="animate-spin mb-4 text-indigo-600" size={40} />
        <p>Acessando dados de performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <NewSaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onSuccess={handleSaleAdded} clientId={currentClient.id} />

      {/* Header - Compacto no Mobile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <button onClick={onBack} className="text-xs md:text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium">
             <ChevronLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 truncate max-w-[200px] md:max-w-none">{currentClient.company}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold ${currentClient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {currentClient.status.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
           
           {/* Seletor de Data Customizado (Igual ao Dashboard) */}
           <div className="relative w-full sm:w-auto" id="date-picker-container">
             <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
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
             
             {showDatePicker && (
               <div className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                 
                 {/* Inputs de Data */}
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

                 {/* Botões Rápidos */}
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

           <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleCopyReport} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Relatório'}
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">
                <Download size={14} /> PDF
              </button>
           </div>
        </div>
      </div>

      {/* KPI Grid - 2 cols on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${idx === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg bg-slate-50 ${kpi.color}`}>
                <kpi.icon size={18} />
              </div>
              <span className={`flex items-center text-[10px] font-bold ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.sub}
              </span>
            </div>
            <div className="mt-3 md:mt-4">
              <h3 className="text-slate-500 text-[10px] md:text-sm font-medium uppercase tracking-wider">{kpi.label}</h3>
              <p className="text-lg md:text-2xl font-bold text-slate-800 mt-1">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800">Performance Detalhada</h3>
            
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {['finance', 'acquisition', 'funnel'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setActiveChart(type as any)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase ${activeChart === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {type === 'finance' ? 'Financeiro' : type === 'acquisition' ? 'Aquisição' : 'Funil'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === 'finance' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="spend" name="Invest." stroke="#3b82f6" fill="url(#colorSpend)" />
                </AreaChart>
              ) : activeChart === 'acquisition' ? (
                <ComposedChart data={acquisitionChartData}>
                  <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[2]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={10} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#f97316" radius={[4, 4, 0, 0]} barSize={15} />
                  <Line yAxisId="right" type="monotone" dataKey="cpl" name="CPL" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              ) : (
                <FunnelChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <defs>
                    <filter id="shadow" height="200%"><feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.1"/></filter>
                    <linearGradient id="gradImpressions" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4338ca" /><stop offset="50%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4338ca" /></linearGradient>
                    <linearGradient id="gradClicks" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1e40af" /><stop offset="50%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1e40af" /></linearGradient>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#b45309" /><stop offset="50%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#b45309" /></linearGradient>
                    <linearGradient id="gradSales" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#047857" /><stop offset="50%" stopColor="#34d399" /><stop offset="100%" stopColor="#047857" /></linearGradient>
                  </defs>
                  <Tooltip content={<CustomFunnelTooltip />} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive filter="url(#shadow)">
                    <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} fontWeight={600} />
                  </Funnel>
                </FunnelChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag size={18} className="text-indigo-600" />
                Vendas Offline
              </h3>
              <button onClick={() => setIsSaleModalOpen(true)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Plus size={18} /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-1 max-h-60 md:max-h-80 custom-scrollbar space-y-3">
              {deals.length > 0 ? deals.map(deal => (
                <div key={deal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                   <div>
                      <p className="font-bold text-slate-700 text-xs md:text-sm">{deal.description}</p>
                      <p className="text-[10px] text-slate-500">{new Date(deal.date).toLocaleDateString('pt-BR')}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-green-600 font-extrabold text-xs md:text-sm">R$ {deal.total_value.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400">{deal.quantity} un.</p>
                   </div>
                </div>
              )) : (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-center italic text-xs">
                   <p>Nenhuma venda registrada.</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Campaigns - Responsive Table or Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base md:text-lg font-bold text-slate-800">Canais de Aquisição</h3>
            <span className="text-[10px] bg-white px-2 py-1 rounded border font-bold text-slate-500 uppercase tracking-tighter">Performance Ativa</span>
         </div>

         {/* Desktop Campaign Table */}
         <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-[10px] tracking-widest">
                  <tr>
                     <th className="px-6 py-4">Campanha</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-right">Leads</th>
                     <th className="px-6 py-4 text-right">CPL</th>
                     <th className="px-6 py-4 text-right">Compras</th>
                     <th className="px-6 py-4 text-right">Invest.</th>
                     <th className="px-6 py-4 text-right">Receita</th>
                     <th className="px-6 py-4 text-right">ROAS</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {campaigns.map((camp) => {
                     const cpl = camp.leads > 0 ? camp.spend / camp.leads : 0;
                     return (
                     <tr key={camp.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-700">{camp.name}</td>
                        <td className="px-6 py-4 text-center">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold ${camp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{camp.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-indigo-600 font-bold">{camp.leads?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-slate-600">R$ {cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-bold">{camp.purchases || 0}</td>
                        <td className="px-6 py-4 text-right font-medium">R$ {camp.spend?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold">R$ {camp.revenue?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-indigo-700">{Number(camp.roas).toFixed(2)}x</td>
                     </tr>
                  );})}
               </tbody>
            </table>
         </div>

         {/* Mobile/Tablet Campaign Cards */}
         <div className="lg:hidden divide-y divide-slate-100">
            {campaigns.map((camp) => {
              const cpl = camp.leads > 0 ? camp.spend / camp.leads : 0;
              return (
                <div key={camp.id} className="p-4 space-y-3">
                   <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm flex-1 pr-4">{camp.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${camp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{camp.status}</span>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                         <p className="text-[9px] text-slate-400 uppercase font-bold">Leads</p>
                         <p className="text-xs font-bold text-indigo-600">{camp.leads}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                         <p className="text-[9px] text-slate-400 uppercase font-bold">CPL</p>
                         <p className="text-xs font-bold text-slate-700">R$ {cpl.toFixed(2)}</p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded border border-indigo-100 text-center">
                         <p className="text-[9px] text-indigo-400 uppercase font-bold">ROAS</p>
                         <p className="text-xs font-black text-indigo-700">{Number(camp.roas).toFixed(2)}x</p>
                      </div>
                   </div>
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Investido: <b className="text-slate-700">R$ {camp.spend.toLocaleString()}</b></span>
                      <span className="text-slate-500 font-medium">Vendas: <b className="text-emerald-600">{camp.purchases || 0}</b></span>
                   </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};