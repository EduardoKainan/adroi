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

// Polyfill para evitar o erro de timeout do Navigator LockManager no iFrame
if (typeof window !== 'undefined' && window.navigator && window.navigator.locks) {
  const originalRequest = window.navigator.locks.request.bind(window.navigator.locks);
  window.navigator.locks.request = function(name: string, ...args: any[]) {
    // Se for o lock do supabase, executa o callback imediatamente ignorando o lock
    if (name.includes('supabase') || name.startsWith('lock:sb-')) {
       const callback = args.length > 1 && typeof args[1] === 'function' ? args[1] : (args.length > 0 && typeof args[0] === 'function' ? args[0] : null);
       if (callback) {
          return new Promise(async (resolve, reject) => {
             try {
                const result = await callback({ name, mode: 'exclusive' });
                resolve(result);
             } catch(err) {
                reject(err);
             }
          });
       }
    }
    return originalRequest(name, ...args);
  } as any;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
