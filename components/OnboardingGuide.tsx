
import React, { useState } from 'react';
import { Rocket, Users, ShieldCheck, ArrowRight, Check, X, PlayCircle } from 'lucide-react';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAction: () => void; // Ação principal (ex: Abrir modal de novo cliente)
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose, onStartAction }) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const totalSteps = 4; // Aumentado para 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // No último passo, executa a ação e fecha
      onStartAction();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative mx-4 max-h-[90vh] flex flex-col">
        
        {/* Background Decorativo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors z-20"
        >
          <X size={20} />
        </button>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {/* --- PASSO 1: BOAS VINDAS & TUTORIAL (Primeiro Passo) --- */}
          {step === 1 && (
            <div className="text-center space-y-4 animate-in slide-in-from-right-8 duration-300">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Bem-vindo ao AdRoi SaaS</h2>
              <p className="text-slate-500 leading-relaxed text-sm mb-4">
                Sua plataforma de Business Intelligence para gestão de tráfego. 
                <br/><strong>Assista ao vídeo abaixo para aprender como conectar sua conta:</strong>
              </p>
              
              {/* VÍDEO EMBEDADO */}
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-100">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/LBEYkUWHecE?si=iKZW3pMQbTdaauYY" 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerPolicy="strict-origin-when-cross-origin" 
                    allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* --- PASSO 2: VISÃO GERAL --- */}
          {step === 2 && (
             <div className="text-center space-y-4 animate-in slide-in-from-right-8 duration-300 pt-10">
               <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <PlayCircle size={32} />
               </div>
               <h2 className="text-2xl font-bold text-slate-800">O que fazer agora?</h2>
               <p className="text-slate-500 leading-relaxed">
                 Como você viu no vídeo, o primeiro passo é acessar as <strong>Configurações</strong> e inserir seu Token da API do Meta Ads.
                 Isso permitirá que o sistema puxe os dados automaticamente.
               </p>
             </div>
          )}

          {/* --- PASSO 3: SEGURANÇA --- */}
          {step === 3 && (
            <div className="text-center space-y-4 animate-in slide-in-from-right-8 duration-300 pt-10">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Segurança Multi-tenant</h2>
              <p className="text-slate-500 leading-relaxed">
                Seus dados estão protegidos e isolados na sua <strong>Organização</strong>.
                Você pode convidar membros para sua equipe e gerenciar permissões no menu de Configurações.
              </p>
            </div>
          )}

          {/* --- PASSO 4: PRIMEIRO CLIENTE --- */}
          {step === 4 && (
            <div className="text-center space-y-4 animate-in slide-in-from-right-8 duration-300 pt-10">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Cadastre seu 1º Cliente</h2>
              <p className="text-slate-500 leading-relaxed">
                Para começar a ver métricas, precisamos adicionar seu primeiro cliente.
                Isso liberará o Dashboard, Relatórios e a Inteligência Artificial.
              </p>
            </div>
          )}
        </div>

        {/* Footer com Navegação */}
        <div className="bg-slate-50 p-6 flex items-center justify-between border-t border-slate-100 mt-auto shrink-0">
          
          {/* Indicadores de Progresso */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === i ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg shadow-indigo-200"
          >
            {step === totalSteps ? (
              <>Cadastrar Cliente <Check size={18} /></>
            ) : (
              <>Próximo <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
