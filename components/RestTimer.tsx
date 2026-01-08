import React, { useEffect, useRef } from 'react';

interface RestTimerProps {
  timeLeft: number;
  isActive: boolean;
  onTimeChange: (newTime: number) => void;
  onStateChange: (isActive: boolean) => void;
  onComplete: () => void;
}

const RestTimer: React.FC<RestTimerProps> = ({ timeLeft, isActive, onTimeChange, onStateChange, onComplete }) => {
  // Audio ref for beep
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        onTimeChange(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      onStateChange(false);
      onComplete(); // Trigger parent completion logic (sound)
      playAlarm();
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeChange, onStateChange, onComplete]);

  const playAlarm = () => {
    // 1. Haptic Feedback (Vibration)
    if (navigator.vibrate) {
        // Vibrate: 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200]);
    }

    // 2. Audio Beep
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      
      osc.start();
      setTimeout(() => {
        osc.stop();
        // Double beep
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 880;
            gain2.gain.value = 0.1;
            osc2.start();
            setTimeout(() => osc2.stop(), 150);
        }, 200);
      }, 150);

    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const startTimer = (seconds: number) => {
    // Initialize audio context on user interaction
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    onTimeChange(seconds);
    onStateChange(true);
  };

  const cancelTimer = () => {
    onStateChange(false);
    onTimeChange(0);
  };

  const addTime = (seconds: number) => {
    onTimeChange(Math.max(0, timeLeft + seconds));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full">
      {isActive ? (
        <div className="flex items-center justify-between bg-[var(--color-bg)]/80 border border-[var(--color-primary)]/30 shadow-[0_0_15px_rgba(184,242,92,0.1)] rounded-xl p-2 px-4 backdrop-blur-md transition-all animate-fadeIn">
           <div className="flex items-center gap-3">
             <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]"></span>
             </span>
             <span className="text-2xl font-mono font-bold tabular-nums tracking-tight text-[var(--color-text)]">
               {formatTime(timeLeft)}
             </span>
           </div>
           
           <div className="flex gap-2">
              <button onClick={() => addTime(10)} className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-bold py-1.5 px-3 rounded-lg border border-[var(--color-border)] transition text-[var(--color-text)]">+10s</button>
              <button onClick={cancelTimer} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg border border-red-500/30 transition">
                Stop
              </button>
           </div>
        </div>
      ) : (
        <div className="flex gap-2 items-center overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase tracking-widest whitespace-nowrap mr-1">Descanso:</span>
            <button onClick={() => startTimer(30)} className="flex-1 min-w-[50px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--color-border)] transition hover:border-[var(--color-primary)]/50">30s</button>
            <button onClick={() => startTimer(60)} className="flex-1 min-w-[50px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--color-border)] transition hover:border-[var(--color-primary)]/50">60s</button>
            <button onClick={() => startTimer(90)} className="flex-1 min-w-[50px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--color-border)] transition hover:border-[var(--color-primary)]/50">90s</button>
            <button onClick={() => startTimer(120)} className="flex-1 min-w-[50px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--color-border)] transition hover:border-[var(--color-primary)]/50">2m</button>
            <button onClick={() => startTimer(180)} className="flex-1 min-w-[50px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--color-border)] transition hover:border-[var(--color-primary)]/50">3m</button>
        </div>
      )}
    </div>
  );
};

export default RestTimer;