
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CLIENT = 'client'
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  created_at: string;
  meta_api_token?: string; // Novo campo para o Token da API do Facebook/Meta
}

export interface UserProfile {
  id: string;
  organization_id: string;
  role: 'admin' | 'manager' | 'client';
  full_name?: string;
  email?: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'manager';
  created_at: string;
  status: 'pending' | 'accepted';
}

export interface Client {
  id: string;
  organization_id?: string; // Novo campo SaaS
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
  id?: string;
  organization_id?: string;
  type: 'critical' | 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  created_at?: string;
}

export interface CommercialActivity {
  id: string;
  client_id: string;
  organization_id?: string;
  type: 'meeting' | 'proposal';
  date: string;
  prospect_name?: string;
  value?: number;
  notes?: string;
  quantity?: number;
  lead_quality_score?: number;
  created_at?: string;
}

export interface Campaign {
  id: string;
  organization_id?: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  objective: string;
  spend: number;
  revenue: number;
  leads: number;
  purchases: number; 
  roas: number;
  impressions: number;
  clicks: number;
}

export interface Contract {
  id: string;
  organization_id?: string;
  client_id: string;
  type: 'fixed' | 'commission' | 'hybrid';
  monthly_value: number;
  commission_percent: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
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
  organization_id?: string;
  client_id: string;
  date: string;
  description: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  created_at: string;
}

export type TaskCategory = 'do_now' | 'schedule' | 'delegate' | 'delete';

export interface Task {
  id: string;
  organization_id?: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: TaskCategory; 
  durationMinutes?: number; 
  projectId?: string;
  dueDate?: string;
  clientId?: string; 
  clientName?: string; 
}

export interface Project {
  id: string;
  organization_id?: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  deadline?: string;
}

export interface Goal {
  id: string;
  organization_id?: string;
  title: string;
  status: 'on_track' | 'at_risk' | 'completed';
}

export type ViewState = 'DASHBOARD' | 'CLIENT_DETAIL' | 'SETTINGS' | 'TASKS' | 'HELP';
