import { supabase } from '../lib/supabase';
import { Client, Campaign, DailyMetric } from '../types';

export const clientService = {
  // Fetch all clients with aggregated real-time metrics filtered by date
  async getClients(days = 30) {
    try {
      // Calcular data de início
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // 1. Busca os clientes
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientError) {
        console.error('❌ ERRO CRÍTICO NO SUPABASE:', clientError.message);
        throw clientError;
      }

      if (!clients || clients.length === 0) return [];

      // 2. Busca todas as campanhas desses clientes para vincular IDs
      const clientIds = clients.map(c => c.id);
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, client_id')
        .in('client_id', clientIds);

      const campaignIds = campaigns?.map(c => c.id) || [];

      // 3. Busca métricas acumuladas (leads, spend, revenue) FILTRADAS POR DATA
      let metricsData: any[] = [];
      if (campaignIds.length > 0) {
        const { data: metrics, error: metricsError } = await supabase
          .from('campaign_metrics')
          .select('campaign_id, leads, spend, revenue')
          .in('campaign_id', campaignIds)
          .gte('date', startDateStr); // Filtro de Data
        
        if (!metricsError && metrics) {
          metricsData = metrics;
        }
      }

      // 4. Agrega os dados em memória para garantir consistência no Dashboard
      const clientsWithMetrics = clients.map(client => {
        // Encontrar campanhas deste cliente
        const myCampaigns = campaigns?.filter(c => c.client_id === client.id) || [];
        const myCampaignIds = myCampaigns.map(c => c.id);

        // Filtrar métricas das campanhas deste cliente
        const myMetrics = metricsData.filter(m => myCampaignIds.includes(m.campaign_id));

        // Calcular totais reais baseados no período selecionado
        const realTotalLeads = myMetrics.reduce((sum, m) => sum + (Number(m.leads) || 0), 0);
        const realTotalSpend = myMetrics.reduce((sum, m) => sum + (Number(m.spend) || 0), 0);
        const realTotalRevenue = myMetrics.reduce((sum, m) => sum + (Number(m.revenue) || 0), 0);
        
        // Calcular ROAS real
        const realRoas = realTotalSpend > 0 ? realTotalRevenue / realTotalSpend : 0;

        return {
          ...client,
          total_leads: realTotalLeads,      
          total_spend: realTotalSpend,      
          total_revenue: realTotalRevenue,  
          roas: realRoas
        };
      });
      
      return clientsWithMetrics as Client[];
    } catch (error) {
      console.error('Erro de conexão:', error);
      return []; 
    }
  },

  // Create a new client
  async createClient(clientData: Partial<Client>) {
    const payload = {
      name: clientData.name,
      company: clientData.company,
      email: clientData.email,
      ad_account_id: clientData.ad_account_id,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        ...data,
        total_spend: 0,
        total_revenue: 0,
        total_leads: 0,
        roas: 0,
        roi: 0
      } as Client;
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error?.message || error);
      throw error;
    }
  },

  // Fetch campaigns for a specific client AND aggregate their metrics filtered by date
  async getCampaigns(clientId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 1. Buscar metadados das campanhas
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) throw error;
    if (!campaigns || campaigns.length === 0) return [];

    const campaignIds = campaigns.map(c => c.id);

    // 2. Buscar métricas acumuladas de todas essas campanhas no período
    // Usamos select('*') para evitar erro caso a coluna 'purchases' ainda não exista no banco
    const { data: metrics, error: metricsError } = await supabase
      .from('campaign_metrics')
      .select('*')
      .in('campaign_id', campaignIds)
      .gte('date', startDateStr); // Filtro de Data

    if (metricsError) throw metricsError;

    // 3. Agregar (Somar) as métricas por campanha
    const metricsMap: Record<string, any> = {};
    
    metrics?.forEach((m: any) => {
      if (!metricsMap[m.campaign_id]) {
        metricsMap[m.campaign_id] = { spend: 0, revenue: 0, leads: 0, impressions: 0, clicks: 0, purchases: 0 };
      }
      metricsMap[m.campaign_id].spend += Number(m.spend || 0);
      metricsMap[m.campaign_id].revenue += Number(m.revenue || 0);
      metricsMap[m.campaign_id].leads += Number(m.leads || 0);
      metricsMap[m.campaign_id].impressions += Number(m.impressions || 0);
      metricsMap[m.campaign_id].clicks += Number(m.clicks || 0);
      // Mapeia purchases diretamente
      metricsMap[m.campaign_id].purchases += Number(m.purchases || 0); 
    });

    // 4. Combinar Campanha + Métricas Calculadas
    const result = campaigns.map(c => {
      const stats = metricsMap[c.id] || { spend: 0, revenue: 0, leads: 0, impressions: 0, clicks: 0, purchases: 0 };
      const roas = stats.spend > 0 ? stats.revenue / stats.spend : 0;
      
      return {
        ...c,
        spend: stats.spend,
        revenue: stats.revenue,
        leads: stats.leads,
        purchases: stats.purchases,
        impressions: stats.impressions,
        clicks: stats.clicks,
        roas: roas
      };
    });

    return result.sort((a, b) => b.spend - a.spend) as Campaign[];
  },

  // Fetch daily metrics aggregated by date for the charts (Client Level)
  async getClientMetrics(clientId: string, days = 30) {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId);
    
    if (!campaigns || campaigns.length === 0) return [];

    const campaignIds = campaigns.map(c => c.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: metrics, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .in('campaign_id', campaignIds)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    const aggregated: Record<string, DailyMetric> = {};

    metrics?.forEach((m: any) => {
      if (!aggregated[m.date]) {
        aggregated[m.date] = { date: m.date, spend: 0, revenue: 0, leads: 0, roas: 0 };
      }
      aggregated[m.date].spend += Number(m.spend);
      aggregated[m.date].revenue += Number(m.revenue);
      aggregated[m.date].leads += Number(m.leads);
    });

    return Object.values(aggregated).map(d => ({
      ...d,
      roas: d.spend > 0 ? Number((d.revenue / d.spend).toFixed(2)) : 0
    }));
  },

  // Fetch daily metrics for a specific campaign (Campaign Level)
  async getSingleCampaignMetrics(campaignId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: metrics, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    return (metrics || []).map((m: any) => ({
      date: m.date,
      spend: Number(m.spend || 0),
      revenue: Number(m.revenue || 0),
      leads: Number(m.leads || 0),
      roas: Number(m.spend) > 0 ? Number((m.revenue / m.spend).toFixed(2)) : 0
    })) as DailyMetric[];
  }
};