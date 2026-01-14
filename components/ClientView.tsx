import React, { useEffect, useState, useMemo } from 'react';
import { Client, Contract, Campaign, DailyMetric, Deal, Insight } from '../types';
import { clientService, getLocalDateString } from '../services/clientService';
import { contractService } from '../services/contractService';
import { dealService } from '../services/dealService';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { DollarSign, Target, TrendingUp, Calendar, Download, Loader2, Users, ShoppingBag, Plus, Copy, Check, BarChart, ChevronLeft, ChevronDown, Sparkles } from 'lucide-react';
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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeChart, setActiveChart] = useState<'finance' | 'acquisition' | 'funnel'>('finance');
  
  // AI Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  
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
    setChartsReady(false);
    setShowInsights(false); // Reset insights on new data
    setInsights([]);

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
      setTimeout(() => setChartsReady(true), 150);
    }
  };

  const handleSaleAdded = async () => {
    const dealsData = await dealService.getDeals(currentClient.id);
    setDeals(dealsData);
  };

  // --- Função para chamar IA ---
  const handleGenerateInsights = async () => {
     if (insights.length > 0) {
       setShowInsights(!showInsights);
       return;
     }

     setLoadingInsights(true);
     setShowInsights(true);
     
     // Atualiza o client com as métricas calculadas no frontend para enviar ao AI
     const clientWithCurrentStats: Client = {
        ...currentClient,
        total_spend: filteredStats.totalSpend,
        total_revenue: filteredStats.totalRevenue,
        total_leads: filteredStats.totalLeads,
        roas: filteredStats.roas
     };

     try {
       const generatedInsights = await aiAnalysisService.generateInsights(clientWithCurrentStats, campaigns, chartData);
       setInsights(generatedInsights);
     } catch (e) {
       console.error("Erro ao gerar insights", e);
     } finally {
       setLoadingInsights(false);
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

    text += `Total Investido: R$ ${filteredStats.totalSpend?.toLocaleString('pt-BR')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  // --- ECHARTS CONFIGURATIONS ---

  // 1. Finance Chart Option (Area with Gradient)
  const getFinanceOption = useMemo(() => {
    const dates = chartData.map(d => d.date.split('-')[2]); // Just days
    const revenue = chartData.map(d => d.revenue);
    const spend = chartData.map(d => d.spend);

    return {
      toolbox: {
        feature: {
          saveAsImage: { show: true, title: 'Salvar' }
        },
        right: '2%'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.1)',
        textStyle: { color: '#1e293b' },
        formatter: (params: any) => {
          let res = `<div class="font-bold mb-1 border-b border-slate-100 pb-1 text-slate-700">Dia ${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const val = param.value !== undefined ? param.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
            res += `<div class="flex items-center gap-2 text-xs py-0.5">${param.marker} <span class="text-slate-500">${param.seriesName}:</span> <span class="font-bold text-slate-700">${val}</span></div>`;
          });
          return res;
        }
      },
      legend: { 
        data: ['Receita', 'Investimento'], 
        bottom: 0,
        itemGap: 20,
        textStyle: { color: '#64748b' }
      },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: dates,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 11, margin: 12 }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: {
             color: '#94a3b8',
             fontSize: 11,
             formatter: (value: number) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`
          }
        }
      ],
      series: [
        {
          name: 'Receita',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#10b981' },
          showSymbol: false,
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' }
            ])
          },
          emphasis: { focus: 'series' },
          data: revenue
        },
        {
          name: 'Investimento',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#3b82f6' },
          showSymbol: false,
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
            ])
          },
          emphasis: { focus: 'series' },
          data: spend
        }
      ]
    };
  }, [chartData]);

  // 2. Acquisition Chart Option (3D Bar + Line)
  const getAcquisitionOption = useMemo(() => {
    const dates = chartData.map(d => d.date.split('-')[2]);
    const leads = chartData.map(d => d.leads);
    const cpl = chartData.map(d => d.leads > 0 ? d.spend / d.leads : 0);

    // Gradiente 3D Cilíndrico para as Barras (Esquerda -> Direita)
    const barGradient = new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#d97706' },   // Sombra Esquerda
        { offset: 0.5, color: '#fbbf24' }, // Brilho Central (Amber 400)
        { offset: 1, color: '#b45309' }    // Sombra Direita
    ]);

    return {
      toolbox: {
        feature: {
          saveAsImage: { show: true, title: 'Salvar' }
        },
        right: '2%'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.1)',
        textStyle: { color: '#1e293b' }
      },
      legend: { data: ['Leads', 'CPL'], bottom: 0, textStyle: { color: '#64748b' } },
      grid: { left: '2%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
      xAxis: [
        {
          type: 'category',
          data: dates,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 11, margin: 12 }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Leads',
          position: 'left',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#d97706', fontSize: 11 },
          nameTextStyle: { color: '#d97706', fontWeight: 'bold', align: 'left', padding: [0, 0, 0, -10] }
        },
        {
          type: 'value',
          name: 'CPL (R$)',
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#ef4444', fontSize: 11, formatter: (val: number) => `R$${val.toFixed(0)}` },
          nameTextStyle: { color: '#ef4444', fontWeight: 'bold', align: 'right', padding: [0, -10, 0, 0] }
        }
      ],
      series: [
        {
          name: 'Leads',
          type: 'bar',
          barWidth: '50%',
          itemStyle: { 
            color: barGradient, 
            borderRadius: [4, 4, 0, 0],
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowOffsetY: 2
          },
          data: leads
        },
        {
          name: 'CPL',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          itemStyle: { color: '#ef4444' },
          lineStyle: { 
             width: 3, 
             shadowColor: 'rgba(239, 68, 68, 0.3)', 
             shadowBlur: 8,
             shadowOffsetY: 4
          },
          data: cpl
        }
      ]
    };
  }, [chartData]);

  // 3. Funnel Chart Option (3D Effect with Lighting)
  const getFunnelOption = useMemo(() => {
    const impressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
    const clicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const leads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
    const purchases = campaigns.reduce((acc, c) => acc + (c.purchases || 0), 0);

    const data = [
      { name: 'IMPRESSÕES', value: impressions, realValue: impressions },
      { name: 'CLIQUES', value: clicks, realValue: clicks },
      { name: 'LEADS', value: leads, realValue: leads },
      { name: 'VENDAS', value: purchases, realValue: purchases }
    ];

    // Gradiente 3D com iluminação central (Highlight)
    const create3DGradient = (colorStart: string, colorMid: string, colorEnd: string) => {
        return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colorStart },
            { offset: 0.4, color: colorMid }, // Ponto de luz (Highlight)
            { offset: 1, color: colorEnd }
        ]);
    };

    const colors = [
        create3DGradient('#0891b2', '#67e8f9', '#0e7490'), // Cyan
        create3DGradient('#2563eb', '#93c5fd', '#1e40af'), // Blue
        create3DGradient('#7c3aed', '#c4b5fd', '#5b21b6'), // Violet
        create3DGradient('#db2777', '#fbcfe8', '#9d174d')  // Pink
    ];

    return {
      toolbox: {
        feature: {
          saveAsImage: { show: true, title: 'Salvar' }
        },
        right: '2%'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
             const val = params.data.realValue.toLocaleString();
             return `<div class="font-bold text-slate-700 mb-1">${params.name}</div><div class="text-indigo-600 font-black text-lg">${val}</div>`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.1)',
        textStyle: { color: '#1e293b' }
      },
      series: [
        {
          name: 'Funnel',
          type: 'funnel',
          left: '10%',
          right: '10%',
          top: 20,
          bottom: 20,
          width: '80%',
          minSize: '0%',
          maxSize: '100%',
          sort: 'none',
          gap: 6, 
          
          itemStyle: {
            borderColor: 'transparent',
            borderWidth: 0,
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 10,
            shadowColor: 'rgba(0,0,0,0.2)' // Sombra projetada
          },

          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
               return `{value|${params.data.realValue.toLocaleString()}}\n{title|${params.name}}`;
            },
            rich: {
                title: {
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 10,
                    fontWeight: 'bold',
                    lineHeight: 14,
                    align: 'center',
                    padding: [4, 0, 0, 0]
                },
                value: {
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 800,
                    align: 'center',
                    textShadowBlur: 2,
                    textShadowColor: 'rgba(0,0,0,0.3)'
                }
            }
          },
          labelLine: { show: false },
          data: data.map((d, i) => ({
             value: d.value || 1, 
             name: d.name,
             realValue: d.realValue,
             itemStyle: { color: colors[i] }
          }))
        }
      ]
    };
  }, [campaigns]);


  const dateOptionLabels: Record<string, string> = {
    '7D': 'Últimos 7 dias',
    '14D': 'Últimos 14 dias',
    '30D': 'Últimos 30 dias',
    'CUSTOM': 'Personalizado'
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
                    ${showInsights ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}
                  `}
                >
                  {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className={showInsights ? "fill-indigo-300" : ""} />} 
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

      {/* AI Insights Feed */}
      {showInsights && <InsightsFeed insights={insights} loading={loadingInsights} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        {loading || !chartsReady ? (
          <ChartSkeleton />
        ) : (
          <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
               {activeChart === 'funnel' && (
                 <ReactECharts 
                    option={getFunnelOption} 
                    style={{ height: '100%', width: '100%', minHeight: '400px' }} 
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                 />
               )}
            </div>
          </div>
        )}

        {/* Offline Sales */}
        {loading ? (
          <SalesSkeleton />
        ) : (
          <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[500px] md:h-[650px] lg:h-auto">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-indigo-600" />
                  Vendas Offline
                </h3>
                <button onClick={() => setIsSaleModalOpen(true)} className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={14} /> Nova Venda
                </button>
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
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center italic text-xs border-2 border-dashed border-slate-100 rounded-lg">
                     <p>Nenhuma venda manual registrada.</p>
                  </div>
                )}
             </div>
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