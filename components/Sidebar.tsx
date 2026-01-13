import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, BarChart3, LogOut, CheckSquare, Menu } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'CLIENT_DETAIL', label: 'Clientes', icon: Users },
    { id: 'TASKS', label: 'Gestão de Tarefas', icon: CheckSquare },
    { id: 'REPORTS', label: 'Relatórios', icon: BarChart3 },
    { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
    { id: 'SETTINGS', label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-slate-900 text-white z-50 shadow-lg flex items-center justify-between px-6">
      
      {/* Logo Area */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-inner shadow-indigo-400/20">
          AR
        </div>
        <span className="text-lg font-bold tracking-tight hidden md:block">AdRoi SaaS</span>
      </div>

      {/* Navigation Menu (Horizontal) */}
      <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar mx-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (currentView === 'CLIENT_DETAIL' && item.id === 'CLIENT_DETAIL');
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as ViewState)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Menu Icon (Visible only on small screens) */}
      <button className="md:hidden p-2 text-slate-400">
        <Menu size={24} />
      </button>

      {/* User / Logout Area */}
      <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-slate-700 h-8 hidden md:flex">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-slate-600">
               GA
            </div>
            <div className="hidden lg:block leading-tight">
               <div className="text-xs font-bold">Gestor Admin</div>
               <div className="text-[10px] text-slate-400">admin@adroi.com</div>
            </div>
         </div>
         <button className="text-slate-400 hover:text-red-400 transition-colors" title="Sair">
            <LogOut size={18} />
         </button>
      </div>
    </header>
  );
};