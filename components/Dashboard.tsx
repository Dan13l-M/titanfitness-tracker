import React, { useState } from 'react';
import { CompletedWorkout, BodyMetric, Exercise, ExerciseLog, SetLog } from '../types';

interface DashboardProps {
  userName: string;
  history: CompletedWorkout[];
  metrics: BodyMetric[];
  exercises: Exercise[];
  onAddMetric: (metric: BodyMetric) => void;
  onDeleteMetric: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onUpdateWorkout: (workout: CompletedWorkout) => void;
  unit: 'kg' | 'lbs';
  onUnitChange: (u: 'kg' | 'lbs') => void;
}

const SimpleLineChart = ({ data, unit }: { data: { value: number; date: number; originalUnit: 'kg' | 'lbs' }[], unit: 'kg' | 'lbs' }) => {
  if (data.length < 2) return null;

  // Normalize data for the chart based on current unit preference
  const normalizedData = data.map(d => {
    let val = d.value;
    if (unit === 'kg' && d.originalUnit === 'lbs') val = d.value * 0.453592;
    if (unit === 'lbs' && d.originalUnit === 'kg') val = d.value * 2.20462;
    return { ...d, value: val };
  });

  const sortedData = [...normalizedData].sort((a, b) => a.date - b.date);
  const values = sortedData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  // Add some padding to Y axis
  const paddingY = (maxVal - minVal) * 0.2 || 2;
  const yMin = minVal - paddingY;
  const yMax = maxVal + paddingY;

  const width = 100;
  const height = 40;

  const points = sortedData.map((d, i) => {
    const x = (i / (sortedData.length - 1)) * width;
    const y = height - ((d.value - yMin) / (yMax - yMin)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-40 relative mt-6 group">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
         {/* Glow Filter */}
         <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ccf381" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ccf381" stopOpacity="0" />
            </linearGradient>
         </defs>
         
         <polygon 
            points={`${0},${height} ${points} ${width},${height}`} 
            fill="url(#lineGradient)" 
         />
         
         <polyline 
            points={points} 
            fill="none" 
            stroke="#ccf381" 
            strokeWidth="1.5" 
            filter="url(#glow)"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_5px_rgba(204,243,129,0.5)]"
         />

         {sortedData.map((d, i) => {
            const x = (i / (sortedData.length - 1)) * width;
            const y = height - ((d.value - yMin) / (yMax - yMin)) * height;
            return (
                <circle 
                    key={i} 
                    cx={x} 
                    cy={y} 
                    r="2" 
                    fill="#1e293b" 
                    stroke="#ccf381" 
                    strokeWidth="0.8" 
                    vectorEffect="non-scaling-stroke"
                    className="hover:r-4 transition-all duration-300 cursor-pointer"
                >
                  <title>{d.value.toFixed(1)} {unit}</title>
                </circle>
            );
         })}
       </svg>
       
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-between items-end pb-2">
            <span className="text-[9px] text-gray-500 font-mono">{new Date(sortedData[0].date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
            <span className="text-[9px] text-gray-500 font-mono">{new Date(sortedData[sortedData.length-1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
       </div>
    </div>
  );
};

const VolumeBarChart = ({ volumeData, unit }: { volumeData: Record<string, number>, unit: 'kg'|'lbs' }) => {
    const entries = Object.entries(volumeData).sort((a, b) => b[1] - a[1]); // Sort by volume desc
    if (entries.length === 0) return (
        <div className="flex flex-col items-center justify-center h-40 text-muted text-xs border border-dashed border-theme rounded-xl gap-2">
            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <p>Sin datos de volumen</p>
            <p className="text-[10px]">Completa entrenos para ver estadísticas</p>
        </div>
    );

    const maxVol = Math.max(...entries.map(e => e[1]));

    return (
        <div className="space-y-3">
            {entries.slice(0, 5).map(([muscle, vol]) => {
                const percentage = (vol / maxVol) * 100;
                // Convert stored volume (often normalized) to display unit if needed, 
                // assuming calculation logic stored it in KG.
                const displayVol = unit === 'lbs' ? vol * 2.20462 : vol;

                return (
                    <div key={muscle} className="group">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold">{muscle}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{displayVol.toLocaleString(undefined, {maximumFractionDigits:0})} {unit}</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-secondary to-primary rounded-full relative group-hover:shadow-[0_0_10px_rgba(204,243,129,0.3)] transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ userName, history, metrics, exercises, onAddMetric, onDeleteMetric, onDeleteWorkout, onUpdateWorkout, unit, onUnitChange }) => {
  const [weightInput, setWeightInput] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<CompletedWorkout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<ExerciseLog[]>([]);

  // Stats Logic
  const totalWorkouts = history.length;
  
  const getWeeklyConsistency = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dateStr = date.toDateString();
      const hasWorkout = history.some(h => new Date(h.date).toDateString() === dateStr);
      return { day: days[date.getDay()], hasWorkout, date: date.getDate() };
    });
  };

  const weeklyData = getWeeklyConsistency();
  const workoutsThisWeek = weeklyData.filter(d => d.hasWorkout).length;

  // Calculate Volume per Muscle Group (Total All Time)
  const calculateMuscleVolume = () => {
      const muscleVol: Record<string, number> = {};
      
      history.forEach(workout => {
          // If detailed logs exist
          if(workout.details) {
              workout.details.forEach(log => {
                  const exercise = exercises.find(e => e.id === log.exerciseId);
                  if (exercise) {
                      // Calculate volume for this exercise in this workout
                      const exVol = log.sets.reduce((acc, set) => {
                          if (!set.completed) return acc;
                          const w = parseFloat(set.weight);
                          if(isNaN(w)) return acc;
                          
                          // Normalize to KG for storage/calculation consistency
                          const weightKg = set.unit === 'lbs' ? w * 0.453592 : w;
                          return acc + weightKg; // Sum weight per set only
                      }, 0);
                      
                      const group = exercise.muscleGroups[0] || 'Otros';
                      muscleVol[group] = (muscleVol[group] || 0) + exVol;
                  }
              });
          }
      });
      return muscleVol;
  };

  const muscleVolumeData = calculateMuscleVolume();

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput) return;
    onAddMetric({
      id: `bm_${Date.now()}`,
      date: Date.now(),
      weight: parseFloat(weightInput),
      unit: unit // Save with current unit
    });
    setWeightInput('');
  };

  // Sort metrics for chart/list
  const sortedMetrics = [...metrics].sort((a, b) => b.date - a.date);
  
  // Helpers to display weight in current unit preferences
  const formatWeight = (val: number, originalUnit: 'kg' | 'lbs') => {
    if (unit === originalUnit) return val.toFixed(1);
    if (unit === 'kg') return (val * 0.453592).toFixed(1);
    return (val * 2.20462).toFixed(1);
  };

  const currentWeight = sortedMetrics.length > 0 
    ? formatWeight(sortedMetrics[0].weight, sortedMetrics[0].unit) 
    : '-';
    
  const startWeight = sortedMetrics.length > 0 
    ? formatWeight(sortedMetrics[sortedMetrics.length - 1].weight, sortedMetrics[sortedMetrics.length - 1].unit) 
    : '-';
  
  const chartData = metrics.map(m => ({ value: m.weight, date: m.date, originalUnit: m.unit }));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm font-medium mb-1">Bienvenido de nuevo</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="text-[var(--color-text)]">Hola, </span>
            <span className="gradient-text">{userName}</span>
          </h2>
        </div>
        <div className="flex gap-3 items-center">
            {/* Unit Toggle */}
            <div className="bg-[var(--color-surface)] p-1 rounded-xl flex text-xs font-bold border border-[var(--color-border)]">
                <button 
                    onClick={() => onUnitChange('kg')} 
                    className={`px-4 py-2 rounded-lg transition-all ${unit === 'kg' ? 'bg-primary text-dark shadow-glow-sm' : 'text-[var(--color-text-muted)] hover:text-primary'}`}
                >KG</button>
                <button 
                    onClick={() => onUnitChange('lbs')} 
                    className={`px-4 py-2 rounded-lg transition-all ${unit === 'lbs' ? 'bg-primary text-dark shadow-glow-sm' : 'text-[var(--color-text-muted)] hover:text-primary'}`}
                >LBS</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Stats Block */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 gap-4">
             <div className="stat-card group cursor-default">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--color-text-muted)] text-[11px] font-semibold uppercase tracking-wider mb-1">Total Sesiones</p>
                    <p className="text-4xl font-black text-[var(--color-text)]">{totalWorkouts}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:shadow-glow-sm transition-shadow">
                    <span className="text-xl">💪</span>
                  </div>
                </div>
             </div>
             <div className="stat-card group cursor-default">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--color-text-muted)] text-[11px] font-semibold uppercase tracking-wider mb-1">Esta Semana</p>
                    <p className="text-4xl font-black text-primary">{workoutsThisWeek}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/20 group-hover:shadow-glow-sm transition-shadow">
                    <span className="text-xl">🔥</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             {/* Consistency Card */}
             <div className="card p-5 rounded-2xl">
                <h3 className="text-base font-bold mb-5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center">
                    <span className="text-sm">📅</span>
                  </div>
                  Consistencia Semanal
                </h3>
                <div className="flex justify-between items-center">
                {weeklyData.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${d.hasWorkout ? 'bg-primary/15 border-primary text-primary shadow-glow-sm' : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-subtle)]'}`}>
                        {d.date}
                    </div>
                    <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase">{d.day.charAt(0)}</span>
                    </div>
                ))}
                </div>
            </div>

            {/* Volume per Muscle Group */}
            <div className="card p-5 rounded-2xl">
                <h3 className="text-base font-bold mb-5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                    <span className="text-sm">📊</span>
                  </div>
                  Volumen por Músculo
                </h3>
                <VolumeBarChart volumeData={muscleVolumeData} unit={unit} />
            </div>
          </div>

          {/* Recent History */}
          <div className="card p-5 rounded-2xl">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              Historial Reciente
            </h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="empty-state py-8">
                  <span className="text-4xl mb-3 opacity-50">🏋️</span>
                  <p className="text-[var(--color-text-muted)] text-sm">Aún no tienes entrenamientos</p>
                  <p className="text-[var(--color-text-subtle)] text-xs mt-1">Completa tu primera sesión para verla aquí</p>
                </div>
              ) : history.slice().reverse().slice(0, 5).map(workout => (
                <div 
                  key={workout.id} 
                  onClick={() => {
                    setSelectedWorkout(workout);
                    setEditedDetails(workout.details ? [...workout.details.map(d => ({...d, sets: d.sets.map(s => ({...s}))}))] : []);
                    setIsEditing(false);
                  }}
                  className="flex items-center justify-between p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] hover:border-primary/50 transition-all group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--color-text)] group-hover:text-primary transition truncate">{workout.subRoutineName}</p>
                        {workout.prs && workout.prs.length > 0 && (
                            <span className="badge badge-warning text-[9px]">🏆 PR</span>
                        )}
                    </div>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{new Date(workout.date).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="block text-sm font-bold text-[var(--color-text)]">{workout.durationMinutes} min</span>
                      <span className="block text-[10px] text-[var(--color-text-muted)] font-medium">
                          {workout.totalVolume ? `${(workout.totalVolume / (unit === 'kg' ? 1 : 2.2)).toFixed(0)} ${unit}` : `${workout.exercisesCompleted} Ej.`}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm(`¿Eliminar sesión "${workout.subRoutineName}"? Esta acción no se puede deshacer.`)) {
                          onDeleteWorkout(workout.id);
                        }
                      }}
                      className="btn-icon w-8 h-8 opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Weight Tracker */}
        <div className="space-y-5">
           <div className="card p-5 rounded-2xl flex flex-col">
             <h3 className="text-base font-bold mb-4 flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
                 <span className="text-sm">⚖️</span>
               </div>
               Peso Corporal
             </h3>
             
             {/* Chart Component */}
             <SimpleLineChart data={chartData} unit={unit} />

             <div className="grid grid-cols-2 gap-3 my-5">
                <div className="stat-card text-center py-4">
                   <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider font-semibold">Actual</p>
                   <p className="text-2xl font-black text-[var(--color-text)]">{currentWeight} <span className="text-xs font-normal text-[var(--color-text-muted)]">{unit}</span></p>
                </div>
                <div className="stat-card text-center py-4">
                   <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider font-semibold">Inicio</p>
                   <p className="text-2xl font-bold text-[var(--color-text-muted)]">{startWeight} <span className="text-xs font-normal text-[var(--color-text-subtle)]">{unit}</span></p>
                </div>
             </div>

             <form onSubmit={handleAddWeight} className="flex gap-2 mb-5">
               <input 
                 type="number" 
                 step="0.1"
                 placeholder={`Registrar peso...`} 
                 className="input-modern flex-1 p-3 rounded-xl text-sm"
                 value={weightInput}
                 onChange={e => setWeightInput(e.target.value)}
               />
               <button type="submit" className="btn-primary px-5 rounded-xl font-bold text-lg">+</button>
             </form>

             <div className="flex-1 overflow-y-auto space-y-2 max-h-52 custom-scrollbar pr-1">
               {sortedMetrics.map(metric => (
                 <div key={metric.id} className="flex justify-between items-center p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group">
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">{new Date(metric.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-[var(--color-text)]">{formatWeight(metric.weight, metric.unit)} {unit}</span>
                      <button onClick={() => onDeleteMetric(metric.id)} className="text-[var(--color-text-subtle)] hover:text-red-400 opacity-60 md:opacity-0 group-hover:opacity-100 transition-all text-xs cursor-pointer">✕</button>
                    </div>
                 </div>
               ))}
               {metrics.length === 0 && (
                 <div className="text-center py-6">
                   <p className="text-[var(--color-text-subtle)] text-xs">Registra tu peso para ver el progreso</p>
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-start justify-center pt-8 pb-4 px-4 sm:pt-12 sm:px-6 md:pt-16 md:px-8 overflow-y-auto animate-fadeIn" onClick={() => setSelectedWorkout(null)}>
          <div 
            className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-theme flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            
            {/* Header - Fixed at top */}
            <div className="shrink-0 p-6 border-b border-theme bg-surface rounded-t-2xl">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white">{selectedWorkout.subRoutineName}</h3>
                  <p className="text-sm mt-1 text-gray-400">{selectedWorkout.programName}</p>
                  <p className="text-xs mt-0.5 text-gray-500">{new Date(selectedWorkout.date).toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p>
                </div>
                <button onClick={() => setSelectedWorkout(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-primary text-dark font-bold rounded-xl text-sm hover:shadow-glow transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Editar
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditedDetails(selectedWorkout.details ? [...selectedWorkout.details.map(d => ({...d, sets: d.sets.map(s => ({...s}))}))] : []);
                      }}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 font-bold rounded-xl text-sm transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        const updatedWorkout = {...selectedWorkout, details: editedDetails};
                        onUpdateWorkout(updatedWorkout);
                        setSelectedWorkout(updatedWorkout);
                        setIsEditing(false);
                      }}
                      className="px-5 py-2.5 bg-primary text-dark font-bold rounded-xl text-sm hover:shadow-glow transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Guardar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats Cards - Fixed */}
            <div className="shrink-0 bg-surface px-6 py-4 grid grid-cols-3 gap-3 border-b border-theme">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-primary">{selectedWorkout.durationMinutes}</div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold">Minutos</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-secondary">{selectedWorkout.exercisesCompleted}</div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold">Ejercicios</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                {selectedWorkout.prs && selectedWorkout.prs.length > 0 ? (
                  <>
                    <div className="text-2xl font-black text-yellow-400">🏆 {selectedWorkout.prs.length}</div>
                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold">PRs</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-black">{selectedWorkout.totalVolume > 0 ? (selectedWorkout.totalVolume / (unit === 'kg' ? 1 : 2.2)).toFixed(0) : '—'}</div>
                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold">{unit}</div>
                  </>
                )}
              </div>
            </div>

            {/* Exercise Details - Scrollable */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {editedDetails.length > 0 ? editedDetails.map((log, logIdx) => {
                const exercise = exercises.find(e => e.id === log.exerciseId);
                return (
                  <div key={log.routineExerciseId} className="rounded-2xl overflow-hidden border border-theme">
                    {/* Exercise Header */}
                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black">{logIdx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{exercise?.name || 'Ejercicio'}</h4>
                        <p className="text-xs text-muted">{exercise?.muscleGroups.join(' • ')}</p>
                      </div>
                      <span className="text-xs bg-white/10 px-2 py-1 rounded-lg font-bold">{log.sets.length} sets</span>
                    </div>
                    
                    {/* Sets Table */}
                    <div className="p-3 bg-surface">
                      <div className="grid grid-cols-5 gap-1 text-[10px] text-muted font-bold uppercase px-2 mb-2">
                        <span className="text-center">#</span>
                        <span className="text-center">{unit}</span>
                        <span className="text-center">Reps</span>
                        <span className="text-center">RPE</span>
                        <span className="text-center">✓</span>
                      </div>
                      {log.sets.map((set, setIdx) => (
                        <div key={setIdx} className={`grid grid-cols-5 gap-1 items-center p-2 rounded-lg mb-1 transition ${set.completed ? 'bg-primary/10' : 'bg-white/5'}`}>
                          <span className="text-muted text-xs font-mono text-center">{set.setNumber}</span>
                          {isEditing ? (
                            <>
                              <input 
                                type="number" 
                                value={set.weight} 
                                onChange={(e) => {
                                  const newDetails = [...editedDetails];
                                  newDetails[logIdx].sets[setIdx].weight = e.target.value;
                                  setEditedDetails(newDetails);
                                }}
                                className="input-modern py-1.5 px-2 rounded-lg text-center text-sm font-bold"
                              />
                              <input 
                                type="number" 
                                value={set.reps} 
                                onChange={(e) => {
                                  const newDetails = [...editedDetails];
                                  newDetails[logIdx].sets[setIdx].reps = e.target.value;
                                  setEditedDetails(newDetails);
                                }}
                                className="input-modern py-1.5 px-2 rounded-lg text-center text-sm font-bold"
                              />
                              <input 
                                type="number" 
                                value={set.rpe || ''} 
                                onChange={(e) => {
                                  const newDetails = [...editedDetails];
                                  newDetails[logIdx].sets[setIdx].rpe = e.target.value;
                                  setEditedDetails(newDetails);
                                }}
                                className="input-modern py-1.5 px-2 rounded-lg text-center text-sm"
                              />
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-center text-sm">{set.weight || '—'}</span>
                              <span className="font-bold text-center text-sm">{set.reps || '—'}</span>
                              <span className="text-muted text-center text-sm">{set.rpe || '—'}</span>
                            </>
                          )}
                          <span className={`text-center text-lg ${set.completed ? 'text-primary' : 'text-muted/30'}`}>
                            {set.completed ? '✓' : '○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-16 text-muted">
                  <div className="text-5xl mb-4 opacity-30">📋</div>
                  <p className="font-bold">Sin detalles guardados</p>
                  <p className="text-xs mt-2 opacity-70">Los entrenamientos anteriores pueden no tener datos detallados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;