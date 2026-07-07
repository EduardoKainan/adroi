import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ==================== TYPES ====================

interface ChecklistItem {
  id: string;
  name: string;
  description: string;
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
  date: string;
  hour: string;
  direction: 'compra' | 'venda';
  asset: 'WIN' | 'WDO' | 'OUTRO';
  entry: number;
  stop: number;
  target: number;
  contracts: number;
  setup: 'FQ' | 'TRM' | 'TC' | 'OUTRO';
  partial1: number;
  partial2: number;
  partial3: number;
  result: 'ganho' | 'perda' | 'empate';
  pnlContrib: number;
  stopPts: number;
  entryReason: string;
  emotion: string;
  lesson: string;
  createdAt: number;
}

interface MesaConfig {
  initialBalance: number;
  phase: 'simulador' | 'fase1' | 'real';
  goal: number;
}

// ==================== STORAGE ====================

const STORAGE_KEY_TRADES = 'traderbook_trades_v2';
const STORAGE_KEY_MESA = 'traderbook_mesa';
const STORAGE_KEY_PRE = 'traderbook_premarket_v2';

function loadTrades(): TradeRecord[] {
  try { const raw = localStorage.getItem(STORAGE_KEY_TRADES); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveTrades(trades: TradeRecord[]) { localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades)); }

function loadMesa(): MesaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESA);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { initialBalance: 1000, phase: 'simulador', goal: 10000 };
}
function saveMesa(m: MesaConfig) { localStorage.setItem(STORAGE_KEY_MESA, JSON.stringify(m)); }

// ==================== HELPERS ====================

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtBRL(v: number) { return 'R$ ' + fmt(v); }

function calcStats(trades: TradeRecord[]) {
  const total = trades.length;
  const wins = trades.filter(t => t.result === 'ganho').length;
  const losses = trades.filter(t => t.result === 'perda').length;
  const pnl = trades.reduce((s, t) => s + t.pnlContrib, 0);
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const map = total > 0 ? Math.round(trades.reduce((s, t) => s + (t.result === 'ganho' ? t.stopPts : 0), 0) / total) : 0;
  return { total, wins, losses, pnl, winRate, map };
}

// ==================== KNOWLEDGE BASE DATA ====================

const knowledgeSections = [
  {
    title: '🎯 FQ — Falha e Quebra',
    summary: 'Sistema que opera na reversão/correção de fluxo. Foco na falha da estrutura, não no rompimento.',
    subsections: [
      { sub: 'Definição', content: `FQ (Falha e Quebra) atua na reversão ou correção de fluxo. Ocorre quando o preço atinge barreira técnica, faz falso rompimento para capturar liquidez, falha em dar continuidade, quebra a estrutura anterior e inverte.\n\nDuas vertentes:\n• A Falha: Mercado testa topo/fundo e deixa nível mais fraco\n• A Quebra: Perde fundo ou rompe topo anterior, confirmando mudança\n• Sequência poderosa: Quebra → Falha` },
      { sub: 'Setup de Entrada', content: `• Timeframe: Estrutura 5 min, execução 2 min (barateia stop)\n• Região de Trava: Jamais opera FQ fora de região técnica\n• Filtro VAP: Prioriza falha acima da VAP (compra) ou abaixo (venda)\n• Filtro Média 9/2: Estrutura calçada pela média 9 do 2 min\n• Entrada: Na falha da estrutura, após candle gatilho` },
      { sub: 'Captura de Liquidez', content: `• Institucional vende agressivamente para forçar rompimento temporário de suporte\n• Stops de comprados são acionados + novos vendidos entram\n• Institucional compra passivamente tudo, garante preço médio\n• Exaurida força vendedora, mercado reverte com velocidade (FQ)` },
      { sub: 'Padrões de Candle', content: `✅ Bottom Tail (martelo no fundo) com fechamento positivo\n✅ Top Tail (martelo invertido no topo) com candle negativo\n✅ Harami, Engolfo, Twin Towers\n❌ Evitar: Doji único, padrão sem corpo real de rejeição` },
      { sub: 'Alvos e Stops', content: `• Stop: atrás do topo mais baixo (venda) ou fundo mais alto (compra)\n• Limites: máximo 250 pts (WIN), máximo 7 pts (WDO)\n• Alvos: Médias 9/20, retrações Fibo (50%, 61,8%), média 50/200 do 5 min, topo/fundo oposto` },
      { sub: 'Gerenciamento (25 ct)', content: `• 1ª Parcial (15 ct): Preço atinge 1:1 do stop → stop dos 10 restantes vai pra entrada\n• 2ª Parcial (5 ct): 2:1 ou média intermediária\n• 3ª Parcial (3 ct): Alvo macro principal\n• Soldados (2 ct): Correm até perder linha\n• 1 ct: Sai cheio na 1ª parcial` },
      { sub: 'Reversão vs Correção', content: `• Reversão: Extremidades macros. Objetivo = inverter tendência principal. Alvos longos.\n• Correção: A favor de tendência forte após retração até confluência. Alvo mais curto = retomada da tendência.` },
    ]
  },
  {
    title: '🔄 TRM — Retorno às Médias',
    summary: 'Opera a exaustão contra a tendência. Preço esticado = oportunidade de reversão.',
    subsections: [
      { sub: 'Quando Operar', content: `• Preço esticado: mínimo 3-4 candles de 5 min sem tocar na média 9\n• Opera exaustão contra tendência\n• Busca retorno à média 9 ou 20\n• Requer confluência com região técnica` },
      { sub: 'Diferença TRM vs FQ', content: `• TRM: Preço longe da média, opera exaustão, trade rápido, alvo na média\n• FQ: Preço em região, opera falha de estrutura, reversão/correção\n• Decisão: Onde o preço está (região) > movimento que ele faz` },
    ]
  },
  {
    title: '📐 Gestão de Risco (GR)',
    summary: 'Position sizing, stop diário, carryover, parciais, limites com banca em R$.',
    subsections: [
      { sub: 'Position Sizing', content: `Fórmula: Contratos = (Banca × Risco%) ÷ (Stop pts × Valor/pt)\n\nWIN: 1 pt = R$ 0,20 | Stop máx: 250 pts\nWDO: 1 pt = R$ 10,00 | Stop máx: 7 pts\n\nEx: Banca R$ 5.000, Risco 1%, Stop 200 pts WIN\n= (5000×0,01)÷(200×0,20) = 50÷40 = 1 contrato` },
      { sub: 'Stop Diário e Limites', content: `• Stop diário: 3% da banca (iniciante)\n• 33% margem (Fase 1) | 20% margem (Conta Real)\n• 3 stops no dia = fim da sessão\n• Encerramento: 11:00 AM` },
      { sub: 'Carryover', content: `• Lucro acima de 50% da meta é descartado (não vira "banca do dia seguinte")\n• Stop móvel ajustado usando pivôs na estrutura de 2 min\n• Após 1ª parcial, stop vai para entrada (zero a zero)\n• Cada trade é independente` },
      { sub: 'SOS — Estancar Perdas', content: `• 2 perdas consecutivas → parar, revisar, resetar mental\n• Não tentar "recuperar loss"\n• Loss é para ser aceito, não recuperado\n• Zero a zero entre trades` },
    ]
  },
  {
    title: '⏰ Operacional & Pré-Mercado',
    summary: 'Rotina diária, decisão FQ/TRM, trades/dia, regiões ruins.',
    subsections: [
      { sub: 'Rotina Pré-Mercado', content: `1. Análise tempos maiores: Médias 9/20/50/200/400 (Mensal, Semanal, Diário)\n2. Marcar confluências: suportes, resistências, GAPs, Fibos\n3. Cenário macro: S&P, DOW, NASDAQ, VIX, petróleo, notícias\n4. Cálculo de abertura: projetar direção por correlações\n5. Oração: após pré-market, antes da abertura\n6. Trade de abertura até 9:15. Encerramento 11:00` },
      { sub: 'Decisão FQ/TRM/TC', content: `• TRM: Preço esticado, sem tocar média 9 por 3-4 candles de 5 min\n• FQ: Preço em região de confluência, reversão/correção\n• TC (Correção): Pullback na média 9/2, aguardando rejeição com candle\n• Critério: Onde o preço está > movimento que ele faz` },
      { sub: 'Regiões Ruins', content: `• Notícias macro\n• Antes de feriado\n• 12h-14h (baixa liquidez)\n• Antes do fechamento (16h55+)\n• Preço longe da média (esperar correção)` },
    ]
  },
  {
    title: '🧠 Psicologia',
    summary: 'Check-in emocional, diário, mindset zero-a-zero.',
    subsections: [
      { sub: 'Mindset', content: `• "Loss é para ser aceito, não recuperado"\n• Diário substitui intuição por estatística\n• Foco no processo, não no dinheiro\n• Zero a zero entre trades\n• Check-in emocional antes de cada trade\n• "Fora da janela": não re-entrar após stop` },
      { sub: 'Sequência', content: `• 2 perdas consecutivas → SOS (parar e revisar)\n• 3 stops no dia → fim de sessão\n• Após ganho grande: reduzir ou parar\n• Nunca dobrar após perda\n• Meta diária: R$ 500` },
    ]
  },
  {
    title: '📊 Exemplos Numéricos',
    summary: '4 exemplos reais com MAP, stops, parciais.',
    subsections: [
      { sub: 'Ex.1 — Venda WIN (10 Jun)', content: '25 ct, stop 145 pts. 1ª: 15@+140, 2ª: 5@+290, 3ª: 3@+500, soldados: 2@+645. MAP = 865 pts' },
      { sub: 'Ex.2 — Compra WIN (17 Jun)', content: '25 ct, stop 180 pts. 1ª: 15@+180, 2ª: 5@+300, 3ª: 3@+500, soldados: 2@+550. MAP = 710 pts' },
      { sub: 'Ex.3 — Compra WIN (24 Jun)', content: '25 ct, stop 245 pts. 1ª: 15@+235, 2ª: 5@+500, 3ª: 3@+790, soldados: 2@0. MAP = 1030 pts' },
      { sub: 'Ex.4 — Stop Dólar', content: '15 ct, stop 6.5 pts, sem filtro da 9/2. MAP 2 pts. Perda cheia de -6.5 pts. Lição: não ignorar filtros.' },
    ]
  }
];

// ==================== PRE-MARKET ====================

const defaultPreItems: ChecklistItem[] = [
  { id: 'tempos', name: '📈 Análise Tempos Maiores', description: 'Médias 9/20/50/200/400 no Mensal, Semanal, Diário', ok: null, notes: '' },
  { id: 'confluencias', name: '📍 Marcar Confluências', description: 'Suportes, resistências, max/min do dia anterior, GAPs, Fibos', ok: null, notes: '' },
  { id: 'macro', name: '🌎 Cenário Macro Global', description: 'S&P, DOW, NASDAQ, VIX, petróleo, minério, notícias', ok: null, notes: '' },
  { id: 'calculadora', name: '🧮 Cálculo Abertura', description: 'Projetar direção e intensidade por correlações', ok: null, notes: '' },
  { id: 'oracao', name: '🙏 Oração', description: 'Antes da abertura, após pré-market', ok: null, notes: '' },
  { id: 'regiao', name: '🎯 Região do Preço', description: 'FQ em região técnica ou TRM por esticamento?', ok: null, notes: '' },
  { id: 'decisao', name: '⚡ Decisão FQ / TRM / TC', description: 'Onde está o preço > movimento que ele faz', ok: null, notes: '' },
  { id: 'plano', name: '📝 Plano do Trade', description: 'Entrada, stop, alvos, contratos escritos antes de operar', ok: null, notes: '' },
];

// ==================== COMPONENTS ====================

// -- Mesa Config + Dashboard --
function MesaView() {
  const [config, setConfig] = useState<MesaConfig>(loadMesa);
  const trades = loadTrades();

  useEffect(() => { saveMesa(config); }, [config]);

  const phaseRules = useMemo(() => ({
    simulador: {
      label: '1️⃣ Simulador',
      stopPct: 0.33, carryoverCap: 0.50, minDays: 10, minPositive: 5, maxDays: 60,
      desc: 'Construção de margens. Bater a meta (R$ 10k) em até 60 dias para liberar margem na conta real.',
    },
    fase1: {
      label: '2️⃣ Fase 1',
      stopPct: 0.33, carryoverCap: 0.50, minDays: 5, minPositive: 3, maxDays: 14,
      desc: 'Adaptação ao risco. 2 semanas. Precisa estar positivo para passar. Regra dos 50%.',
    },
    real: {
      label: '3️⃣ Conta Real',
      stopPct: 0.20, carryoverCap: null, minDays: 3, minPositive: 0, maxDays: 0,
      desc: 'Stop diário 20% sobre margem carregada. Mínimo 3 dias para saque. Split: 90/10.',
    },
  }), []);

  const stats = useMemo(() => {
    const r = phaseRules[config.phase];
    const initial = config.initialBalance;
    const goal = config.goal;
    const totalResult = trades.reduce((s, t) => s + t.pnlContrib, 0);
    const currentBalance = initial + totalResult;
    const daysOperated = trades.length;
    const daysPositive = trades.filter(t => t.pnlContrib > 0).length;

    // Carryover (regra 50%)
    let carryoverTotal = 0;
    trades.forEach(t => {
      if (t.pnlContrib > 0) {
        if (r.carryoverCap !== null && t.pnlContrib > initial * r.carryoverCap) {
          carryoverTotal += initial * r.carryoverCap;
        } else {
          carryoverTotal += t.pnlContrib;
        }
      }
    });

    const dailyStop = initial * r.stopPct;
    const progress = Math.min(100, Math.max(0, (totalResult / goal) * 100));
    const daysRemaining = r.maxDays > 0 ? r.maxDays - daysOperated : '∞';
    const meetMinDays = daysOperated >= r.minDays;
    const meetMinPositive = daysPositive >= r.minPositive;
    const meetGoal = totalResult >= goal;
    const canPass = config.phase !== 'real' ? (meetMinDays && meetMinPositive && meetGoal) : null;

    return { r, initial, goal, totalResult, currentBalance, daysOperated, daysPositive,
      daysRemaining, carryoverTotal, dailyStop, progress, meetMinDays, meetMinPositive, meetGoal, canPass };
  }, [config, trades]);

  const phases = [
    { key: 'simulador' as const, label: '1️⃣ Simulador' },
    { key: 'fase1' as const, label: '2️⃣ Fase 1' },
    { key: 'real' as const, label: '3️⃣ Conta Real' },
  ];
  const phaseIdx = phases.findIndex(p => p.key === config.phase);

  const pnlColor = stats.totalResult >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Config */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">⚙️ Configuração</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Banca / Margem Inicial (R$)</label>
            <input type="number" value={config.initialBalance}
              onChange={e => setConfig(p => ({ ...p, initialBalance: Number(e.target.value) }))}
              className="w-full bg-slate-800 rounded-xl p-3 text-white text-sm border border-slate-700 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Fase</label>
            <select value={config.phase} onChange={e => setConfig(p => ({ ...p, phase: e.target.value as MesaConfig['phase'] }))}
              className="w-full bg-slate-800 rounded-xl p-3 text-white text-sm border border-slate-700 focus:border-indigo-500 outline-none">
              <option value="simulador">1️⃣ Simulador</option>
              <option value="fase1">2️⃣ Fase 1</option>
              <option value="real">3️⃣ Conta Real</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Meta de Lucro (R$)</label>
            <input type="number" value={config.goal}
              onChange={e => setConfig(p => ({ ...p, goal: Number(e.target.value) }))}
              className="w-full bg-slate-800 rounded-xl p-3 text-white text-sm border border-slate-700 focus:border-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-2">
        {phases.map((p, i) => {
          let cls = 'bg-slate-800 text-slate-500 border-slate-700';
          if (p.key === config.phase) cls = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50';
          else if (i < phaseIdx) cls = 'bg-green-500/10 text-green-400 border-green-500/30';
          return (
            <div key={p.key} className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold border ${cls}`}>
              {p.label}
            </div>
          );
        })}
      </div>

      {/* Phase info */}
      <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
        {stats.r.desc}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Saldo Atual', value: fmtBRL(stats.currentBalance), cls: 'text-yellow-400' },
          { label: 'Resultado', value: `${stats.totalResult >= 0 ? '+' : ''}${fmtBRL(stats.totalResult)}`, cls: pnlColor },
          { label: `Stop (${Math.round(stats.r.stopPct * 100)}%)`, value: fmtBRL(stats.dailyStop), cls: 'text-slate-300' },
          { label: 'Carryover', value: fmtBRL(stats.carryoverTotal), cls: 'text-yellow-400' },
          { label: `Dias + (mín ${stats.r.minPositive})`, value: `${stats.daysPositive} / ${stats.r.minPositive}`, cls: stats.meetMinPositive ? 'text-green-400' : 'text-red-400' },
          { label: `Dias Op (mín ${stats.r.minDays})`, value: `${stats.daysOperated} / ${stats.r.minDays}`, cls: stats.meetMinDays ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">📈 Progresso</span>
          <span className="text-white font-bold">{Math.round(stats.progress)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all duration-500 ${
            stats.progress >= 100 ? 'bg-green-500' : stats.progress >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'
          }`} style={{ width: `${Math.min(100, stats.progress)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{fmtBRL(stats.totalResult)} / {fmtBRL(stats.goal)}</span>
          <span>🎯 Dias: {stats.daysOperated} op • {stats.daysRemaining} rest</span>
        </div>

        {stats.meetGoal && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-sm font-bold text-green-400">✅ META ATINGIDA!</p>
            {config.phase !== 'real' && <p className="text-xs text-green-300 mt-1">Condições: {stats.meetMinDays ? '✅' : '❌'} dias • {stats.meetMinPositive ? '✅' : '❌'} dias positivos</p>}
          </div>
        )}

        {stats.daysRemaining !== '∞' && Number(stats.daysRemaining) <= 0 && !stats.meetGoal && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm font-bold text-red-400">❌ Prazo esgotado</p>
          </div>
        )}
      </div>

      {/* Regras da Mesa */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">📜 Regras da Mesa</h2>
        <div className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
          <p>🎯 <span className="text-slate-200">Meta:</span> {fmtBRL(stats.goal)} de lucro</p>
          <p>⏱️ <span className="text-slate-200">Prazo:</span> {stats.r.maxDays} dias — restam {stats.daysRemaining}</p>
          <p>🛑 <span className="text-slate-200">Stop Diário:</span> {Math.round(stats.r.stopPct * 100)}% ({fmtBRL(stats.dailyStop)})</p>
          <p>📊 <span className="text-slate-200">Carryover:</span> {stats.r.carryoverCap !== null ? `${Math.round(stats.r.carryoverCap * 100)}% de ganho diário máximo contabilizado` : 'Sem limite'}</p>
          <p>📆 <span className="text-slate-200">Mínimos:</span> {stats.r.minDays} dias operados, {stats.r.minPositive} positivos</p>
          {config.phase === 'real' && <p>💰 <span className="text-slate-200">Split:</span> 90% trader / 10% mesa (IR 20% descontado). Pagamento dia 5.</p>}
        </div>
      </div>
    </div>
  );
}

// -- Risk Calculator --
function RiskCalculator() {
  const [input, setInput] = useState<RiskInput>({ banca: 5000, riskPercent: 1, stopPoints: 200, pointValue: 0.20 });
  const [selected, setSelected] = useState<'WIN'|'WDO'>('WIN');

  const result = useMemo(() => {
    const risk = input.banca * (input.riskPercent / 100);
    const stopCost = input.stopPoints * input.pointValue;
    const contracts = Math.floor(risk / (stopCost || 1));
    return { riskAmount: risk, stopCost, contracts: Math.max(1, contracts) };
  }, [input]);

  const maxStop = selected === 'WIN' ? 250 : 7;

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 w-full max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-white mb-4">📐 Calculadora de Risco</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setSelected('WIN'); setInput(p => ({ ...p, pointValue: 0.20 })); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${selected === 'WIN' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>WIN (R$0,20)</button>
        <button onClick={() => { setSelected('WDO'); setInput(p => ({ ...p, pointValue: 10 })); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${selected === 'WDO' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>WDO (R$10)</button>
      </div>
      <div className="space-y-3 mb-4">
        {[
          { key: 'banca' as const, label: 'Banca (R$)', step: 100 },
          { key: 'riskPercent' as const, label: 'Risco (%)', step: 0.1 },
          { key: 'stopPoints' as const, label: `Stop (pts) — máx ${maxStop}`, step: 5, max: maxStop },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-slate-400">{f.label}</label>
            <input type="number" value={input[f.key]} max={(f as any).max}
              onChange={e => setInput(p => ({ ...p, [f.key]: Number(e.target.value) }))}
              step={f.step}
              className="w-full bg-slate-800 rounded-xl p-3 text-white text-sm border border-slate-700 focus:border-indigo-500 outline-none" />
          </div>
        ))}
      </div>
      <div className="bg-slate-800/80 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between"><span className="text-sm text-slate-400">Risco em R$:</span><span className="text-yellow-400 font-bold">{fmtBRL(result.riskAmount)}</span></div>
        <div className="flex justify-between"><span className="text-sm text-slate-400">Custo do stop:</span><span className="text-yellow-400 font-bold">{fmtBRL(result.stopCost)}</span></div>
        <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
          <span className="text-sm text-slate-400">📦 Contratos:</span>
          <span className="text-2xl font-bold text-green-400">{result.contracts}</span>
        </div>
      </div>
      <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
        <p className="text-xs text-indigo-300">Stop máximo {selected}: {maxStop} pts. 3 stops no dia = fim. Meta: R$ 500/dia.</p>
      </div>
    </div>
  );
}

// -- Pre-Market Checklist --
function PreMarketCheck() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRE);
    if (saved) { try { const p = JSON.parse(saved); if (p.date === todayStr()) return p.items; } catch {} }
    return defaultPreItems.map(i => ({ ...i }));
  });
  const [showNotes, setShowNotes] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRE, JSON.stringify({ date: todayStr(), items }));
  }, [items]);

  const toggle = useCallback((id: string, value: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ok: i.ok === value ? null : value } : i));
  }, []);

  const semaforo = useMemo(() => {
    const done = items.filter(i => i.ok === true).length;
    const failed = items.filter(i => i.ok === false).length;
    const progress = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    if (failed > 0) return { cor: '🔴', texto: 'Pendências — Revisar', classe: 'bg-red-500/20 text-red-300 border-red-500/30', progress: 'bg-red-500' };
    if (done < items.length) return { cor: '🟡', texto: `${done}/${items.length}`, classe: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', progress: 'bg-yellow-500' };
    return { cor: '🟢', texto: '✅ Preparado', classe: 'bg-green-500/20 text-green-300 border-green-500/30', progress: 'bg-green-500' };
  }, [items]);

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">☀️ Pré-Mercado • {todayStr()}</h2>
        <button onClick={() => setItems(defaultPreItems.map(i => ({ ...i })))} className="text-xs text-slate-500 hover:text-slate-300 underline">Resetar</button>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${semaforo.progress}`}
          style={{ width: `${(items.filter(i => i.ok === true).length / items.length) * 100}%` }} />
      </div>
      <div className={`border rounded-2xl p-3 mb-4 text-center text-sm font-bold ${semaforo.classe}`}>
        {semaforo.cor} {semaforo.texto}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`bg-slate-800/50 rounded-xl p-3 border ${item.ok === true ? 'border-green-500/30' : item.ok === false ? 'border-red-500/30' : 'border-slate-700/50'}`}>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-white font-medium">{item.name}</span>
              <button onClick={() => toggle(item.id, true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${item.ok === true ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-green-500/20'}`}>✅</button>
              <button onClick={() => toggle(item.id, false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${item.ok === false ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-red-500/20'}`}>❌</button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{item.description}</p>
            {showNotes === item.id && (
              <textarea value={item.notes} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                placeholder="Anotações..."
                className="w-full mt-2 bg-slate-900 rounded-lg p-2 text-xs text-slate-300 border border-slate-700 resize-none h-16" />
            )}
            <button onClick={() => setShowNotes(showNotes === item.id ? null : item.id)} className="text-[10px] text-indigo-400 mt-1">
              {showNotes === item.id ? 'Fechar' : '📝 Anotar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Session Dashboard --
function SessionDashboard() {
  const trades = loadTrades();
  const today = todayStr();
  const todayTrades = trades.filter(t => t.date === today);
  const config = loadMesa();

  const stats = useMemo(() => calcStats(todayTrades), [todayTrades]);
  const daily = useMemo(() => ({
    trades: todayTrades.length, wins: todayTrades.filter(t => t.result === 'ganho').length,
    losses: todayTrades.filter(t => t.result === 'perda').length,
    pnl: todayTrades.reduce((s, t) => s + t.pnlContrib, 0),
    meta: 500,
  }), [todayTrades]);

  const metaProgress = Math.min(100, Math.round((daily.pnl / daily.meta) * 100));
  const carryoverApplied = daily.pnl > daily.meta * 0.5;
  const stopDiario = daily.losses >= 3;
  const phaseStop = config.initialBalance * ({
    simulador: 0.33, fase1: 0.33, real: 0.20
  }[config.phase]);

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 w-full max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-white mb-4">📊 Sessão • {todayStr()}</h2>

      <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 rounded-2xl p-4 border border-indigo-500/20 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">🎯 Meta do Dia</span>
          <span className={`text-lg font-bold ${daily.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBRL(daily.pnl)}</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            metaProgress >= 100 ? 'bg-green-500' : metaProgress >= 50 ? 'bg-yellow-500' : daily.pnl < 0 ? 'bg-red-500' : 'bg-indigo-500'
          }`} style={{ width: `${Math.abs(metaProgress)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>R$ 0</span>
          <span>R$ {daily.meta}</span>
        </div>

        {carryoverApplied && (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-300">⚠️ Lucro acima de 50% — carryover. Excedente não vira banca do dia seguinte.</p>
          </div>
        )}
        {stopDiario && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-300">🔴 3 perdas no dia — Sessão encerrada. Volte amanhã.</p>
          </div>
        )}
        <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
          <span>🛑 Stop fase: {fmtBRL(phaseStop)}</span>
          <span>📋 Fase: {config.phase === 'simulador' ? 'Simulador' : config.phase === 'fase1' ? 'Fase 1' : 'Conta Real'}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Trades', value: stats.total, cls: 'text-white' },
          { label: 'Win', value: stats.wins, cls: 'text-green-400' },
          { label: 'Loss', value: stats.losses, cls: 'text-red-400' },
          { label: 'WR', value: `${stats.winRate.toFixed(0)}%`, cls: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/60 rounded-xl p-3 text-center mb-4">
        <p className="text-xs text-slate-400">MAP (Média de Pontos)</p>
        <p className="text-xl font-bold text-indigo-400">{stats.map} pts</p>
      </div>

      {todayTrades.length > 0 ? (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">📋 Trades de hoje:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayTrades.slice(-5).reverse().map(t => (
              <div key={t.id} className={`bg-slate-800/40 rounded-xl p-3 border-l-4 ${
                t.result === 'ganho' ? 'border-green-500' : t.result === 'perda' ? 'border-red-500' : 'border-yellow-500'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">{t.direction === 'compra' ? '🟢' : '🔴'} {t.asset} • {t.setup}</span>
                  <span className={`text-sm font-bold ${t.pnlContrib >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBRL(t.pnlContrib)}</span>
                </div>
                <p className="text-[10px] text-slate-500">{t.hour} | Entrada: {t.entry} | Stop: {t.stop} | Ct: {t.contracts}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/40 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Nenhum trade hoje. Registre no 📓 Diário.</p>
        </div>
      )}
    </div>
  );
}

// -- Trade Diary --
function TradeDiary() {
  const [trades, setTrades] = useState<TradeRecord[]>(loadTrades);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ganho' | 'perda'>('all');
  const [form, setForm] = useState<Partial<TradeRecord>>({
    direction: 'compra', asset: 'WIN', setup: 'FQ', entry: 0, stop: 0, target: 0,
    contracts: 1, partial1: 0, partial2: 0, partial3: 0, result: 'ganho',
    pnlContrib: 0, stopPts: 0, entryReason: '', emotion: '', lesson: '',
  });

  useEffect(() => { saveTrades(trades); }, [trades]);

  const calcStopPts = (entry: number, stop: number, dir: 'compra' | 'venda') => {
    return dir === 'compra' ? entry - stop : stop - entry;
  };

  const addTrade = () => {
    const now = new Date();
    const t: TradeRecord = {
      id: Date.now().toString(), date: todayStr(), hour: now.toTimeString().slice(0, 5),
      direction: form.direction || 'compra', asset: form.asset || 'WIN',
      entry: form.entry || 0, stop: form.stop || 0, target: form.target || 0,
      contracts: form.contracts || 1, setup: form.setup || 'FQ',
      partial1: form.partial1 || 0, partial2: form.partial2 || 0, partial3: form.partial3 || 0,
      result: form.result || 'ganho', pnlContrib: form.pnlContrib || 0,
      stopPts: calcStopPts(form.entry || 0, form.stop || 0, form.direction || 'compra'),
      entryReason: form.entryReason || '', emotion: form.emotion || '', lesson: form.lesson || '',
      createdAt: Date.now(),
    };
    setTrades(prev => [...prev, t]);
    setForm({ direction: 'compra', asset: 'WIN', setup: 'FQ', entry: 0, stop: 0, target: 0,
      contracts: 1, partial1: 0, partial2: 0, partial3: 0, result: 'ganho',
      pnlContrib: 0, stopPts: 0, entryReason: '', emotion: '', lesson: '' });
    setShowForm(false);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return trades;
    return trades.filter(t => t.result === filter);
  }, [trades, filter]);

  const stats = useMemo(() => calcStats(trades), [trades]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `traderbook-trades-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-3">
        <div className="grid grid-cols-5 gap-2 text-center">
          <div><p className="text-[10px] text-slate-500">Total</p><p className="text-sm font-bold text-white">{stats.total}</p></div>
          <div><p className="text-[10px] text-slate-500">Win</p><p className="text-sm font-bold text-green-400">{stats.wins}</p></div>
          <div><p className="text-[10px] text-slate-500">Loss</p><p className="text-sm font-bold text-red-400">{stats.losses}</p></div>
          <div><p className="text-[10px] text-slate-500">WR</p><p className="text-sm font-bold text-yellow-400">{stats.winRate.toFixed(0)}%</p></div>
          <div><p className="text-[10px] text-slate-500">P&L</p><p className={`text-sm font-bold ${stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBRL(stats.pnl)}</p></div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={() => setShowForm(!showForm)}
          className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition">
          {showForm ? '✕ Fechar' : '+ Novo Trade'}
        </button>
        <button onClick={exportJSON} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition">📥 Export</button>
        <button onClick={() => { setTrades([]); saveTrades([]); }} className="px-4 py-3 bg-slate-800 hover:bg-red-500/20 text-slate-400 rounded-xl text-xs font-medium transition">🗑️</button>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-3">
          <h3 className="text-sm font-bold text-white mb-3">📝 Novo Trade</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500">Direção</label>
              <div className="flex gap-1 mt-1">
                {(['compra', 'venda'] as const).map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.direction === d ? (d === 'compra' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-slate-800 text-slate-400'}`}>
                    {d === 'compra' ? '🟢 C' : '🔴 V'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Ativo</label>
              <div className="flex gap-1 mt-1">
                {(['WIN', 'WDO'] as const).map(a => (
                  <button key={a} onClick={() => setForm(f => ({ ...f, asset: a }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.asset === a ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Setup</label>
              <div className="flex gap-1 mt-1">
                {(['FQ', 'TRM', 'TC'] as const).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, setup: s }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.setup === s ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Resultado</label>
              <div className="flex gap-1 mt-1">
                {(['ganho', 'perda', 'empate'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, result: r }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.result === r ? (r === 'ganho' ? 'bg-green-500 text-white' : r === 'perda' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black') : 'bg-slate-800 text-slate-400'}`}>
                    {r === 'ganho' ? '✅' : r === 'perda' ? '❌' : '➖'}
                  </button>
                ))}
              </div>
            </div>
            {[
              { key: 'entry', label: 'Entrada' }, { key: 'stop', label: 'Stop' },
              { key: 'target', label: 'Alvo' }, { key: 'contracts', label: 'Contratos' },
              { key: 'pnlContrib', label: 'P&L (R$)' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] text-slate-500">{f.label}</label>
                <input type="number" value={(form as any)[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                  className="w-full bg-slate-800 rounded-lg p-2 text-xs text-white border border-slate-700" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500">Razão da Entrada</label>
              <input type="text" value={form.entryReason || ''}
                onChange={e => setForm(p => ({ ...p, entryReason: e.target.value }))}
                placeholder="FQ em suporte com martelo..." className="w-full bg-slate-800 rounded-lg p-2 text-xs text-white border border-slate-700" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500">Emoção / Lição</label>
              <input type="text" value={form.lesson || ''}
                onChange={e => setForm(p => ({ ...p, lesson: e.target.value }))}
                placeholder="Calmo, segui o plano..." className="w-full bg-slate-800 rounded-lg p-2 text-xs text-white border border-slate-700" />
            </div>
          </div>
          <button onClick={addTrade} className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-bold">
            ✅ Registrar Trade
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-3">
        {(['all', 'ganho', 'perda'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-medium ${filter === f ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {f === 'all' ? 'Todos' : f === 'ganho' ? '✅ Ganhos' : '❌ Perdas'}
          </button>
        ))}
        <span className="text-[10px] text-slate-500 self-center ml-auto">{trades.filter(t => t.date === todayStr()).length} hoje</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="bg-slate-800/40 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">Nenhum trade registrado.</p>
            <p className="text-xs text-slate-600 mt-1">Toque em "+ Novo Trade" para começar.</p>
          </div>
        )}
        {filtered.slice(-50).reverse().map(t => (
          <div key={t.id} className={`bg-slate-800/50 rounded-xl p-3 border-l-4 ${
            t.result === 'ganho' ? 'border-green-500' : t.result === 'perda' ? 'border-red-500' : 'border-yellow-500'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-bold text-white">{t.direction === 'compra' ? '🟢' : '🔴'} {t.asset}</span>
                <span className="text-xs text-slate-500 ml-2">{t.date} {t.hour}</span>
              </div>
              <span className={`text-sm font-bold ${t.pnlContrib >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBRL(t.pnlContrib)}</span>
            </div>
            <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
              <span>{t.setup}</span>
              <span>Ent: {t.entry}</span>
              <span>Stop: {t.stop} ({t.stopPts}pts)</span>
              <span>{t.contracts}ct</span>
            </div>
            {t.lesson && <p className="text-[10px] text-slate-400 mt-1 italic">"{t.lesson}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Knowledge Base --
function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<number[]>([]);
  const [openSubs, setOpenSubs] = useState<string[]>([]);

  const toggleSection = (idx: number) => {
    setOpenSections(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const toggleSub = (id: string) => {
    setOpenSubs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return knowledgeSections;
    const q = search.toLowerCase();
    return knowledgeSections.filter(s =>
      s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q) ||
      s.subsections.some(sub => sub.sub.toLowerCase().includes(q) || sub.content.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Pesquisar na base..."
          className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm text-white border border-slate-700 focus:border-indigo-500 outline-none" />
        <p className="text-[10px] text-slate-500 mt-2">6 temas • {knowledgeSections.reduce((s, sec) => s + sec.subsections.length, 0)} tópicos</p>
      </div>
      <div className="space-y-2">
        {filtered.map((section, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden">
            <button onClick={() => toggleSection(idx)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition text-left">
              <div>
                <h3 className="text-sm font-bold text-white">{section.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{section.summary}</p>
              </div>
              <span className="text-slate-500">{openSections.includes(idx) ? '▲' : '▼'}</span>
            </button>
            {openSections.includes(idx) && (
              <div className="px-4 pb-4 space-y-2">
                {section.subsections.map((sub, si) => {
                  const subId = `${idx}-${si}`;
                  return (
                    <div key={subId} className="bg-slate-800/50 rounded-xl overflow-hidden">
                      <button onClick={() => toggleSub(subId)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition text-left">
                        <span className="text-xs font-medium text-indigo-300">{sub.sub}</span>
                        <span className="text-slate-600 text-[10px]">{openSubs.includes(subId) ? '▲' : '▼'}</span>
                      </button>
                      {openSubs.includes(subId) && (
                        <div className="px-3 pb-3">
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{sub.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

type TraderTab = 'mesa' | 'pre' | 'risco' | 'sessao' | 'diario' | 'base';

const tabs = [
  { id: 'mesa' as TraderTab, label: 'Mesa', icon: '⚙️' },
  { id: 'pre' as TraderTab, label: 'Pré-Mercado', icon: '☀️' },
  { id: 'risco' as TraderTab, label: 'Risco', icon: '📐' },
  { id: 'sessao' as TraderTab, label: 'Sessão', icon: '📊' },
  { id: 'diario' as TraderTab, label: 'Diário', icon: '📓' },
  { id: 'base' as TraderTab, label: 'Base', icon: '📚' },
];

export default function TraderBookApp() {
  const [tab, setTab] = useState<TraderTab>('mesa');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white">📘 TraderBook</h1>
        <p className="text-[11px] text-slate-500">Mesa de Trading • TradeSystem • Meta R$ 500/dia</p>
      </div>

      <div className="bg-slate-900/90 border-b border-slate-800 px-2 py-2 sticky top-0 z-20 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                tab === t.id ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        {tab === 'mesa' && <MesaView />}
        {tab === 'pre' && <PreMarketCheck />}
        {tab === 'risco' && <RiskCalculator />}
        {tab === 'sessao' && <SessionDashboard />}
        {tab === 'diario' && <TradeDiary />}
        {tab === 'base' && <KnowledgeBase />}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center justify-between text-[10px] text-slate-500 max-w-lg mx-auto">
          <span>📘 TraderBook</span>
          <span>🧠 TradeSystem • FQ • TRM</span>
          <span>🎯 R$ 500/dia</span>
        </div>
      </div>
    </div>
  );
}
