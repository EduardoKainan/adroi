
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientView } from './components/ClientView';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { SettingsView } from './components/SettingsView';
import { PublicReportForm } from './components/PublicReportForm';
import { HelpView } from './components/HelpView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard'; // Import
import { ReportsView } from './components/ReportsView'; // Import
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Client, ViewState, Project, Task, Goal, TaskCategory } from './types';
import { taskService } from './services/taskService';
import { clientService, getLocalDateString } from './services/clientService'; 
import { Loader2 } from 'lucide-react';

// Wrapper component to handle Auth State
const AppContent: React.FC = () => {
  const { user, loading: authLoading, profile } = useAuth();
  
  // --- LÓGICA DE ROTEAMENTO PÚBLICO ---
  const [publicClientId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/report/')) {
        const id = path.split('/report/')[1];
        if (id) return id;
    }
    return null;
  });

  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Estado Principal
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loadingTasks, setLoadingTasks] = useState(false);

  // --- Handlers ---
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('CLIENT_DETAIL');
  };

  const handleViewChange = (view: ViewState) => {
    if (view !== 'CLIENT_DETAIL') setSelectedClient(null);
    setCurrentView(view);
  };

  const fetchTaskData = async () => {
    setLoadingTasks(true);
    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 30);

      const [fetchedTasks, fetchedProjects, fetchedGoals, fetchedClients] = await Promise.all([
        taskService.getTasks(),
        taskService.getProjects(),
        taskService.getGoals(),
        clientService.getClients(getLocalDateString(start), getLocalDateString(today)) 
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setGoals(fetchedGoals);
      setClients(fetchedClients);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Carrega dados iniciais quando logado
  useEffect(() => {
    if (user && currentView === 'TASKS') fetchTaskData();
    if (user && currentView === 'CLIENT_DETAIL' && clients.length <= 1) {
       // Fetch clients for dropdown if missing
       const today = new Date();
       const start = new Date();
       start.setDate(today.getDate() - 30);
       clientService.getClients(getLocalDateString(start), getLocalDateString(today))
        .then(res => setClients(res));
    }
  }, [currentView, user]);

  const handleTaskMove = async (taskId: string, newCategory: TaskCategory) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, category: newCategory } : t));
    try { await taskService.updateTaskCategory(taskId, newCategory); } 
    catch { fetchTaskData(); }
  };

  // --- RENDER ---
  
  // 1. Loading Inicial
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // 2. Rota Pública (Relatório)
  if (publicClientId) {
    return <PublicReportForm clientId={publicClientId} />;
  }

  // 3. Auth Flow
  if (!user) {
    return authView === 'login' 
      ? <Login onRegisterClick={() => setAuthView('register')} />
      : <Register onLoginClick={() => setAuthView('login')} />;
  }

  // 4. App Principal (Logado)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />
      
      {/* 
         - md:ml-64: Margem à esquerda no desktop para não ficar embaixo da Sidebar fixa
         - pt-20: Padding top no mobile para não ficar embaixo do Header fixo
         - md:pt-8: Padding top normal no desktop
      */}
      <main className="flex-1 p-6 pt-20 md:p-8 md:pt-8 md:ml-64 overflow-y-auto w-full max-w-[1600px] mx-auto min-h-screen transition-all duration-300">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
           <div>
              <div className="text-sm text-slate-500 font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              
              <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                {/* Exibe papel do usuário para debug/confirmação visual */}
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border 
                  ${profile?.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                  {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : 'Gestor'}
                </span>
                <span>AdRoi Workspace / <span className="text-slate-600 font-semibold">{
                  currentView === 'DASHBOARD' ? 'Visão Geral' : 
                  currentView === 'CLIENT_DETAIL' ? 'Clientes' : 
                  currentView === 'TASKS' ? 'Tarefas' : 
                  currentView === 'REPORTS' ? 'Relatórios' : 
                  currentView === 'SUPER_ADMIN' ? 'Super Admin' :
                  currentView === 'HELP' ? 'Ajuda' : 
                  'Configurações'}
                </span></span>
              </div>
           </div>
        </header>

        {currentView === 'DASHBOARD' && (
          <Dashboard onSelectClient={handleClientSelect} />
        )}

        {currentView === 'CLIENT_DETAIL' && selectedClient && (
          <ClientView 
            client={selectedClient} 
            clients={clients.length > 0 ? clients : [selectedClient]} 
            onClientSwitch={handleClientSelect}
            onBack={() => handleViewChange('DASHBOARD')} 
          />
        )}

        {currentView === 'REPORTS' && (
          <ReportsView />
        )}

        {currentView === 'TASKS' && (
          loadingTasks ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <Loader2 className="animate-spin mb-4 text-indigo-600" size={40} />
              <p>Carregando seu cockpit...</p>
            </div>
          ) : (
            <ProfessionalDashboard 
              projects={projects}
              tasks={tasks}
              goals={goals}
              clients={clients}
              onTaskMove={handleTaskMove}
              onTaskCreate={fetchTaskData}
              onTaskUpdate={fetchTaskData}
              onProjectCreate={fetchTaskData}
              onTaskToggle={async (id, val) => {
                 setTasks(p => p.map(t => t.id === id ? {...t, completed: val} : t));
                 await taskService.toggleTaskCompletion(id, val);
              }}
              onTaskDelete={async (id) => {
                 if(!confirm("Excluir tarefa?")) return;
                 setTasks(p => p.filter(t => t.id !== id));
                 await taskService.deleteTask(id);
              }}
            />
          )
        )}

        {currentView === 'SETTINGS' && (
          <SettingsView />
        )}

        {currentView === 'HELP' && (
          <HelpView />
        )}

        {currentView === 'SUPER_ADMIN' && profile?.role === 'super_admin' && (
          <SuperAdminDashboard />
        )}
      </main>
    </div>
  );
};

// Root Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
