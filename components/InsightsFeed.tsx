import React from 'react';
import { Insight } from '../types';
import { AlertTriangle, TrendingUp, Info, AlertOctagon, Lightbulb, ArrowRight } from 'lucide-react';

interface InsightsFeedProps {
  insights: Insight[];
  loading: boolean;
}

export const InsightsFeed: React.FC<InsightsFeedProps> = ({ insights, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl border border-slate-200"></div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertOctagon size={20} />;
      case 'opportunity': return <TrendingUp size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-700 hover:shadow-red-100';
      case 'opportunity':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:shadow-emerald-100';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700 hover:shadow-amber-100';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700 hover:shadow-blue-100';
    }
  };

  return (
    <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-yellow-500 fill-yellow-500" size={20} />
        <h3 className="font-bold text-slate-700 text-lg">AdRoi Intelligence</h3>
        <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-bold">BETA</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, idx) => (
          <div 
            key={idx} 
            className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md cursor-default flex flex-col justify-between ${getStyles(insight.type)}`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2 font-bold uppercase text-xs tracking-wider opacity-80">
                {getIcon(insight.type)}
                <span>{insight.type === 'critical' ? 'Ação Imediata' : insight.type === 'opportunity' ? 'Oportunidade' : insight.type === 'warning' ? 'Atenção' : 'Informativo'}</span>
              </div>
              <h4 className="font-bold text-base mb-2 leading-tight">{insight.title}</h4>
              <p className="text-sm opacity-90 mb-4 leading-relaxed">{insight.description}</p>
            </div>
            
            <div className={`mt-auto pt-3 border-t border-black/5 text-sm font-semibold flex items-start gap-2`}>
              <ArrowRight size={16} className="mt-0.5 shrink-0" />
              <span>{insight.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};