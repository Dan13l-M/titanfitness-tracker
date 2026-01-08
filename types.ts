
export enum ExerciseType {
  Strength = 'Strength',
  Cardio = 'Cardio',
  Flexibility = 'Flexibility'
}

export enum RoutineFocus {
  PPL = 'PUSH / PULL / LEGS',
  FullBody = 'FULL BODY',
  TorsoLegs = 'TORSO / PIERNA',
  CardioAbs = 'CARDIO / ABDOMEN',
  Cardio = 'CARDIO',
  Abs = 'ABDOMEN'
}

export enum TrainingMode {
  Standard = 'Normal',
  Dropset = 'Dropset',
  SuperSet = 'Biserie',
  RestPause = 'Rest-Pause',
  Warmup = 'Calentamiento',
  AMRAP = 'AMRAP'
}

export enum FitnessGoal {
  Hypertrophy = 'Hipertrofia',
  Strength = 'Fuerza',
  Endurance = 'Resistencia',
  WeightLoss = 'Pérdida de Peso',
  GeneralHealth = 'Salud General'
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  height: number; // in cm
  weight: number; // in kg (stored normalized)
  goal: FitnessGoal;
  experienceLevel: 'Principiante' | 'Intermedio' | 'Avanzado';
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  pattern?: string;
  subtype?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  defaultRestSeconds?: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: string;
  reps: string;
  weightPlaceholder?: string;
  mode?: TrainingMode;
}

export interface SubRoutine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  focus: RoutineFocus;
  subRoutines: SubRoutine[];
  createdAt: number;
}

export interface SetLog {
  setNumber: number;
  weight: string;
  reps: string;
  rpe?: string;
  completed: boolean;
  unit: 'kg' | 'lbs';
}

export interface ExerciseLog {
  routineExerciseId: string;
  exerciseId: string;
  sets: SetLog[];
}

export interface ActiveWorkoutSession {
  programName: string;
  subRoutine: SubRoutine;
  startTime: number;
  logs: ExerciseLog[];
}

export interface CompletedWorkout {
  id: string;
  programName: string;
  subRoutineName: string;
  date: number;
  durationMinutes: number;
  exercisesCompleted: number;
  totalVolume: number;
  prs?: string[];
  details?: ExerciseLog[];
}

export interface BodyMetric {
  id: string;
  date: number;
  weight: number;
  unit: 'kg' | 'lbs';
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  messages: ChatMessage[];
}

export type ViewState = 'dashboard' | 'exercises' | 'routines' | 'active-workout' | 'settings' | 'onboarding' | 'coach';
