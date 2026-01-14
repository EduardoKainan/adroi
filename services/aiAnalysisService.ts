import { GoogleGenAI, Type } from "@google/genai";
import { Client, Campaign, DailyMetric, Insight } from "../types";
import { supabase } from '../lib/supabase';

// Helper seguro para ler variáveis de ambiente no Vite ou Node
const getApiKey = () => {
  try {
    // Tenta ler do Vite (import.meta.env)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_API_KEY) {
      return (import.meta as any).env.VITE_GOOGLE_API_KEY;
    }
    // Fallback para process.env
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Erro ao ler variáveis de ambiente para API Key");
  }
  return '';
};

const API_KEY = getApiKey();

// Inicialização segura para evitar que o app quebre no load se a chave for inválida
let ai: GoogleGenAI | null = null;
try {
  // Inicializa mesmo com string vazia para não dar throw no construtor
  // O erro real será tratado ao chamar generateContent
  ai = new GoogleGenAI({ apiKey: API_KEY || 'dummy_key_to_prevent_crash' });
} catch (e) {
  console.warn("Falha na inicialização do cliente AI:", e);
}

export const aiAnalysisService = {
  // --- MÉTODOS DE BANCO DE DADOS ---

  // Salvar insights gerados no banco
  async saveInsights(clientId: string, insights: Insight[]) {
    if (!insights.length) return;

    const payload = insights.map(insight => ({
      client_id: clientId,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      recommendation: insight.recommendation,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('insights').insert(payload);
    if (error) console.error("Erro ao salvar insights:", error);
  },

  // Buscar insights salvos de um cliente
  async getSavedInsights(clientId: string): Promise<Insight[]> {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar insights salvos:", error);
      return [];
    }
    return data as Insight[];
  },

  // Deletar um insight específico (Concluir/Excluir)
  async deleteInsight(insightId: string) {
    const { error } = await supabase.from('insights').delete().eq('id', insightId);
    if (error) throw error;
  },

  // --- MÉTODO DE IA (EXISTENTE) ---
  
  async generateInsights(
    client: Client, 
    campaigns: Campaign[], 
    metrics: DailyMetric[]
  ): Promise<Insight[]> {
    
    // Verificação de segurança antes de chamar a API
    if (!API_KEY || !ai) {
      return [{
        type: 'warning',
        title: 'Chave de API Ausente',
        description: 'A chave da API do Google Gemini não foi configurada ou detectada.',
        recommendation: 'Adicione VITE_GOOGLE_API_KEY ao seu arquivo .env para ativar a inteligência.'
      }];
    }

    // 1. Preparar o Contexto de Dados (Payload Leve)
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    const topPerforming = campaigns.sort((a, b) => b.roas - a.roas).slice(0, 3);
    const worstPerforming = campaigns.filter(c => c.spend > 0).sort((a, b) => a.roas - b.roas).slice(0, 3);
    
    // Cálculo de tendência simples (últimos 3 dias vs 3 dias anteriores)
    const sortedMetrics = metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last3Days = sortedMetrics.slice(0, 3);
    const prev3Days = sortedMetrics.slice(3, 6);
    
    const contextData = {
      client: client.company,
      goals: {
        target_roas: client.target_roas || 4.0, // Default se não configurado
        target_cpa: client.target_cpa || 50.0,
        budget_limit: client.budget_limit || 10000,
      },
      current_performance: {
        total_spend: client.total_spend,
        total_revenue: client.total_revenue,
        total_roas: client.roas,
        total_leads: client.total_leads
      },
      campaign_highlights: {
        top_3_roas: topPerforming.map(c => ({ name: c.name, roas: c.roas, spend: c.spend })),
        bottom_3_roas: worstPerforming.map(c => ({ name: c.name, roas: c.roas, spend: c.spend }))
      },
      recent_trend: {
        last_3_days_avg_roas: last3Days.reduce((acc, m) => acc + m.roas, 0) / (last3Days.length || 1),
        prev_3_days_avg_roas: prev3Days.reduce((acc, m) => acc + m.roas, 0) / (prev3Days.length || 1),
      }
    };

    try {
      // 2. Chamada ao Modelo Gemini 3 Flash Preview (Rápido e Inteligente)
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: JSON.stringify(contextData),
        config: {
          systemInstruction: `
            You are "AdRoi Intelligence", a Senior Traffic Manager and Data Analyst expert in Meta Ads and Google Ads.
            Analyze the provided JSON data containing client goals, campaign performance, and recent trends.
            
            Your task is to identify ANOMALIES, OPPORTUNITIES, and BUDGET PACING issues.
            
            Rules:
            1. If ROAS is below target_roas, issue a CRITICAL or WARNING insight.
            2. If CPA is above target_cpa, issue a WARNING.
            3. If a campaign has high spend and low ROAS (below 1.5), suggest pausing (CRITICAL).
            4. If a campaign has high ROAS (> target * 1.5), suggest scaling (OPPORTUNITY).
            5. Check budget pacing. If spend is projected to exceed limit, warn them.
            
            Return strictly a JSON array of insights. Translate everything to Portuguese (Brazil).
            Keep titles concise (max 5 words). Keep descriptions actionable.
          `,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['critical', 'opportunity', 'warning', 'info'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                recommendation: { type: Type.STRING }
              },
              required: ['type', 'title', 'description', 'recommendation']
            }
          },
          temperature: 0.4 // Baixa temperatura para análises mais precisas e menos criativas
        }
      });

      // 3. Parse e Retorno
      if (response.text) {
        return JSON.parse(response.text) as Insight[];
      }
      return [];

    } catch (error) {
      console.error("AdRoi AI Error:", error);
      // Fallback em caso de erro (sem internet, quota excedida, etc)
      return [{
        type: 'info',
        title: 'Análise Indisponível',
        description: 'Não foi possível conectar com a inteligência artificial no momento. Tente novamente mais tarde.',
        recommendation: 'Verifique sua conexão e a chave de API.'
      }];
    }
  }
};