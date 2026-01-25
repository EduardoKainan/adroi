
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  User, Building2, CreditCard, Users, Shield, 
  Save, Loader2, CheckCircle, LogOut, Mail, Lock, Plus, Trash2, Clock, Eye, EyeOff, Key
} from 'lucide-react';
import { UserProfile, OrganizationInvite } from '../types';
import { toast } from 'sonner';

type SettingsTab = 'profile' | 'organization' | 'team' | 'billing';

export const SettingsView: React.FC = () => {
  const { user, profile, organization, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);

  // Form States
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [metaToken, setMetaToken] = useState(organization?.meta_api_token || '');
  const [showMetaToken, setShowMetaToken] = useState(false);

  // Team States
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager'>('manager');

  // Sincronizar estados iniciais
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (organization?.name) setOrgName(organization.name);
    // Nota: O token pode ser null, então checamos se é undefined para não sobrescrever caso o usuário esteja digitando e algo dispare o effect (embora deps controlem)
    if (organization?.meta_api_token !== undefined) setMetaToken(organization.meta_api_token || '');
  }, [profile, organization]);

  // Carregar Time ao entrar na aba
  useEffect(() => {
    if (activeTab === 'team' && organization?.id) {
        fetchTeamData();
    }
  }, [activeTab, organization?.id]);

  const isAdmin = profile?.role === 'admin';

  const fetchTeamData = async () => {
    if (!organization?.id) return;
    try {
        // 1. Membros Ativos
        const { data: members, error: membersError } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', organization.id);
        
        if (membersError) throw membersError;
        setTeamMembers(members as UserProfile[]);

        // 2. Convites Pendentes (Apenas se for admin)
        if (isAdmin) {
            const { data: invitesData, error: invitesError } = await supabase
                .from('organization_invites')
                .select('*')
                .eq('organization_id', organization.id);
            
            if (!invitesError) setInvites(invitesData as OrganizationInvite[]);
        }

    } catch (error) {
        console.error("Erro ao carregar time:", error);
    }
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
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Importante: .select() garante que o retorno contenha os dados atualizados.
      // Se RLS bloquear, data será vazio/null.
      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          name: orgName,
          meta_api_token: metaToken 
        })
        .eq('id', organization.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Nenhuma alteração salva. Verifique se você é Administrador.");
      }

      toast.success('Informações da empresa atualizadas!');
      
      // Opcional: Recarregar a página para garantir que o contexto global (AuthContext) pegue o novo token
      // Isso evita que o campo fique vazio se o usuário mudar de aba e voltar.
      setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao atualizar organização: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!organization?.id) return;
      setLoading(true);

      try {
          const { error } = await supabase
            .from('organization_invites')
            .insert([{
                organization_id: organization.id,
                email: inviteEmail,
                role: inviteRole
            }]);

          if (error) throw error;

          toast.success(`Convite enviado para ${inviteEmail}`);
          setInviteEmail('');
          setShowInviteModal(false);
          fetchTeamData(); // Recarrega a lista

      } catch (error: any) {
          toast.error(`Erro ao convidar: ${error.message}`);
      } finally {
          setLoading(false);
      }
  };

  const handleRevokeInvite = async (inviteId: string) => {
      if(!confirm("Tem certeza que deseja cancelar este convite?")) return;
      try {
          const { error } = await supabase.from('organization_invites').delete().eq('id', inviteId);
          if (error) throw error;
          fetchTeamData();
          toast.success("Convite cancelado.");
      } catch (error: any) {
          toast.error("Erro ao remover convite: " + error.message);
      }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    if (confirm(`Enviar email de redefinição de senha para ${user.email}?`)) {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: window.location.origin,
        });
        if (error) toast.error('Erro ao enviar email: ' + error.message);
        else toast.success('Email de redefinição enviado! Verifique sua caixa de entrada.');
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
            <form onSubmit={handleUpdateOrg} className="space-y-6 max-w-lg">
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

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Token da API do Facebook (Meta Ads)</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type={showMetaToken ? "text" : "password"}
                          className="w-full pl-10 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                          placeholder="EAAB..."
                      />
                      <button 
                        type="button"
                        onClick={() => setShowMetaToken(!showMetaToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showMetaToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Token de acesso de longa duração para integração com N8N/Webhook.
                    </p>
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
            <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
                <Plus size={16} /> Convidar Membro
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
                     <th className="px-6 py-4 font-medium text-slate-500 text-right">Status</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {/* 1. Membros Ativos */}
                 {teamMembers.map(member => (
                    <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                               {member.full_name?.substring(0,2) || 'US'}
                           </div>
                           {member.full_name} 
                           {member.id === user?.id && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">Você</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{member.email}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                               {member.role === 'admin' ? 'Administrador' : 'Gerente'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-green-50 text-green-700">
                               <CheckCircle size={12} /> Ativo
                           </span>
                        </td>
                    </tr>
                 ))}

                 {/* 2. Convites Pendentes */}
                 {invites.map(invite => (
                     <tr key={invite.id} className="bg-slate-50/50">
                        <td className="px-6 py-4 font-medium text-slate-400 italic flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                               <Mail size={14} />
                           </div>
                           (Pendente)
                        </td>
                        <td className="px-6 py-4 text-slate-500">{invite.email}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${invite.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} opacity-70`}>
                               {invite.role === 'admin' ? 'Administrador' : 'Gerente'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-yellow-50 text-yellow-700">
                               <Clock size={12} /> Aguardando
                           </span>
                           {isAdmin && (
                               <button 
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Cancelar convite"
                               >
                                   <Trash2 size={14} />
                               </button>
                           )}
                        </td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      {/* Modal de Convite (Inline para simplicidade) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-slate-800 mb-1">Convidar Novo Membro</h3>
                <p className="text-sm text-slate-500 mb-6">O usuário receberá acesso ao workspace assim que se cadastrar com este email.</p>
                
                <form onSubmit={handleSendInvite} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email do Colaborador</label>
                        <input 
                            required
                            type="email" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="colaborador@exemplo.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão</label>
                        <select 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager')}
                        >
                            <option value="manager">Gerente (Pode gerenciar clientes/projetos)</option>
                            <option value="admin">Administrador (Acesso total)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setShowInviteModal(false)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 py-2 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                            Enviar Convite
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
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
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'organization' && renderOrganization()}
          {activeTab === 'team' && renderTeam()}
          {activeTab === 'billing' && renderBilling()}
       </div>
    </div>
  );
};
