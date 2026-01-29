import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
          <div className="bg-white p-8 rounded-xl shadow-2xl border border-slate-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 border border-red-100 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            
            <h1 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Ocorreu um erro inesperado ao carregar a aplicação. Tente recarregar a página.
            </p>
            
            {this.state.error && (
              <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 border border-slate-100 overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ChevronRight size={10} /> Detalhe Técnico
                </p>
                <code className="text-xs font-mono text-red-600 break-words block">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200"
            >
              <RefreshCw size={18} />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}