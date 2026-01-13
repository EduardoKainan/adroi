import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientView } from './components/ClientView';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { Client, ViewState, Project, Task, Goal, TaskCategory } from './types';
import { taskService } from './services/taskService';
import { clientService } from './services/clientService'; // Necessário para listar clientes na modal de tarefas
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // States for Task Management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // Clientes para o dropdown de tarefas
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
      // Carrega tarefas, projetos, metas E clientes (para poder vincular na criação)
      const [fetchedTasks, fetchedProjects, fetchedGoals, fetchedClients] = await Promise.all([
        taskService.getTasks(),
        taskService.getProjects(),
        taskService.getGoals(),
        clientService.getClients(30) // Busca clientes (usando 30 dias padrão para métricas, mas aqui queremos só a lista)
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
    await fetchTaskData(); // Recarrega tudo para pegar a nova tarefa com os joins corretos
  };
  
  const handleUpdateTask = async () => {
    await fetchTaskData();
  };
  
  const handleCreateProject = async () => {
    await fetchTaskData(); // Recarrega para incluir o novo projeto
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
      {/* Navigation Header (formerly Sidebar) */}
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />
      
      {/* Main Content Area - Added pt-20 to clear fixed header */}
      <main className="flex-1 p-8 pt-24 overflow-y-auto w-full max-w-[1600px] mx-auto">
        <header className="mb-6 flex justify-between items-center">
           <div className="text-sm text-slate-500 font-medium">
             {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
           
           {/* Breadcrumb / Context indicator could go here */}
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