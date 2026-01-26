
import React from 'react';
import { HelpCircle, PlayCircle, BookOpen } from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <HelpCircle className="text-indigo-600" />
          Ajuda & Tutoriais
        </h2>
        <p className="text-slate-500 mt-1">Guia rápido para configurar e extrair o máximo do AdRoi.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Tutorial Principal */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Passo Essencial</span>
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <PlayCircle className="text-slate-400" size={20} />
                   Como Conectar sua Conta de Anúncios
                 </h3>
                 <p className="text-slate-500 text-sm mt-1">Aprenda a obter o Token de Acesso e conectar o Facebook Ads ao seu painel.</p>
              </div>
           </div>
           
           <div className="p-6 bg-slate-50">
             <div className="aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg border-4 border-white">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/LBEYkUWHecE?si=iKZW3pMQbTdaauYY" 
                    title="Como Conectar sua Conta de Anúncios" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerPolicy="strict-origin-when-cross-origin" 
                    allowFullScreen
                ></iframe>
             </div>
           </div>
           
           <div className="p-6 bg-white border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <BookOpen size={16} /> Resumo do vídeo:
              </h4>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                  <li>Acesse as Configurações da Empresa no AdRoi.</li>
                  <li>Insira o Token de API do Facebook (Meta Ads).</li>
                  <li>Certifique-se de usar um token de longa duração.</li>
                  <li>Cadastre seu cliente usando o ID da conta de anúncios (`act_123...`).</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
