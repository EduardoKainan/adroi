
import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, BarChart3, LogOut, CheckSquare, Menu, X, Briefcase } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, organization, signOut } = useAuth();

  // Filtra menu baseado no cargo (Manager não vê Settings)
  const menuItems = [
    { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'CLIENT_DETAIL', label: 'Clientes', icon: Users },
    { id: 'TASKS', label: 'Gestão de Tarefas', icon: CheckSquare },
    { id: 'REPORTS', label: 'Relatórios', icon: BarChart3 },
    { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
    { id: 'SETTINGS', label: 'Configurações', icon: Settings, adminOnly: true },
  ].filter(item => !item.adminOnly || profile?.role === 'admin');

  const handleNavItemClick = (viewId: ViewState) => {
    onChangeView(viewId);
    setIsMobileMenuOpen(false);
  };

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'US';

  return (
    <>
      {/* --- MOBILE HEADER (Visible only on mobile) --- */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-slate-900 text-white z-50 shadow-lg flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-inner shadow-indigo-400/20">
            AR
          </div>
          <div>
             <span className="text-lg font-bold tracking-tight block leading-none">AdRoi</span>
          </div>
        </div>
        <button 
          className="p-2 text-slate-400 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
      </header>

      {/* --- DESKTOP SIDEBAR (Hidden on mobile, Fixed Left) --- */}
      <aside className="hidden md:flex fixed top-0 left-0 w-64 h-screen bg-slate-900 text-white flex-col z-50 shadow-xl border-r border-slate-800">
        
        {/* Logo Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-inner shadow-indigo-400/20">
            AR
          </div>
          <div className="min-w-0">
             <span className="text-xl font-bold tracking-tight block leading-none">AdRoi</span>
             {organization && <span className="text-[10px] text-slate-400 font-medium tracking-wide block truncate max-w-[140px]">{organization.name}</span>}
          </div>
        </div>

        {/* Navigation Menu (Vertical) */}
        <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (currentView === 'CLIENT_DETAIL' && item.id === 'CLIENT_DETAIL');
            
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id as ViewState)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
                <span>{item.label}</span>
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>}
              </button>
            );
          })}
        </nav>

        {/* User / Logout Area (Bottom) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
           <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs border-2 border-slate-600 font-bold shrink-0">
                   {userInitials}
                </div>
                <div className="min-w-0">
                   <div className="text-sm font-bold truncate text-white">{profile?.full_name || 'Usuário'}</div>
                   <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>
              </div>
              <button onClick={signOut} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-all" title="Sair">
                 <LogOut size={18} />
              </button>
           </div>
        </div>
      </aside>

      {/* --- MOBILE DRAWER (Same as before) --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Menu */}
          <div className="absolute top-0 right-0 w-72 h-full bg-slate-900 text-white p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-bold">Menu</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-400" />
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
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

            <div className="mt-auto pt-6 border-t border-slate-800">
               <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                       {userInitials}
                    </div>
                    <div className="min-w-0">
                       <div className="text-sm font-bold truncate text-white">{profile?.full_name}</div>
                       <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                    </div>
                  </div>
                  <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-400">
                    <LogOut size={18} />
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
