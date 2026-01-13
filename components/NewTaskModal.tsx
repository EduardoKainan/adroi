import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Clock, Flag, Briefcase, User } from 'lucide-react';
import { Client, Project, TaskCategory, Task } from '../types';
import { taskService } from '../services/taskService';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCategory?: TaskCategory;
  taskToEdit?: Task | null; // Prop para edição
  clients: Client[];
  projects: Project[];
}

// Helper para data local YYYY-MM-DD
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onSuccess, initialCategory, taskToEdit, clients, projects }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium',
    category: initialCategory || 'do_now',
    durationMinutes: 30,
    dueDate: getTodayLocal(),
    clientId: '',
    projectId: ''
  });

  // Effect para popular o form quando abre (Criação ou Edição)
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        // Modo Edição
        setFormData({
          title: taskToEdit.title,
          priority: taskToEdit.priority,
          category: taskToEdit.category,
          durationMinutes: taskToEdit.durationMinutes || 30,
          dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : getTodayLocal(),
          clientId: taskToEdit.clientId || '',
          projectId: taskToEdit.projectId || ''
        });
      } else {
        // Modo Criação (Reset)
        setFormData({
          title: '',
          priority: 'medium',
          category: initialCategory || 'do_now',
          durationMinutes: 30,
          dueDate: getTodayLocal(),
          clientId: '',
          projectId: ''
        });
      }
    }
  }, [isOpen, taskToEdit, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        priority: formData.priority as 'low'|'medium'|'high',
        category: formData.category as TaskCategory,
        durationMinutes: Number(formData.durationMinutes),
        dueDate: formData.dueDate,
        clientId: formData.clientId || undefined,
        projectId: formData.projectId || undefined
      };

      if (taskToEdit) {
        await taskService.updateTask(taskToEdit.id, payload);
      } else {
        await taskService.createTask(payload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      alert('Erro ao salvar tarefa. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">
            {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título da Tarefa</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Ex: Fazer setup da campanha X"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Matriz (Categoria)</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
              >
                <option value="do_now">Fazer Agora</option>
                <option value="schedule">Agendar</option>
                <option value="delegate">Delegar</option>
                <option value="delete">Eliminar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date" 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duração Est. (min)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="number"
                  step="5"
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.durationMinutes}
                  onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vincular Cliente (Opcional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                  value={formData.clientId}
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                >
                  <option value="">Nenhum</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vincular Projeto (Opcional)</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                  value={formData.projectId}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">Nenhum</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {taskToEdit ? 'Atualizar Tarefa' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};