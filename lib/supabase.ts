import { createClient } from '@supabase/supabase-js';

// ⚠️ CONFIGURAÇÃO OBRIGATÓRIA:
// Substitua as strings abaixo pelas suas credenciais reais do painel do Supabase (Project Settings -> API).
// Se você estiver usando um arquivo .env.local, certifique-se de que as variáveis comecem com NEXT_PUBLIC_.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfdlzpuznelntgdkswzp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZGx6cHV6bmVsbnRnZGtzd3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTQ3ODEsImV4cCI6MjA4MzQ5MDc4MX0.HYbglf3FC1gPN1QFWp_lgCiFuEc5zkOJWF69t63gZAo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);