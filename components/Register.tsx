
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onLoginClick: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName // Isso será lido pelo Trigger para criar a Org
          }
        }
      });

      if (error) throw error;
      // Se sucesso, o trigger SQL vai criar Org e Profile automaticamente
      
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          Crie sua conta AdRoi
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Comece a gerenciar suas campanhas e clientes hoje.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Nome Completo</label>
                    <input
                      required
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Nome da Agência / Empresa</label>
                    <input
                      required
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                    />
                 </div>
                 <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!formData.fullName || !formData.companyName}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Próximo
                  </button>
              </div>
            )}

            {step === 2 && (
               <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      required
                      type="email"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Senha</label>
                    <input
                      required
                      type="password"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Voltar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Finalizar Cadastro'}
                    </button>
                  </div>
               </div>
            )}
          </form>

          <div className="mt-6 text-center">
              <button onClick={onLoginClick} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center gap-1 mx-auto">
                 <ArrowLeft size={14} /> Já tenho uma conta
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
