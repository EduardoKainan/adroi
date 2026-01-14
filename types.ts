
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CLIENT = 'client'
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email?: string;
  ad_account_id?: string;
  status: 'active' | 'churned' | 'paused';
  total_spend: number;
  total_revenue: number;
  total_leads?: number;
  roas: number;
  roi: number;
  last_updated: string;
  created_at?: string;
  
  // Metas de Performance (AdRoi Intelligence)
  target_roas?: number;
  target_cpa?: number;
  budget_limit?: number;

  // CRM Lite Feature Flag
  crm_enabled?: boolean;
}

export interface Insight {
  id?: string; // ID do banco de dados (opcional pois o AI gera sem ID inicialmente)
  type: 'critical' | 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  created_at?: string;
}

export interface CommercialActivity {
  id: string;
  client_id: string;
  type: 'meeting' | 'proposal';
  date: string;
  prospect_name?: string;
  value?: number;
  notes?: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  objective: string;
  spend: number;
  revenue: number;
  leads: number;
  purchases: number; // Renomeado de sales para purchases
  roas: number;
  impressions: number;
  clicks: number;
}

export interface Contract {
  id: string;
  client_id: string;
  type: 'fixed' | 'commission' | 'hybrid';
  monthly_value: number;
  commission_percent: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  // UI computed property
  days_remaining?: number;
}

export interface DailyMetric {
  date: string;
  spend: number;
  revenue: number;
  leads: number;
  roas: number;
}

export interface Deal {
  id: string;
  client_id: string;
  date: string;
  description: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  created_at: string;
}

// Interfaces para o Dashboard Profissional (Produtividade)
export type TaskCategory = 'do_now' | 'schedule' | 'delegate' | 'delete';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: TaskCategory; // Campo novo para Matriz de Eisenhower
  durationMinutes?: number; 
  projectId?: string;
  dueDate?: string;
  clientId?: string; // Foreign Key para o banco
  clientName?: string; // Opcional para contexto no card (Join)
}

export interface Project {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  deadline?: string;
}

export interface Goal {
  id: string;
  title: string;
  status: 'on_track' | 'at_risk' | 'completed';
}

// For UI State Management
export type ViewState = 'DASHBOARD' | 'CLIENT_DETAIL' | 'SETTINGS' | 'TASKS';