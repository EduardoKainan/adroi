import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Externaliza dependências que são fornecidas via importmap no index.html
      // Isso impede que o Vite falhe ao tentar encontrá-las em node_modules se não estiverem instaladas
      external: [
        'echarts',
        'echarts-for-react',
        '@google/genai',
        'react',
        'react-dom',
        'recharts',
        'lucide-react',
        '@supabase/supabase-js'
      ]
    }
  },
  define: {
    // Polyfill simples para evitar crash em bibliotecas que acessam process.env
    'process.env': {}
  }
});