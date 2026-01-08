
import { Routine, RoutineFocus } from './types';
import { EXERCISE_DATABASE, EQUIPMENT_CATEGORIES, MUSCLE_CATEGORIES } from './exerciseData';

// Re-export exercise data
export const INITIAL_EXERCISES = EXERCISE_DATABASE;
export { EQUIPMENT_CATEGORIES, MUSCLE_CATEGORIES };

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'rt_1',
    name: 'Rutina de Ejemplo PPL',
    focus: RoutineFocus.PPL,
    createdAt: Date.now(),
    subRoutines: [
      {
        id: 'sr_1',
        name: 'Empuje (Push)',
        exercises: [
          { id: 're_1', exerciseId: 'ex_122', sets: '4', reps: '6-8' }, // Close-grip bench press
          { id: 're_2', exerciseId: 'ex_345', sets: '3', reps: '8-10' } // Barbell overhead press
        ]
      },
      {
        id: 'sr_2',
        name: 'Tracción (Pull)',
        exercises: [
          { id: 're_4', exerciseId: 'ex_001', sets: '4', reps: 'Al fallo' } // Pull-up
        ]
      }
    ]
  },
  {
    id: 'rt_2',
    name: 'Cuerpo Completo',
    focus: RoutineFocus.FullBody,
    createdAt: Date.now(),
    subRoutines: [
      {
        id: 'sr_fb_1',
        name: 'Día Único',
        exercises: [
          { id: 're_fb_1', exerciseId: 'ex_290', sets: '3', reps: '10' } // Barbell back squat
        ]
      }
    ]
  }
];
