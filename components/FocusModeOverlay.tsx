
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Play, Pause, CheckCircle, Clock, Maximize2, Minimize2 } from 'lucide-react';

interface FocusModeOverlayProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ task, onClose, onComplete }) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
      return (
          <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className="font-mono font-bold text-lg">{formatTime(seconds)}</span>
              </div>
              <div className="border-l border-slate-700 h-6 mx-1"></div>
              <div className="max-w-[150px] truncate text-sm font-medium text-slate-300">
                  {task.title}
              </div>
              <button onClick={() => setIsMinimized(false)} className="p-1 hover:bg-slate-800 rounded">
                  <Maximize2 size={16} />
              </button>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <button 
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10"
        >
            <Minimize2 size={18} /> Minimizar
        </button>
        <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        >
            <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-3xl px-6 text-center space-y-8">
         
         {/* Status Badge */}
         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Clock size={14} className={isActive ? "animate-spin-slow" : ""} />
            <span className="text-xs font-bold tracking-widest uppercase">Modo Foco Ativo</span>
         </div>

         {/* Timer */}
         <div className="font-mono text-8xl md:text-9xl font-bold text-white tracking-tighter tabular-nums drop-shadow-2xl">
            {formatTime(seconds)}
         </div>

         {/* Task Title */}
         <div className="space-y-2">
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                {task.title}
            </h2>
            {task.clientName && (
                <p className="text-lg text-slate-400 font-medium">
                    {task.clientName}
                </p>
            )}
         </div>

         {/* Controls */}
         <div className="flex items-center justify-center gap-6 pt-8">
            <button 
                onClick={() => setIsActive(!isActive)}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${isActive ? 'bg-slate-800 text-yellow-400 border border-slate-600 hover:border-yellow-400' : 'bg-white text-indigo-900 shadow-lg shadow-indigo-500/50'}`}
                title={isActive ? "Pausar" : "Retomar"}
            >
                {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>

            <button 
                onClick={() => {
                    const confirmComplete = window.confirm("Parabéns! Deseja concluir esta tarefa agora?");
                    if (confirmComplete) onComplete();
                }}
                className="group flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/30 transform hover:scale-105"
            >
                <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />
                Concluir Tarefa
            </button>
         </div>

         {/* Note Hint */}
         <p className="text-slate-500 text-sm mt-12 animate-pulse">
            Respire fundo. Foco total em uma coisa de cada vez.
         </p>
      </div>
    </div>
  );
};
