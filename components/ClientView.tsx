import React, { useEffect, useState, useMemo } from 'react';
import { Client, Contract, Campaign, DailyMetric, Deal, Insight, CommercialActivity } from '../types';
import { clientService, getLocalDateString } from '../services/clientService';
import { contractService } from '../services/contractService';
import { dealService } from '../services/dealService';
import { commercialService } from '../services/commercialService';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { DollarSign, Target, TrendingUp, Calendar, Download, Loader2, Users, ShoppingBag, Plus, Copy, Check, BarChart, ChevronLeft, ChevronDown, Sparkles, PieChart, Link, ExternalLink, FileText, Briefcase } from 'lucide-react';
import { NewSaleModal } from './NewSaleModal';
import { InsightsFeed } from './InsightsFeed';
// Importação do ECharts
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ClientViewProps {
  client: Client;
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
  <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <SkeletonPulse className="h-6 w-48" />
      <div className="flex gap-2">
        <SkeletonPulse className="h-8 w-20" />
        <SkeletonPulse className="h-8 w-20" />
        <SkeletonPulse className="h-8 w-20" />
      </div>
    </div>
    <div className="flex-1 w-full bg-slate-50 rounded-lg flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-300" size={32} />
    </div>
  </div>
);

const SalesSkeleton = () => (
  <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <SkeletonPulse className="h-6 w-32" />
      <SkeletonPulse className="h-8 w-8" />
    </div>
    <div className="space-y-4 flex-1">
      {[1, 2, 3, 4].map((i) => (
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

export const ClientView: React.FC<ClientViewProps> = ({ client, onBack }) => {
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
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeChart, setActiveChart] = useState<'finance' | 'acquisition' | 'marketing_funnel' | 'commercial_funnel'>('finance');
  const [crmListTab, setCrmListTab] = useState<'deals' | 'activities'>('deals');
  
  // AI Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(true); // Default true se tiver insights
  
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
        aiAnalysisService.getSavedInsights(currentClient.id)
      ];

      // Se CRM Ativo, busca atividades (Reuniões/Propostas)
      if (currentClient.crm_enabled) {
          promises.push(commercialService.getActivities(currentClient.id));
      }

      const results = await Promise.all(promises);
      
      setCampaigns(results[0]);
      setChartData(results[1]);
      setContract(results[2]);
      setDeals(results[3]);
      setInsights(results[4]);

      if (currentClient.crm_enabled && results[5]) {
          setActivities(results[5]);
      } else {
          setActivities([]);
      }
      
    } catch (error: any) {
      console.error("Failed to load client details:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setChartsReady(true), 150);
    }
  };

  const handleSaleAdded = async () => {
    // Recarrega apenas as deals para atualizar a lista e o cálculo
    const dealsData = await dealService.getDeals(currentClient.id);
    setDeals(dealsData);
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
       } else {
           setInsights(generatedInsights);
       }
     } catch (e) {
       console.error("Erro ao gerar insights", e);
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
  }, [client.id, dateRange]);

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
        const meetings = periodActivities.filter(a => a.type === 'meeting').reduce((acc, a) => acc + (a.quantity || 1), 0);
        const proposals = periodActivities.filter(a => a.type === 'proposal').reduce((acc, a) => acc + (a.quantity || 1), 0);
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
    const offlineRevenueByDate: Record<string, number> = {};
    deals.filter(d => d.date >= dateRange.start && d.date <= dateRange.end).forEach(d => {
        if (!offlineRevenueByDate[d.date]) offlineRevenueByDate[d.date] = 0;
        offlineRevenueByDate[d.date] += Number(d.total_value);
    });

    const dates = chartData.map(d => d.date.split('-')[2]); 
    const spend = chartData.map(d => d.spend);
    const adRevenue = chartData.map(d => d.revenue);
    
    const blendedRevenue = chartData.map(d => {
        const offline = offlineRevenueByDate[d.date] || 0;
        return d.revenue + offline;
    });

    return {
      toolbox: { feature: { saveAsImage: { show: true, title: 'Salvar' } }, right: '2%' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          let res = `<div class="font-bold mb-1 border-b border-slate-100 pb-1 text-slate-700">Dia ${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const val = param.value !== undefined ? param.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
            res += `<div class="flex items-center gap-2 text-xs py-0.5">${param.marker} <span class="text-slate-500">${param.seriesName}:</span> <span class="font-bold text-slate-700">${val}</span></div>`;
          });
          return res;
        }
      },
      legend: { data: ['Receita Total', 'Investimento', 'Receita Ads'], bottom: 0 },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
      xAxis: [{ type: 'category', boundaryGap: false, data: dates, axisLine: { show: false }, axisTick: { show: false } }],
      yAxis: [{ type: 'value', splitLine: { lineStyle: { type: 'dashed' } } }],
      series: [
        {
          name: 'Receita Total',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#10b981' },
          areaStyle: { opacity: 0.2, color: '#10b981' },
          data: blendedRevenue
        },
        {
          name: 'Investimento',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#3b82f6' },
          areaStyle: { opacity: 0.2, color: '#3b82f6' },
          data: spend
        },
        {
            name: 'Receita Ads',
            type: 'line',
            smooth: true,
            lineStyle: { width: 1, color: '#94a3b8', type: 'dashed' },
            data: adRevenue
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
    const meetings = filteredActivities.filter(a => a.type === 'meeting').reduce((acc, a) => acc + (a.quantity || 1), 0);
    const proposals = filteredActivities.filter(a => a.type === 'proposal').reduce((acc, a) => acc + (a.quantity || 1), 0);
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
                        <button onClick={() => setIsSaleModalOpen(true)} className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                            <Plus size={14} /> Nova
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 max-h-[400px] md:max-h-[550px] custom-scrollbar space-y-3">
                    {deals.length > 0 ? deals.map(deal => (
                        <div key={deal.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors">
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
                <div className="flex-1 overflow-y-auto pr-1 max-h-[400px] md:max-h-[550px] custom-scrollbar space-y-3">
                    {filteredActs.length > 0 ? filteredActs.map(act => (
                        <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 relative group hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${act.type === 'meeting' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {act.type === 'meeting' ? 'Reunião' : 'Proposta'}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            
                            {/* --- Atualização: Exibir badge de lote se quantity > 1 --- */}
                            {(act.quantity && act.quantity > 1) ? (
                                <p className="font-bold text-slate-700 text-sm mb-0.5">
                                    Resumo Semanal: <span className="text-indigo-600">{act.quantity} {act.type === 'meeting' ? 'Reuniões' : 'Propostas'}</span>
                                </p>
                            ) : (
                                <p className="font-bold text-slate-700 text-sm mb-0.5">{act.prospect_name || 'Prospect sem nome'}</p>
                            )}
                            
                            {act.type === 'proposal' && act.value && (
                                <p className="text-xs font-bold text-emerald-600">Valor: R$ {act.value.toLocaleString('pt-BR')}</p>
                            )}

                            {/* --- Exibir Qualidade do Lead --- */}
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
                    )) : (
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

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <NewSaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onSuccess={handleSaleAdded} clientId={currentClient.id} />

      {/* Header */}
      {loading ? (
        <HeaderSkeleton />
      ) : (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        {loading || !chartsReady ? (
          <ChartSkeleton />
        ) : (
          <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800">Performance Detalhada</h3>
              
              <div className="bg-slate-100 p-1 rounded-lg flex gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setActiveChart('finance')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase ${activeChart === 'finance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Financeiro
                </button>
                <button 
                  onClick={() => setActiveChart('acquisition')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase ${activeChart === 'acquisition' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Aquisição
                </button>
                <button 
                  onClick={() => setActiveChart('marketing_funnel')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase ${activeChart === 'marketing_funnel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Funil de Marketing
                </button>
                {currentClient.crm_enabled && (
                    <button 
                      onClick={() => setActiveChart('commercial_funnel')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap uppercase ${activeChart === 'commercial_funnel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Funil de Vendas
                    </button>
                )}
              </div>
            </div>
            
            <div className="w-full flex-1 min-h-[400px]">
               {activeChart === 'finance' && (
                 <ReactECharts 
                    option={getFinanceOption} 
                    style={{ height: '100%', width: '100%', minHeight: '400px' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                 />
               )}
               {activeChart === 'acquisition' && (
                 <ReactECharts 
                    option={getAcquisitionOption} 
                    style={{ height: '100%', width: '100%', minHeight: '400px' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                 />
               )}
               {activeChart === 'marketing_funnel' && (
                 <ReactECharts 
                    option={getMarketingFunnelOption} 
                    style={{ height: '100%', width: '100%', minHeight: '400px' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                 />
               )}
               {activeChart === 'commercial_funnel' && (
                 <ReactECharts 
                    option={getCommercialFunnelOption} 
                    style={{ height: '100%', width: '100%', minHeight: '400px' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                 />
               )}
            </div>
          </div>
        )}

        {/* CRM / Vendas Side Panel */}
        {loading ? (
          <SalesSkeleton />
        ) : (
          <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[500px] md:h-[650px] lg:h-auto">
             
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
      </div>

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