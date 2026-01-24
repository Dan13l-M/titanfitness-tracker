
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Exercise, CompletedWorkout } from '../types';
import { generateAIExerciseDescription } from '../services/geminiService';
import { uploadExerciseImage, deleteExerciseImage } from '../services/supabaseService';

interface ExerciseLibraryProps {
  exercises: Exercise[];
  history: CompletedWorkout[];
  onAddExercise: (ex: Exercise) => void;
  onUpdateExercise: (ex: Exercise) => void;
  onDeleteExercise: (id: string) => void;
  userId?: string; // For Supabase Storage uploads
}

const MUSCLE_GROUPS = [
  'Espalda',
  'Pecho',
  'Bíceps',
  'Tríceps',
  'Glúteo',
  'Femoral',
  'Cuádriceps',
  'Hombro',
  'Antebrazo',
  'Abdomen',
  'Otros'
];

const EQUIPMENT_GROUPS = [
  'Peso corporal',
  'Barra',
  'Mancuerna',
  'Mancuernas',
  'Kettlebell',
  'Polea',
  'Máquina',
  'Banda',
  'Otro'
];

const CATEGORY_ICONS: Record<string, string> = {
  'Espalda': '🦅',
  'Pecho': '🎯',
  'Bíceps': '💪',
  'Tríceps': '🦾',
  'Glúteo': '🍑',
  'Femoral': '🍗',
  'Cuádriceps': '🦵',
  'Hombro': '🥥',
  'Antebrazo': '🤜',
  'Abdomen': '🍫',
  'Otros': '⚡'
};

const EQUIPMENT_ICONS: Record<string, string> = {
  'Peso corporal': '💪',
  'Barra': '🏋️',
  'Mancuerna': '🔩',
  'Mancuernas': '🔩',
  'Kettlebell': '🔔',
  'Polea': '⚙️',
  'Máquina': '🎰',
  'Banda': '🎗️',
  'Otro': '⚡'
};

// IDs de ejercicios predefinidos (no se pueden eliminar)
const DEFAULT_EXERCISE_IDS = [
  'ex_chest_1', 'ex_chest_2', 'ex_chest_3', 'ex_chest_4',
  'ex_back_1', 'ex_back_2', 'ex_back_3', 'ex_back_4', 'ex_back_5',
  'ex_legs_1', 'ex_legs_2', 'ex_legs_3', 'ex_legs_4', 'ex_legs_5', 'ex_legs_6', 'ex_legs_7',
  'ex_sh_1', 'ex_sh_2', 'ex_sh_3', 'ex_sh_4',
  'ex_arm_1', 'ex_arm_2', 'ex_arm_3', 'ex_arm_4',
  'ex_core_1', 'ex_core_2', 'ex_full_1', 'ex_cardio_1'
];

const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({ exercises, history, onAddExercise, onUpdateExercise, onDeleteExercise, userId }) => {
  const isCustomExercise = (id: string) => !id.startsWith('ex_');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'muscle' | 'equipment'>('muscle');
  
  // Form State
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscles, setNewExerciseMuscles] = useState<string[]>([]); // Array state
  const [newExerciseDesc, setNewExerciseDesc] = useState('');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('Peso corporal');
  const [mediaFile, setMediaFile] = useState<string | null>(null); // Preview (base64 or URL)
  const [pendingFile, setPendingFile] = useState<File | null>(null); // Actual file to upload
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Máximo 5MB.");
        return;
      }
      // Store the file for later upload
      setPendingFile(file);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoDescription = async () => {
    if (!newExerciseName) return;
    setIsGenerating(true);
    const desc = await generateAIExerciseDescription(newExerciseName);
    setNewExerciseDesc(desc);
    setIsGenerating(false);
  };

  const toggleMuscleSelection = (group: string) => {
    setNewExerciseMuscles(prev => {
        if (prev.includes(group)) return prev.filter(g => g !== group);
        return [...prev, group];
    });
  };

  // Open Edit Modal
  const handleEditClick = (ex: Exercise, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExerciseId(ex.id);
    setNewExerciseName(ex.name);
    setNewExerciseMuscles(ex.muscleGroups || []);
    setNewExerciseDesc(ex.description || '');
    setMediaFile(ex.mediaUrl || null);
    setMediaType(ex.mediaType || 'image');
    setIsModalOpen(true);
  };

  // Open Details Modal
  const handleCardClick = (ex: Exercise) => {
    setSelectedExercise(ex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName || newExerciseMuscles.length === 0) {
        alert("Debes poner un nombre y seleccionar al menos un músculo.");
        return;
    }

    let finalMediaUrl = mediaFile;
    
    // If there's a new file to upload and user is logged in
    if (pendingFile && userId) {
      setIsUploading(true);
      try {
        // Delete old image if updating an exercise with existing cloud image
        if (editingExerciseId) {
          const oldExercise = exercises.find(ex => ex.id === editingExerciseId);
          if (oldExercise?.mediaUrl && oldExercise.mediaUrl.includes('supabase')) {
            try {
              await deleteExerciseImage(oldExercise.mediaUrl);
            } catch (err) {
              console.error('Error deleting old image:', err);
            }
          }
        }
        
        // Upload new image
        finalMediaUrl = await uploadExerciseImage(userId, pendingFile);
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Error al subir la imagen. Se guardará sin imagen.');
        finalMediaUrl = undefined;
      } finally {
        setIsUploading(false);
      }
    }

    const exerciseData: Exercise = {
      id: editingExerciseId || `custom_${Date.now()}`,
      name: newExerciseName,
      muscleGroups: newExerciseMuscles,
      equipment: newExerciseEquipment,
      description: newExerciseDesc,
      mediaUrl: finalMediaUrl || undefined,
      mediaType: mediaType
    };

    if (editingExerciseId) {
      onUpdateExercise(exerciseData);
    } else {
      onAddExercise(exerciseData);
    }

    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setEditingExerciseId(null);
    setNewExerciseName('');
    setNewExerciseMuscles([]);
    setNewExerciseDesc('');
    setNewExerciseEquipment('Peso corporal');
    setMediaFile(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  // Logic to extract stats for a specific exercise
  const getExerciseStats = (exId: string) => {
    if (!history) return { chartData: [], historyList: [] };

    const logs = history.flatMap(workout => {
        const details = workout.details?.find(d => d.exerciseId === exId);
        if (!details) return [];
        return [{
            date: workout.date,
            programName: workout.programName,
            sets: details.sets.filter(s => s.completed)
        }];
    }).filter(log => log.sets.length > 0).sort((a, b) => a.date - b.date);

    // Calculate Estimated 1RM for each session using Epley formula: w * (1 + r/30)
    // We take the best set of the day
    const chartData = logs.map(log => {
        const bestSet = log.sets.reduce((best, current) => {
            const w = parseFloat(current.weight);
            const r = parseFloat(current.reps);
            const weightKg = current.unit === 'lbs' ? w * 0.453592 : w;
            const e1rm = weightKg * (1 + r / 30);
            return e1rm > best ? e1rm : best;
        }, 0);
        return { date: log.date, value: bestSet };
    });

    return { chartData, historyList: logs.reverse() }; // Reverse logs for display (newest first)
  };

  // 1. Filter exercises
  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscleGroups.some(mg => mg.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ex.equipment && ex.equipment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 2. Group exercises by muscle or equipment
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    let key: string;
    if (viewMode === 'muscle') {
      const primaryGroup = ex.muscleGroups[0] || 'Otros';
      key = MUSCLE_GROUPS.includes(primaryGroup) ? primaryGroup : 'Otros';
    } else {
      const equipment = ex.equipment || 'Otro';
      // Normalize equipment names
      if (equipment.includes('Mancuerna')) key = 'Mancuernas';
      else if (equipment.includes('Polea') || equipment.includes('Cable')) key = 'Polea';
      else if (equipment.includes('Máquina')) key = 'Máquina';
      else if (equipment.includes('Barra') && !equipment.includes('corporal')) key = 'Barra';
      else if (equipment.includes('corporal') || equipment === 'Peso corporal') key = 'Peso corporal';
      else if (equipment.includes('Kettlebell')) key = 'Kettlebell';
      else if (equipment.includes('Banda')) key = 'Banda';
      else key = 'Otro';
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const renderCategories = viewMode === 'muscle' ? [...MUSCLE_GROUPS] : [...EQUIPMENT_GROUPS];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 card p-5 rounded-2xl sticky top-0 z-30 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-[var(--color-text)] to-[var(--color-text-muted)] bg-clip-text text-transparent">BIBLIO</span>
            <span className="text-[var(--color-primary)]">TECA</span>
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Buscar ejercicio..." 
              className="input-modern w-full md:w-64 px-4 py-2.5 rounded-xl text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="btn-primary px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold"
            >
              + Nuevo
            </button>
          </div>
        </div>
        
        {/* View Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('muscle')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${viewMode === 'muscle' ? 'bg-[var(--color-primary)] text-[var(--color-bg)] shadow-lg' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'}`}
          >
            🎯 Por Músculo
          </button>
          <button
            onClick={() => setViewMode('equipment')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${viewMode === 'equipment' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'}`}
          >
            🏋️ Por Equipo
          </button>
        </div>
      </div>

      <div className="space-y-10 pb-12">
        {renderCategories.map(category => {
            const categoryExercises = groupedExercises[category];
            if (!categoryExercises || categoryExercises.length === 0) return null;

            return (
                <div key={category} className="animate-fadeIn">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-xl">
                          {viewMode === 'muscle' ? (CATEGORY_ICONS[category] || '⚡') : (EQUIPMENT_ICONS[category] || '⚡')}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-[var(--color-text)]">{category}</h3>
                        <span className="badge badge-primary text-xs">{categoryExercises.length}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {categoryExercises.map(exercise => (
                        <div 
                            key={exercise.id} 
                            onClick={() => handleCardClick(exercise)}
                            className="card card-lift rounded-2xl overflow-hidden group relative flex flex-col cursor-pointer hover:border-[var(--color-primary)]/30"
                        >
                            <div className="aspect-video bg-[var(--color-surface)] relative flex items-center justify-center overflow-hidden">
                            {exercise.mediaUrl ? (
                                <>
                                    {exercise.mediaType === 'video' ? (
                                    <video src={exercise.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                    <img src={exercise.mediaUrl} alt={exercise.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-[var(--color-text-subtle)]">
                                    <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            
                            <div className="absolute top-2 right-2 flex gap-1 opacity-60 md:opacity-0 group-hover:opacity-100 transition z-10">
                                <button 
                                    onClick={(e) => handleEditClick(exercise, e)}
                                    className="bg-black/50 hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] text-white p-2 rounded-full transition backdrop-blur-sm transform scale-90 hover:scale-100"
                                    title="Editar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                {isCustomExercise(exercise.id) && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`¿Eliminar "${exercise.name}"? Esta acción no se puede deshacer.`)) {
                                                onDeleteExercise(exercise.id);
                                            }
                                        }}
                                        className="bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition backdrop-blur-sm transform scale-90 hover:scale-100"
                                        title="Eliminar"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col relative">
                                <div className="mb-2">
                                    <h3 className="text-base font-bold leading-tight group-hover:text-[var(--color-primary)] transition-colors">{exercise.name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {exercise.muscleGroups.map((mg, i) => (
                                        <span key={i} className="chip text-[10px]">{mg}</span>
                                    ))}
                                    {exercise.equipment && (
                                        <span className="chip chip-secondary text-[10px]">
                                            {exercise.equipment}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[var(--color-text-muted)] text-xs line-clamp-2 leading-relaxed">{exercise.description || "Sin descripción disponible."}</p>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            );
        })}

        {filteredExercises.length === 0 && (
            <div className="text-center py-20 text-[var(--color-text-muted)]">
                <p className="text-lg font-medium">No se encontraron ejercicios.</p>
                <p className="text-sm">Prueba con otro término de búsqueda o crea uno nuevo.</p>
            </div>
        )}
      </div>

      {/* Edit Modal - Using Portal to escape parent stacking context */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="modal-backdrop animate-fadeIn" onClick={handleCloseModal}>
          <div className="card w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-5 text-[var(--color-text)]">
              {editingExerciseId ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Nombre</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Press Militar"
                  className="input-modern w-full p-3 rounded-xl"
                  value={newExerciseName}
                  onChange={e => setNewExerciseName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Grupo(s) Muscular(es)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {MUSCLE_GROUPS.map(group => (
                        <button
                            key={group}
                            type="button"
                            onClick={() => toggleMuscleSelection(group)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                newExerciseMuscles.includes(group) 
                                ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)] shadow-md' 
                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                            }`}
                        >
                            {group} {newExerciseMuscles.includes(group) && '✓'}
                        </button>
                    ))}
                </div>
                {newExerciseMuscles.length === 0 && <p className="text-red-400 text-xs mt-1">Selecciona al menos uno.</p>}
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Equipo</label>
                <select 
                  className="input-modern w-full p-3 rounded-xl appearance-none"
                  value={newExerciseEquipment}
                  onChange={e => setNewExerciseEquipment(e.target.value)}
                >
                  {EQUIPMENT_GROUPS.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest">Descripción</label>
                  <button 
                    type="button"
                    onClick={handleAutoDescription}
                    disabled={isGenerating || !newExerciseName}
                    className="text-xs text-[var(--color-secondary)] font-bold hover:text-[var(--color-text)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isGenerating ? '...' : '✨ Auto-generar'}
                  </button>
                </div>
                <textarea 
                  className="input-modern w-full p-3 rounded-xl"
                  rows={3}
                  placeholder="Técnica, trucos, ejecución..."
                  value={newExerciseDesc}
                  onChange={e => setNewExerciseDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Media</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] w-full py-8 rounded-xl flex flex-col items-center justify-center transition group">
                    {mediaFile ? (
                        <div className="flex flex-col items-center w-full px-4">
                            <div className="w-full h-32 rounded-lg overflow-hidden mb-2 border border-[var(--color-border)] bg-[var(--color-bg)] relative">
                                {mediaType === 'video' ? <video src={mediaFile} className="w-full h-full object-contain"/> : <img src={mediaFile} className="w-full h-full object-contain"/>}
                            </div>
                            <span className="text-xs text-[var(--color-primary)] font-bold">Cambiar archivo</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-2xl mb-2 opacity-50 group-hover:scale-110 transition-transform">📷</span>
                            <span className="text-xs">Click para subir</span>
                        </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="btn-ghost flex-1 py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="btn-primary flex-1 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[var(--color-bg)] border-t-transparent rounded-full animate-spin"></span>
                      Subiendo...
                    </>
                  ) : (
                    editingExerciseId ? 'Actualizar' : 'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Detail / Analytics Modal - Using Portal to escape parent stacking context */}
      {selectedExercise && ReactDOM.createPortal(
        <div className="modal-backdrop animate-fadeIn" onClick={() => setSelectedExercise(null)}>
           <div className="card w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
              
              {/* Close Button - Top right corner of the card */}
              <button 
                onClick={() => setSelectedExercise(null)} 
                className="absolute top-1 left-1 z-50 w-9 h-9 
                rounded-full bg-[var(--color-bg)]/90 hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] 
                hover:text-[var(--color-bg)] flex items-center justify-center shadow-lg backdrop-blur-sm border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Left Side: Info & Media */}
              <div className="md:w-1/3 bg-[var(--color-surface)] border-b md:border-b-0 md:border-r border-[var(--color-border)] flex flex-col">
                  <div className="aspect-square bg-[var(--color-surface)] relative">
                    {selectedExercise.mediaUrl ? (
                         selectedExercise.mediaType === 'video' ? (
                             <video src={selectedExercise.mediaUrl} className="w-full h-full object-cover" controls autoPlay loop muted />
                         ) : (
                             <img src={selectedExercise.mediaUrl} className="w-full h-full object-cover" />
                         )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-surface)]">
                             <span>Sin Imagen</span>
                        </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 overflow-y-auto">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-black leading-none text-[var(--color-text)]">{selectedExercise.name}</h2>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {selectedExercise.muscleGroups.map((mg, i) => (
                             <span key={i} className="chip text-[10px]">{mg}</span>
                        ))}
                      </div>
                      
                      <h4 className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Instrucciones</h4>
                      <p className="text-sm leading-relaxed text-[var(--color-text)]">{selectedExercise.description || "No hay descripción disponible."}</p>
                  </div>
              </div>

              {/* Right Side: Analytics */}
              <div className="md:w-2/3 p-5 md:p-6 bg-[var(--color-card)] overflow-y-auto custom-scrollbar">
                  <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-[var(--color-text)]">
                      <span className="w-1 h-5 bg-[var(--color-secondary)] rounded-full"></span>
                      Progreso (Fuerza Estimada)
                  </h3>

                  {(() => {
                      const { chartData, historyList } = getExerciseStats(selectedExercise.id);
                      
                      if (chartData.length < 2) {
                          return (
                              <div className="mb-6 p-6 border border-dashed border-[var(--color-border)] rounded-2xl text-center text-[var(--color-text-muted)] bg-[var(--color-surface)]">
                                  <p>Necesitas al menos 2 sesiones registradas para ver el gráfico de progreso.</p>
                              </div>
                          );
                      }

                      // Chart rendering logic inline for simplicity within modal
                      const values = chartData.map(d => d.value);
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const padding = (max - min) * 0.2 || 5;
                      const yMin = min - padding;
                      const yMax = max + padding;
                      
                      const width = 100;
                      const height = 40;
                      const points = chartData.map((d, i) => {
                           const x = (i / (chartData.length - 1)) * width;
                           const y = height - ((d.value - yMin) / (yMax - yMin)) * height;
                           return `${x},${y}`;
                      }).join(' ');

                      return (
                          <>
                            <div className="w-full h-40 mb-6 relative">
                                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <polygon points={`${0},${height} ${points} ${width},${height}`} fill="url(#chartFill)" />
                                    <polyline points={points} fill="none" stroke="var(--color-secondary)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                    {chartData.map((d, i) => {
                                         const x = (i / (chartData.length - 1)) * width;
                                         const y = height - ((d.value - yMin) / (yMax - yMin)) * height;
                                         return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--color-text)" />;
                                    })}
                                </svg>
                                <div className="flex justify-between text-[10px] text-[var(--color-text-subtle)] mt-2 font-mono">
                                    <span>{new Date(chartData[0].date).toLocaleDateString()}</span>
                                    <span>{new Date(chartData[chartData.length - 1].date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">
                                <span className="w-1 h-5 bg-[var(--color-primary)] rounded-full"></span>
                                Historial de Sesiones
                            </h3>
                            <div className="space-y-2">
                                {historyList.map((log, i) => (
                                    <div key={i} className="stat-card p-4 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-[var(--color-text-muted)] mb-1">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p className="text-sm font-bold text-[var(--color-text)]">{log.programName}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {log.sets.map((s, idx) => (
                                                <span key={idx} className="text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-bg)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                                    {s.weight} {s.unit} x {s.reps}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                          </>
                      );
                  })()}
                  
                  {(!history || history.length === 0) && (
                      <div className="text-center py-10 text-[var(--color-text-muted)]">
                          No hay historial registrado para este ejercicio.
                      </div>
                  )}
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExerciseLibrary;
