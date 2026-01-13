import { supabase } from '../lib/supabase';
import { Task, Project, Goal, TaskCategory } from '../types';

export const taskService = {
  // --- TASKS ---
  async getTasks() {
    // Buscamos tarefas e fazemos join com a tabela de clientes para pegar o nome da empresa
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients (
          company
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    // Mapeia os dados do banco (snake_case) para a interface (camelCase)
    return data.map((t: any) => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      priority: t.priority,
      category: t.category,
      durationMinutes: t.duration_minutes,
      dueDate: t.due_date,
      projectId: t.project_id,
      clientId: t.client_id,
      clientName: t.clients?.company // Extrai o nome da empresa do join
    })) as Task[];
  },

  async updateTaskCategory(taskId: string, newCategory: TaskCategory) {
    const { error } = await supabase
      .from('tasks')
      .update({ category: newCategory })
      .eq('id', taskId);

    if (error) throw error;
  },

  async toggleTaskCompletion(taskId: string, completed: boolean) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', taskId);

    if (error) throw error;
  },

  async createTask(task: Partial<Task>) {
    const payload = {
      title: task.title,
      priority: task.priority || 'medium',
      category: task.category || 'do_now',
      duration_minutes: task.durationMinutes || 30,
      due_date: task.dueDate,
      client_id: task.clientId,
      project_id: task.projectId
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    
    // Retorna formatado se precisar usar imediatamente na UI sem refetch
    return {
        ...data,
        id: data.id,
        title: data.title,
        completed: data.completed,
        priority: data.priority,
        category: data.category,
        durationMinutes: data.duration_minutes,
        dueDate: data.due_date,
        projectId: data.project_id,
        clientId: data.client_id
    };
  },

  async updateTask(taskId: string, task: Partial<Task>) {
    const payload: any = {
      title: task.title,
      priority: task.priority,
      category: task.category,
      duration_minutes: task.durationMinutes,
      due_date: task.dueDate,
      client_id: task.clientId,
      project_id: task.projectId
    };

    // Remove chaves undefined para não apagar dados acidentalmente se passar parcial
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // --- PROJECTS ---
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
    return data as Project[];
  },

  async createProject(project: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        title: project.title,
        status: project.status || 'active',
        progress: project.progress || 0,
        deadline: project.deadline
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  async updateProject(projectId: string, project: Partial<Project>) {
    const payload: any = {
      title: project.title,
      status: project.status,
      progress: project.progress,
      deadline: project.deadline
    };

    // Limpeza de campos undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  // --- GOALS ---
  async getGoals() {
    const { data, error } = await supabase
      .from('goals')
      .select('*');

    if (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
    return data as Goal[];
  }
};