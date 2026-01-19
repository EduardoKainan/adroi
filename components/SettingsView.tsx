
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  User, Building2, CreditCard, Users, Shield, 
  Save, Loader2, CheckCircle, LogOut, Mail, Lock
} from 'lucide-react';

type SettingsTab = 'profile' | 'organization' | 'team' | 'billing' | 'integrations';

export const SettingsView: React.FC = () => {
  const { user, profile, organization, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [orgName, setOrgName] = useState(organization?.name || '');

  // Sincronizar estados iniciais
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (organization?.name) setOrgName(organization.name);
  }, [profile, organization]);

  const isAdmin = profile?.role === 'admin';

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);

      if (error) throw error;
      showSuccess('Perfil atualizado com sucesso!');
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', organization.id);

      if (error) throw error;
      showSuccess('Informações da empresa atualizadas!');
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao atualizar organização. Verifique se você é Admin.\n\nDetalhe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    if (confirm(`Enviar email de redefinição de senha para ${user.email}?`)) {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: window.location.origin,
        });
        if (error) alert('Erro ao enviar email: ' + error.message);
        else alert('Email de redefinição enviado! Verifique sua caixa de entrada.');
    }
  };

  // --- RENDERIZADORES DE CONTEÚDO ---

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Meu Perfil</h2>
        <p className="text-sm text-slate-500">Gerencie suas informações pessoais e de acesso.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <div className="relative">
               <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={fullName}
                 onChange={(e) => setFullName(e.target.value)}
               />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login)</label>
            <div className="relative">
               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="email" 
                 disabled
                 className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
                 value={user?.email || ''}
               />
            </div>
          </div>

          <div className="pt-2">
             <button 
               type="submit" 
               disabled={loading}
               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-70"
             >
               {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
               Salvar Alterações
             </button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Lock size={16} className="text-slate-400" /> Segurança
            </h3>
            <button 
              onClick={handlePasswordReset}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
                Redefinir minha senha
            </button>
        </div>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Configurações da Organização</h2>
        <p className="text-sm text-slate-500">Detalhes visíveis nos relatórios e para a equipe.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
         {isAdmin ? (
            <form onSubmit={handleUpdateOrg} className="space-y-4 max-w-lg">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa / Agência</label>
                    <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                    />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Este nome aparecerá no cabeçalho dos relatórios públicos.</p>
                </div>
                
                <div className="pt-2">
                    <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-70"
                    >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Atualizar Empresa
                    </button>
                </div>
            </form>
         ) : (
             <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex gap-3 text-amber-800">
                 <Shield className="shrink-0 mt-0.5" size={20} />
                 <div>
                     <h4 className="font-bold text-sm">Acesso Restrito</h4>
                     <p className="text-sm">Apenas administradores podem alterar as configurações da organização.</p>
                 </div>
             </div>
         )}
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-start">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Gestão de Equipe</h2>
            <p className="text-sm text-slate-500">Membros com acesso ao workspace da <b>{organization?.name}</b>.</p>
        </div>
        {isAdmin && (
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                + Convidar Membro
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                     <th className="px-6 py-4 font-medium text-slate-500">Nome</th>
                     <th className="px-6 py-4 font-medium text-slate-500">Email</th>
                     <th className="px-6 py-4 font-medium text-slate-500">Função</th>
                     <th className="px-6 py-4 font-medium text-slate-500 text-right">Ações</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {/* Current User */}
                 <tr className="bg-indigo-50/30">
                     <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {profile?.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        {profile?.full_name} <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">Você</span>
                     </td>
                     <td className="px-6 py-4 text-slate-600">{user?.email}</td>
                     <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {profile?.role}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right text-slate-400 text-xs italic">
                         -
                     </td>
                 </tr>
                 {/* Placeholder for future members */}
             </tbody>
         </table>
         <div className="p-8 text-center text-slate-400 text-sm">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>Convide gestores para colaborar na sua agência.</p>
            <p className="text-xs opacity-70 mt-1">(Funcionalidade de convites em breve)</p>
         </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div>
        <h2 className="text-xl font-bold text-slate-800">Assinatura & Planos</h2>
        <p className="text-sm text-slate-500">Gerencie o faturamento da sua conta AdRoi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Plan Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <CreditCard size={100} />
             </div>
             
             <div className="flex justify-between items-start mb-6">
                 <div>
                     <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded mb-2 inline-block">Plano Atual</span>
                     <h3 className="text-2xl font-bold text-slate-800">AdRoi Pro (Early Access)</h3>
                     <p className="text-slate-500 text-sm mt-1">Plano vitalício gratuito para beta testers.</p>
                 </div>
                 <div className="text-right">
                     <p className="text-3xl font-bold text-slate-800">R$ 0<span className="text-base font-normal text-slate-400">/mês</span></p>
                 </div>
             </div>

             <div className="space-y-3 mb-6">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                     <CheckCircle size={16} className="text-green-500" /> Clientes Ilimitados
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                     <CheckCircle size={16} className="text-green-500" /> Relatórios de IA (Gemini 1.5)
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                     <CheckCircle size={16} className="text-green-500" /> Gestão de Tarefas & CRM
                 </div>
             </div>

             <div className="flex gap-3">
                 <button className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-bold cursor-not-allowed">
                     Alterar Plano
                 </button>
                 <button className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">
                     Histórico de Faturas
                 </button>
             </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-fade-in max-w-5xl">
       {/* Sidebar Navigation */}
       <div className="w-full md:w-64 shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <User size={18} /> Perfil
          </button>
          
          <button 
            onClick={() => setActiveTab('organization')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'organization' ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <Building2 size={18} /> Organização
          </button>

          <button 
            onClick={() => setActiveTab('team')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'team' ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <Users size={18} /> Equipe
          </button>

          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'billing' ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <CreditCard size={18} /> Assinatura
          </button>

          <div className="pt-4 mt-4 border-t border-slate-200">
             <button 
               onClick={signOut}
               className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors font-medium"
             >
                <LogOut size={18} /> Sair da Conta
             </button>
          </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 min-w-0">
          {successMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={18} />
                {successMsg}
            </div>
          )}

          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'organization' && renderOrganization()}
          {activeTab === 'team' && renderTeam()}
          {activeTab === 'billing' && renderBilling()}
       </div>
    </div>
  );
};
