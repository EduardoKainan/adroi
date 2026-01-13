import { createClient } from '@supabase/supabase-js';

// Função auxiliar para obter variáveis de ambiente de forma segura
// Funciona tanto em ambientes com 'process.env' (Node/CRA) quanto 'import.meta.env' (Vite)
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // 1. Tenta Vite / Modern Browsers
    // Use explicit any cast for import.meta to avoid TS errors in environments where ImportMeta is not fully typed
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
    // 2. Tenta Node / Create React App
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignora erros de acesso
  }
  // 3. Retorna fallback
  return fallback;
};

// Configuração com Fallbacks Hardcoded
// Isso garante que o app não quebre se as chaves não estiverem configuradas na Vercel
const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://hfdlzpuznelntgdkswzp.supabase.co');
const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZGx6cHV6bmVsbnRnZGtzd3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTQ3ODEsImV4cCI6MjA4MzQ5MDc4MX0.HYbglf3FC1gPN1QFWp_lgCiFuEc5zkOJWF69t63gZAo');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);