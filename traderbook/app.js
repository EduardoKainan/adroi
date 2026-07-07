/* ===== TRADERBOOK APP ===== */
/* Modelo: openai/gpt-5.5-pro */

// ===== STATE =====
let state = loadState();
let chartInstance = null;

function defaultState() {
  return {
    initialBalance: 1000,
    phase: 'simulador',
    goal: 10000,
    trades: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('traderbook');
    if (raw) {
      const s = JSON.parse(raw);
      if (!Array.isArray(s.trades)) s.trades = [];
      return s;
    }
  } catch(e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem('traderbook', JSON.stringify(state));
}

// ===== HELPERS =====
function fmt(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  return 'R$ ' + fmt(n);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===== RULES =====
function getPhaseRules(phase) {
  const rules = {
    simulador: {
      label: '1️⃣ Simulador',
      stopPct: 0.33,
      carryoverCap: 0.50,
      minDays: 10,
      minPositive: 5,
      maxDays: 60,
      desc: 'Construção de margens. Bater a meta (R$ 10k) em até 60 dias para liberar margem na conta real. Profit grátis no 1º mês → R$ 138/mês depois.',
    },
    fase1: {
      label: '2️⃣ Fase 1',
      stopPct: 0.33,
      carryoverCap: 0.50,
      minDays: 5,
      minPositive: 3,
      maxDays: 14,
      desc: 'Adaptação ao risco. 2 semanas. Precisa estar positivo para passar. Regra dos 50%: dia que passar 50% de gain, o excedente é descartado para carryover.',
    },
    real: {
      label: '3️⃣ Conta Real',
      stopPct: 0.20,
      carryoverCap: null,
      minDays: 3,
      minPositive: 0,
      maxDays: 0,
      desc: 'Stop diário 20% sobre margem carregada. Mínimo 3 dias operados para saque. Split: 90% trader / 10% mesa (IR 20% já descontado). Pagamento dia 5.',
    }
  };
  return rules[phase] || rules.simulador;
}

// ===== CALCULATIONS =====
function calcStats() {
  const phase = state.phase;
  const r = getPhaseRules(phase);
  const initial = Number(state.initialBalance) || 1000;
  const goal = Number(state.goal) || 10000;
  const trades = state.trades || [];

  const totalResult = trades.reduce((sum,t) => sum + (Number(t.result)||0), 0);
  const currentBalance = initial + totalResult;

  const daysOperated = trades.length;
  const daysPositive = trades.filter(t => (Number(t.result)||0) > 0).length;
  const daysNegative = trades.filter(t => (Number(t.result)||0) < 0).length;

  // Carryover (regra 50%)
  let carryoverTotal = 0;
  trades.forEach(t => {
    const res = Number(t.result) || 0;
    if (res > 0) {
      if (r.carryoverCap !== null && res > initial * r.carryoverCap) {
        carryoverTotal += initial * r.carryoverCap;
      } else {
        carryoverTotal += res;
      }
    }
  });

  // Streaks
  const sortedTrades = [...trades].sort((a,b) => new Date(a.date) - new Date(b.date));
  let currentStreak = 0;
  let currentStreakType = null; // 'win' or 'loss'
  let bestWinStreak = 0;
  let bestLossStreak = 0;
  let tempWin = 0, tempLoss = 0;

  sortedTrades.forEach(t => {
    const res = Number(t.result) || 0;
    if (res > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > bestWinStreak) bestWinStreak = tempWin;
    } else if (res < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > bestLossStreak) bestLossStreak = tempLoss;
    }
  });
  // Current streak (desde o último trade)
  if (sortedTrades.length > 0) {
    const last = Number(sortedTrades[sortedTrades.length-1].result) || 0;
    if (last > 0) {
      currentStreakType = 'win';
      currentStreak = tempWin;
    } else if (last < 0) {
      currentStreakType = 'loss';
      currentStreak = tempLoss;
    }
  }

  // Médias
  const winTrades = trades.filter(t => (Number(t.result)||0) > 0);
  const lossTrades = trades.filter(t => (Number(t.result)||0) < 0);
  const avgWin = winTrades.length > 0
    ? winTrades.reduce((s,t) => s + (Number(t.result)||0), 0) / winTrades.length
    : 0;
  const avgLoss = lossTrades.length > 0
    ? lossTrades.reduce((s,t) => s + (Number(t.result)||0), 0) / lossTrades.length
    : 0;
  const winRate = daysOperated > 0 ? (daysPositive / daysOperated) * 100 : 0;

  // Days remaining
  let daysRemaining = r.maxDays > 0 ? r.maxDays - daysOperated : '∞';

  // Stop diário
  const dailyStop = initial * r.stopPct;

  // Progress
  const progress = Math.min(100, Math.max(0, (totalResult / goal) * 100));

  const meetMinDays = daysOperated >= r.minDays;
  const meetMinPositive = daysPositive >= r.minPositive;
  const meetGoal = totalResult >= goal;

  // Equity curve data
  const equityCurve = [];
  let runningTotal = 0;
  const sortedForCurve = [...trades].sort((a,b) => new Date(a.date) - new Date(b.date));
  sortedForCurve.forEach(t => {
    runningTotal += (Number(t.result) || 0);
    equityCurve.push({
      date: t.date,
      value: runningTotal
    });
  });

  return {
    phase, r, initial, goal,
    trades, totalResult, currentBalance,
    daysOperated, daysPositive, daysNegative,
    daysRemaining, carryoverTotal, dailyStop, progress,
    meetMinDays, meetMinPositive, meetGoal,
    currentStreak, currentStreakType,
    bestWinStreak, bestLossStreak,
    avgWin, avgLoss, winRate,
    equityCurve
  };
}

// ===== RENDER =====
function render() {
  const s = calcStats();

  // Phase indicator
  const phases = [
    { key:'simulador', label:'1️⃣ Simulador' },
    { key:'fase1', label:'2️⃣ Fase 1' },
    { key:'real', label:'3️⃣ Conta Real' },
  ];
  const idx = phases.findIndex(p => p.key === s.phase);
  document.getElementById('phaseIndicator').innerHTML = phases.map((p,i) => {
    let cls = '';
    if (p.key === s.phase) cls = 'active';
    else if (i < idx) cls = 'done';
    return `<div class="phase-step ${cls}">${p.label}</div>`;
  }).join('');

  // Phase info
  document.getElementById('phaseInfo').innerHTML = s.r.desc;

  // Stats grid
  const stopLabel = s.r.stopPct * 100 + '%';
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat gold">
      <div class="value">${fmtMoney(s.currentBalance)}</div>
      <div class="label">Saldo Atual</div>
    </div>
    <div class="stat ${s.totalResult >= 0 ? 'green' : 'red'}">
      <div class="value">${s.totalResult >= 0 ? '+' : ''}${fmtMoney(s.totalResult)}</div>
      <div class="label">Resultado Total</div>
    </div>
    <div class="stat white">
      <div class="value">${fmtMoney(s.dailyStop)}</div>
      <div class="label">Stop Diário (${stopLabel})</div>
    </div>
    <div class="stat gold">
      <div class="value">${fmtMoney(s.carryoverTotal)}</div>
      <div class="label">Carryover Total</div>
    </div>
    <div class="stat ${s.meetMinPositive ? 'green' : 'red'}">
      <div class="value">${s.daysPositive} / ${s.r.minPositive}</div>
      <div class="label">Dias Positivos (mín)</div>
    </div>
    <div class="stat ${s.daysOperated >= s.r.minDays ? 'green' : 'red'}">
      <div class="value">${s.daysOperated} / ${s.r.minDays}</div>
      <div class="label">Dias Operados (mín)</div>
    </div>
  `;

  // Progress
  document.getElementById('progressLabel').textContent =
    `${fmtMoney(s.totalResult)} / ${fmtMoney(s.goal)}`;
  document.getElementById('progressPct').textContent = `${Math.round(s.progress)}%`;
  const fill = document.getElementById('progressFill');
  fill.style.width = `${Math.min(100,s.progress)}%`;
  let fillCls = 'fill';
  if (s.progress >= 70) fillCls += ' danger';
  else if (s.progress >= 35) fillCls += ' warning';
  fill.className = fillCls;

  document.getElementById('daysOperated').textContent = s.daysOperated;
  document.getElementById('daysPositive').textContent = s.daysPositive;
  document.getElementById('daysRemaining').textContent = s.daysRemaining;

  // Metrics row
  renderMetrics(s);

  // Trade list
  renderTradeList(s);

  // Chart
  renderChart(s);

  // Rules
  renderRules(s);

  // Sync form
  syncForm();
}

function renderMetrics(s) {
  const streakLabel = s.currentStreak > 0
    ? `${s.currentStreak} ${s.currentStreakType === 'win' ? '🔥' : '❄️'}`
    : '—';
  const bestStreakLabel = `${s.bestWinStreak}W / ${s.bestLossStreak}L`;

  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric">
      <div class="value gold">${streakLabel}</div>
      <div class="label">Streak Atual</div>
    </div>
    <div class="metric">
      <div class="value white">${bestStreakLabel}</div>
      <div class="label">Melhor Streak</div>
    </div>
    <div class="metric">
      <div class="value ${s.avgWin >= 0 ? 'green' : 'red'}">${s.avgWin > 0 ? fmtMoney(s.avgWin) : '—'}</div>
      <div class="label">Média Gain</div>
    </div>
    <div class="metric">
      <div class="value ${s.avgLoss < 0 ? 'red' : 'white'}">${s.avgLoss < 0 ? fmtMoney(s.avgLoss) : '—'}</div>
      <div class="label">Média Loss</div>
    </div>
    <div class="metric">
      <div class="value ${s.winRate >= 50 ? 'green' : 'red'}">${s.winRate.toFixed(1)}%</div>
      <div class="label">Win Rate</div>
    </div>
    <div class="metric">
      <div class="value gold">${s.daysOperated > 0 ? (s.totalResult / s.daysOperated >= 0 ? '+' : '') + fmtMoney(s.totalResult / s.daysOperated) : '—'}</div>
      <div class="label">Média/Dia</div>
    </div>
  `;
}

function renderTradeList(s) {
  const list = document.getElementById('tradeList');
  if (s.trades.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">📭</span>
        Nenhum dia registrado ainda.<br>
        Adicione seu primeiro trade acima.
      </div>`;
    return;
  }

  const sorted = [...s.trades].sort((a,b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = sorted.map(t => {
    const res = Number(t.result)||0;
    const cls = res >= 0 ? 'pos' : 'neg';
    const sign = res >= 0 ? '+' : '';
    const idx = state.trades.indexOf(t);
    return `
      <div class="trade-item">
        <span class="date">${formatDate(t.date)}</span>
        <span class="result ${cls}">${sign}${fmtMoney(res)}</span>
        <span class="notes">${escHtml(t.notes || '')}</span>
        <div class="actions">
          <button class="delete-btn" onclick="deleteTrade(${idx})" title="Remover">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderChart(s) {
  const canvas = document.getElementById('equityChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Destroy old chart
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const data = s.equityCurve;
  if (data.length < 2) {
    // Show placeholder
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8888aa';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Adicione trades para ver o gráfico', canvas.width/2, canvas.height/2);
    return;
  }

  const labels = data.map(d => formatDateShort(d.date));
  const values = data.map(d => d.value + s.initial);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Equity',
        data: values,
        borderColor: '#00B894',
        backgroundColor: 'rgba(0,184,148,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#00B894',
        pointBorderColor: '#0d0d0d',
        pointBorderWidth: 1.5,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e0e0e0',
          bodyColor: '#D4AF37',
          borderColor: '#2a2a4a',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(ctx) {
              return 'R$ ' + fmt(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(42,42,74,0.3)', display: false },
          ticks: { color: '#8888aa', font: { size: 10 }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(42,42,74,0.4)' },
          ticks: {
            color: '#8888aa',
            font: { size: 10 },
            callback: function(val) { return 'R$' + fmt(val); }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function renderRules(s) {
  const r = s.r;
  const stopFmt = fmtMoney(s.dailyStop);
  const capPct = r.carryoverCap !== null ? Math.round(r.carryoverCap * 100) + '%' : '—';

  let html = `
    <strong>🎯 Meta:</strong> ${fmtMoney(s.goal)} de lucro<br>
    <strong>⏱️ Prazo:</strong> ${r.maxDays > 0 ? r.maxDays + ' dias corridos' : 'Indeterminado'} — restam ${s.daysRemaining}<br>
    <strong>🛑 Stop Diário:</strong> ${Math.round(r.stopPct*100)}% (${stopFmt})<br>
    <strong>📊 Carryover:</strong> ${capPct} de ganho diário máximo contabilizado<br>
    <strong>📆 Dias mínimos:</strong> ${r.minDays} operados, ${r.minPositive} positivos<br>
  `;

  if (s.meetGoal) {
    html += `<br><span class="badge green">✅ META ATINGIDA! Lucro total: ${fmtMoney(s.totalResult)}</span>`;
  } else if (s.meetMinDays && s.meetMinPositive) {
    html += `<br><span class="badge gold">⚠️ Mínimos atingidos, falta bater a meta (${fmtMoney(s.goal - s.totalResult)})</span>`;
  } else if (s.daysRemaining !== '∞' && Number(s.daysRemaining) <= 0) {
    html += `<br><span class="badge red">❌ Prazo esgotado</span>`;
  }

  // Win rate insight
  if (s.daysOperated >= 5) {
    html += `<br><br><span class="highlight">📈 Win Rate: ${s.winRate.toFixed(1)}%</span>`;
    if (s.avgWin > 0 && s.avgLoss < 0) {
      const ratio = Math.abs(s.avgWin / s.avgLoss);
      html += ` · <span>Gain/Loss Ratio: ${ratio.toFixed(2)}</span>`;
    }
  }

  document.getElementById('rulesBox').innerHTML = html;
}

function syncForm() {
  document.getElementById('initialBalance').value = state.initialBalance;
  document.getElementById('phaseSelect').value = state.phase;
  document.getElementById('goalAmount').value = state.goal;
}

// ===== ACTIONS =====
function addTrade() {
  const dateInput = document.getElementById('tradeDate');
  const resultInput = document.getElementById('tradeResult');
  const notesInput = document.getElementById('tradeNotes');

  let date = dateInput.value;
  const result = Number(resultInput.value);
  const notes = notesInput.value.trim();

  if (!date) date = todayStr();

  if (isNaN(result) || result === 0) {
    showToast('Informe um resultado diferente de zero.', 'warning');
    return;
  }

  // Check daily stop
  const initial = Number(state.initialBalance) || 1000;
  const r = getPhaseRules(state.phase);
  const dailyStop = initial * r.stopPct;
  let stopMsg = '';
  if (result < 0 && Math.abs(result) > dailyStop) {
    stopMsg = ` ⚠️ Stop diário estourado! (limite: ${fmtMoney(dailyStop)})`;
  }

  state.trades.push({ date, result, notes: notes || '' });
  saveState();
  render();

  dateInput.value = todayStr();
  resultInput.value = '';
  notesInput.value = '';
  resultInput.focus();

  const msg = `Trade registrado!${stopMsg}`;
  showToast(msg, stopMsg ? 'warning' : 'success');
}

function deleteTrade(index) {
  if (index < 0 || index >= state.trades.length) return;
  state.trades.splice(index, 1);
  saveState();
  render();
  showToast('Trade removido.', 'warning');
}

function resetAll() {
  showConfirmModal(
    '⚠️ Resetar todos os dados?',
    'Todos os trades e configurações serão perdidos permanentemente.',
    () => {
      state = defaultState();
      saveState();
      render();
      showToast('Dados resetados.', 'warning');
    }
  );
}

function exportCSV() {
  const trades = state.trades;
  if (trades.length === 0) {
    showToast('Nenhum trade para exportar.', 'warning');
    return;
  }

  const s = calcStats();
  let csv = 'Data,Resultado,Anotacoes\n';
  const sorted = [...trades].sort((a,b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(t => {
    const date = formatDate(t.date);
    const result = (Number(t.result)||0).toFixed(2);
    const notes = (t.notes || '').replace(/"/g, '""');
    csv += `${date},"${result}","${notes}"\n`;
  });

  // Summary
  csv += '\nResumo\n';
  csv += `Saldo Inicial,${state.initialBalance.toFixed(2)}\n`;
  csv += `Resultado Total,${s.totalResult.toFixed(2)}\n`;
  csv += `Saldo Final,${s.currentBalance.toFixed(2)}\n`;
  csv += `Dias Operados,${s.daysOperated}\n`;
  csv += `Win Rate,${s.winRate.toFixed(1)}%\n`;
  csv += `Melhor Streak Win,${s.bestWinStreak}\n`;
  csv += `Melhor Streak Loss,${s.bestLossStreak}\n`;
  csv += `Fase,${state.phase}\n`;
  csv += `Meta,${state.goal.toFixed(2)}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `traderbook-${todayStr()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast('Relatório CSV exportado!', 'success');
}

// ===== CONFIG CHANGE =====
function onConfigChange() {
  state.initialBalance = Number(document.getElementById('initialBalance').value) || 1000;
  state.phase = document.getElementById('phaseSelect').value;
  state.goal = Number(document.getElementById('goalAmount').value) || 10000;
  saveState();
  render();
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter to add trade
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const active = document.activeElement;
    if (active && active.closest('.trade-form')) {
      e.preventDefault();
      addTrade();
    }
  }
  // Escape to focus result input
  if (e.key === 'Escape') {
    document.getElementById('tradeResult').focus();
  }
});

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('initialBalance').addEventListener('change', onConfigChange);
  document.getElementById('phaseSelect').addEventListener('change', onConfigChange);
  document.getElementById('goalAmount').addEventListener('change', onConfigChange);

  // Set today as default date
  document.getElementById('tradeDate').value = todayStr();

  // Focus result input on load
  document.getElementById('tradeResult').focus();

  render();
});

// ===== UTILITIES =====
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirmModal(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${escHtml(title)}</h3>
      <p>${escHtml(message)}</p>
      <div class="btn-group">
        <button class="btn btn-outline" id="modalCancel">Cancelar</button>
        <button class="btn btn-danger" id="modalConfirm">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modalConfirm').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
