import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, BarChart3, LogOut, CheckSquare, Menu, X } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'CLIENT_DETAIL', label: 'Clientes', icon: Users },
    { id: 'TASKS', label: 'Gestão de Tarefas', icon: CheckSquare },
    { id: 'REPORTS', label: 'Relatórios', icon: BarChart3 },
    { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
    { id: 'SETTINGS', label: 'Configurações', icon: Settings },
  ];

  const handleNavItemClick = (viewId: ViewState) => {
    onChangeView(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 bg-slate-900 text-white z-50 shadow-lg flex items-center justify-between px-4 md:px-6">
        
        {/* Logo Area */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-inner shadow-indigo-400/20">
            AR
          </div>
          <span className="text-lg font-bold tracking-tight">AdRoi</span>
        </div>

        {/* Navigation Menu (Horizontal - Desktop) */}
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

        {/* Mobile Menu Toggle Button */}
        <button 
          className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* User / Logout Area (Desktop) */}
        <div className="hidden md:flex items-center gap-4 shrink-0 pl-4 border-l border-slate-700 h-8">
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

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Menu */}
          <div className="absolute top-0 right-0 w-64 h-full bg-slate-900 text-white p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id || (currentView === 'CLIENT_DETAIL' && item.id === 'CLIENT_DETAIL');
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavItemClick(item.id as ViewState)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">GA</div>
                <div className="text-sm">
                  <div className="font-bold">Gestor</div>
                  <div className="text-xs text-slate-400">admin@adroi.com</div>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-red-400">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};