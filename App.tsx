
import React, { useState, useEffect, useCallback } from 'react';
import { onSupabaseAuthStateChanged, supabaseSignOut, saveUserData, loadUserData, isSupabaseConfigured, deleteAccount } from './services/supabaseService';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import { ViewState, Exercise, Routine, ActiveWorkoutSession, SubRoutine, CompletedWorkout, BodyMetric, ExerciseLog, TrainingMode, UserProfile, ChatSession } from './types';
import { INITIAL_EXERCISES, INITIAL_ROUTINES } from './constants';
import ExerciseLibrary from './components/ExerciseLibrary';
import RoutineBuilder from './components/RoutineBuilder';
import Dashboard from './components/Dashboard';
import RestTimer from './components/RestTimer';
import PlateCalculator from './components/PlateCalculator';
import Settings from './components/Settings';
import AiCoach from './components/AiCoach';

const KEYS = {
  EXERCISES: 'titan_exercises',
  ROUTINES: 'titan_routines',
  HISTORY: 'titan_history',
  METRICS: 'titan_metrics',
  SESSION: 'titan_active_session',
  UNIT: 'titan_unit',
  USERNAME: 'titan_username',
  PROFILE: 'titan_profile',
  CHATS: 'titan_chats',
  THEME: 'titan_theme'
};

type Theme = 'light' | 'dark' | 'system';

function App() {
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEYS.THEME);
    return (saved as Theme) || 'dark';
  });
  
  const [timerTime, setTimerTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);
  const [sessionSummary, setSessionSummary] = useState<{volume: number, prs: string[]} | null>(null);

  const migrateExercises = (exList: any[]): Exercise[] => {
      return exList.map(ex => {
          if (ex.muscleGroups) return ex;
          const mg = (ex as any).muscleGroup || 'Otros';
          const groups = [mg];
          if (mg === 'Pecho' && ex.name.includes('Press')) groups.push('Tríceps', 'Hombros');
          if (mg === 'Espalda' && ex.name.includes('Dominada')) groups.push('Bíceps');
          return {
              ...ex,
              muscleGroups: groups,
              muscleGroup: undefined
          } as Exercise;
      });
  };

  const checkAndSetSession = (sessionData: ActiveWorkoutSession) => {
      const MAX_AGE = 12 * 60 * 60 * 1000;
      if (Date.now() - sessionData.startTime > MAX_AGE) {
          localStorage.removeItem(KEYS.SESSION);
          if (session) saveToCloud(KEYS.SESSION, null);
      } else {
          setActiveSession(sessionData);
          setResumeModalOpen(true);
      }
  };

  const loadLocalData = () => {
    try {
      const savedEx = localStorage.getItem(KEYS.EXERCISES);
      const savedRt = localStorage.getItem(KEYS.ROUTINES);
      const savedHis = localStorage.getItem(KEYS.HISTORY);
      const savedMet = localStorage.getItem(KEYS.METRICS);
      const savedChats = localStorage.getItem(KEYS.CHATS);
      const savedSession = localStorage.getItem(KEYS.SESSION);
      const savedUnit = localStorage.getItem(KEYS.UNIT);
      const savedProfile = localStorage.getItem(KEYS.PROFILE);
      
      if (savedEx) {
        let savedExercises = JSON.parse(savedEx);
        savedExercises = migrateExercises(savedExercises);
        const missingDefaults = INITIAL_EXERCISES.filter(def => !savedExercises.some((s: Exercise) => s.id === def.id));
        setExercises([...savedExercises, ...missingDefaults]);
      } else {
        setExercises(INITIAL_EXERCISES);
      }
      
      if (savedRt) {
        const parsedRoutines = JSON.parse(savedRt);
        setRoutines(parsedRoutines);
      }

      if (savedHis) setHistory(JSON.parse(savedHis));
      if (savedMet) setMetrics(JSON.parse(savedMet));
      if (savedChats) setChats(JSON.parse(savedChats));
      if (savedUnit) setWeightUnit(savedUnit as 'kg' | 'lbs');
      
      if (savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
      } else {
          setUserProfile({ name: 'Invitado', age: 25, gender: 'Male', height: 175, weight: 75, goal: 'Hipertrofia' as any, experienceLevel: 'Intermedio' });
      }
      
      if (savedSession) {
        checkAndSetSession(JSON.parse(savedSession));
      }
    } catch (e) {
      console.error("Error loading local data", e);
    }
  };

  const loadCloudData = async (userId: string) => {
    setIsLoadingData(true);
    try {
      // Add timeout to prevent infinite loading if Firestore is offline
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloud sync timeout')), 10000)
      );
      
      const data = await Promise.race([
        loadUserData(userId),
        timeoutPromise
      ]) as Record<string, any>;
      
      let profileFound = false;

      if (data) {
        if (data[KEYS.EXERCISES]) {
          let savedEx = data[KEYS.EXERCISES];
          savedEx = migrateExercises(savedEx);
          const missingDefaults = INITIAL_EXERCISES.filter(def => !savedEx.some((s: Exercise) => s.id === def.id));
          setExercises([...savedEx, ...missingDefaults]);
        }
        if (data[KEYS.ROUTINES]) setRoutines(data[KEYS.ROUTINES]);
        if (data[KEYS.HISTORY]) setHistory(data[KEYS.HISTORY]);
        if (data[KEYS.METRICS]) setMetrics(data[KEYS.METRICS]);
        if (data[KEYS.CHATS]) setChats(data[KEYS.CHATS]);
        if (data[KEYS.UNIT]) setWeightUnit(data[KEYS.UNIT]);
        if (data[KEYS.PROFILE]) {
          setUserProfile(data[KEYS.PROFILE]);
          profileFound = true;
        }
        if (data[KEYS.SESSION]) checkAndSetSession(data[KEYS.SESSION]);
      }
      if (!profileFound) setShowOnboarding(true);
    } catch (error) {
      console.error("Error fetching cloud data (falling back to local):", error);
      loadLocalData();
      // Still show onboarding if no profile
      const savedProfile = localStorage.getItem(KEYS.PROFILE);
      if (!savedProfile) setShowOnboarding(true);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    let authStateReceived = false;
    
    // Timeout fallback in case Supabase auth state change never fires
    const timeout = setTimeout(() => {
      if (!authStateReceived) {
        console.warn('Supabase auth state timeout - falling back to local mode');
        setSession(null);
        setAuthView(true);
        loadLocalData();
      }
    }, 5000); // 5 second timeout
    
    const unsubscribe = onSupabaseAuthStateChanged((user) => {
      authStateReceived = true;
      clearTimeout(timeout);
      
      if (user) {
        setSession(user);
        setAuthView(false);
        loadCloudData(user.id);
      } else {
        // Not logged in - show auth screen if Firebase is configured, else load local
        setSession(null);
        setAuthView(true); // Always show auth view when no user
        loadLocalData();
      }
    });
    
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const saveToCloud = useCallback(async (key: string, value: any) => {
     if (!session?.id) return;
     try {
         await saveUserData(session.id, key, value);
     } catch (err) {
         console.error(`Error saving ${key} to cloud`, err);
     }
  }, [session]);

  const saveData = (key: string, value: any) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (session) saveToCloud(key, value);
  };

  useEffect(() => { if (!isLoadingData) saveData(KEYS.EXERCISES, exercises); }, [exercises, session]);
  useEffect(() => { if (!isLoadingData) saveData(KEYS.ROUTINES, routines); }, [routines, session]);
  useEffect(() => { if (!isLoadingData) saveData(KEYS.HISTORY, history); }, [history, session]);
  useEffect(() => { if (!isLoadingData) saveData(KEYS.METRICS, metrics); }, [metrics, session]);
  useEffect(() => { if (!isLoadingData) saveData(KEYS.CHATS, chats); }, [chats, session]);
  useEffect(() => { if (!isLoadingData) saveData(KEYS.UNIT, weightUnit); }, [weightUnit, session]);
  useEffect(() => { if (!isLoadingData && userProfile) saveData(KEYS.PROFILE, userProfile); }, [userProfile, session]);
  
  // Theme effect - applies class to html element
  useEffect(() => {
    localStorage.setItem(KEYS.THEME, theme);
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('light', theme === 'light');
    }
  }, [theme]);
  
  useEffect(() => {
    if (isLoadingData) return;
    if (activeSession) {
      saveData(KEYS.SESSION, activeSession);
    } else {
      localStorage.removeItem(KEYS.SESSION);
      if(session) saveToCloud(KEYS.SESSION, null);
    }
  }, [activeSession, session]);

  const handleGuestMode = () => {
    setAuthView(false);
    loadLocalData();
  };

  const handleLogout = async () => {
    try {
      await supabaseSignOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setSession(null);
    setAuthView(true);
    setExercises(INITIAL_EXERCISES);
    setRoutines(INITIAL_ROUTINES);
    setHistory([]);
    setChats([]);
    setActiveSession(null);
    setUserProfile(null);
  };

  const handleDeleteAccount = async () => {
    if (!session?.id) return;
    const confirmed = window.confirm(
      "⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.\n\n" +
      "Se eliminarán permanentemente:\n" +
      "• Todos tus programas de entrenamiento\n" +
      "• Tu historial completo\n" +
      "• Tus métricas corporales\n" +
      "• Tus ejercicios personalizados\n" +
      "• Tu cuenta de usuario\n\n" +
      "¿Estás absolutamente seguro?"
    );
    if (!confirmed) return;
    
    const doubleConfirm = window.confirm(
      "¿Realmente quieres eliminar tu cuenta?\n\n" +
      "Escribe 'ELIMINAR' mentalmente y confirma si estás seguro."
    );
    if (!doubleConfirm) return;

    try {
      await deleteAccount(session.id);
      setSession(null);
      setAuthView(true);
      setExercises(INITIAL_EXERCISES);
      setRoutines(INITIAL_ROUTINES);
      setHistory([]);
      setMetrics([]);
      setChats([]);
      setActiveSession(null);
      setUserProfile(null);
      localStorage.clear();
      alert("✅ Tu cuenta y todos tus datos han sido eliminados.");
    } catch (error) {
      console.error('Error deleting account:', error);
      alert("Error al eliminar la cuenta. Por favor inténtalo de nuevo.");
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setMetrics([{ id: 'init_weight', date: Date.now(), weight: profile.weight, unit: 'kg' }]);
    setShowOnboarding(false);
  };

  const handleExportData = () => {
    const data = { version: '1.0', date: new Date().toISOString(), userProfile, weightUnit, exercises, routines, history, metrics, chats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `titan_fitness_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("Esto sobrescribirá tus datos actuales. ¿Estás seguro?")) {
            if (json.userProfile) setUserProfile(json.userProfile);
            if (json.weightUnit) setWeightUnit(json.weightUnit);
            if (json.exercises) setExercises(migrateExercises(json.exercises));
            if (json.routines) setRoutines(json.routines);
            if (json.history) setHistory(json.history);
            if (json.metrics) setMetrics(json.metrics);
            if (json.chats) setChats(json.chats);
            alert("Datos importados correctamente.");
        }
      } catch (err) { alert("Error al leer el archivo."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (window.confirm("⚠️ ADVERTENCIA: Esto borrará TODOS tus datos. ¿Estás seguro?")) {
        setExercises(INITIAL_EXERCISES);
        setRoutines(INITIAL_ROUTINES);
        setHistory([]);
        setMetrics([]);
        setChats([]);
        setActiveSession(null);
        setUserProfile(null);
        localStorage.clear();
        if(session) {
             saveToCloud(KEYS.EXERCISES, INITIAL_EXERCISES);
             saveToCloud(KEYS.ROUTINES, INITIAL_ROUTINES);
             saveToCloud(KEYS.HISTORY, []);
             saveToCloud(KEYS.METRICS, []);
             saveToCloud(KEYS.CHATS, []);
             saveToCloud(KEYS.PROFILE, null);
        }
        window.location.reload();
    }
  };

  const handleAddExercise = (ex: Exercise) => setExercises(prev => [...prev, ex]);
  const handleUpdateExercise = (updatedEx: Exercise) => setExercises(prev => prev.map(ex => ex.id === updatedEx.id ? updatedEx : ex));
  const handleDeleteExercise = (id: string) => setExercises(prev => prev.filter(ex => ex.id !== id));
  const handleAddRoutine = (rt: Routine) => { setRoutines(prev => [...prev, rt]); setCurrentView('routines'); };
  const handleUpdateRoutine = (updatedRt: Routine) => { setRoutines(prev => prev.map(r => r.id === updatedRt.id ? updatedRt : r)); setCurrentView('routines'); };
  const handleDeleteRoutine = (id: string) => { setRoutines(prev => prev.filter(r => r.id !== id)); };

  const handleAddMetric = (m: BodyMetric) => setMetrics(prev => [...prev, m]);
  const handleDeleteMetric = (id: string) => setMetrics(prev => prev.filter(m => m.id !== id));
  const handleDeleteWorkout = (id: string) => setHistory(prev => prev.filter(w => w.id !== id));
  const handleUpdateWorkout = (workout: CompletedWorkout) => setHistory(prev => prev.map(w => w.id === workout.id ? workout : w));

  // Chat Handlers
  const handleUpdateChats = (updatedChats: ChatSession[]) => {
      setChats(updatedChats);
  };

  const showRPEInfo = () => {
    setInfoModalContent({
        title: "RPE: Esfuerzo Percibido",
        content: (
            <div className="space-y-4 text-sm text-gray-300">
                <p>El <strong className="text-white">RPE (Rating of Perceived Exertion)</strong> es una escala del 1 al 10.</p>
                <div className="grid grid-cols-[30px_1fr] gap-2 items-center bg-black/30 p-2 rounded-lg">
                    <span className="font-bold text-primary">10</span><span>Fallo muscular real.</span>
                </div>
                <div className="grid grid-cols-[30px_1fr] gap-2 items-center bg-black/30 p-2 rounded-lg">
                    <span className="font-bold text-white">9</span><span>1 repetición en reserva (RIR 1).</span>
                </div>
            </div>
        )
    });
  };

  const showModeInfo = () => {
    setInfoModalContent({
        title: "Modos de Entrenamiento",
        content: (
            <div className="space-y-4 text-sm text-gray-300">
                <div className="bg-black/30 p-3 rounded-lg border-l-2 border-primary"><strong className="text-white block">Standard</strong><span>Series normales.</span></div>
                <div className="bg-black/30 p-3 rounded-lg border-l-2 border-red-500"><strong className="text-white block">Dropset</strong><span>Al fallo y reduce peso.</span></div>
            </div>
        )
    });
  };
  
  const getLastSessionStats = (exerciseId: string) => {
    for (let i = history.length - 1; i >= 0; i--) {
        const workout = history[i];
        if (!workout.details) continue;
        const log = workout.details.find(d => d.exerciseId === exerciseId);
        if (log) return log.sets;
    }
    return null;
  };

  const startWorkout = (routineName: string, subRoutine: SubRoutine) => {
    const initialLogs: ExerciseLog[] = subRoutine.exercises.map(ex => {
        const lastStats = getLastSessionStats(ex.exerciseId);
        return {
            routineExerciseId: ex.id,
            exerciseId: ex.exerciseId,
            sets: Array.from({ length: parseInt(ex.sets.split('-')[0]) || 3 }).map((_, i) => {
                let prevWeight = '';
                let prevReps = ex.reps.split('-')[0] || '';
                if (lastStats && lastStats[i]) {
                    prevWeight = lastStats[i].weight;
                    prevReps = lastStats[i].reps;
                }
                return { setNumber: i + 1, weight: prevWeight, reps: prevReps, rpe: '', completed: false, unit: weightUnit };
            })
        };
    });
    setActiveSession({ programName: routineName, subRoutine: subRoutine, startTime: Date.now(), logs: initialLogs });
    setCurrentView('active-workout');
  };

  const handleLogUpdate = (routineExerciseId: string, setIndex: number, field: 'weight' | 'reps' | 'completed' | 'rpe', value: any) => {
    if (!activeSession) return;
    if (field === 'completed' && value === true && navigator.vibrate) navigator.vibrate(50);
    setActiveSession(prev => {
      if (!prev) return null;
      const newLogs = prev.logs.map(log => {
        if (log.routineExerciseId === routineExerciseId) {
          const newSets = [...log.sets];
          newSets[setIndex] = { ...newSets[setIndex], [field]: value, unit: weightUnit };
          return { ...log, sets: newSets };
        }
        return log;
      });
      return { ...prev, logs: newLogs };
    });
  };

  const calculateVolumeAndPRs = () => {
    if (!activeSession) return { volume: 0, prs: [] };
    let totalVolume = 0;
    const newPRs: string[] = [];
    activeSession.logs.forEach(log => {
        const exercise = exercises.find(e => e.id === log.exerciseId);
        if (!exercise) return;
        const validSets = log.sets.filter(s => s.completed && !isNaN(parseFloat(s.weight)));
        if (validSets.length === 0) return;
        const currentMax = Math.max(...validSets.map(s => {
            const val = parseFloat(s.weight);
            return s.unit === 'lbs' ? val * 0.453592 : val;
        }));
        validSets.forEach(s => {
            const w = parseFloat(s.weight);
            const weightInKg = s.unit === 'lbs' ? w * 0.453592 : w;
            totalVolume += weightInKg; // Sum weight per set, not weight x reps
        });
        let historicalMax = 0;
        history.forEach(h => {
            if (!h.details) return;
            const hLog = h.details.find(d => d.exerciseId === log.exerciseId);
            if (hLog) {
                const maxSet = Math.max(...hLog.sets.filter(s => s.completed).map(s => {
                    const val = parseFloat(s.weight);
                    return s.unit === 'lbs' ? val * 0.453592 : val;
                }));
                if (maxSet > historicalMax) historicalMax = maxSet;
            }
        });
        if (currentMax > historicalMax && currentMax > 0) newPRs.push(exercise.name);
    });
    return { volume: totalVolume, prs: newPRs };
  };

  const handleRequestFinish = () => {
    const stats = calculateVolumeAndPRs();
    setSessionSummary(stats);
    setIsFinishModalOpen(true);
  };

  const confirmFinishWorkout = (save: boolean) => {
    if (!activeSession) return;
    if (save) {
      try {
        const endTime = Date.now();
        const durationMs = endTime - activeSession.startTime;
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
        const exercisesDone = activeSession.logs.filter(l => l.sets.some(s => s.completed)).length;
        const completed: CompletedWorkout = {
          id: `cw_${Date.now()}`,
          programName: activeSession.programName,
          subRoutineName: activeSession.subRoutine.name,
          date: Date.now(),
          durationMinutes: durationMinutes,
          exercisesCompleted: exercisesDone,
          details: activeSession.logs,
          totalVolume: sessionSummary?.volume || 0,
          prs: sessionSummary?.prs || []
        };
        setHistory(prev => [...prev, completed]);
      } catch (err) { console.error(err); }
    }
    setActiveSession(null);
    setCurrentView('dashboard');
    setIsFinishModalOpen(false);
    setSessionSummary(null);
  };
  
  const getModeColor = (mode: TrainingMode | undefined) => {
    switch (mode) {
        case TrainingMode.Dropset: return 'bg-red-500/20 text-red-400 border-red-500/30';
        case TrainingMode.SuperSet: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        case TrainingMode.RestPause: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case TrainingMode.Warmup: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        default: return 'bg-white/10 text-gray-300 border-white/10';
    }
  };

  const handleResumeConfirm = () => { setResumeModalOpen(false); setCurrentView('active-workout'); };
  const handleResumeDiscard = () => { setResumeModalOpen(false); setActiveSession(null); localStorage.removeItem(KEYS.SESSION); if (session) saveToCloud(KEYS.SESSION, null); };

  if (authView) return <Auth onLoginSuccess={(s) => setSession(s)} onGuestMode={handleGuestMode} />;
  if (isLoadingData) return (
    <div className="h-screen bg-[var(--color-bg)] flex items-center justify-center flex-col gap-5">
      <div className="relative">
        <span className="w-14 h-14 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin block"></span>
        <span className="absolute inset-0 w-14 h-14 border-[3px] border-transparent border-b-secondary/50 rounded-full animate-spin block" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></span>
      </div>
      <p className="text-primary font-bold text-sm tracking-wide animate-pulse">Sincronizando...</p>
    </div>
  );
  if (showOnboarding) return <Onboarding onComplete={handleProfileComplete} />;

  return (
    <div className="flex flex-col h-screen font-sans selection:bg-primary selection:text-dark overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden glass-panel px-4 py-3 border-b border-[var(--color-border)] flex justify-between items-center flex-none z-40 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-green-500 flex items-center justify-center shadow-glow-sm">
            <span className="text-dark font-black text-xs">TF</span>
          </div>
          <h1 className="text-lg font-black tracking-tight">
            <span className="text-[var(--color-text)]">TITAN</span>
            <span className="text-primary">FIT</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
            {activeSession && (
              <span className="badge badge-primary animate-pulseGlow text-[9px] px-2 py-1">
                EN CURSO
              </span>
            )}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="btn-icon w-9 h-9"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
            </button>
            <button onClick={() => setCurrentView('settings')} className="btn-icon w-9 h-9">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-[var(--color-border)] p-5 flex-none relative z-20">
          {/* Logo */}
          <div className="mb-8 cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-green-500 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
                <span className="text-dark font-black text-sm">TF</span>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none">
                  <span className="text-[var(--color-text)]">TITAN</span>
                  <span className="text-primary">FIT</span>
                </h1>
                <p className="text-[10px] text-[var(--color-text-subtle)] font-medium mt-0.5">TRACKER PRO</p>
              </div>
            </div>
          </div>
          
          {/* User Card */}
          <div className="mb-6 flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold border border-primary/20">
               {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
             </div>
             <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold truncate text-[var(--color-text)]">{userProfile?.name || 'Atleta'}</p>
                 <p className="text-[10px] text-[var(--color-text-muted)] truncate flex items-center gap-1.5">
                   {session ? (
                     <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Sincronizado</>
                   ) : (
                     <><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>Modo Local</>
                   )}
                 </p>
             </div>
             {session && (
               <button onClick={handleLogout} className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all" title="Cerrar sesión">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
             )}
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1.5 flex-1">
             <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon="📊" label="Dashboard" />
             <NavButton active={currentView === 'routines'} onClick={() => setCurrentView('routines')} icon="📋" label="Programas" />
             <NavButton active={currentView === 'exercises'} onClick={() => setCurrentView('exercises')} icon="🏋️" label="Ejercicios" />
             <NavButton active={currentView === 'coach'} onClick={() => setCurrentView('coach')} icon="🤖" label="Titan Coach" />
             {activeSession && (
               <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                 <NavButton active={currentView === 'active-workout'} onClick={() => setCurrentView('active-workout')} icon="⚡" label="En Curso" urgent />
               </div>
             )}
          </nav>
          
          {/* Bottom Actions */}
          <div className="mt-auto pt-4 border-t border-[var(--color-border)] space-y-1.5">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="nav-item w-full justify-start"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon="⚙️" label="Ajustes" />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-28 md:pb-8 relative bg-transparent">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {currentView === 'dashboard' && <Dashboard userName={userProfile?.name || 'Atleta'} history={history} metrics={metrics} exercises={exercises} onAddMetric={handleAddMetric} onDeleteMetric={handleDeleteMetric} onDeleteWorkout={handleDeleteWorkout} onUpdateWorkout={handleUpdateWorkout} unit={weightUnit} onUnitChange={setWeightUnit} />}
            {currentView === 'coach' && <AiCoach userProfile={userProfile} history={history} metrics={metrics} chats={chats} onUpdateChats={handleUpdateChats} />}
            {currentView === 'exercises' && <ExerciseLibrary exercises={exercises} onAddExercise={handleAddExercise} onUpdateExercise={handleUpdateExercise} onDeleteExercise={handleDeleteExercise} history={history} userId={session?.id} />}
            {currentView === 'routines' && <RoutineBuilder routines={routines} exercises={exercises} onAddRoutine={handleAddRoutine} onUpdateRoutine={handleUpdateRoutine} onDeleteRoutine={handleDeleteRoutine} onSelectSubRoutineForWorkout={startWorkout} />}
            {currentView === 'settings' && <Settings userName={userProfile?.name || 'Atleta'} onUpdateName={(name) => setUserProfile(prev => prev ? {...prev, name} : {name} as UserProfile)} onExportData={handleExportData} onImportData={handleImportData} onResetData={handleResetData} onDeleteAccount={handleDeleteAccount} isLoggedIn={!!session} theme={theme} onThemeChange={setTheme} />}
            {currentView === 'active-workout' && activeSession && (
                <div className="max-w-3xl mx-auto space-y-5">
                {/* Workout Header */}
                <div className="bg-[var(--color-surface)] backdrop-blur-xl p-5 rounded-2xl border border-[var(--color-border)] sticky top-0 z-30 shadow-lg space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                            <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight truncate">{activeSession.subRoutine.name}</h2>
                          </div>
                          <p className="text-[var(--color-text-muted)] text-sm truncate pl-5">{activeSession.programName}</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button onClick={() => setIsCalculatorOpen(true)} className="flex-1 md:flex-none btn-secondary px-4 py-3 flex justify-center items-center gap-2 group">
                            <span>🧮</span>
                            <span className="text-xs font-bold bg-[var(--color-primary-dim)] text-primary px-2 py-0.5 rounded">{weightUnit}</span>
                          </button>
                          <button onClick={handleRequestFinish} className="flex-1 md:flex-none btn-primary px-6 py-3 font-bold">
                            Terminar
                          </button>
                        </div>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-4">
                      <RestTimer timeLeft={timerTime} isActive={isTimerActive} onTimeChange={setTimerTime} onStateChange={setIsTimerActive} onComplete={() => {}} />
                    </div>
                </div>
                
                {/* Exercise Cards */}
                <div className="space-y-4 animate-stagger">
                    {activeSession.subRoutine.exercises.map((re, idx) => {
                    const ex = exercises.find(e => e.id === re.exerciseId);
                    const log = activeSession.logs.find(l => l.routineExerciseId === re.id);
                    const completedSets = log?.sets.filter(s => s.completed).length || 0;
                    const totalSets = log?.sets.length || 0;
                    return (
                        <div key={re.id} className="card p-5 rounded-2xl relative overflow-hidden">
                        {/* Progress indicator */}
                        <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
                          <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 pt-2 gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <span className="flex items-center justify-center w-9 h-9 flex-none rounded-xl bg-[var(--color-primary-dim)] text-primary font-bold text-sm border border-primary/20">{idx + 1}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-bold text-[var(--color-text)] leading-tight">{ex?.name}</h3>
                                  {re.mode && re.mode !== TrainingMode.Standard && (
                                    <button onClick={showModeInfo} className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 whitespace-nowrap transition-colors ${getModeColor(re.mode)}`}>
                                      {re.mode}
                                    </button>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-1.5">
                                  <span className="chip chip-active text-[11px] py-0.5 px-2">{re.sets} Ser.</span>
                                  <span className="chip text-[11px] py-0.5 px-2">{re.reps} Reps</span>
                                </div>
                              </div>
                            </div>
                            {ex?.mediaUrl && (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[var(--color-bg)] rounded-xl overflow-hidden border border-[var(--color-border)] shadow-md flex-none">
                                {ex.mediaType === 'video' ? <video src={ex.mediaUrl} className="w-full h-full object-cover" /> : <img src={ex.mediaUrl} alt="" className="w-full h-full object-cover" />}
                              </div>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="grid grid-cols-[32px_1fr_1fr_1fr_48px] gap-2 px-1 text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider text-center font-semibold items-center mb-3">
                              <span>#</span>
                              <span>{weightUnit}</span>
                              <span>Reps</span>
                              <span>RPE</span>
                              <span>✓</span>
                            </div>
                            {log?.sets.map((set, sIdx) => (
                            <div key={sIdx} className={`grid grid-cols-[32px_1fr_1fr_1fr_48px] gap-2 items-center p-2.5 rounded-xl transition-all duration-200 ${set.completed ? 'bg-[var(--color-primary-dim)] border border-primary/20' : 'bg-[var(--color-bg)] border border-[var(--color-border)]'}`}>
                                <span className={`text-xs text-center font-bold ${set.completed ? 'text-primary' : 'text-[var(--color-text-subtle)]'}`}>{sIdx + 1}</span>
                                <input type="number" placeholder="-" value={set.weight} onChange={(e) => handleLogUpdate(re.id, sIdx, 'weight', e.target.value)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 rounded-lg text-center text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                <input type="number" placeholder="-" value={set.reps} onChange={(e) => handleLogUpdate(re.id, sIdx, 'reps', e.target.value)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 rounded-lg text-center text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                <input type="number" placeholder="-" value={set.rpe || ''} onChange={(e) => handleLogUpdate(re.id, sIdx, 'rpe', e.target.value)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 rounded-lg text-center text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                <label className="flex items-center justify-center cursor-pointer">
                                  <input type="checkbox" checked={set.completed} onChange={(e) => handleLogUpdate(re.id, sIdx, 'completed', e.target.checked)} className="peer hidden" />
                                  <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${set.completed ? 'bg-primary border-primary shadow-glow-sm' : 'border-[var(--color-border-hover)] bg-[var(--color-surface)] hover:border-primary/50'}`}>
                                    <svg className={`w-5 h-5 text-dark transition-opacity ${set.completed ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                </label>
                            </div>))}
                        </div>
                        </div>
                    );})}
                </div>
                </div>
            )}
          </div>
        </main>
      </div>

      <PlateCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} unit={weightUnit} onUnitChange={setWeightUnit} />

      {/* Info Modal */}
      {infoModalContent && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[80] animate-fadeIn" onClick={() => setInfoModalContent(null)}>
            <div className="card w-full max-w-sm rounded-2xl p-6 shadow-xl animate-fadeInScale" onClick={e => e.stopPropagation()}>
                <button onClick={() => setInfoModalContent(null)} className="absolute top-4 right-4 btn-icon w-8 h-8">✕</button>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🎓</span>
                  <h3 className="text-lg font-bold text-[var(--color-text)]">{infoModalContent.title}</h3>
                </div>
                <div className="bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)]">{infoModalContent.content}</div>
            </div>
        </div>
      )}

      {/* Resume Session Modal */}
      {resumeModalOpen && activeSession && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[90] animate-fadeIn">
              <div className="card w-full max-w-sm rounded-2xl p-8 shadow-xl text-center animate-fadeInScale" onClick={e => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-secondary/15 text-secondary rounded-2xl flex items-center justify-center mx-auto mb-5 border border-secondary/30 shadow-lg">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">Sesión Detectada</h3>
                  <p className="text-[var(--color-text-muted)] text-sm mb-6">Dejaste "<span className="text-[var(--color-text)] font-medium">{activeSession.programName}</span>" a medias. ¿Quieres continuarlo?</p>
                  <div className="flex gap-3">
                    <button onClick={handleResumeDiscard} className="flex-1 btn-secondary py-3 font-semibold">Descartar</button>
                    <button onClick={handleResumeConfirm} className="flex-1 btn-primary py-3 font-bold">Continuar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Finish Workout Modal */}
      {isFinishModalOpen && activeSession && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="card w-full max-w-sm rounded-2xl p-8 shadow-xl animate-fadeInScale" onClick={e => e.stopPropagation()}>
             <div className="text-center mb-6">
               <div className="w-16 h-16 bg-[var(--color-primary-dim)] text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-glow">
                 <span className="text-3xl">💪</span>
               </div>
               <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">¡Gran trabajo!</h3>
               <p className="text-[var(--color-text-muted)] text-sm">Resumen de tu entrenamiento</p>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-6">
               <div className="stat-card text-center">
                 <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-1 font-semibold">Volumen Total</p>
                 <p className="text-2xl font-black text-[var(--color-text)]">
                   {sessionSummary ? (sessionSummary.volume / (weightUnit === 'kg' ? 1 : 0.453592)).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0}
                   <span className="text-xs ml-1 font-normal text-[var(--color-text-muted)]">{weightUnit}</span>
                 </p>
               </div>
               <div className="stat-card text-center">
                 <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-1 font-semibold">Duración</p>
                 <p className="text-2xl font-black text-[var(--color-text)]">
                   {Math.max(1, Math.round((Date.now() - activeSession.startTime) / 60000))}
                   <span className="text-xs ml-1 font-normal text-[var(--color-text-muted)]">min</span>
                 </p>
               </div>
             </div>
             {sessionSummary?.prs && sessionSummary.prs.length > 0 && (
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6">
                 <p className="text-amber-400 text-xs font-bold flex items-center gap-2">🏆 ¡Nuevos PRs! {sessionSummary.prs.join(', ')}</p>
               </div>
             )}
             <div className="flex flex-col gap-2">
               <button onClick={() => confirmFinishWorkout(true)} className="w-full btn-primary font-bold py-4">
                 Guardar Entrenamiento
               </button>
               <button onClick={() => confirmFinishWorkout(false)} className="w-full text-red-400 hover:text-red-300 font-medium py-2 text-sm transition-colors">
                 Descartar
               </button>
               <button onClick={() => setIsFinishModalOpen(false)} className="w-full text-[var(--color-text-muted)] py-2 hover:text-[var(--color-text)] transition-colors text-sm">
                 Volver al entrenamiento
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-[var(--color-border)] flex justify-around items-center px-2 py-2 z-50 safe-area-pb">
        <MobileNavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon="📊" label="Home" />
        <MobileNavButton active={currentView === 'routines'} onClick={() => setCurrentView('routines')} icon="📋" label="Rutinas" />
        <MobileNavButton active={currentView === 'coach'} onClick={() => setCurrentView('coach')} icon="🤖" label="Coach" />
        <MobileNavButton active={currentView === 'exercises'} onClick={() => setCurrentView('exercises')} icon="🏋️" label="Ejercicios" />
        {activeSession && <MobileNavButton active={currentView === 'active-workout'} onClick={() => setCurrentView('active-workout')} icon="⚡" label="Activo" urgent />}
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label, urgent }: any) => (
  <button 
    onClick={onClick} 
    className={`nav-item w-full ${active ? (urgent ? 'nav-item-urgent' : 'active') : ''}`}
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label, urgent }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
      active 
        ? urgent 
          ? 'text-dark bg-primary shadow-glow-sm' 
          : 'text-primary bg-[var(--color-primary-dim)]' 
        : 'text-[var(--color-text-muted)]'
    }`}
  >
    <span className="text-lg mb-0.5">{icon}</span>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
