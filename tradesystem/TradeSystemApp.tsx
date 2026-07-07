import React, { useState, useMemo } from 'react';

// ============ TIPOS ============

interface ChecklistItem {
  id: string;
  name: string;
  ok: boolean | null;
  notes: string;
}

interface RiskInput {
  banca: number;
  riskPercent: number;
  stopPoints: number;
  pointValue: number;
}

interface TradeRecord {
  id: string;
  datetime: string;
  direction: 'compra' | 'venda';
  entry: number;
  stop: number;
  target: number;
  contracts: number;
  result: 'ganho' | 'perda' | 'empate';
  pnl: number;
  emotion: string;
}

// ============ COMPONENTES ============

/** Checklist interativo dos 8 pontos */
function CheckList() {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: 'regiao', name: '📍 Região', ok: null, notes: '' },
    { id: 'tendencia', name: '📈 Tendência', ok: null, notes: '' },
    { id: 'medias', name: '📏 Afastamento Médias', ok: null, notes: '' },
    { id: 'gatilho', name: '⚡ Gatilho', ok: null, notes: '' },
    { id: 'volume', name: '📊 Volume', ok: null, notes: '' },
    { id: 'fluxo', name: '🔄 Fluxo', ok: null, notes: '' },
    { id: 'alvos', name: '🎯 Alvos', ok: null, notes: '' },
    { id: 'contradicoes', name: '🚫 Contradições', ok: null, notes: '' },
  ]);

  const semaforo = useMemo(() => {
    const failed = items.filter(i => i.ok === false).length;
    if (failed > 0) return { cor: '🔴', texto: 'VERMELHO — Não entre', classe: 'bg-red-600' };
    const pending = items.filter(i => i.ok === null).length;
    if (pending > 0) return { cor: '🟡', texto: 'AMARELO — Mão leve', classe: 'bg-yellow-500' };
    return { cor: '🟢', texto: 'VERDE — Enche a mão!', classe: 'bg-green-500' };
  }, [items]);

  const toggle = (id: string, value: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ok: i.ok === value ? null : value } : i));
  };

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl w-full max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-3">📋 Checklist 8 Pontos</h2>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded-lg">
          <span className="flex-1 text-sm">{item.name}</span>
          <button onClick={() => toggle(item.id, true)}
            className={`px-3 py-1 rounded text-xs font-bold ${item.ok === true ? 'bg-green-500' : 'bg-gray-700'}`}>
            ✅ Sim
          </button>
          <button onClick={() => toggle(item.id, false)}
            className={`px-3 py-1 rounded text-xs font-bold ${item.ok === false ? 'bg-red-500' : 'bg-gray-700'}`}>
            ❌ Não
          </button>
        </div>
      ))}
      <div className={`mt-3 p-3 rounded-xl text-center font-bold text-lg ${semaforo.classe}`}>
        {semaforo.cor} {semaforo.texto}
      </div>
    </div>
  );
}

/** Calculadora de Risco */
function RiskCalculator() {
  const [input, setInput] = useState<RiskInput>({
    banca: 5000,
    riskPercent: 1,
    stopPoints: 200,
    pointValue: 0.20
  });

  const result = useMemo(() => {
    const riskAmount = input.banca * (input.riskPercent / 100);
    const stopCost = input.stopPoints * input.pointValue;
    const contracts = Math.floor(riskAmount / stopCost);
    return {
      riskAmount: riskAmount.toFixed(2),
      stopCost: stopCost.toFixed(2),
      contracts: Math.max(1, contracts)
    };
  }, [input]);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl w-full max-w-md mx-auto mt-4">
      <h2 className="text-lg font-bold mb-3">📐 Calculadora de Risco</h2>
      <div className="space-y-2 mb-4">
        {Object.entries({ banca: 'Banca (R$)', riskPercent: 'Risco (%)', stopPoints: 'Stop (pts)', pointValue: 'Valor/pt (R$)' })
          .map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-gray-400">{label}</label>
              <input type="number" value={input[key as keyof RiskInput]}
                onChange={e => setInput(p => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-full bg-gray-800 rounded p-2 text-white text-sm" />
            </div>
          ))}
      </div>
      <div className="bg-gray-800 rounded-xl p-3">
        <p className="text-sm text-gray-400">Risco em R$: <span className="text-yellow-400 font-bold">R$ {result.riskAmount}</span></p>
        <p className="text-sm text-gray-400">Custo do stop: <span className="text-yellow-400 font-bold">R$ {result.stopCost}</span></p>
        <p className="text-lg font-bold mt-2">📦 Contratos: <span className="text-green-400">{result.contracts}</span></p>
      </div>
    </div>
  );
}

/** Dashboard rápido */
function Dashboard() {
  const [trades, setTrades] = useState<TradeRecord[]>([
    { id: '1', datetime: new Date().toISOString(), direction: 'compra', entry: 125000, stop: 124800, target: 125500, contracts: 1, result: 'ganho', pnl: 100, emotion: 'calmo' },
  ]);

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.result === 'ganho').length;
    const losses = trades.filter(t => t.result === 'perda').length;
    const pnl = trades.reduce((s, t) => s + t.pnl, 0);
    return { total, wins, losses, winRate: total > 0 ? ((wins / total) * 100).toFixed(0) : '0', pnl };
  }, [trades]);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl w-full max-w-md mx-auto mt-4">
      <h2 className="text-lg font-bold mb-3">📊 Resumo do Dia</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-xs text-gray-400">Trades</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-xs text-gray-400">Win Rate</p>
          <p className="text-xl font-bold text-green-400">{stats.winRate}%</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-xs text-gray-400">Ganhos</p>
          <p className="text-xl font-bold text-green-400">{stats.wins}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg text-center">
          <p className="text-xs text-gray-400">Perdas</p>
          <p className="text-xl font-bold text-red-400">{stats.losses}</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 p-3 rounded-lg text-center">
        <p className="text-xs text-yellow-300">P&L do Dia</p>
        <p className={`text-2xl font-bold ${stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          R$ {stats.pnl.toFixed(2)}
        </p>
        <p className="text-xs text-yellow-300 mt-1">Meta: R$ 500,00</p>
      </div>
    </div>
  );
}

/** Base de Conhecimento */
function KnowledgeBase() {
  const sections = [
    { title: '🎯 TradeSystem', content: 'Sistema do Mateus Schwartz — checklist de 8 pontos pra decidir entrada/saída no Day Trade (Mini Índice e Mini Dólar). Opera Trade de Abertura (9h-11h), promessa até 15 min de operação.' },
    { title: '🔴🟡🟢 Semáforo', content: 'VERMELHO = Não entra (algum critério falhou). AMARELO = Mão leve (trade arriscado, reduzir contratos). VERDE = Enche a mão (tudo alinhado).' },
    { title: '📐 Gestão de Risco (TRM)', content: 'Position Sizing: Contratos = (Banca × Risco%) ÷ (Stop pts × Valor/pt). Stop diário: 3% banca (iniciante), 33% margem (Fase 1), 20% margem (conta real). Carryover: lucro acima de 50% da meta é descartado.' },
    { title: '🧠 Operação Racional', content: 'Plano antes da operação. Diário de operações. Revisão pós-op. Regra do "Fora da Janela" (não re-entrar). 3 stops no dia = fim. Check-in emocional antes de cada trade.' },
    { title: '🚫 Regiões Ruins', content: 'Notícias macro. Antes de feriado. 12h-14h (baixa liquidez). Antes do fechamento (16h55+). Preço longe da média (esperar correção).' },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl w-full max-w-md mx-auto mt-4">
      <h2 className="text-lg font-bold mb-3">📚 Base de Conhecimento</h2>
      {sections.map((s, i) => (
        <div key={i} className="mb-2">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition text-sm font-medium">
            {s.title}
          </button>
          {open === i && (
            <div className="bg-gray-800/50 p-3 mt-1 rounded-lg text-xs text-gray-300 leading-relaxed">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ APP PRINCIPAL ============

export default function TradeSystemApp() {
  const [tab, setTab] = useState<'checklist' | 'risco' | 'dashboard' | 'base'>('checklist');

  return (
    <div className="min-h-screen bg-black">
      {/* Nav */}
      <div className="bg-gray-900 border-b border-gray-800 p-2 flex gap-1 overflow-x-auto">
        {[
          { id: 'checklist' as const, label: '📋 Checklist' },
          { id: 'risco' as const, label: '📐 Risco' },
          { id: 'dashboard' as const, label: '📊 Dia' },
          { id: 'base' as const, label: '📚 Base' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === t.id ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {tab === 'checklist' && <CheckList />}
        {tab === 'risco' && <RiskCalculator />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'base' && <KnowledgeBase />}
      </div>
    </div>
  );
}
