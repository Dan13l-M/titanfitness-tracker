import React, { useRef } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface SettingsProps {
  userName: string;
  onUpdateName: (name: string) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  onDeleteAccount?: () => void;
  isLoggedIn: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  userName, 
  onUpdateName, 
  onExportData, 
  onImportData, 
  onResetData,
  onDeleteAccount,
  isLoggedIn,
  theme,
  onThemeChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ThemeButton = ({ value, icon, label }: { value: Theme; icon: string; label: string }) => (
    <button
      onClick={() => onThemeChange(value)}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
        theme === value 
          ? 'bg-[var(--color-primary)] text-[var(--color-bg)] shadow-md' 
          : 'stat-card hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs font-bold ${theme === value ? '' : 'text-[var(--color-text-muted)]'}`}>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 card p-5 rounded-2xl">
        <div>
           <h2 className="text-2xl font-black tracking-tight">
             <span className="bg-gradient-to-r from-[var(--color-text)] to-[var(--color-text-muted)] bg-clip-text text-transparent">AJUSTES</span>
             <span className="text-[var(--color-text-subtle)] mx-2">&</span>
             <span className="text-[var(--color-primary)]">DATOS</span>
           </h2>
           <p className="text-[var(--color-text-muted)] text-sm mt-1">Personalización y copias de seguridad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Theme Section - NEW */}
        <div className="card p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-xl">🎨</div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Apariencia</h3>
            </div>
            
            <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-3">Tema de Color</label>
                <div className="flex gap-3">
                  <ThemeButton value="light" icon="☀️" label="Claro" />
                  <ThemeButton value="dark" icon="🌙" label="Oscuro" />
                  <ThemeButton value="system" icon="💻" label="Sistema" />
                </div>
                <p className="text-xs text-[var(--color-text-subtle)] mt-3">
                  {theme === 'system' 
                    ? 'Se ajusta automáticamente según la preferencia de tu dispositivo.' 
                    : theme === 'light' 
                      ? 'Modo claro activado para uso diurno.'
                      : 'Modo oscuro activado para reducir fatiga visual.'}
                </p>
            </div>
        </div>

        {/* Profile Section */}
        <div className="card p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-xl">👤</div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Perfil de Usuario</h3>
            </div>
            
            <div>
                <label className="block text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-widest mb-2">Tu Nombre / Apodo</label>
                <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => onUpdateName(e.target.value)}
                    placeholder="Ej. Titan"
                    className="input-modern w-full p-4 rounded-xl text-lg font-bold"
                />
                <p className="text-xs text-[var(--color-text-subtle)] mt-2">Se usará para personalizar tu dashboard.</p>
            </div>
        </div>

        {/* Data Management Section */}
        <div className="card p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-xl">💾</div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">Gestión de Datos</h3>
            </div>

            <div className="space-y-3">
                <button 
                    onClick={onExportData}
                    className="w-full stat-card hover:bg-[var(--color-surface-hover)] p-4 rounded-xl flex items-center justify-between group transition-all border-[var(--color-secondary)]/30"
                >
                    <div className="text-left">
                        <span className="block font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">Exportar Copia de Seguridad</span>
                        <span className="text-xs text-[var(--color-text-muted)]">Descarga un archivo .json con tu historial</span>
                    </div>
                    <svg className="w-6 h-6 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>

                <div className="relative">
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full stat-card hover:bg-[var(--color-surface-hover)] p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="text-left">
                            <span className="block font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">Importar Datos</span>
                            <span className="text-xs text-[var(--color-text-muted)]">Restaura una copia desde un archivo</span>
                        </div>
                        <svg className="w-6 h-6 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-transform group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={onImportData}
                        accept=".json"
                        className="hidden" 
                    />
                </div>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 rounded-2xl border-red-500/20 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                 <svg className="w-28 h-28 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </div>
            
            <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl">⚠️</div>
                <h3 className="text-lg font-bold text-red-400">Zona de Peligro</h3>
            </div>
            
            <p className="text-sm text-[var(--color-text-muted)] max-w-xl relative z-10">
                Esta acción eliminará permanentemente todo tu historial de entrenamientos, rutinas personalizadas y métricas corporales. Esta acción no se puede deshacer.
            </p>

            <button 
                onClick={onResetData}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-3 rounded-xl font-bold transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] relative z-10"
            >
                Borrar Todos los Datos
            </button>
            
            {isLoggedIn && onDeleteAccount && (
              <button 
                onClick={onDeleteAccount}
                className="bg-red-600/10 hover:bg-red-600/30 text-red-500 border border-red-600/30 px-5 py-3 rounded-xl font-bold transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] relative z-10 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Eliminar Cuenta Permanentemente
              </button>
            )}
        </div>
      </div>
      
      <div className="text-center text-xs text-[var(--color-text-subtle)] mt-10 font-mono">
        TITAN FITNESS TRACKER v1.7.0 <br/>
        Datos almacenados localmente en su navegador.
      </div>
    </div>
  );
};

export default Settings;