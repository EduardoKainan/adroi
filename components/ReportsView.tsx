import React, { useState, useEffect, useMemo } from 'react';
import { dealService, EnrichedDeal } from '../services/dealService';
import { getLocalDateString } from '../services/clientService';
import { Calendar, ChevronDown, DollarSign, TrendingUp, ShoppingBag, Loader2, Download, Filter } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

type DateRangeOption = 'YESTERDAY' | '7D' | '14D' | '30D' | 'THIS_MONTH' | 'CUSTOM';

export const ReportsView: React.FC = () => {
  const [deals, setDeals] = useState<EnrichedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateOption, setDateOption] = useState<DateRangeOption>('THIS_MONTH');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Inicialização de datas
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (dateOption === 'CUSTOM') return;

    switch (dateOption) {
      case 'YESTERDAY':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case '7D':
        start.setDate(today.getDate() - 7);
        break;
      case '14D':
        start.setDate(today.getDate() - 14);
        break;
      case '30D':
        start.setDate(today.getDate() - 30);
        break;
      case 'THIS_MONTH':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
    }

    setDateRange({
      start: getLocalDateString(start),
      end: getLocalDateString(end)
    });
  }, [dateOption]);

  // Fetch Data
  const fetchData = async () => {
    if (!dateRange.start || !dateRange.end) return;
    setLoading(true);
    try {
      const data = await dealService.getAllDeals(dateRange.start, dateRange.end);
      setDeals(data);
    } catch (error) {
      console.error("Failed to load reports", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Cálculos de KPI
  const totalRevenue = deals.reduce((acc, d) => acc + d.total_value, 0);
  const totalSales = deals.reduce((acc, d) => acc + (d.quantity || 1), 0); // Quantidade de itens/contratos
  const totalDealsCount = deals.length; // Quantidade de transações
  const averageTicket = totalDealsCount > 0 ? totalRevenue / totalDealsCount : 0;

  // Gráfico de Evolução Diária
  const getEvolutionChart = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    // Inicializa datas com 0 para o gráfico não ficar buraco
    let curr = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (curr <= end) {
        grouped[getLocalDateString(curr)] = 0;
        curr.setDate(curr.getDate() + 1);
    }

    deals.forEach(d => {
        if (grouped[d.date] !== undefined) {
            grouped[d.date] += d.total_value;
        }
    });

    const dates = Object.keys(grouped).sort();
    const values = dates.map(d => grouped[d]);
    const labels = dates.map(d => d.split('-').slice(1).reverse().join('/')); // DD/MM

    return {
        tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/><b>R$ ${params[0].value.toLocaleString()}</b>` },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: labels, axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
            data: values,
            type: 'bar',
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: '#6366f1'}, {offset: 1, color: '#818cf8'}]) },
            barWidth: '60%',
            showBackground: true,
            backgroundStyle: { color: '#f1f5f9' }
        }]
    };
  }, [deals, dateRange]);

  // Gráfico de Top Clientes
  const getTopClientsChart = useMemo(() => {
      const clientSales: Record<string, number> = {};
      deals.forEach(d => {
          const name = d.client_company || 'Desconhecido';
          clientSales[name] = (clientSales[name] || 0) + d.total_value;
      });

      const sortedData = Object.entries(clientSales)
        .sort((a, b) => a[1] - b[1]) // Ascendente para barra horizontal
        .slice(Math.max(0, Object.keys(clientSales).length - 5)); // Top 5

      return {
        tooltip: { trigger: 'axis', formatter: '{b}: R$ {c}' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: sortedData.map(d => d[0]), axisLine: { show: false }, axisTick: { show: false } },
        series: [{
            type: 'bar',
            data: sortedData.map(d => d[1]),
            itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: 'right', formatter: (p: any) => `R$ ${Number(p.value).toLocaleString()}` }
        }]
      };
  }, [deals]);

  const handleExportCSV = () => {
      const headers = ['Data', 'Empresa', 'Descrição', 'Qtd', 'Valor Unit.', 'Valor Total'];
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n"
          + deals.map(d => {
              return [
                  d.date,
                  `"${d.client_company || ''}"`,
                  `"${d.description}"`,
                  d.quantity,
                  d.unit_value,
                  d.total_value
              ].join(",");
          }).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `vendas_${dateRange.start}_${dateRange.end}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-indigo-600" size={24} />
                    Relatório de Vendas
                </h2>
                <p className="text-sm text-slate-500">Análise consolidada de fechamentos e receita.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-auto" id="date-picker-reports">
                    <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="w-full md:w-[240px] bg-slate-50 border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-500" />
                            <span>
                                {dateOption === 'CUSTOM' 
                                    ? `${dateRange.start.split('-')[2]}/${dateRange.start.split('-')[1]} - ${dateRange.end.split('-')[2]}/${dateRange.end.split('-')[1]}` 
                                    : dateOption === 'THIS_MONTH' ? 'Este Mês' : dateOption === '30D' ? 'Últimos 30 dias' : 'Período'}
                            </span>
                        </div>
                        <ChevronDown size={14} />
                    </button>

                    {showDatePicker && (
                        <div className="absolute top-full right-0 mt-2 w-[300px] bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button onClick={() => { setDateOption('THIS_MONTH'); setShowDatePicker(false); }} className="px-2 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">Este Mês</button>
                                <button onClick={() => { setDateOption('30D'); setShowDatePicker(false); }} className="px-2 py-2 text-xs font-bold bg-slate-50 text-slate-700 rounded hover:bg-slate-100">Últimos 30d</button>
                                <button onClick={() => { setDateOption('7D'); setShowDatePicker(false); }} className="px-2 py-2 text-xs font-bold bg-slate-50 text-slate-700 rounded hover:bg-slate-100">Últimos 7d</button>
                                <button onClick={() => { setDateOption('YESTERDAY'); setShowDatePicker(false); }} className="px-2 py-2 text-xs font-bold bg-slate-50 text-slate-700 rounded hover:bg-slate-100">Ontem</button>
                            </div>
                            <div className="border-t pt-3">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Personalizado</p>
                                <div className="flex gap-2">
                                    <input type="date" className="w-full text-xs p-2 border rounded" value={dateRange.start} onChange={(e) => { setDateOption('CUSTOM'); setDateRange(p => ({...p, start: e.target.value}))}} />
                                    <input type="date" className="w-full text-xs p-2 border rounded" value={dateRange.end} onChange={(e) => { setDateOption('CUSTOM'); setDateRange(p => ({...p, end: e.target.value}))}} />
                                </div>
                                <button onClick={() => { fetchData(); setShowDatePicker(false); }} className="w-full mt-3 bg-indigo-600 text-white text-xs font-bold py-2 rounded">Aplicar</button>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleExportCSV} className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-300 rounded-lg hover:bg-slate-50" title="Exportar CSV">
                    <Download size={20} />
                </button>
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receita Total</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-1">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={24} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-1">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp size={24} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendas</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalSales} <span className="text-sm font-normal text-slate-400">itens</span></h3>
                    <p className="text-xs text-slate-400 mt-1">{totalDealsCount} transações</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <ShoppingBag size={24} />
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px]">
                <h3 className="font-bold text-slate-800 mb-4">Evolução de Faturamento</h3>
                {loading ? <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div> : 
                    <ReactECharts option={getEvolutionChart} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                }
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[350px]">
                <h3 className="font-bold text-slate-800 mb-4">Top Clientes (Receita)</h3>
                {loading ? <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div> : 
                    <ReactECharts option={getTopClientsChart} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                }
            </div>
        </div>

        {/* Data Grid / Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Filter size={16} className="text-slate-500" /> Detalhamento de Transações
                </h3>
                <span className="text-xs font-medium text-slate-500">{deals.length} registros encontrados</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4 text-center">Qtd</th>
                            <th className="px-6 py-4 text-right">Valor Unit.</th>
                            <th className="px-6 py-4 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Carregando...</td></tr>
                        ) : deals.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">Nenhuma venda encontrada neste período.</td></tr>
                        ) : (
                            deals.map((deal) => (
                                <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                        {new Date(deal.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        {deal.client_company || 'Cliente Removido'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={deal.description}>
                                        {deal.description}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        {deal.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        R$ {deal.unit_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        R$ {deal.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};