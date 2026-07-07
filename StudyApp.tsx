import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Menu, RefreshCcw, Signal, Sparkles, User, X } from 'lucide-react';
import { studyQuestions as localQuestions } from './data/studySeed';
import { shellStyles, navItems } from './components/study/config';
import { SidebarContent } from './components/study/views';
import { DashboardView, EssaysView, PlanView, ProgressView, QuestionsView } from './components/study/views';
import { MiniStat } from './components/study/ui';
import { studyService } from './services/studyService';
import { StudyDashboardData, StudyEssayDidacticResponse, StudyEssayDraft, StudyEssayEntry, StudyEssayPrompt, StudyQuestionItem, StudyQuestionSessionState, StudyViewKey } from './types';

const appShell = shellStyles.app;
const panel = shellStyles.panel;
const mobileSafePadding = shellStyles.pagePadding;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<StudyViewKey>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [questionBank, setQuestionBank] = useState<StudyQuestionItem[]>(localQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState<StudyQuestionItem | undefined>(localQuestions[0]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastRecordedQuestionId, setLastRecordedQuestionId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<StudyDashboardData | null>(null);
  const [questionSession, setQuestionSession] = useState<StudyQuestionSessionState | null>(null);
  const [essayPrompts, setEssayPrompts] = useState<StudyEssayPrompt[]>([]);
  const [essayHistory, setEssayHistory] = useState<StudyEssayEntry[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [essayDraft, setEssayDraft] = useState('');
  const [draftMeta, setDraftMeta] = useState<StudyEssayDraft | null>(null);
  const [didacticResponse, setDidacticResponse] = useState<StudyEssayDidacticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEssay, setSavingEssay] = useState(false);
  const [generatingDidactic, setGeneratingDidactic] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const loadedQuestions = await studyService.getQuestionBank();
      const data = await studyService.getDashboardData(loadedQuestions);
      const session = await studyService.getQuestionSession(loadedQuestions, data.attempts);
      const prompts = studyService.getEssayPrompts();
      const history = await studyService.getEssayHistory();
      const savedDraft = studyService.getEssayDraft();

      setQuestionBank(loadedQuestions);
      setQuestionSession(session);
      setSelectedQuestion(loadedQuestions.find((item) => item.id === session.currentQuestionId) || loadedQuestions[0] || localQuestions[0]);
      setDashboardData(data);
      setEssayPrompts(prompts);
      setSelectedPromptId(savedDraft?.promptId || prompts[0]?.id || '');
      setEssayDraft(savedDraft?.answer || '');
      setDraftMeta(savedDraft);
      setEssayHistory(history);
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedPromptId) return;
    const timer = window.setTimeout(async () => {
      const nextDraft = await studyService.saveEssayDraft(selectedPromptId, essayDraft);
      setDraftMeta(nextDraft);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [essayDraft, selectedPromptId]);

  const overallProgress = useMemo(() => {
    if (!dashboardData || !dashboardData.subjectProgress.length) return 0;
    return Math.round(dashboardData.subjectProgress.reduce((sum, item) => sum + item.progress, 0) / dashboardData.subjectProgress.length);
  }, [dashboardData]);

  const averageAccuracy = dashboardData?.summary.accuracy ?? 0;
  const totalReviews = dashboardData?.summary.pendingReviews ?? 0;
  const recommendation = dashboardData?.recommendation;
  const topWeakness = dashboardData?.topicPerformance?.[0];
  const reviewDueNow = dashboardData?.reviewQueue.filter((item) => item.status !== 'scheduled') || [];
  const currentViewLabel = navItems.find((item) => item.key === currentView)?.label || 'Dashboard';

  const selectedPrompt = useMemo(() => essayPrompts.find((item) => item.id === selectedPromptId) || essayPrompts[0], [essayPrompts, selectedPromptId]);

  useEffect(() => {
    if (!selectedPrompt && essayPrompts[0]) setSelectedPromptId(essayPrompts[0].id);
  }, [selectedPrompt, essayPrompts]);

  useEffect(() => {
    const historyMatch = essayHistory.find((item) => item.promptId === selectedPromptId && item.didacticResponse);
    setDidacticResponse(historyMatch?.didacticResponse || null);
  }, [essayHistory, selectedPromptId]);

  const resetQuestionState = (nextQuestion?: StudyQuestionItem) => {
    setSelectedQuestion(nextQuestion);
    setSelectedOption(null);
    setShowAnswer(false);
  };

  const openQuestionById = async (questionId: number) => {
    if (!dashboardData) return;
    const nextSession = await studyService.setCurrentQuestion(questionId, questionBank, dashboardData.attempts);
    setQuestionSession(nextSession);
    const nextQuestion = questionBank.find((item) => item.id === questionId);
    if (nextQuestion) resetQuestionState(nextQuestion);
  };

  const goToQuestionOffset = async (offset: number) => {
    if (!questionSession?.queueQuestionIds.length || !selectedQuestion) return;
    const currentIndex = Math.max(questionSession.queueQuestionIds.indexOf(selectedQuestion.id), 0);
    const nextQuestionId = questionSession.queueQuestionIds[(currentIndex + offset + questionSession.queueQuestionIds.length) % questionSession.queueQuestionIds.length];
    if (nextQuestionId) await openQuestionById(nextQuestionId);
  };

  const goToRecommendedQuestion = async () => {
    if (!questionSession?.currentQuestionId) return;
    const nextQuestion = questionBank.find((item) => item.id === questionSession.currentQuestionId);
    if (nextQuestion) resetQuestionState(nextQuestion);
  };

  const saveAttempt = async () => {
    if (!selectedQuestion || selectedOption === null || showAnswer || saving) return;
    setSaving(true);
    const result = await studyService.recordAttempt({
      question_id: selectedQuestion.id,
      subject: selectedQuestion.subject,
      topic: selectedQuestion.topic,
      selected_option: selectedOption,
      is_correct: selectedQuestion.correctIndex === selectedOption,
    }, questionBank);

    setDashboardData(result.dashboardData);
    setQuestionSession(result.questionSession);
    setLastRecordedQuestionId(selectedQuestion.id);
    setShowAnswer(true);
    setSaving(false);
  };

  const saveEssay = async () => {
    if (!selectedPrompt || !essayDraft.trim() || savingEssay) return;
    setSavingEssay(true);
    const history = await studyService.saveEssayEntry({
      promptId: selectedPrompt.id,
      title: selectedPrompt.title,
      subject: selectedPrompt.subject,
      topic: selectedPrompt.topic,
      answer: essayDraft.trim(),
      status: 'finished',
      didacticResponse: didacticResponse || undefined,
    });
    setEssayHistory(history);
    setEssayDraft('');
    setDraftMeta(null);
    setSavingEssay(false);
  };

  const generateDidacticEssay = async () => {
    if (!selectedPrompt || generatingDidactic) return;
    setGeneratingDidactic(true);
    const generated = await studyService.generateDidacticEssay(selectedPrompt.id);
    setDidacticResponse(generated);
    setGeneratingDidactic(false);
  };

  const clearEssayDraft = () => {
    setEssayDraft('');
    setDraftMeta(null);
    void studyService.saveEssayDraft(selectedPromptId, '');
  };

  const renderDidacticResponse = (response: StudyEssayDidacticResponse) => (
    <div className="mt-5 space-y-4 rounded-3xl border border-cyan-400/20 bg-cyan-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cyan-200">Resposta-modelo explicada</p>
          <p className="text-xs text-slate-400">Didática passo a passo para estudar, não para copiar. Fonte: {response.provider === 'gemini' ? 'IA' : 'fallback local'}.</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{new Date(response.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {response.steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h3 className="font-medium text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{step.explanation}</p>
            <ul className="mt-3 space-y-2 text-sm text-cyan-100">{step.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <h3 className="font-medium text-white">Resposta-modelo</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{response.modelAnswer}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat label="Tese" value="definida" />
        <MiniStat label="Argumentos" value={`${response.arguments.length}`} />
        <MiniStat label="Passos" value={`${response.steps.length}`} />
      </div>
    </div>
  );

  return (
    <div className={appShell}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.26),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.12),_transparent_32%)]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/70 p-6 lg:flex lg:flex-col">
          <SidebarContent currentView={currentView} onChangeView={setCurrentView} source={dashboardData?.source ?? 'local'} recommendation={recommendation?.subject || 'Aguardando histórico'} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl">
            <div className={`flex items-start justify-between gap-4 py-4 ${mobileSafePadding}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => setMenuOpen(true)} className="rounded-2xl border border-white/10 p-2 text-slate-200 lg:hidden"><Menu size={20} /></button>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500 sm:text-sm">Agente mentor de concurso</p>
                  <h1 className="text-base font-semibold text-white sm:text-lg">MVP navegável do aluno Eduardo</h1>
                  <p className="mt-1 text-xs text-slate-500 lg:hidden">{currentViewLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`hidden items-center gap-2 rounded-2xl border px-3 py-2 text-sm md:flex ${dashboardData?.source === 'supabase' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-200'}`}><Signal size={16} /> {dashboardData?.source === 'supabase' ? 'Supabase online' : 'Fallback local'}</div>
                <button className="rounded-2xl border border-white/10 p-3 text-slate-300"><Bell size={18} /></button>
                <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200"><User size={18} /></div>
                  <div><p className="text-sm font-medium text-white">Eduardo K.</p><p className="text-xs text-slate-400">Edital PM • 127 dias</p></div>
                </div>
              </div>
            </div>
          </header>

          <main className={`flex-1 py-6 pb-28 lg:pb-6 ${mobileSafePadding}`}>
            {loading || !dashboardData || !recommendation ? (
              <div className={`${panel} flex items-center gap-3 p-6 text-slate-300`}><RefreshCcw size={18} className="animate-spin" /> Carregando progresso...</div>
            ) : (
              <>
                {currentView === 'dashboard' && <DashboardView dashboardData={dashboardData} overallProgress={overallProgress} averageAccuracy={averageAccuracy} totalReviews={totalReviews} essayHistoryLength={essayHistory.length} recommendation={recommendation} topWeakness={topWeakness} reviewDueNowCount={reviewDueNow.length} onChangeView={setCurrentView} />}
                {currentView === 'questoes' && <QuestionsView questionSession={questionSession} selectedQuestion={selectedQuestion} selectedOption={selectedOption} showAnswer={showAnswer} saving={saving} lastRecordedQuestionId={lastRecordedQuestionId} source={dashboardData.source} onSelectOption={setSelectedOption} onSaveAttempt={saveAttempt} onResetAnswer={() => { setSelectedOption(null); setShowAnswer(false); }} onPrevQuestion={() => { void goToQuestionOffset(-1); }} onNextQuestion={() => { void goToQuestionOffset(1); }} onResumeRecommendedQuestion={() => { void goToRecommendedQuestion(); }} />}
                {currentView === 'plano' && <PlanView dashboardData={dashboardData} essayHistoryLength={essayHistory.length} />}
                {currentView === 'evolucao' && <ProgressView dashboardData={dashboardData} reviewDueNowCount={reviewDueNow.length} />}
                {currentView === 'discursivas' && <EssaysView essayPrompts={essayPrompts} selectedPromptId={selectedPromptId} selectedPrompt={selectedPrompt} essayDraft={essayDraft} draftMeta={draftMeta} savingEssay={savingEssay} generatingDidactic={generatingDidactic} didacticResponse={didacticResponse} essayHistory={essayHistory} onPromptChange={setSelectedPromptId} onEssayDraftChange={setEssayDraft} onSaveEssay={saveEssay} onGenerateDidacticEssay={generateDidacticEssay} onClearDraft={clearEssayDraft} renderDidacticResponse={renderDidacticResponse} />}
              </>
            )}
          </main>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-80 border-r border-white/10 bg-slate-950 p-5 sm:p-6">
            <div className="mb-6 flex items-center justify-between"><div><p className="text-sm text-slate-400">Mentor</p><h2 className="text-xl font-semibold text-white">Concurso App</h2></div><button onClick={() => setMenuOpen(false)} className="rounded-2xl border border-white/10 p-2 text-slate-200"><X size={18} /></button></div>
            <SidebarContent currentView={currentView} onChangeView={(view) => { setCurrentView(view); setMenuOpen(false); }} source={dashboardData?.source ?? 'local'} recommendation={recommendation?.subject || 'Aguardando histórico'} />
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.key;
            return (
              <button key={item.key} onClick={() => setCurrentView(item.key)} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${active ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                <Icon size={18} />
                <span className="truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {currentView === 'questoes' && selectedQuestion && (
        <div className="fixed inset-x-0 bottom-[84px] z-30 px-4 sm:hidden">
          <div className="rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button onClick={saveAttempt} disabled={selectedOption === null || saving} className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Salvando...' : 'Corrigir'}</button>
              <button onClick={() => { setSelectedOption(null); setShowAnswer(false); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200">Limpar</button>
              {showAnswer && <button onClick={() => { void goToRecommendedQuestion(); }} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white">Próxima</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
