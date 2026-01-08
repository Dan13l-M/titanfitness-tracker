import React, { useState } from 'react';
import { UserProfile, FitnessGoal } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    gender: 'Male',
    experienceLevel: 'Principiante',
    goal: FitnessGoal.Hypertrophy,
    name: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFinish = () => {
    if (formData.name && formData.age && formData.weight && formData.height) {
      onComplete(formData as UserProfile);
    } else {
        alert("Por favor completa todos los campos.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="card w-full max-w-lg p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-border)]">
            <div className="h-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <div className="relative z-10">
            {step === 1 && (
                <div className="animate-fadeIn">
                    <h2 className="text-3xl font-black italic mb-2 text-[var(--color-text)]">BIENVENIDO A TITAN<span className="text-[var(--color-primary)] not-italic">FIT</span></h2>
                    <p className="text-[var(--color-text-muted)] mb-8">Antes de empezar, necesitamos conocerte un poco mejor para personalizar tu experiencia.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">¿Cómo te llamas?</label>
                            <input 
                                type="text" 
                                className="input-modern w-full p-4 rounded-xl text-lg"
                                placeholder="Tu nombre"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Género</label>
                            <div className="flex gap-4">
                                {['Male', 'Female', 'Other'].map((g) => (
                                    <button 
                                        key={g}
                                        onClick={() => handleChange('gender', g)}
                                        className={`flex-1 p-3 rounded-xl font-bold border transition ${formData.gender === g ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-hover)]'}`}
                                    >
                                        {g === 'Male' ? 'Hombre' : g === 'Female' ? 'Mujer' : 'Otro'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Nivel de Experiencia</label>
                            <select 
                                className="input-modern w-full p-4 rounded-xl"
                                value={formData.experienceLevel}
                                onChange={e => handleChange('experienceLevel', e.target.value)}
                            >
                                <option>Principiante</option>
                                <option>Intermedio</option>
                                <option>Avanzado</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={nextStep} 
                            disabled={!formData.name}
                            className="btn-primary py-3 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente ➔
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fadeIn">
                    <h2 className="text-3xl font-black mb-2 text-[var(--color-text)]">TUS DATOS FÍSICOS</h2>
                    <p className="text-[var(--color-text-muted)] mb-8">Para calcular mejor tus métricas y progreso.</p>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Edad</label>
                            <input 
                                type="number" 
                                className="input-modern w-full p-4 rounded-xl text-lg"
                                placeholder="Años"
                                value={formData.age || ''}
                                onChange={e => handleChange('age', parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Altura (cm)</label>
                            <input 
                                type="number" 
                                className="input-modern w-full p-4 rounded-xl text-lg"
                                placeholder="175"
                                value={formData.height || ''}
                                onChange={e => handleChange('height', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Peso Actual (kg)</label>
                        <input 
                            type="number" 
                            className="input-modern w-full p-4 rounded-xl text-lg"
                            placeholder="70.5"
                            value={formData.weight || ''}
                            onChange={e => handleChange('weight', parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button 
                            onClick={prevStep} 
                            className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] font-bold py-3 px-4 transition"
                        >
                            Atrás
                        </button>
                        <button 
                            onClick={nextStep} 
                            disabled={!formData.age || !formData.height || !formData.weight}
                            className="btn-primary py-3 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente ➔
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fadeIn">
                    <h2 className="text-3xl font-black mb-2 text-[var(--color-text)]">TU OBJETIVO</h2>
                    <p className="text-[var(--color-text-muted)] mb-8">¿Qué quieres lograr con TitanFit?</p>

                    <div className="space-y-3">
                        {Object.values(FitnessGoal).map((goal) => (
                            <button 
                                key={goal}
                                onClick={() => handleChange('goal', goal)}
                                className={`w-full p-4 rounded-xl text-left border transition flex justify-between items-center group ${formData.goal === goal ? 'bg-[var(--color-secondary)]/20 border-[var(--color-secondary)] text-[var(--color-text)]' : 'bg-[var(--color-surface)] border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'}`}
                            >
                                <span className="font-bold">{goal}</span>
                                {formData.goal === goal && <span className="text-[var(--color-secondary)]">✓</span>}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button 
                            onClick={prevStep} 
                            className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] font-bold py-3 px-4 transition"
                        >
                            Atrás
                        </button>
                        <button 
                            onClick={handleFinish} 
                            className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-black py-4 px-10 rounded-xl hover:shadow-[0_0_25px_rgba(184,242,92,0.3)] transition transform hover:-translate-y-1 w-auto"
                        >
                            ¡COMENZAR!
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;