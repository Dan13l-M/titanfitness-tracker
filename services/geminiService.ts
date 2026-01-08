
import { GoogleGenAI, Type } from "@google/genai";
import { RoutineFocus, UserProfile, CompletedWorkout, BodyMetric, ChatMessage } from "../types";

// Safety check for API Key
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateAIExerciseDescription = async (exerciseName: string): Promise<string> => {
  if (!apiKey) return "API Key faltante. No se puede generar descripción.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Proporciona una descripción breve, técnica y motivadora (máximo 40 palabras) para el ejercicio: "${exerciseName}". En Español.`,
    });
    return response.text || "No se pudo generar la descripción.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Error al contactar con la IA.";
  }
};

interface RoutineParams {
    focus: string;
    level: string;
    equipment: string;
    daysPerWeek: number;
    durationMinutes: string;
    injuries: string;
}

export const generateAIRoutine = async (params: RoutineParams): Promise<any> => {
  if (!apiKey) throw new Error("API Key faltante");

  const prompt = `Actúa como un entrenador de élite. Crea una rutina de entrenamiento completa con los siguientes parámetros:
  - Enfoque: "${params.focus}"
  - Nivel: "${params.level}"
  - Frecuencia: ${params.daysPerWeek} días por semana.
  - Duración por sesión: Aprox ${params.durationMinutes} minutos.
  - Equipo disponible: "${params.equipment}"
  - Lesiones/Limitaciones a evitar: "${params.injuries || 'Ninguna'}"
  
  La respuesta DEBE ser un JSON válido con la siguiente estructura exacta (sin markdown, solo JSON raw):
  {
    "name": "Nombre PRO de la rutina (ej. Titan Hypertrophy PPL)",
    "focus": "${params.focus}", 
    "subRoutines": [
        {
            "name": "Nombre del Día (ej. Día 1: Pecho y Tríceps)",
            "exercises": [
                {
                    "name": "Nombre del ejercicio",
                    "sets": "Rango (ej. 3-4)",
                    "reps": "Rango (ej. 8-12)",
                    "muscleGroup": "Grupo muscular principal (ej. Pecho)"
                }
            ]
        }
    ]
  }
  IMPORTANTE: El campo 'focus' en la respuesta JSON DEBE ser EXACTAMENTE uno de estos valores string:
  - "PUSH / PULL / LEGS"
  - "FULL BODY"
  - "TORSO / PIERNA"
  - "CARDIO / ABDOMEN"
  - "CARDIO"
  - "ABDOMEN"

  Genera exactamente ${params.daysPerWeek} días (subRoutines). Cada día debe tener entre 5 y 7 ejercicios lógicos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            focus: { type: Type.STRING },
            subRoutines: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    sets: { type: Type.STRING },
                                    reps: { type: Type.STRING },
                                    muscleGroup: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating routine:", error);
    throw error;
  }
};

export const getCoachResponse = async (
    currentMessage: string, 
    chatHistory: ChatMessage[],
    userProfile: UserProfile | null,
    history: CompletedWorkout[],
    metrics: BodyMetric[]
): Promise<string> => {
    if (!apiKey) return "Error: No API Key configured.";

    // Context Data preparation
    const lastWorkout = history.length > 0 ? history[history.length - 1] : null;
    const lastWorkoutDate = lastWorkout ? new Date(lastWorkout.date) : null;
    const daysSinceLastWorkout = lastWorkoutDate 
        ? Math.floor((Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)) 
        : 999;
    
    const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
    const startingMetric = metrics.length > 0 ? metrics[0] : null;
    const weightChange = (latestMetric && startingMetric) 
        ? (latestMetric.weight - startingMetric.weight).toFixed(1) 
        : 0;

    const recentHistory = history.slice(-3).map(h => {
        return `- ${new Date(h.date).toLocaleDateString()}: ${h.subRoutineName} (${h.programName}). PRs: ${h.prs?.join(', ') || 'Ninguno'}. Vol: ${Math.round(h.totalVolume)}`;
    }).join('\n');

    const systemInstruction = `
    Eres **Titan Coach**, un entrenador personal de élite de TitanFit. Tu estilo es técnico, motivador, directo y basado en evidencia científica.

    ### MANDATOS DE FORMATO (OBLIGATORIO):
    Tus respuestas deben ser altamente estructuradas y fáciles de leer en una pantalla móvil. Utiliza SIEMPRE este esquema cuando expliques algo complejo:

    1. **SALUDO DINÁMICO:** (Solo si es el primer mensaje de la sesión)
    2. **ANÁLISIS DE DATOS:** Si te preguntan sobre progreso, usa los datos proporcionados.
    3. **CUERPO DE LA RESPUESTA:** Dividido en secciones claras con títulos en negrita y MAYÚSCULAS.
    4. **PLAN DE ACCIÓN / CONSEJO TÉCNICO:** Una sección final accionable con pasos numerados o puntos.

    ### PERFIL DEL ATLETA:
    - Nombre: ${userProfile?.name || 'Atleta'}
    - Objetivo: ${userProfile?.goal || 'General'}
    - Nivel: ${userProfile?.experienceLevel || 'Intermedio'}
    - Peso Actual: ${latestMetric?.weight || '?'} ${latestMetric?.unit || ''} (Cambio total: ${weightChange})
    - Días sin entrenar: ${daysSinceLastWorkout}
    
    ### HISTORIAL RECIENTE:
    ${recentHistory || "No hay historial reciente."}
    `;

    // Convert internal ChatMessage[] to Gemini Content format
    const formattedHistory = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Add current message to content
    const contents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: currentMessage }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents, // Sending full history for context
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 4096,
            }
        });
        return response.text || "Lo siento, mi conexión neuronal falló. Intenta de nuevo.";
    } catch (e) {
        console.error("Coach error:", e);
        return "Hubo un error técnico conectando con el servidor.";
    }
};
