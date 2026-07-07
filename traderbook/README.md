# 📊 TraderBook

App de controle de mesa de trading — Simulador → Fase 1 → Conta Real.

## Funcionalidades

- **Tracker de dias** — registre cada trade com data, resultado e anotações
- **Stop diário automático** — 33% (Simulador/Fase1) ou 20% (Conta Real)
- **Regra dos 50%** — carryover com cap de ganho diário
- **Dashboard** — saldo, progresso, dias operados, carryover acumulado
- **3 fases** — alterna entre Simulador, Fase 1 e Conta Real com regras diferentes
- **Persistência local** — dados salvos no navegador (localStorage)
- **Dark mode** — visual @eduardu.ads

## Como usar

Abra `index.html` no navegador. Ou sirva localmente:

```bash
npx serve traderbook/
```

## Roadmap

- [ ] Backend Node/Express com SQLite
- [ ] Múltiplos traders/contas
- [ ] Relatório mensal exportável
- [ ] Autenticação
- [ ] Dashboard com gráficos
