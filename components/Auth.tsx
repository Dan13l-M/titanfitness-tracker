import React, { useState } from 'react';
import { 
  isSupabaseConfigured, 
  supabaseSignIn, 
  supabaseSignUp, 
  supabaseResetPassword 
} from '../services/supabaseService';


interface AuthProps {
  onLoginSuccess: (user: any) => void;
  onGuestMode: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onGuestMode }) => {
  const [view, setView] = useState<'login' | 'signup' | 'verify' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured()) {
        setError("Supabase no está configurado. Revisa las variables de entorno.");
        setLoading(false);
        return;
    }

    try {
      if (view === 'login') {
        const result = await supabaseSignIn(email, password);
        if (result.user) {
          onLoginSuccess(result.user);
        }
      } else if (view === 'signup') {
        const result = await supabaseSignUp(email, password);
        if (result.user) {
          // Show verification screen instead of auto-login
          setView('verify');
        }
      } else if (view === 'forgot') {
        await supabaseResetPassword(email);
        setSuccessMsg("¡Enlace enviado! Revisa tu correo para restablecer la contraseña.");
      }

    } catch (err: any) {
      let message = err.message || 'Error de autenticación';
      if (err.code === 'auth/invalid-email') message = 'Correo electrónico inválido';
      if (err.code === 'auth/user-disabled') message = 'Esta cuenta ha sido deshabilitada';
      if (err.code === 'auth/user-not-found') message = 'No existe una cuenta con este correo';
      if (err.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
      if (err.code === 'auth/email-already-in-use') message = 'Ya existe una cuenta con este correo';
      if (err.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres';
      if (err.code === 'auth/invalid-credential') message = 'Credenciales inválidas. Verifica tu correo y contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'verify') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
            <div className="card w-full max-w-md p-8 rounded-3xl shadow-2xl text-center animate-fadeIn">
                <div className="w-20 h-20 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--color-primary)]/50 shadow-[0_0_20px_rgba(184,242,92,0.2)]">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-2xl font-black mb-2 text-[var(--color-text)]">¡Verifica tu Correo!</h2>
                <p className="text-[var(--color-text-muted)] mb-6">
                    Hemos enviado un enlace de confirmación a <strong className="text-[var(--color-primary)]">{email}</strong>. 
                    Por favor, revísalo para activar tu cuenta.
                </p>
                <button 
                    onClick={() => setView('login')}
                    className="btn-secondary w-full py-3 px-6 rounded-xl font-bold"
                >
                    Volver a Iniciar Sesión
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="card w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-[var(--color-primary)]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-[var(--color-secondary)]/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}></div>

        <div className="relative z-10 text-center mb-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)]/10 rounded-2xl mb-4 border border-[var(--color-primary)]/20">
            <span className="text-3xl">💪</span>
          </div>
           <h1 className="text-4xl font-black italic tracking-tighter mb-2 text-[var(--color-text)]">
             TITAN<span className="text-[var(--color-primary)] not-italic">FIT</span>
           </h1>
           <p className="text-[var(--color-text-muted)] text-sm">Tu entrenador personal, ahora en la nube.</p>
        </div>

        {/* View indicator */}
        <div className="flex gap-1 justify-center mb-6">
          <div className={`h-1 rounded-full transition-all ${view === 'login' ? 'w-8 bg-[var(--color-primary)]' : 'w-2 bg-[var(--color-border)]'}`}></div>
          <div className={`h-1 rounded-full transition-all ${view === 'signup' ? 'w-8 bg-[var(--color-primary)]' : 'w-2 bg-[var(--color-border)]'}`}></div>
          <div className={`h-1 rounded-full transition-all ${view === 'forgot' ? 'w-8 bg-[var(--color-primary)]' : 'w-2 bg-[var(--color-border)]'}`}></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
           {error && (
             <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm text-center animate-fadeIn flex items-center gap-2 justify-center">
               <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
               <span>{error}</span>
             </div>
           )}
           {successMsg && (
             <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-sm text-center animate-fadeIn flex items-center gap-2 justify-center">
               <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
               <span>{successMsg}</span>
             </div>
           )}

           <div className="space-y-3">
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
               </div>
               <input 
                 type="email" 
                 placeholder="Correo electrónico" 
                 required
                 className="input-modern w-full p-4 pl-12 rounded-xl"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
               />
             </div>
             
             {view !== 'forgot' && (
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <input 
                   type="password" 
                   placeholder="Contraseña" 
                   required
                   minLength={6}
                   className="input-modern w-full p-4 pl-12 rounded-xl"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
               </div>
             )}
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full btn-primary py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
           >
             <span className="relative z-10 flex items-center justify-center gap-2">
               {loading ? (
                 <>
                   <span className="w-5 h-5 border-2 border-[var(--color-bg)] border-t-transparent rounded-full animate-spin"></span>
                   Procesando...
                 </>
               ) : (
                 <>
                   {view === 'login' ? 'Iniciar Sesión' : view === 'signup' ? 'Crear Cuenta' : 'Enviar Enlace'}
                   <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </>
               )}
             </span>
           </button>
        </form>

        <div className="mt-6 text-center space-y-3 relative z-10">
           {view === 'login' && (
               <>
                <button 
                    onClick={() => { setView('signup'); setError(null); }}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm font-medium transition block w-full py-2"
                >
                    ¿No tienes cuenta? <span className="font-bold text-[var(--color-primary)]">Regístrate</span>
                </button>
                <button 
                    onClick={() => { setView('forgot'); setError(null); }}
                    className="text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] text-xs transition block w-full"
                >
                    Olvidé mi contraseña
                </button>
               </>
           )}
           
           {(view === 'signup' || view === 'forgot') && (
               <button 
                onClick={() => { setView('login'); setError(null); setSuccessMsg(null); }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm font-medium transition inline-flex items-center gap-1"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                 Volver a Iniciar Sesión
               </button>
           )}
           
           <div className="border-t border-[var(--color-border)] pt-4 mt-4">
             <button 
               onClick={onGuestMode}
               className="text-[var(--color-secondary)] hover:text-[var(--color-primary)] text-sm font-bold transition flex items-center justify-center gap-2 mx-auto group"
             >
               <span className="w-8 h-8 rounded-full bg-[var(--color-secondary)]/10 flex items-center justify-center group-hover:bg-[var(--color-secondary)]/20 transition">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               </span>
               Continuar como Invitado
             </button>
             <p className="text-[var(--color-text-subtle)] text-xs mt-2">Los datos se guardarán solo en este dispositivo</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
