import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Removida configuração de external para forçar o bundling local
    // Isso corrige a tela branca causada por falhas de carregamento via CDN (ImportMap)
  },
  define: {
    // Mantém compatibilidade com bibliotecas que usam process.env
    'process.env': {}
  }
});