import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Briefcase } from 'lucide-react';
import { taskService } from '../services/taskService';
import { Project } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectToEdit?: Project | null;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSuccess, projectToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    status: 'active',
    progress: 0
  });

  // Popula o formulário ao abrir (Edição ou Criação)
  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setFormData({
          title: projectToEdit.title,
          deadline: projectToEdit.deadline ? projectToEdit.deadline.split('T')[0] : '',
          status: projectToEdit.status,
          progress: projectToEdit.progress || 0
        });
      } else {
        setFormData({
          title: '',
          deadline: '',
          status: 'active',
          progress: 0
        });
      }
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (projectToEdit) {
        await taskService.updateProject(projectToEdit.id, {
          title: formData.title,
          deadline: formData.deadline || undefined,
          status: formData.status as 'active' | 'paused' | 'completed',
          progress: formData.progress
        });
      } else {
        await taskService.createProject({
          title: formData.title,
          deadline: formData.deadline || undefined,
          status: formData.status as 'active' | 'paused' | 'completed',
          progress: formData.progress
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Erro ao salvar projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">
            {projectToEdit ? 'Editar Projeto' : 'Novo Projeto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Projeto</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                required
                type="text" 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: Lançamento Black Friday"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo de Entrega</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                   type="date" 
                   className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.deadline}
                   onChange={e => setFormData({...formData, deadline: e.target.value})}
                   />
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                   value={formData.status}
                   onChange={e => setFormData({...formData, status: e.target.value})}
                >
                   <option value="active">Em Andamento</option>
                   <option value="paused">Pausado</option>
                   <option value="completed">Concluído</option>
                </select>
             </div>
          </div>

          {projectToEdit && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Progresso Manual</label>
                <span className="text-xs font-bold text-indigo-600">{formData.progress}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={formData.progress}
                onChange={e => setFormData({...formData, progress: Number(e.target.value)})}
              />
            </div>
          )}

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
              {projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};