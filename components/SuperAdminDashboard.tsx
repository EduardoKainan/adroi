
import React, { useState, useEffect } from 'react';
import { superAdminService } from '../services/superAdminService';
import { AdminOrgMetric, AdminUserMetric } from '../types';
import { Building2, Users, Shield, Search, Loader2, Database, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<AdminOrgMetric[]>([]);
  const [users, setUsers] = useState<AdminUserMetric[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Tenta buscar separadamente para identificar qual falha
      const orgsData = await superAdminService.getAllOrganizations();
      const usersData = await superAdminService.getAllUsers();
      
      setOrgs(orgsData || []);
      setUsers(usersData || []);
    } catch (err: any) {
      console.error("Super Admin Error:", err);
      const msg = err.message || 'Erro desconhecido ao carregar dados.';
      setError(msg);
      toast.error('Falha ao carregar dados. Verifique o alerta na tela.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.includes(searchTerm)
  );

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculos de Totais
  const totalOrgs = orgs.length;
  const totalUsers = users.length;
  const totalClientsManaged = orgs.reduce((acc, o) => acc + (o.total_clients || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl shadow-slate-900/20 border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Shield className="text-red-500" size={24} />
               <h2 className="text-2xl font-bold tracking-tight">Painel Super Admin</h2>
            </div>
            <p className="text-slate-400 text-sm">Visão global de todos os tenants e usuários do sistema.</p>
          </div>
          <div className="flex gap-4">
             <div className="text-right px-4 border-r border-slate-700">
                <p className="text-xs text-slate-400 uppercase font-bold">Assinaturas</p>
                <p className="text-2xl font-bold">{totalOrgs}</p>
             </div>
             <div className="text-right px-4 border-r border-slate-700">
                <p className="text-xs text-slate-400 uppercase font-bold">Usuários</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
             </div>
             <div className="text-right pl-4">
                <p className="text-xs text-slate-400 uppercase font-bold">Clientes Geridos</p>
                <p className="text-2xl font-bold text-emerald-400">{totalClientsManaged}</p>
             </div>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-red-800">Acesso Bloqueado ou Erro de Configuração</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    
                    <div className="mt-3 text-xs bg-white/50 p-2 rounded border border-red-100 text-red-800">
                        <strong>Diagnóstico:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            {error.includes('function') ? (
                                <li>As funções SQL não foram criadas. Execute o arquivo <code>supabase/super_admin_setup.sql</code>.</li>
                            ) : error.includes('Acesso negado') || error.includes('Access denied') ? (
                                <li>Seu usuário não tem a role <code>super_admin</code> no banco. Execute <code>UPDATE profiles SET role = 'super_admin' WHERE email = 'seu@email.com';</code></li>
                            ) : (
                                <li>Erro genérico. Verifique os logs do Supabase.</li>
                            )}
                        </ul>
                    </div>
                    <button 
                        onClick={fetchData} 
                        className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> Tentar Novamente
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('orgs')}
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'orgs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
               <Building2 size={16} /> Organizações
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
               <Users size={16} /> Usuários
            </button>
         </div>

         <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'orgs' ? "Buscar organização..." : "Buscar usuário..."}
              className="pl-10 pr-4 py-2.5 w-full md:w-80 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
         {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
               <Loader2 size={40} className="animate-spin mb-4 text-indigo-600" />
               <p>Carregando dados globais...</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
               {activeTab === 'orgs' ? (
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] tracking-wider text-slate-500">
                        <tr>
                           <th className="px-6 py-4 font-bold">Organização</th>
                           <th className="px-6 py-4 font-bold text-center">Usuários</th>
                           <th className="px-6 py-4 font-bold text-center">Clientes</th>
                           <th className="px-6 py-4 font-bold text-center">Projetos</th>
                           <th className="px-6 py-4 font-bold">Data Criação</th>
                           <th className="px-6 py-4 font-bold text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredOrgs.length > 0 ? filteredOrgs.map(org => (
                           <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="font-bold text-slate-800 text-base">{org.name}</div>
                                 <div className="text-[10px] text-slate-400 font-mono">{org.id}</div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                                    {org.total_users}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                                    {org.total_clients}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-center text-slate-600 font-medium">
                                 {org.total_projects}
                              </td>
                              <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                                 <Calendar size={14} />
                                 {new Date(org.created_at).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div> Ativo
                                 </span>
                              </td>
                           </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                                    Nenhuma organização encontrada.
                                </td>
                            </tr>
                        )}
                     </tbody>
                  </table>
               ) : (
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] tracking-wider text-slate-500">
                        <tr>
                           <th className="px-6 py-4 font-bold">Usuário</th>
                           <th className="px-6 py-4 font-bold">Organização</th>
                           <th className="px-6 py-4 font-bold">Role</th>
                           <th className="px-6 py-4 font-bold text-right">Ações</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length > 0 ? filteredUsers.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="font-bold text-slate-800">{user.full_name || 'Sem nome'}</div>
                                 <div className="text-xs text-slate-500">{user.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Building2 size={14} className="text-slate-400" />
                                    {user.organization_name || 'Sem Org'}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border 
                                    ${user.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-100' : 
                                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                      'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {user.role}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button className="text-xs text-indigo-600 font-bold hover:underline">
                                    Detalhes
                                 </button>
                              </td>
                           </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">
                                    Nenhum usuário encontrado.
                                </td>
                            </tr>
                        )}
                     </tbody>
                  </table>
               )}
            </div>
         )}
      </div>
    </div>
  );
};
