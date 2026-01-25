
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Client, Contract, Campaign, DailyMetric, Deal, Insight, CommercialActivity } from '../types';
import { clientService, getLocalDateString } from '../services/clientService';
import { contractService } from '../services/contractService';
import { dealService } from '../services/dealService';
import { commercialService } from '../services/commercialService';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { DollarSign, Target, TrendingUp, Calendar, Download, Loader2, Users, ShoppingBag, Plus, Copy, Check, BarChart, ChevronLeft, ChevronDown, Sparkles, PieChart, Link, ExternalLink, FileText, Briefcase, Search, Activity, Trash2, PenLine } from 'lucide-react';
import { NewSaleModal } from './NewSaleModal';
import { InsightsFeed } from './InsightsFeed';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { toast } from 'sonner';

interface ClientViewProps {
  client: Client;
  clients?: Client[]; // Lista completa para o dropdown
  onClientSwitch?: (client: Client) => void; // Função para trocar
  onBack: () => void;
}

type DateRangeOption = '7D' | '14D' | '30D' | 'CUSTOM';

// Componentes de Skeleton para carregamento visual
const SkeletonPulse: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
);

const HeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
    <div className="space-y-3">
      <SkeletonPulse className="h-4 w-24" />
      <div className="flex items-center gap-3">
        <SkeletonPulse className="h-8 w-48" />
        <SkeletonPulse className="h-5 w-16 rounded-full" />
      </div>
    </div>
    <div className="flex gap-2">
      <SkeletonPulse className="h-10 w-40" />
      <SkeletonPulse className="h-10 w-24" />
      <SkeletonPulse className="h-10 w-24" />
    </div>
  </div>
);

const KPISkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm ${i === 5 ? 'col-span-2 md:col-span-1' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <SkeletonPulse className="h-8 w-8 rounded-lg" />
          <SkeletonPulse className="h-4 w-12" />
        </div>
        <SkeletonPulse className="h-3 w-20 mb-2" />
        <SkeletonPulse className="h-8 w-32" />
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
            <SkeletonPulse className="h-6 w-48" />
            </div>
            <div className="flex-1 w-full bg-slate-50 rounded-lg flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
        </div>
    ))}
  </div>
);

const SalesSkeleton = () => (
  <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-[300px] flex flex-col mb-6">
    <div className="flex justify-between items-center mb-6">
      <SkeletonPulse className="h-6 w-32" />
      <SkeletonPulse className="h-8 w-8" />
    </div>
    <div className="space-y-4 flex-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
          <div className="space-y-2">
            <SkeletonPulse className="h-4 w-32" />
            <SkeletonPulse className="h-3 w-20" />
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-slate-200 flex justify-between">
      <SkeletonPulse className="h-6 w-48" />
      <SkeletonPulse className="h-6 w-32" />
    </div>
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <SkeletonPulse key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

export const ClientView: React.FC<ClientViewProps> = ({ client, clients = [], onClientSwitch, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chartData, setChartData] = useState<DailyMetric[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  
  // Dados de CRM
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<CommercialActivity[]>([]);
  
  // UI State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null); // Estado para edição
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [crmListTab, setCrmListTab] = useState<'deals' | 'activities'>('deals');
  
  // Header Dropdown State
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // AI Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(true); // Default true se tiver insights
  
  const [currentClient, setCurrentClient] = useState<Client>(client);

  // Date State
  const [dateOption, setDateOption] = useState<DateRangeOption>('30D');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sincroniza o currentClient quando a prop muda (ex: troca pelo pai)
  useEffect(() => {
    setCurrentClient(client);
  }, [client]);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#date-picker-container')) {
            setShowDatePicker(false);
        }
        if (dropdownRef.current && !dropdownRef.current.contains(target)) {
            setIsClientDropdownOpen(false);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const calculateFilteredStats = () => {
     // 1. Ads Metrics
     const adSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
     const adRevenue = campaigns.reduce((acc, c) => acc + (c.revenue || 0), 0);
     const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);

     // 2. Offline Metrics (Filtered by date)
     const offlineRevenue = deals
        .filter(d => d.date >= dateRange.start && d.date <= dateRange.end)
        .reduce((acc, d) => acc + (d.total_value || 0), 0);

     // 3. Blended Totals
     const totalRevenue = adRevenue + offlineRevenue;
     const roas = adSpend > 0 ? totalRevenue / adSpend : 0;
     const roi = adSpend > 0 ? (totalRevenue - adSpend) / adSpend : 0;

     return { totalSpend: adSpend, totalRevenue, adRevenue, offlineRevenue, totalLeads, roas, roi };
  };

  const filteredStats = calculateFilteredStats();

  const fetchData = async () => {
    if (!dateRange.start || !dateRange.end) return;
    
    setLoading(true);
    setChartsReady(false);

    try {
      const startDateStr = dateRange.start;
      const endDateStr = dateRange.end;

      const promises: Promise<any>[] = [
        clientService.getCampaigns(currentClient.id, startDateStr, endDateStr),
        clientService.getClientMetrics(currentClient.id, startDateStr, endDateStr),
        contractService.getClientContract(currentClient.id),
        dealService.getDeals(currentClient.id), // Retorna todos, filtramos localmente para a lista lateral
        aiAnalysisService.getSavedInsights(currentClient.id),
        // Adicionamos sempre o fetch de activities, independente do flag, para garantir que se houver dados, mostre.
        commercialService.getActivities(currentClient.id)
      ];

      const results = await Promise.all(promises);
      
      setCampaigns(results[0]);
      setChartData(results[1]);
      setContract(results[2]);
      setDeals(results[3]);
      setInsights(results[4]);
      setActivities(results[5] || []);
      
    } catch (error: any) {
      console.error("Failed to load client details:", error);
      toast.error("Falha ao carregar detalhes do cliente.");
    } finally {
      setLoading(false);
      setTimeout(() => setChartsReady(true), 150);
    }
  };

  const handleSaleAdded = async () => {
    // Recarrega apenas as deals para atualizar a lista e o cálculo
    const dealsData = await dealService.getDeals(currentClient.id);
    setDeals(dealsData);
    setDealToEdit(null); // Limpa edição
  };

  const handleEditDeal = (deal: Deal) => {
    setDealToEdit(deal);
    setIsSaleModalOpen(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (confirm("Tem certeza que deseja excluir esta venda?")) {
        try {
            await dealService.deleteDeal(dealId);
            const dealsData = await dealService.getDeals(currentClient.id);
            setDeals(dealsData);
            toast.success("Venda excluída.");
        } catch (error) {
            console.error("Erro ao deletar venda", error);
            toast.error("Erro ao excluir venda.");
        }
    }
  };

  const handleOpenNewSale = () => {
    setDealToEdit(null);
    setIsSaleModalOpen(true);
  };

  // --- Função para chamar IA e Salvar ---
  const handleGenerateInsights = async () => {
     if (insights.length > 0 && !showInsights) {
       setShowInsights(true);
       return;
     }

     setLoadingInsights(true);
     setShowInsights(true);
     
     // Atualiza o client com as métricas MISTAS (Blended) para enviar ao AI
     const clientWithCurrentStats: Client = {
        ...currentClient,
        total_spend: filteredStats.totalSpend,
        total_revenue: filteredStats.totalRevenue, // Blended
        total_leads: filteredStats.totalLeads,
        roas: filteredStats.roas // Blended
     };

     try {
       const generatedInsights = await aiAnalysisService.generateInsights(clientWithCurrentStats, campaigns, chartData);
       
       if (generatedInsights.length > 0 && !generatedInsights[0].title.includes("Indisponível")) {
           await aiAnalysisService.saveInsights(currentClient.id, generatedInsights);
           const saved = await aiAnalysisService.getSavedInsights(currentClient.id);
           setInsights(saved);
           toast.success("Análise de IA concluída.");
       } else {
           setInsights(generatedInsights);
           toast.error("IA Indisponível no momento.");
       }
     } catch (e) {
       console.error("Erro ao gerar insights", e);
       toast.error("Erro ao gerar análise.");
     } finally {
       setLoadingInsights(false);
     }
  };

  const handleDismissInsight = async (id: string) => {
    try {
        await aiAnalysisService.deleteInsight(id);
        setInsights(prev => prev.filter(i => i.id !== id));
    } catch (error) {
        console.error("Erro ao excluir insight", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentClient.id, dateRange]);

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

    text += `\n---------\n`;
    text += `💰 Resumo Financeiro\n`;
    text += `Investimento: R$ ${filteredStats.totalSpend?.toLocaleString('pt-BR')}\n`;
    text += `Receita (Ads + Manual): R$ ${filteredStats.totalRevenue?.toLocaleString('pt-BR')}\n`;
    text += `ROAS Misto: ${filteredStats.roas.toFixed(2)}x`;

    if (currentClient.crm_enabled) {
        const periodActivities = activities.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
        
        // --- ATUALIZAÇÃO: Cálculo usando 'quantity' ---
        // Se quantity for undefined, assume 1. Se for 0, usa 0.
        const meetings = periodActivities.filter(a => a.type === 'meeting').reduce((acc, a) => acc + (a.quantity !== undefined ? a.quantity : 1), 0);
        const proposals = periodActivities.filter(a => a.type === 'proposal').reduce((acc, a) => acc + (a.quantity !== undefined ? a.quantity : 1), 0);
        const proposalValue = periodActivities.filter(a => a.type === 'proposal').reduce((acc, p) => acc + (p.value || 0), 0);
        
        text += `\n\n🎯 Funil Comercial\n`;
        text += `- Reuniões Realizadas: ${meetings}\n`;
        text += `- Propostas Enviadas: ${proposals} (R$ ${proposalValue.toLocaleString('pt-BR')})\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/report/${currentClient.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const daysDiff = dateRange.start && dateRange.end 
    ? Math.max(0, Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 3600 * 24)))
    : 30;

  const kpis = [
    { label: 'Leads', value: filteredStats.totalLeads.toLocaleString('pt-BR'), sub: `${daysDiff}d`, trend: 'up', icon: Users, color: 'text-orange-500' },
    { label: 'Investido', value: `R$ ${filteredStats.totalSpend.toLocaleString('pt-BR')}`, sub: `${daysDiff}d`, trend: 'up', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Receita Total', value: `R$ ${filteredStats.totalRevenue.toLocaleString('pt-BR')}`, sub: `Ads: ${(filteredStats.adRevenue/1000).toFixed(1)}k | Manual: ${(filteredStats.offlineRevenue/1000).toFixed(1)}k`, trend: 'up', icon: Target, color: 'text-green-500' },
    { label: 'ROAS Misto', value: `${(filteredStats.roas || 0).toFixed(2)}x`, sub: 'Meta 4x', trend: (filteredStats.roas || 0) > 4 ? 'up' : 'down', icon: PieChart, color: 'text-purple-500' },
    { label: 'ROI Real', value: `${((filteredStats.roi || 0) * 100).toFixed(1)}%`, sub: 'Final', trend: 'up', icon: BarChart, color: 'text-emerald-500' },
  ];

  // --- ECHARTS CONFIGURATIONS ---

  // 1. Finance Chart
  const getFinanceOption = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return {};

    // 1. Gerar array de datas completo para o eixo X
    const allDates: string[] = [];
    let curr = new Date(dateRange.start + 'T12:00:00'); // evita timezone shift
    const end = new Date(dateRange.end + 'T12:00:00');
    
    while (curr <= end) {
        // Garantir formato YYYY-MM-DD localmente
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        allDates.push(`${year}-${month}-${day}`);
        curr.setDate(curr.getDate() + 1);
    }

    // 2. Mapear dados existentes (Ads) por data
    const adDataMap: Record<string, DailyMetric> = {};
    chartData.forEach(d => { adDataMap[d.date] = d; });

    // 3. Mapear dados manuais (Vendas) por data
    const manualRevenueMap: Record<string, number> = {};
    deals.filter(d => d.date >= dateRange.start && d.date <= dateRange.end).forEach(d => {
        if (!manualRevenueMap[d.date]) manualRevenueMap[d.date] = 0;
        manualRevenueMap[d.date] += Number(d.total_value);
    });

    // 4. Construir vetores alinhados
    const datesLabels = allDates.map(d => `${d.split('-')[2]}/${d.split('-')[1]}`); // DD/MM
    const spendData = allDates.map(d => adDataMap[d]?.spend || 0);
    const adRevenueData = allDates.map(d => adDataMap[d]?.revenue || 0);
    const manualRevenueData = allDates.map(d => manualRevenueMap[d] || 0);
    
    const totalRevenueData = allDates.map((d, i) => adRevenueData[i] + manualRevenueData[i]);

    return {
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          let res = `<div class="font-bold mb-1 border-b border-slate-100 pb-1 text-slate-700">Dia ${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const val = param.value !== undefined ? param.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
            
            // Cor bolinha
            const color = typeof param.color === 'string' ? param.color : (param.color?.colorStops?.[0]?.color || param.color); 

            res += `<div class="flex items-center gap-2 text-xs py-0.5">
               <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
               <span class="text-slate-500">${param.seriesName}:</span> <span class="font-bold text-slate-700">${val}</span>
            </div>`;
          });
          return res;
        }
      },
      legend: { 
          data: ['Receita Total', 'Investimento', 'Receita Ads', 'Receita Manual'], 
          bottom: 0,
          itemGap: 20
      },
      grid: { left: '2%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: [{ 
          type: 'category', 
          boundaryGap: false, 
          data: datesLabels, 
          axisLine: { show: false }, 
          axisTick: { show: false } 
      }],
      yAxis: [{ type: 'value', splitLine: { lineStyle: { type: 'dashed' } } }],
      series: [
        {
          name: 'Receita Total',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#10b981' }, // Emerald
          areaStyle: { opacity: 0.1, color: '#10b981' },
          data: totalRevenueData,
          z: 1 // Fundo
        },
        {
          name: 'Investimento',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#3b82f6' }, // Blue
          areaStyle: { opacity: 0.1, color: '#3b82f6' },
          data: spendData,
          z: 2
        },
        {
            name: 'Receita Ads',
            type: 'line',
            smooth: true,
            lineStyle: { width: 2, color: '#94a3b8', type: 'dashed' }, // Slate
            data: adRevenueData,
            z: 3
        },
        {
            name: 'Receita Manual',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2, color: '#8b5cf6', type: 'solid' }, // Violet Solid (mais visível)
            itemStyle: { color: '#8b5cf6' },
            data: manualRevenueData,
            z: 4 // Topo absoluto para garantir visibilidade
        }
      ]
    };
  }, [chartData, deals, dateRange]);

  // 2. Acquisition Chart
  const getAcquisitionOption = useMemo(() => {
    const dates = chartData.map(d => d.date.split('-')[2]);
    const leads = chartData.map(d => d.leads);
    const cpl = chartData.map(d => d.leads > 0 ? d.spend / d.leads : 0);
    const barGradient = new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#d97706' }, { offset: 1, color: '#b45309' }]);

    return {
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Leads', 'CPL'], bottom: 0 },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
      xAxis: [{ type: 'category', data: dates, axisLine: { show: false }, axisTick: { show: false } }],
      yAxis: [
        { type: 'value', name: 'Leads', position: 'left', axisLine: { show: false }, axisTick: { show: false } },
        { type: 'value', name: 'CPL (R$)', position: 'right', axisLine: { show: false }, axisTick: { show: false } }
      ],
      series: [
        { name: 'Leads', type: 'bar', barWidth: '50%', itemStyle: { color: barGradient, borderRadius: [4, 4, 0, 0] }, data: leads },
        { name: 'CPL', type: 'line', yAxisIndex: 1, smooth: true, itemStyle: { color: '#ef4444' }, lineStyle: { width: 3 }, data: cpl }
      ]
    };
  }, [chartData]);

  // 3. Marketing Funnel (Ads Logic Only)
  const getMarketingFunnelOption = useMemo(() => {
    const impressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
    const clicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const leads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
    const adSales = campaigns.reduce((acc, c) => acc + (c.purchases || 0), 0);

    const create3DGradient = (colorStart: string, colorMid: string, colorEnd: string) => {
        return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colorStart },
            { offset: 0.4, color: colorMid },
            { offset: 1, color: colorEnd }
        ]);
    };

    const data = [
        { name: 'IMPRESSÕES', value: impressions, realValue: impressions },
        { name: 'CLIQUES', value: clicks, realValue: clicks },
        { name: 'LEADS', value: leads, realValue: leads },
        { name: 'VENDAS (ADS)', value: adSales, realValue: adSales }
    ];
    
    const colors = [
        create3DGradient('#0891b2', '#67e8f9', '#0e7490'), // Cyan
        create3DGradient('#2563eb', '#93c5fd', '#1e40af'), // Blue
        create3DGradient('#7c3aed', '#c4b5fd', '#5b21b6'), // Violet
        create3DGradient('#db2777', '#fbcfe8', '#9d174d')  // Pink
    ];

    return {
      title: { text: 'Funil de Marketing (Ads)', left: 'center', textStyle: { fontSize: 14, color: '#64748b' }, top: 5 },
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `<div class="font-bold text-slate-700 mb-1">${params.name}</div><div class="text-indigo-600 font-black text-lg">${params.data.realValue.toLocaleString()}</div>`
      },
      series: [{
          name: 'Funnel',
          type: 'funnel',
          left: '10%', right: '10%', top: 40, bottom: 20, width: '80%', minSize: '0%', maxSize: '100%', sort: 'none', gap: 6,
          label: { show: true, position: 'inside', formatter: (params: any) => `{value|${params.data.realValue.toLocaleString()}}\n{title|${params.name}}`, rich: { title: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' }, value: { color: '#fff', fontSize: 16, fontWeight: 800 } } },
          data: data.map((d, i) => ({ value: d.value || 1, name: d.name, realValue: d.realValue, itemStyle: { color: colors[i] } }))
      }]
    };
  }, [campaigns]);

  // 4. Commercial Funnel (CRM Logic Only)
  const getCommercialFunnelOption = useMemo(() => {
    // Métricas de CRM (Filtradas pelo período)
    const filteredActivities = activities.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
    
    // --- ATUALIZAÇÃO: Cálculo usando 'quantity' ---
    const meetings = filteredActivities.filter(a => a.type === 'meeting').reduce((acc, a) => acc + (a.quantity !== undefined ? a.quantity : 1), 0);
    const proposals = filteredActivities.filter(a => a.type === 'proposal').reduce((acc, a) => acc + (a.quantity !== undefined ? a.quantity : 1), 0);
    const leads = filteredStats.totalLeads; // Leads totais vindos do Marketing
    const dealsClosed = deals.filter(d => d.date >= dateRange.start && d.date <= dateRange.end).length;

    const create3DGradient = (colorStart: string, colorMid: string, colorEnd: string) => {
        return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colorStart },
            { offset: 0.4, color: colorMid },
            { offset: 1, color: colorEnd }
        ]);
    };

    const data = [
        { name: 'LEADS TOTAIS', value: leads, realValue: leads },
        { name: 'REUNIÕES', value: meetings, realValue: meetings },
        { name: 'PROPOSTAS', value: proposals, realValue: proposals },
        { name: 'FECHAMENTOS', value: dealsClosed, realValue: dealsClosed }
    ];
    
    const colors = [
        create3DGradient('#d97706', '#fbbf24', '#b45309'), // Amber
        create3DGradient('#ea580c', '#fdba74', '#c2410c'), // Orange
        create3DGradient('#16a34a', '#86efac', '#14532d'), // Green
        create3DGradient('#047857', '#6ee7b7', '#064e3b')  // Emerald Dark
    ];

    return {
      title: { text: 'Funil Comercial (CRM Local)', left: 'center', textStyle: { fontSize: 14, color: '#64748b' }, top: 5 },
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `<div class="font-bold text-slate-700 mb-1">${params.name}</div><div class="text-emerald-600 font-black text-lg">${params.data.realValue.toLocaleString()}</div>`
      },
      series: [{
          name: 'Funnel',
          type: 'funnel',
          left: '10%', right: '10%', top: 40, bottom: 20, width: '80%', minSize: '0%', maxSize: '100%', sort: 'none', gap: 6,
          label: { show: true, position: 'inside', formatter: (params: any) => `{value|${params.data.realValue.toLocaleString()}}\n{title|${params.name}}`, rich: { title: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' }, value: { color: '#fff', fontSize: 16, fontWeight: 800 } } },
          data: data.map((d, i) => ({ value: d.value || 1, name: d.name, realValue: d.realValue, itemStyle: { color: colors[i] } }))
      }]
    };
  }, [filteredStats.totalLeads, activities, deals, dateRange]);


  // 5. Evolution Chart (Sales vs Quality) - FIXED LOGIC
  const getQualityEvolutionOption = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return {};

    // 1. Gerar array de datas completo
    const allDates: string[] = [];
    let curr = new Date(dateRange.start + 'T12:00:00');
    const end = new Date(dateRange.end + 'T12:00:00');
    
    while (curr <= end) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        allDates.push(`${year}-${month}-${day}`);
        curr.setDate(curr.getDate() + 1);
    }

    const datesLabels = allDates.map(d => `${d.split('-')[2]}/${d.split('-')[1]}`); // DD/MM

    // 2. Mapear Dados
    const proposalData: number[] = [];
    const salesData: number[] = [];
    const qualityData: (number | null)[] = [];

    allDates.forEach(date => {
        // Propostas
        const dayProposals = activities
            .filter(a => a.date === date && a.type === 'proposal')
            .reduce((acc, a) => acc + (a.quantity !== undefined ? a.quantity : 1), 0);
        
        // Vendas
        const daySales = deals
            .filter(d => d.date === date)
            .reduce((acc, d) => acc + (d.quantity !== undefined ? d.quantity : 1), 0);

        // Qualidade Média
        // Correção: Garantir que lead_quality_score seja tratado como número e maior que 0
        const dayQualityActs = activities.filter(a => a.date === date && a.lead_quality_score && a.lead_quality_score > 0);
        let avgQuality = null;
        if (dayQualityActs.length > 0) {
            const sum = dayQualityActs.reduce((acc, a) => acc + Number(a.lead_quality_score || 0), 0);
            avgQuality = Number((sum / dayQualityActs.length).toFixed(1));
        }

        proposalData.push(dayProposals);
        salesData.push(daySales);
        qualityData.push(avgQuality);
    });

    return {
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { data: ['Propostas Enviadas', 'Vendas Realizadas', 'Qualidade Média Lead (1-5)'], bottom: 0 },
      grid: { left: '2%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: [{ type: 'category', data: datesLabels, axisLine: { show: false }, axisTick: { show: false } }],
      yAxis: [
        { 
            type: 'value', 
            name: 'Volume', 
            position: 'left',
            splitLine: { show: true, lineStyle: { type: 'dashed' } }
        },
        { 
            type: 'value', 
            name: 'Score (1-5)', 
            min: 0, 
            max: 5, 
            position: 'right',
            splitLine: { show: false }
        }
      ],
      series: [
        {
            name: 'Propostas Enviadas',
            type: 'bar',
            barGap: '10%',
            itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] }, // Violet
            data: proposalData
        },
        {
            name: 'Vendas Realizadas',
            type: 'bar',
            itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, // Emerald
            data: salesData
        },
        {
            name: 'Qualidade Média Lead (1-5)',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { width: 3, color: '#f59e0b' }, // Amber
            itemStyle: { color: '#f59e0b', borderWidth: 2, borderColor: '#fff' },
            connectNulls: true, // Conecta pontos se houver dias sem dados no meio
            data: qualityData
        }
      ]
    };

  }, [activities, deals, dateRange]);


  const dateOptionLabels: Record<string, string> = {
    '7D': 'Últimos 7 dias',
    '14D': 'Últimos 14 dias',
    '30D': 'Últimos 30 dias',
    'CUSTOM': 'Personalizado'
  };

  // Renderiza a lista lateral dependendo da aba ativa (Vendas ou Atividades)
  const renderSidePanelContent = () => {
    if (crmListTab === 'deals') {
        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingBag size={18} className="text-indigo-600" />
                        Vendas
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleOpenNewSale} className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                            <Plus size={14} /> Nova
                        </button>
                    </div>
                </div>
                {/* Visualização em GRID responsivo para ocupar a largura total */}
                <div className="flex-1 overflow-y-auto pr-1 max-h-[400px] custom-scrollbar">
                    {deals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {deals.map(deal => (
                                <div key={deal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors group relative">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-700 text-xs md:text-sm truncate" title={deal.description}>{deal.description}</p>
                                        <p className="text-[10px] text-slate-500">{new Date(deal.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right pl-2 shrink-0 mr-6 group-hover:mr-2 transition-all">
                                        <p className="text-green-600 font-extrabold text-xs md:text-sm">R$ {deal.total_value.toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400">{deal.quantity} un.</p>
                                    </div>
                                    
                                    {/* Action Buttons (Edit/Delete) - Absolute Positioned on Hover */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1">
                                        <button 
                                            onClick={() => handleEditDeal(deal)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                            title="Editar"
                                        >
                                            <PenLine size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteDeal(deal.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center italic text-xs border-2 border-dashed border-slate-100 rounded-lg p-6">
                            <p>Nenhuma venda registrada.</p>
                        </div>
                    )}
                </div>
            </>
        );
    } else {
        // Lista de Atividades (CRM)
        const filteredActs = activities.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
        
        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-blue-600" />
                        Atividades CRM
                    </h3>
                </div>
                {/* Visualização em GRID responsivo */}
                <div className="flex-1 overflow-y-auto pr-1 max-h-[400px] custom-scrollbar">
                    {filteredActs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredActs.map(act => (
                                <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 relative group hover:bg-white hover:shadow-sm transition-all h-full">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${act.type === 'meeting' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {act.type === 'meeting' ? 'Reunião' : 'Proposta'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    
                                    {(act.quantity !== undefined && act.quantity >= 0) ? (
                                        <p className="font-bold text-slate-700 text-sm mb-0.5 truncate">
                                            Resumo: <span className="text-indigo-600">{act.quantity} {act.type === 'meeting' ? 'Reuniões' : 'Propostas'}</span>
                                        </p>
                                    ) : (
                                        <p className="font-bold text-slate-700 text-sm mb-0.5 truncate">{act.prospect_name || 'Prospect sem nome'}</p>
                                    )}
                                    
                                    {act.type === 'proposal' && act.value && (
                                        <p className="text-xs font-bold text-emerald-600">Valor: R$ {act.value.toLocaleString('pt-BR')}</p>
                                    )}

                                    {act.lead_quality_score && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-slate-500 font-medium">Qualidade Leads:</span>
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <div key={s} className={`w-1.5 h-1.5 rounded-full mx-0.5 ${s <= act.lead_quality_score! ? 'bg-yellow-400' : 'bg-slate-200'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {act.notes && (
                                        <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">"{act.notes}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center italic text-xs border-2 border-dashed border-slate-100 rounded-lg p-6">
                            <p>Nenhuma atividade encontrada neste período.</p>
                            <p className="mt-1">Use o link público para registrar.</p>
                        </div>
                    )}
                </div>
            </>
        );
    }
  };

  const filteredClients = clients.filter(c => 
    c.company.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <NewSaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={handleSaleAdded} 
        clientId={currentClient.id} 
        dealToEdit={dealToEdit} // Passar a prop de edição
      />

      {/* Header */}
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="space-y-2">
            <button onClick={onBack} className="text-xs md:text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium">
               <ChevronLeft size={16} /> Dashboard
            </button>
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                {/* --- SELETOR DE CLIENTE (DROPDOWN) --- */}
                <button 
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 truncate max-w-[200px] md:max-w-none group-hover:text-indigo-600 transition-colors">
                        {currentClient.company}
                    </h1>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform duration-200 group-hover:text-indigo-500 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold ${currentClient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {currentClient.status.toUpperCase()}
                </span>

                {/* --- MENU DROPDOWN LISTA DE CLIENTES --- */}
                {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="Buscar cliente..." 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredClients.length > 0 ? filteredClients.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        if (onClientSwitch) {
                                            onClientSwitch(c);
                                            setIsClientDropdownOpen(false);
                                            setClientSearchTerm('');
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 ${c.id === currentClient.id ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <div>
                                        <p className={`font-bold ${c.id === currentClient.id ? 'text-indigo-700' : 'text-slate-700'}`}>{c.company}</p>
                                        <p className="text-xs text-slate-400">{c.name}</p>
                                    </div>
                                    {c.id === currentClient.id && <Check size={16} className="text-indigo-600" />}
                                    {c.status === 'paused' && <span className="w-2 h-2 rounded-full bg-slate-300 ml-2" title="Pausado"></span>}
                                </button>
                            )) : (
                                <div className="p-4 text-center text-xs text-slate-400">Nenhum cliente encontrado.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2">
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

                   <div className="border-t border-slate-100 pt-3">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Períodos Rápidos</p>
                     <div className="grid grid-cols-3 gap-2">
                       <button onClick={() => setDateOption('7D')} className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '7D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>7 dias</button>
                       <button onClick={() => setDateOption('14D')} className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '14D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>14 dias</button>
                       <button onClick={() => setDateOption('30D')} className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${dateOption === '30D' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>30 dias</button>
                     </div>
                   </div>
                   
                   <button onClick={() => setShowDatePicker(false)} className="w-full mt-4 bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">Aplicar Filtro</button>
                 </div>
               )}
             </div>

             <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleGenerateInsights}
                  disabled={loadingInsights}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors shadow-sm
                    ${showInsights && insights.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}
                  `}
                >
                  {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className={showInsights && insights.length > 0 ? "fill-indigo-300" : ""} />} 
                  {loadingInsights ? 'Analisando...' : 'Análise IA'}
                </button>
                <button onClick={handleCopyReport} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Relatório'}
                </button>
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">
                  <Download size={14} /> PDF
                </button>
             </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {loading ? (
        <KPISkeleton />
      ) : (
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
      )}

      {/* AI Insights Feed - Agora com onDismiss */}
      {showInsights && <InsightsFeed insights={insights} loading={loadingInsights} onDismiss={handleDismissInsight} />}

      {/* Main Chart Area (Agora em Grid 2 Colunas) */}
      {loading || !chartsReady ? (
        <ChartSkeleton />
      ) : (
        <div className="space-y-6">
            
            {/* Linha 1: Financeiro e Aquisição */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-500" />
                        Financeiro
                    </h3>
                    <ReactECharts 
                        option={getFinanceOption} 
                        style={{ height: '350px', width: '100%' }} 
                        opts={{ renderer: 'svg' }}
                        notMerge={true}
                    />
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-orange-500" />
                        Aquisição & CPL
                    </h3>
                    <ReactECharts 
                        option={getAcquisitionOption} 
                        style={{ height: '350px', width: '100%' }} 
                        opts={{ renderer: 'svg' }}
                        notMerge={true}
                    />
                </div>
            </div>

            {/* Linha 2: Funis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Target size={18} className="text-blue-500" />
                        Funil de Marketing
                    </h3>
                    <ReactECharts 
                        option={getMarketingFunnelOption} 
                        style={{ height: '350px', width: '100%' }} 
                        opts={{ renderer: 'svg' }}
                        notMerge={true}
                    />
                </div>

                {currentClient.crm_enabled && (
                    <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Briefcase size={18} className="text-purple-500" />
                            Funil Comercial
                        </h3>
                        <ReactECharts 
                            option={getCommercialFunnelOption} 
                            style={{ height: '350px', width: '100%' }} 
                            opts={{ renderer: 'svg' }}
                            notMerge={true}
                        />
                    </div>
                )}
            </div>

            {/* Linha 3: Evolução Comercial & Qualidade (Novo) */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-amber-500" />
                    Evolução Comercial & Qualidade
                </h3>
                <ReactECharts 
                    option={getQualityEvolutionOption} 
                    style={{ height: '350px', width: '100%' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                />
            </div>

        </div>
      )}

      {/* CRM / Vendas Panel (Movido para baixo) */}
      {loading ? (
        <SalesSkeleton />
      ) : (
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
             
             {/* Header com Abas (Se CRM Ativo) */}
             <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    {currentClient.crm_enabled ? (
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button 
                                onClick={() => setCrmListTab('deals')}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${crmListTab === 'deals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Vendas
                            </button>
                            <button 
                                onClick={() => setCrmListTab('activities')}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${crmListTab === 'activities' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Atividades
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleCopyPublicLink} 
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${linkCopied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    title="Copiar link para cliente preencher"
                  >
                    {linkCopied ? <Check size={14} /> : <Link size={14} />}
                  </button>
                </div>
             </div>
             
             {renderSidePanelContent()}
             
        </div>
      )}

      {/* Campaigns Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
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
                          <td className="px-6 py-4 font-bold text-slate-700 max-w-[200px] truncate" title={camp.name}>{camp.name}</td>
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
                        <h4 className="font-bold text-slate-800 text-sm flex-1 pr-4 line-clamp-2">{camp.name}</h4>
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
      )}
    </div>
  );
};
