import React from 'react';
import TraderBookApp from './traderbook/TraderBookApp';

export default function App() {
  return (
    <>
      {/* Header fixo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-bold text-white">📘 TraderBook</h1>
          <p className="text-[10px] text-slate-500">Mesa de Trading • TradeSystem</p>
        </div>
        <span className="text-[10px] text-slate-600">🧠 v4-flash</span>
      </div>
      <div className="pt-14">
        <TraderBookApp />
      </div>
    </>
  );
}
