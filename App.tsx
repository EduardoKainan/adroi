import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientView } from './components/ClientView';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { PublicReportForm } from './components/PublicReportForm'; // Importar novo componente
import { Client, ViewState, Project, Task, Goal, TaskCategory } from './types';
import { taskService } from './services/taskService';
import { clientService, getLocalDateString } from './services/clientService'; 
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- LÓGICA DE ROTEAMENTO MANUAL PARA LINK PÚBLICO ---
  const [publicClientId, setPublicClientId] = useState<string | null>(null);

  useEffect(() => {
    // Verifica se a URL é do tipo /report/:clientId
    const path = window.location.pathname;
    if (path.startsWith('/report/')) {
        const id = path.split('/report/')[1];
        if (id) {
            setPublicClientId(id);
        }
    }
  }, []);

  // Se for uma rota pública, renderiza APENAS o formulário
  if (publicClientId) {
    return <PublicReportForm clientId={publicClientId} />;
  }
  // -----------------------------------------------------

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // States for Task Management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [loadingTasks, setLoadingTasks] = useState(false);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('CLIENT_DETAIL');
  };

  const handleViewChange = (view: ViewState) => {
    if (view !== 'CLIENT_DETAIL') {
      setSelectedClient(null);
    }
    setCurrentView(view);
  };

  // Carrega dados de tarefas quando a view muda para TASKS
  useEffect(() => {
    if (currentView === 'TASKS') {
      fetchTaskData();
    }
  }, [currentView]);

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
      console.error("Erro ao carregar dados de tarefas", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskMove = async (taskId: string, newCategory: TaskCategory) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, category: newCategory } : task
      )
    );
    try {
      await taskService.updateTaskCategory(taskId, newCategory);
    } catch (error) {
      console.error("Erro ao salvar movimento da tarefa", error);
      fetchTaskData(); 
    }
  };

  const handleCreateTask = async () => {
    await fetchTaskData(); 
  };
  
  const handleUpdateTask = async () => {
    await fetchTaskData();
  };
  
  const handleCreateProject = async () => {
    await fetchTaskData(); 
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: completed } : task
        )
    );
    try {
        await taskService.toggleTaskCompletion(taskId, completed);
    } catch (error) {
        console.error("Erro ao atualizar status da tarefa", error);
        fetchTaskData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if(!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    try {
        await taskService.deleteTask(taskId);
    } catch (error) {
        console.error("Erro ao deletar tarefa", error);
        fetchTaskData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />
      
      {/* Main Content Area */}
      <main className="flex-1 p-8 pt-24 overflow-y-auto w-full max-w-[1600px] mx-auto">
        <header className="mb-6 flex justify-between items-center">
           <div className="text-sm text-slate-500 font-medium">
             {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
           
           <div className="text-sm text-slate-400">
             AdRoi Workspace / <span className="text-slate-600 font-semibold">{currentView === 'DASHBOARD' ? 'Visão Geral' : currentView}</span>
           </div>
        </header>

        {currentView === 'DASHBOARD' && (
          <Dashboard onSelectClient={handleClientSelect} />
        )}

        {currentView === 'CLIENT_DETAIL' && selectedClient && (
          <ClientView 
            client={selectedClient} 
            onBack={() => handleViewChange('DASHBOARD')} 
          />
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
              onTaskCreate={handleCreateTask}
              onTaskUpdate={handleUpdateTask}
              onProjectCreate={handleCreateProject}
              onTaskToggle={handleToggleTask}
              onTaskDelete={handleDeleteTask}
            />
          )
        )}

        {currentView !== 'DASHBOARD' && currentView !== 'CLIENT_DETAIL' && currentView !== 'TASKS' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
             <h2 className="text-2xl font-bold mb-2">Em desenvolvimento</h2>
             <p>Este módulo estará disponível na próxima versão do AdRoi.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;