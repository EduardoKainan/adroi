
import React, { useState, useEffect, useMemo } from 'react';
import { Project, Task, Goal, TaskCategory, Client } from '../types'; 
import { Plus, MoreHorizontal, Calendar, Clock, ArrowRight, ArrowLeft, Trash2, PenLine, Target, AlertCircle, Briefcase, TrendingUp, CheckCircle2, GripVertical, X, ListTodo, ChevronRight, Eye, EyeOff, BarChart2, Layout, Filter, Play } from 'lucide-react';
import { NewTaskModal } from './NewTaskModal';
import { NewProjectModal } from './NewProjectModal';
import { FocusModeOverlay } from './FocusModeOverlay';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface ProfessionalDashboardProps {
  projects: Project[];
  tasks: Task[];
  goals: Goal[];
  clients: Client[];
  onTaskMove?: (taskId: string, newCategory: TaskCategory) => void;
  onTaskCreate?: () => void;
  onTaskUpdate?: () => void;
  onProjectCreate?: () => void;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskDelete?: (taskId: string) => void;
}

export const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ projects, tasks, goals, clients, onTaskMove, onTaskCreate, onTaskUpdate, onProjectCreate, onTaskToggle, onTaskDelete }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskCategory | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  
  // State para controlar visibilidade de tarefas concluídas
  const [showCompleted, setShowCompleted] = useState(false);
  
  // State para alternar entre Kanban e Gráficos
  const [viewMode, setViewMode] = useState<'board' | 'analytics'>('board');

  // State para Filtro de Data (Analytics)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Últimos 30 dias
    end: new Date().toISOString().split('T')[0]
  });
  
  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newTaskInitialCategory, setNewTaskInitialCategory] = useState<TaskCategory | undefined>(undefined);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // Sincroniza o projeto selecionado com a lista atualizada de projetos quando há alterações
  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    }
  }, [projects]);

  // --- 1. Cálculos de KPIs ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const activeProjects = projects.filter(p => p.status === 'active');
  const pendingTasks = tasks.filter(t => !t.completed);
  const totalPendingMinutes = pendingTasks.reduce((acc, t) => acc + (t.durationMinutes || 30), 0);
  const totalPendingHours = (totalPendingMinutes / 60).toFixed(1);

  // Ordenação para o Cronograma (Sidebar)
  const sortedTasksByDate = [...tasks]
    .filter(t => t.dueDate && !t.completed)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const openNewTaskModal = (category?: TaskCategory) => {
    setTaskToEdit(null); // Garante que não está editando
    setNewTaskInitialCategory(category);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const openNewProjectModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = () => {
    if (selectedProject) {
      setProjectToEdit(selectedProject);
      setIsProjectModalOpen(true);
    }
  };

  const handleTaskSuccess = () => {
    if (taskToEdit && onTaskUpdate) {
        onTaskUpdate();
    } else if (onTaskCreate) {
        onTaskCreate();
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, category: TaskCategory) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== category) {
      setDragOverColumn(category);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
     // Optional
  };

  const handleDrop = (e: React.DragEvent, category: TaskCategory) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onTaskMove) {
      onTaskMove(taskId, category);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Helper para calcular progresso
  const calculateProjectProgress = (projectId: string, manualProgress: number = 0) => {
      const projectTasks = tasks.filter(t => t.projectId === projectId);
      const total = projectTasks.length;
      if (total === 0) return manualProgress; // Fallback para manual se não houver tarefas
      
      const completed = projectTasks.filter(t => t.completed).length;
      return Math.round((completed / total) * 100);
  };

  // --- ECHARTS OPTIONS ---

  // 1. Prioridade das Tarefas (Bar)
  const getPriorityOption = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const medium = tasks.filter(t => t.priority === 'medium' && !t.completed).length;
    const low = tasks.filter(t => t.priority === 'low' && !t.completed).length;

    return {
      title: { text: 'Tarefas Pendentes por Prioridade', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
      tooltip: { trigger: 'item' },
      xAxis: { type: 'category', data: ['Alta', 'Média', 'Baixa'], axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      grid: { bottom: 30, top: 40, left: 40, right: 20 },
      series: [
        {
          data: [
            { value: high, itemStyle: { color: '#ef4444' } },
            { value: medium, itemStyle: { color: '#eab308' } },
            { value: low, itemStyle: { color: '#3b82f6' } }
          ],
          type: 'bar',
          barWidth: '40%',
          label: { show: true, position: 'top' },
          itemStyle: { borderRadius: [4, 4, 0, 0] }
        }
      ]
    };
  }, [tasks]);

  // 2. Progresso dos Projetos (Horizontal Bar)
  const getProjectProgressChart = useMemo(() => {
    const active = projects.filter(p => p.status === 'active').slice(0, 8); // Top 8 active
    const titles = active.map(p => p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title);
    const progressData = active.map(p => calculateProjectProgress(p.id, p.progress));

    return {
      title: { text: 'Progresso dos Projetos Ativos', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', max: 100, splitLine: { show: false } },
      yAxis: { type: 'category', data: titles, axisTick: { show: false }, axisLine: { show: false } },
      series: [
        {
          type: 'bar',
          data: progressData,
          barWidth: 15,
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{offset: 0, color: '#4f46e5'}, {offset: 1, color: '#818cf8'}]),
            borderRadius: [0, 4, 4, 0]
          },
          label: { show: true, position: 'right', formatter: '{c}%' }
        }
      ]
    };
  }, [projects, tasks]);

  // 3. Matriz de Tarefas (Donut)
  const getMatrixOption = useMemo(() => {
    const doNow = tasks.filter(t => t.category === 'do_now' && !t.completed).length;
    const schedule = tasks.filter(t => t.category === 'schedule' && !t.completed).length;
    const delegate = tasks.filter(t => t.category === 'delegate' && !t.completed).length;
    const del = tasks.filter(t => t.category === 'delete' && !t.completed).length;

    return {
      title: { text: 'Distribuição na Matriz', left: 'center', top: '45%', textStyle: { fontSize: 12, color: '#64748b' } },
      tooltip: { trigger: 'item' },
      series: [
        {
          name: 'Categoria',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: doNow, name: 'Fazer (Do Now)', itemStyle: { color: '#ef4444' } },
            { value: schedule, name: 'Agendar', itemStyle: { color: '#3b82f6' } },
            { value: delegate, name: 'Delegar', itemStyle: { color: '#eab308' } },
            { value: del, name: 'Eliminar', itemStyle: { color: '#94a3b8' } }
          ]
        }
      ]
    };
  }, [tasks]);

  // 4. Status Geral (Pie)
  const getStatusOption = useMemo(() => {
    return {
      title: { text: 'Status Geral', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: [
            { value: completedTasks, name: 'Concluídas', itemStyle: { color: '#10b981' } },
            { value: totalTasks - completedTasks, name: 'Pendentes', itemStyle: { color: '#6366f1' } }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [completedTasks, totalTasks]);

  // 5. Tarefas por Cliente (Pendentes)
  const getTasksByClientOption = useMemo(() => {
    // Conta tarefas pendentes por cliente
    const clientCounts: Record<string, number> = {};
    tasks.filter(t => !t.completed).forEach(t => {
        const name = t.clientName || 'Interno / Sem Cliente';
        clientCounts[name] = (clientCounts[name] || 0) + 1;
    });

    // Converte para array e ordena (ascendente para gráfico de barras horizontal)
    const sortedData = Object.entries(clientCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.value - b.value); 

    const displayData = sortedData.slice(Math.max(0, sortedData.length - 10));

    return {
      title: { text: 'Tarefas Pendentes por Cliente', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { show: false } },
      yAxis: { type: 'category', data: displayData.map(d => d.name), axisTick: { show: false }, axisLine: { show: false } },
      series: [
        {
          type: 'bar',
          data: displayData.map(d => d.value),
          barWidth: 15,
          itemStyle: { 
            color: '#8b5cf6', // Violeta
            borderRadius: [0, 4, 4, 0]
          },
          label: { show: true, position: 'right' }
        }
      ]
    };
  }, [tasks]);

  // 6. NOVO: Tarefas CONCLUÍDAS por Cliente (Com Filtro de Data)
  const getCompletedTasksByClientOption = useMemo(() => {
    const clientCounts: Record<string, number> = {};
    
    tasks.filter(t => {
      // Filtra apenas concluídas
      if (!t.completed) return false;
      
      // Filtra por data (Considerando dueDate como referência de entrega)
      if (!t.dueDate) return false;
      const taskDate = t.dueDate; // Formato YYYY-MM-DD
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    }).forEach(t => {
        const name = t.clientName || 'Interno / Sem Cliente';
        clientCounts[name] = (clientCounts[name] || 0) + 1;
    });

    const sortedData = Object.entries(clientCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.value - b.value); 

    const displayData = sortedData.slice(Math.max(0, sortedData.length - 10));

    return {
      title: { text: 'Entregas Realizadas por Cliente (Período Selecionado)', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { show: false } },
      yAxis: { type: 'category', data: displayData.map(d => d.name), axisTick: { show: false }, axisLine: { show: false } },
      series: [
        {
          type: 'bar',
          data: displayData.map(d => d.value),
          barWidth: 15,
          itemStyle: { 
            color: '#10b981', // Verde/Esmeralda
            borderRadius: [0, 4, 4, 0]
          },
          label: { show: true, position: 'right' }
        }
      ]
    };
  }, [tasks, dateRange]);


  // Configuração das Colunas do Kanban
  const columns: {
    id: TaskCategory;
    title: string;
    description: string;
    bgClass: string;
    borderClass: string;
    headerTextClass: string;
    icon?: React.ReactNode;
  }[] = [
    {
      id: 'do_now',
      title: 'FAZER',
      description: '(Urgente & Importante)',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-100',
      headerTextClass: 'text-red-700',
      icon: <AlertCircle size={16} className="text-red-600" />
    },
    {
      id: 'schedule',
      title: 'AGENDAR',
      description: '(Imp. & Não Urgente)',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-100',
      headerTextClass: 'text-blue-700',
      icon: <Calendar size={16} className="text-blue-600" />
    },
    {
      id: 'delegate',
      title: 'DELEGAR',
      description: '(Urg. & Não Imp.)',
      bgClass: 'bg-yellow-50',
      borderClass: 'border-yellow-100',
      headerTextClass: 'text-yellow-700',
      icon: <Clock size={16} className="text-yellow-600" />
    },
    {
      id: 'delete',
      title: 'ELIMINAR',
      description: '(Nem Urg. Nem Imp.)',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      headerTextClass: 'text-slate-700',
      icon: <Trash2 size={16} className="text-slate-500" />
    }
  ];

  // Cálculo de progresso para o projeto selecionado no drawer
  const selectedProjectProgress = selectedProject 
    ? calculateProjectProgress(selectedProject.id, selectedProject.progress) 
    : 0;

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-6rem)] animate-in fade-in duration-500 gap-6 relative">
      
      {/* --- FOCUS MODE OVERLAY --- */}
      {activeFocusTask && (
        <FocusModeOverlay 
            task={activeFocusTask} 
            onClose={() => setActiveFocusTask(null)}
            onComplete={() => {
                onTaskToggle?.(activeFocusTask.id, true);
                setActiveFocusTask(null);
            }}
        />
      )}

      <NewTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={handleTaskSuccess}
        initialCategory={newTaskInitialCategory}
        taskToEdit={taskToEdit}
        clients={clients}
        projects={projects}
      />

      <NewProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={onProjectCreate || (() => {})}
        projectToEdit={projectToEdit}
      />

      {/* --- Linha Superior: KPIs --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiência</span>
             <div className="text-xl font-bold text-slate-800 mt-1">{completionRate}%</div>
           </div>
           <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
             <Target size={20} />
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carga Horária</span>
             <div className="text-xl font-bold text-slate-800 mt-1">{totalPendingHours}h</div>
           </div>
           <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
             <Clock size={20} />
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projetos Ativos</span>
             <div className="text-xl font-bold text-slate-800 mt-1">{activeProjects.length}</div>
           </div>
           <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
             <Briefcase size={20} />
           </div>
        </div>

         <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between text-white">
           <div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metas</span>
             <div className="text-xl font-bold mt-1">{goals.filter(g => g.status === 'on_track').length}/{goals.length}</div>
           </div>
           <div className="w-10 h-10 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center">
             <TrendingUp size={20} />
           </div>
        </div>
      </div>

      {/* --- Área Principal (Grid Dividido) --- */}
      <div className="flex-1 md:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: Kanban ou Gráficos (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col md:min-h-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 shrink-0 gap-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle size={18} className="text-indigo-600" />
              Gestão de Tarefas
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
               
               {/* Date Filter (Only in Analytics) */}
               {viewMode === 'analytics' && (
                 <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 mr-2">
                    <Calendar size={14} className="text-slate-400 ml-1" />
                    <input 
                      type="date" 
                      className="text-xs border-none outline-none text-slate-600 bg-transparent w-[90px]"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                      type="date" 
                      className="text-xs border-none outline-none text-slate-600 bg-transparent w-[90px]"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    />
                 </div>
               )}

               {/* View Toggle */}
               <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                  <button 
                    onClick={() => setViewMode('board')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Layout size={14} /> Quadro
                  </button>
                  <button 
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <BarChart2 size={14} /> Análise
                  </button>
               </div>

               {viewMode === 'board' && (
                 <button 
                   onClick={() => setShowCompleted(!showCompleted)}
                   className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border ${showCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600'}`}
                   title={showCompleted ? "Ocultar tarefas concluídas" : "Mostrar tarefas concluídas"}
                 >
                   {showCompleted ? <EyeOff size={14} /> : <Eye size={14} />}
                   <span className="hidden sm:inline">{showCompleted ? 'Ocultar Feitas' : 'Ver Feitas'}</span>
                 </button>
               )}

               <button 
                onClick={() => openNewTaskModal('do_now')}
                className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 whitespace-nowrap ml-auto sm:ml-0"
               >
                 <Plus size={14} /> Nova Tarefa
               </button>
            </div>
          </div>

          <div className="flex-1 md:min-h-0">
            {viewMode === 'board' ? (
                /* --- KANBAN VIEW --- */
                <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-4 md:h-full pb-4 md:pb-0 snap-x snap-mandatory md:snap-none custom-scrollbar">
                {columns.map((col) => {
                    // FILTRAGEM DE TAREFAS BASEADA NO TOGGLE
                    const colTasks = tasks.filter(t => t.category === col.id && (showCompleted || !t.completed));
                    const isOver = dragOverColumn === col.id;

                    return (
                    <div 
                        key={col.id} 
                        className={`flex flex-col rounded-xl border transition-all duration-200 
                        flex-shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center
                        h-[400px] md:h-full
                        ${col.bgClass} 
                        ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2 scale-[1.01]' : col.borderClass}
                        `}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        
                        {/* Header Coluna */}
                        <div className="p-3 flex items-center justify-between shrink-0 border-b border-black/5">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="shrink-0">{col.icon}</div>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-xs truncate ${col.headerTextClass}`}>{col.title}</h3>
                                <p className={`text-[9px] opacity-70 truncate ${col.headerTextClass}`}>{col.description}</p>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60 ${col.headerTextClass}`}>
                            {colTasks.length}
                        </span>
                        </div>

                        {/* Lista Tarefas */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {colTasks.map(task => (
                            <div 
                            key={task.id} 
                            className={`bg-white p-3 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing
                                ${draggedTaskId === task.id ? 'opacity-50 ring-2 ring-indigo-200 rotate-2' : ''}
                            `}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            // Open modal on double click for better UX
                            onDoubleClick={() => openEditTaskModal(task)}
                            >
                            <div className="flex justify-between items-start mb-1.5">
                                <div className="flex items-start gap-2">
                                <button 
                                    onClick={() => onTaskToggle?.(task.id, !task.completed)}
                                    className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                                >
                                    {task.completed && <CheckCircle2 size={10} />}
                                </button>
                                <p className={`text-xs font-medium leading-snug pr-4 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {task.title}
                                </p>
                                </div>
                                
                                <div className="flex flex-col gap-1 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1">
                                
                                {/* Start Focus Mode Button */}
                                {!task.completed && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveFocusTask(task);
                                        }}
                                        className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                                        title="Modo Foco"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>
                                )}

                                {/* Edit Button */}
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    openEditTaskModal(task);
                                    }}
                                    className="text-slate-300 hover:text-indigo-600 hover:bg-slate-50 p-1 rounded transition-colors"
                                    title="Editar"
                                >
                                    <PenLine size={14} />
                                </button>

                                {/* Delete Button */}
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskDelete?.(task.id);
                                    }}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                                </div>
                            </div>
                            
                            {task.clientName && (
                                <span className="inline-block text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mb-2">
                                {task.clientName}
                                </span>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex gap-1">
                                {col.id !== 'do_now' && (
                                    <button 
                                    onClick={() => onTaskMove?.(task.id, columns[Math.max(0, columns.findIndex(c => c.id === col.id) - 1)].id)}
                                    title="Mover para esquerda"
                                    >
                                    <ArrowLeft size={12} className="text-slate-300 hover:text-indigo-600 cursor-pointer" />
                                    </button>
                                )}
                                {col.id !== 'delete' && (
                                    <button
                                    onClick={() => onTaskMove?.(task.id, columns[Math.min(columns.length - 1, columns.findIndex(c => c.id === col.id) + 1)].id)}
                                    title="Mover para direita"
                                    >
                                    <ArrowRight size={12} className="text-slate-300 hover:text-indigo-600 cursor-pointer" />
                                    </button>
                                )}
                                </div>
                                {col.id === 'do_now' && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Target size={10} /> Focar
                                </span>
                                )}
                            </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => openNewTaskModal(col.id)}
                            className={`w-full py-1.5 text-[10px] font-medium border border-dashed rounded text-center opacity-60 hover:opacity-100 transition-opacity ${col.headerTextClass} ${col.borderClass}`}
                        >
                            + Adicionar
                        </button>
                        </div>
                    </div>
                    );
                })}
                </div>
            ) : (
                /* --- ANALYTICS VIEW --- */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto animate-in fade-in pb-10">
                    {/* 1. Prioridades */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                        <ReactECharts 
                            option={getPriorityOption}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>

                    {/* 2. Progresso de Projetos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                        <ReactECharts 
                            option={getProjectProgressChart}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>

                    {/* 3. Distribuição Matriz */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                        <ReactECharts 
                            option={getMatrixOption}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>

                    {/* 4. Status Geral */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                        <ReactECharts 
                            option={getStatusOption}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>

                    {/* 5. Tarefas por Cliente (Wide - Pendentes) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[350px] lg:col-span-2">
                        <ReactECharts 
                            option={getTasksByClientOption}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>

                    {/* 6. Tarefas CONCLUÍDAS por Cliente (Wide - Com Filtro) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[350px] lg:col-span-2">
                        <ReactECharts 
                            option={getCompletedTasksByClientOption}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Sidebar Tática (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 md:overflow-y-auto md:pr-1">
          
          {/* Cronograma */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 shrink-0">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
               <Calendar size={16} className="text-indigo-600" />
               Próximas Entregas
             </h3>
             
             <div className="space-y-4">
                {sortedTasksByDate.length > 0 ? sortedTasksByDate.map((task, idx) => (
                  <div key={idx} className="flex gap-3 items-start group">
                     <div className="flex flex-col items-center mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                        <div className="w-0.5 h-full bg-slate-100 mt-1 group-last:hidden min-h-[20px]"></div>
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => onTaskToggle?.(task.id, !task.completed)}
                                className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-400'}`}
                            >
                                {task.completed && <CheckCircle2 size={8} className="text-white" />}
                            </button>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1 cursor-pointer hover:text-indigo-600" title={task.title} onClick={() => openEditTaskModal(task)}>{task.title}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 block pl-5">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'Hoje'}
                          {task.clientName && ` • ${task.clientName}`}
                        </span>
                     </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic">Sem tarefas agendadas.</p>
                )}
             </div>
          </div>

          {/* Projetos Ativos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 min-h-[200px]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Briefcase size={16} className="text-blue-600" />
                  Projetos
                </h3>
                <button 
                  onClick={openNewProjectModal}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="Novo Projeto"
                >
                  <Plus size={16} />
                </button>
             </div>
             
             <div className="space-y-3">
               {activeProjects.map(project => {
                 // Calcula progresso dinamicamente
                 const dynamicProgress = calculateProjectProgress(project.id, project.progress);
                 
                 return (
                 <div 
                    key={project.id} 
                    onClick={() => setSelectedProject(project)}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-indigo-300 hover:shadow-sm hover:bg-white transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] group-hover:text-indigo-700 transition-colors" title={project.title}>
                         {project.title}
                       </span>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded border ${dynamicProgress === 100 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-100'}`}>
                         {dynamicProgress}%
                       </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full ${dynamicProgress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                         style={{ width: `${dynamicProgress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} />
                        {project.deadline ? new Date(project.deadline).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'Sem prazo'}
                      </span>
                      <ChevronRight size={12} className="text-slate-400" />
                    </div>
                 </div>
               );})}
               <button className="w-full py-2 text-xs text-slate-500 font-medium hover:text-indigo-600 border border-dashed border-slate-200 rounded-lg hover:border-indigo-300 transition-all">
                 Ver todos os projetos
               </button>
             </div>
          </div>

        </div>

      </div>

      {/* --- SIDE PANEL (PROJECT DETAILS) --- */}
      {selectedProject && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity" 
            onClick={() => setSelectedProject(null)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 p-0 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header do Drawer */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">Projeto</span>
                   <h2 className="text-xl font-bold text-slate-800 leading-tight">{selectedProject.title}</h2>
                 </div>
                 <button 
                   onClick={() => setSelectedProject(null)}
                   className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                 >
                   <X size={20} />
                 </button>
               </div>

               <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Entrega: {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${selectedProject.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="capitalize">{selectedProject.status === 'active' ? 'Em andamento' : selectedProject.status}</span>
                  </div>
               </div>
               
               <div className="mt-4">
                 <div className="flex justify-between text-xs mb-1">
                   <span className="font-semibold text-slate-600">Progresso</span>
                   <span className="font-bold text-slate-800">{selectedProjectProgress}%</span>
                 </div>
                 <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${selectedProjectProgress}%` }}></div>
                 </div>
               </div>
            </div>

            {/* Lista de Tarefas do Projeto */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Tarefas Associadas</h3>
              </div>

              {tasks.filter(t => t.projectId === selectedProject.id).length > 0 ? (
                <div className="space-y-3">
                  {tasks.filter(t => t.projectId === selectedProject.id).map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
                       <button 
                          onClick={() => onTaskToggle?.(task.id, !task.completed)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                          title={task.completed ? 'Concluída' : 'Marcar como feita'}
                        >
                          {task.completed && <CheckCircle2 size={12} />}
                       </button>
                       <div className="flex-1">
                          <p className={`text-sm font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider 
                              ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 
                                task.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' : 
                                'bg-slate-100 text-slate-500'}`
                            }>
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {task.category === 'do_now' ? 'Fazer' : task.category === 'schedule' ? 'Agendar' : task.category === 'delegate' ? 'Delegar' : 'Eliminar'}
                            </span>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => openEditTaskModal(task)}
                            className="text-slate-300 hover:text-indigo-600 transition-colors"
                          >
                            <PenLine size={14} />
                          </button>
                         <button 
                           onClick={() => onTaskDelete?.(task.id)}
                           className="text-slate-300 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                  <Briefcase size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Nenhuma tarefa vinculada a este projeto.</p>
                  <button 
                    onClick={() => {
                       setSelectedProject(null); // Fecha drawer
                       openNewTaskModal('do_now');
                    }}
                    className="text-xs text-indigo-600 font-bold mt-2 hover:underline"
                  >
                    + Adicionar Tarefa
                  </button>
                </div>
              )}
            </div>
             
            {/* Footer do Drawer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
               <button 
                 onClick={() => setSelectedProject(null)}
                 className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
               >
                 Fechar
               </button>
               <button 
                 onClick={openEditProjectModal}
                 className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
               >
                 <PenLine size={16} />
                 Editar Projeto
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
