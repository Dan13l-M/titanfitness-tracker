import React, { useState } from 'react';
import { Exercise, Routine, RoutineExercise, RoutineFocus, SubRoutine, TrainingMode } from '../types';
import { generateAIRoutine } from '../services/geminiService';

interface RoutineBuilderProps {
  routines: Routine[];
  exercises: Exercise[];
  onAddRoutine: (routine: Routine) => void;
  onUpdateRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onSelectSubRoutineForWorkout: (routineName: string, subRoutine: SubRoutine) => void;
}

const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ 
  routines, 
  exercises, 
  onAddRoutine, 
  onUpdateRoutine,
  onDeleteRoutine,
  onSelectSubRoutineForWorkout 
}) => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  
  // Program State
  const [routineName, setRoutineName] = useState('');
  const [routineFocus, setRoutineFocus] = useState<RoutineFocus>(RoutineFocus.PPL);
  
  // Sub-routines State
  const [subRoutines, setSubRoutines] = useState<SubRoutine[]>([]);
  const [activeSubRoutineId, setActiveSubRoutineId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // AI Generator State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Mobile Library State
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Params
  const [aiLevel, setAiLevel] = useState('Intermedio');
  const [aiEquipment, setAiEquipment] = useState('Gimnasio completo');
  const [aiFocus, setAiFocus] = useState('Hipertrofia');
  const [aiDays, setAiDays] = useState(4);
  const [aiDuration, setAiDuration] = useState('60');
  const [aiInjuries, setAiInjuries] = useState('');

  // Helpers
  const currentSubRoutine = subRoutines.find(sr => sr.id === activeSubRoutineId);
  const filteredExercises = exercises.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const startCreating = () => {
    resetBuilder();
    setIsCreatorOpen(true);
    const id = `sr_${Date.now()}`;
    setSubRoutines([{ id, name: "Día 1", exercises: [] }]);
    setActiveSubRoutineId(id);
  };

  const startEditing = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setRoutineFocus(routine.focus);
    const subsCopy = JSON.parse(JSON.stringify(routine.subRoutines));
    setSubRoutines(subsCopy);
    setActiveSubRoutineId(subsCopy[0]?.id || null);
    setIsCreatorOpen(true);
  };

  const handleAddSubRoutine = () => {
    const newId = `sr_${Date.now()}`;
    const newSub: SubRoutine = {
      id: newId,
      name: `Día ${subRoutines.length + 1}`,
      exercises: []
    };
    setSubRoutines([...subRoutines, newSub]);
    setActiveSubRoutineId(newId);
  };

  const handleDeleteSubRoutine = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSubs = subRoutines.filter(sr => sr.id !== id);
    setSubRoutines(newSubs);
    if (activeSubRoutineId === id) {
      setActiveSubRoutineId(newSubs[0]?.id || null);
    }
  };

  const handleRenameSubRoutine = (id: string, newName: string) => {
    setSubRoutines(prev => prev.map(sr => sr.id === id ? { ...sr, name: newName } : sr));
  };

  const handleAddExerciseToSubRoutine = (exerciseId: string) => {
    if (!activeSubRoutineId) return;

    const newRoutineExercise: RoutineExercise = {
      id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exerciseId,
      sets: '3',
      reps: '8-12',
      mode: TrainingMode.Standard
    };

    setSubRoutines(prev => prev.map(sr => {
      if (sr.id === activeSubRoutineId) {
        return { ...sr, exercises: [...sr.exercises, newRoutineExercise] };
      }
      return sr;
    }));
  };

  const handleUpdateExercise = (exId: string, field: keyof RoutineExercise, value: any) => {
    if (!activeSubRoutineId) return;
    setSubRoutines(prev => prev.map(sr => {
      if (sr.id === activeSubRoutineId) {
        return {
          ...sr,
          exercises: sr.exercises.map(ex => ex.id === exId ? { ...ex, [field]: value } : ex)
        };
      }
      return sr;
    }));
  };

  const handleRemoveExercise = (exId: string) => {
    if (!activeSubRoutineId) return;
    setSubRoutines(prev => prev.map(sr => {
      if (sr.id === activeSubRoutineId) {
        return {
          ...sr,
          exercises: sr.exercises.filter(ex => ex.id !== exId)
        };
      }
      return sr;
    }));
  };

  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex || !activeSubRoutineId) return;
    const newExercises = [...(currentSubRoutine?.exercises || [])];
    const [draggedItem] = newExercises.splice(draggedItemIndex, 1);
    newExercises.splice(dropIndex, 0, draggedItem);
    setSubRoutines(prev => prev.map(sr => {
      if (sr.id === activeSubRoutineId) {
        return { ...sr, exercises: newExercises };
      }
      return sr;
    }));
    setDraggedItemIndex(null);
  };

  const handleSaveRoutine = () => {
    if (!routineName || subRoutines.length === 0) {
      alert("Debes poner un nombre a la rutina y añadir al menos un día con ejercicios.");
      return;
    }
    const routineId = editingRoutineId || `rt_${Date.now()}`;
    const createdAt = editingRoutineId 
      ? routines.find(r => r.id === editingRoutineId)?.createdAt || Date.now() 
      : Date.now();
    const newRoutine: Routine = {
      id: routineId,
      name: routineName,
      focus: routineFocus,
      subRoutines: subRoutines,
      createdAt: createdAt
    };
    if (editingRoutineId) {
      onUpdateRoutine(newRoutine);
    } else {
      onAddRoutine(newRoutine);
    }
    resetBuilder();
  };

  const resetBuilder = () => {
    setRoutineName('');
    setRoutineFocus(RoutineFocus.PPL);
    setSubRoutines([]);
    setActiveSubRoutineId(null);
    setEditingRoutineId(null);
    setIsCreatorOpen(false);
    setIsMobileLibraryOpen(false);
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    try {
      const generatedData = await generateAIRoutine({
          focus: aiFocus,
          level: aiLevel,
          equipment: aiEquipment,
          daysPerWeek: aiDays,
          durationMinutes: aiDuration,
          injuries: aiInjuries
      });
      const newSubRoutines: SubRoutine[] = [];
      generatedData.subRoutines.forEach((day: any) => {
          const mappedExercises: RoutineExercise[] = [];
          day.exercises.forEach((aiEx: any) => {
             let existing = exercises.find(e => e.name.toLowerCase().includes(aiEx.name.toLowerCase()));
             if (!existing) {
                  existing = exercises.find(e => e.muscleGroups.some(mg => mg.toLowerCase() === aiEx.muscleGroup.toLowerCase())) || exercises[0];
             }
             if (existing) {
                mappedExercises.push({
                    id: `re_ai_${Math.random()}`,
                    exerciseId: existing.id,
                    sets: aiEx.sets,
                    reps: aiEx.reps,
                    mode: TrainingMode.Standard
                });
             }
          });
          newSubRoutines.push({
              id: `sr_ai_${Math.random()}`,
              name: day.name,
              exercises: mappedExercises
          });
      });
      setRoutineName(generatedData.name);
      const focusEnum = Object.values(RoutineFocus).find(f => f === generatedData.focus) || RoutineFocus.PPL;
      setRoutineFocus(focusEnum);
      setSubRoutines(newSubRoutines);
      setActiveSubRoutineId(newSubRoutines[0]?.id);
      if (!isCreatorOpen) setIsCreatorOpen(true);
      setIsAiModalOpen(false);
    } catch (e) {
      alert("Error generando rutina. Intenta de nuevo.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleInternalDelete = (e: React.MouseEvent, id: string) => {
      // Direct action to avoid bubbling or race conditions with card clicks
      e.preventDefault();
      e.stopPropagation();
      
      if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar este programa por completo? Esta acción no se puede deshacer.')) {
          onDeleteRoutine(id);
      }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {!isCreatorOpen ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-[var(--color-text)] to-[var(--color-text-muted)] bg-clip-text text-transparent">MIS</span>
              <span className="text-[var(--color-primary)] ml-2">PROGRAMAS</span>
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsAiModalOpen(true)}
                className="flex-1 sm:flex-none btn-secondary px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                ✨ IA Builder
              </button>
              <button 
                onClick={startCreating}
                className="flex-1 sm:flex-none btn-primary px-5 py-2.5 rounded-xl font-bold"
              >
                + Nuevo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {routines.map(routine => (
              <div key={routine.id} className="card card-lift rounded-2xl p-5 relative group hover:border-[var(--color-primary)]/30">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold tracking-tight truncate text-[var(--color-text)]">{routine.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                         <span className="badge badge-primary text-[10px]">{routine.focus}</span>
                         <span className="badge text-[10px]">{routine.subRoutines.length} Días</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 z-10 ml-4 shrink-0">
                    <button 
                      onClick={() => startEditing(routine)}
                      className="btn-icon hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                      onClick={(e) => handleInternalDelete(e, routine.id)}
                      className="btn-icon hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {routine.subRoutines.map((sub) => (
                    <div key={sub.id} className="stat-card p-4 rounded-xl">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-[var(--color-text)]">{sub.name}</p>
                          <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-widest">{sub.exercises.length} Ejercicios</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onSelectSubRoutineForWorkout(routine.name, sub)}
                        className="w-full flex items-center justify-center gap-2 btn-primary px-3 py-2.5 rounded-lg text-xs font-bold transform hover:-translate-y-0.5"
                      >
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                         Iniciar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {routines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-2xl gap-3 bg-[var(--color-surface)]/30">
                <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <p className="font-bold text-sm">No tienes programas creados</p>
                <p className="text-xs">Crea tu primer programa con el botón "+ Nuevo"</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card rounded-2xl p-5 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-black text-[var(--color-text)]">
              {editingRoutineId ? 'Editar Programa' : 'Nuevo Programa'}
            </h2>
            <div className="flex gap-2">
               <button onClick={resetBuilder} className="btn-ghost px-4 py-2 text-sm font-medium">Cancelar</button>
               <button onClick={handleSaveRoutine} className="btn-primary px-5 py-2 rounded-xl font-bold">
                 {editingRoutineId ? 'Actualizar' : 'Guardar'}
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1">Nombre</label>
              <input 
                type="text" 
                className="input-modern w-full p-3 rounded-xl"
                value={routineName}
                onChange={e => setRoutineName(e.target.value)}
                placeholder="Ej. PPL Frecuencia 2"
              />
            </div>
            <div>
              <label className="block text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1">Enfoque</label>
              <select 
                className="input-modern w-full p-3 rounded-xl appearance-none"
                value={routineFocus}
                onChange={e => setRoutineFocus(e.target.value as RoutineFocus)}
              >
                {Object.values(RoutineFocus).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-1 gap-5 overflow-hidden flex-col lg:flex-row">
            <div className="flex-1 flex flex-col min-h-0 border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
               <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] flex flex-nowrap overflow-x-auto p-3 gap-2 items-center touch-pan-x">
                 {subRoutines.map((sr) => (
                   <div 
                    key={sr.id}
                    onClick={() => setActiveSubRoutineId(sr.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 cursor-pointer rounded-full min-w-[100px] max-w-[160px] justify-between group transition-all duration-200 text-sm ${
                        activeSubRoutineId === sr.id 
                        ? 'bg-[var(--color-primary)] text-[var(--color-bg)] font-bold shadow-md' 
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                    }`}
                   >
                     <span className="whitespace-nowrap truncate">{sr.name}</span>
                     <button 
                        onClick={(e) => handleDeleteSubRoutine(sr.id, e)} 
                        className={`hover:bg-black/10 rounded-full w-5 h-5 flex items-center justify-center transition flex-shrink-0 ${activeSubRoutineId === sr.id ? 'text-[var(--color-bg)]/60' : 'text-[var(--color-text-subtle)]'}`}
                    >
                        ×
                     </button>
                   </div>
                 ))}
                 <button 
                  onClick={handleAddSubRoutine}
                  className="px-3 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] rounded-full whitespace-nowrap text-sm border border-dashed border-[var(--color-border)] transition flex-shrink-0"
                  title="Añadir Día"
                 >
                   + Día
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                  {currentSubRoutine ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-5 items-center">
                        <input 
                          type="text" 
                          value={currentSubRoutine.name}
                          onChange={(e) => handleRenameSubRoutine(currentSubRoutine.id, e.target.value)}
                          className="bg-transparent border-b border-[var(--color-border)] font-bold text-lg w-full focus:border-[var(--color-primary)] focus:outline-none py-1 text-[var(--color-text)]"
                          placeholder="Nombre del Día"
                        />
                      </div>

                      <button 
                        onClick={() => setIsMobileLibraryOpen(true)}
                        className="lg:hidden w-full py-4 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2 font-bold mb-4 bg-[var(--color-surface)]"
                      >
                        <span className="text-xl text-[var(--color-primary)]">+</span> Añadir Ejercicio
                      </button>

                      {currentSubRoutine.exercises.map((re, index) => {
                        const ex = exercises.find(e => e.id === re.exerciseId);
                        const isDragging = draggedItemIndex === index;
                        return (
                          <div 
                            key={re.id} 
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(index)}
                            className={`stat-card p-4 rounded-xl flex flex-col items-start gap-4 animate-fadeIn hover:bg-[var(--color-surface-hover)] transition group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 border-dashed border-[var(--color-primary)]' : ''}`}
                          >
                            <div className="w-full flex items-center gap-3">
                                <div className="text-[var(--color-text-subtle)] font-mono text-xs w-6 text-center flex flex-col items-center gap-1 cursor-grab">
                                    <svg className="w-4 h-4 text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                    <span>{index + 1}</span>
                                </div>
                                <div className="flex-1 w-full text-center sm:text-left min-w-0">
                                  <p className="font-bold text-sm truncate text-[var(--color-text)]">{ex?.name}</p>
                                  <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-widest truncate">{ex?.muscleGroups.join(', ')}</p>
                                </div>
                                <button onClick={() => handleRemoveExercise(re.id)} className="text-[var(--color-text-subtle)] hover:text-red-400 p-2 rounded transition opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                                ✕
                                </button>
                            </div>
                            
                            <div className="w-full flex flex-wrap gap-2 items-end justify-between border-t border-[var(--color-border)] pt-3">
                                <div className="flex gap-2">
                                    <div className="flex flex-col items-center px-1">
                                        <span className="text-[8px] text-[var(--color-text-subtle)] uppercase font-bold mb-1">Series</span>
                                        <input 
                                        className="input-modern w-14 text-center text-sm font-bold text-[var(--color-primary)] rounded-lg py-2"
                                        value={re.sets}
                                        onChange={(e) => handleUpdateExercise(re.id, 'sets', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col items-center px-1">
                                        <span className="text-[8px] text-[var(--color-text-subtle)] uppercase font-bold mb-1">Reps</span>
                                        <input 
                                        className="input-modern w-16 text-center text-sm font-bold rounded-lg py-2"
                                        value={re.reps}
                                        onChange={(e) => handleUpdateExercise(re.id, 'reps', e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-[120px]">
                                    <span className="block text-[8px] text-[var(--color-text-subtle)] uppercase font-bold mb-1">Modo</span>
                                    <select 
                                        className="input-modern w-full text-xs p-2.5 rounded-lg appearance-none cursor-pointer hover:bg-[var(--color-surface-hover)]"
                                        value={re.mode || TrainingMode.Standard}
                                        onChange={(e) => handleUpdateExercise(re.id, 'mode', e.target.value)}
                                    >
                                        {Object.values(TrainingMode).map(mode => (
                                            <option key={mode} value={mode} className="bg-[var(--color-bg)] text-[var(--color-text)]">{mode}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                        <div className="text-center">
                            <p className="text-2xl mb-2">👈</p>
                            <p>Selecciona un día</p>
                        </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="hidden lg:flex w-80 border border-[var(--color-border)] rounded-2xl flex-col bg-[var(--color-surface)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] font-bold flex justify-between items-center text-[var(--color-text)]">
                  <span>Biblioteca</span>
                  <span className="badge text-xs">{exercises.length}</span>
              </div>
              <div className="p-2 border-b border-[var(--color-border)]">
                 <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="input-modern w-full p-2 text-xs rounded-lg"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {filteredExercises.map(ex => (
                  <button 
                    key={ex.id}
                    onClick={() => handleAddExerciseToSubRoutine(ex.id)}
                    disabled={!activeSubRoutineId}
                    className="w-full text-left stat-card p-3 rounded-xl hover:bg-[var(--color-surface-hover)] transition group disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
                  >
                    <div className="min-w-0">
                        <div className="text-sm font-bold truncate text-[var(--color-text)]">{ex.name}</div>
                        <div className="text-[9px] text-[var(--color-text-subtle)] uppercase tracking-widest truncate">{ex.muscleGroups.join(', ')}</div>
                    </div>
                    <span className={`text-lg font-bold transition flex-shrink-0 ml-2 ${activeSubRoutineId ? 'text-[var(--color-primary)] opacity-0 group-hover:opacity-100' : 'text-[var(--color-text-subtle)]'}`}>+</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobileLibraryOpen && (
        <div className="fixed inset-0 z-[80] bg-[var(--color-bg)] flex flex-col animate-fadeIn">
             <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
                <h3 className="font-black text-lg text-[var(--color-text)]">Añadir Ejercicio</h3>
                <button 
                    onClick={() => setIsMobileLibraryOpen(false)} 
                    className="btn-icon w-10 h-10"
                >
                    ✕
                </button>
             </div>
             <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <input
                    type="text"
                    placeholder="Buscar por nombre o músculo..."
                    className="input-modern w-full p-3 rounded-xl text-base"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {filteredExercises.length > 0 ? (
                    filteredExercises.map(ex => (
                        <button
                            key={ex.id}
                            onClick={() => {
                                handleAddExerciseToSubRoutine(ex.id);
                                if (navigator.vibrate) navigator.vibrate(20);
                            }}
                            className="w-full text-left stat-card p-4 rounded-xl flex justify-between items-center active:scale-[0.98] transition"
                        >
                            <div>
                                <div className="font-bold text-[var(--color-text)] text-base">{ex.name}</div>
                                <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">{ex.muscleGroups.join(', ')}</div>
                            </div>
                            <div className="bg-[var(--color-primary)] text-[var(--color-bg)] rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md">+</div>
                        </button>
                    ))
                ) : (
                    <div className="text-center text-[var(--color-text-muted)] mt-10">No se encontraron ejercicios.</div>
                )}
             </div>
             <div className="absolute bottom-6 left-0 right-0 px-6">
                 <button 
                    onClick={() => setIsMobileLibraryOpen(false)}
                    className="w-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] text-white font-bold py-4 rounded-2xl shadow-2xl"
                 >
                     Listo
                 </button>
             </div>
        </div>
      )}

      {isAiModalOpen && (
        <div className="modal-backdrop animate-fadeIn" onClick={() => setIsAiModalOpen(false)}>
          <div className="card w-full max-w-md mx-4 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-5 text-[var(--color-text)]">✨ Generar Rutina PRO</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Objetivo</label>
                    <input 
                      type="text" 
                      value={aiFocus}
                      onChange={(e) => setAiFocus(e.target.value)}
                      className="input-modern w-full p-3 rounded-xl"
                      placeholder="Hipertrofia..."
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Nivel</label>
                    <select 
                        value={aiLevel}
                        onChange={(e) => setAiLevel(e.target.value)}
                        className="input-modern w-full p-3 rounded-xl appearance-none"
                        >
                        <option>Principiante</option>
                        <option>Intermedio</option>
                        <option>Avanzado</option>
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Días / Semana</label>
                    <input 
                      type="number" 
                      min="1" max="7"
                      value={aiDays}
                      onChange={(e) => setAiDays(parseInt(e.target.value))}
                      className="input-modern w-full p-3 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Tiempo (min)</label>
                    <input 
                      type="number" 
                      value={aiDuration}
                      onChange={(e) => setAiDuration(e.target.value)}
                      className="input-modern w-full p-3 rounded-xl"
                      placeholder="60"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Equipo Disponible</label>
                <input 
                  type="text"
                  value={aiEquipment}
                  onChange={(e) => setAiEquipment(e.target.value)}
                  className="input-modern w-full p-3 rounded-xl" 
                  placeholder="Mancuernas, Barra, Poleas..."
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Lesiones / A Evitar</label>
                <input 
                  type="text"
                  value={aiInjuries}
                  onChange={(e) => setAiInjuries(e.target.value)}
                  className="input-modern w-full p-3 rounded-xl border-red-500/30 focus:border-red-500" 
                  placeholder="Ej. Dolor lumbar, Hombro izquierdo..."
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsAiModalOpen(false)} className="btn-ghost flex-1 py-3 rounded-xl font-bold">Cancelar</button>
              <button 
                onClick={handleAiGenerate} 
                disabled={aiLoading}
                className="btn-secondary flex-1 py-3 rounded-xl flex justify-center items-center font-bold"
              >
                {aiLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : 'Generar Rutina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineBuilder;