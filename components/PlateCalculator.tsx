import React, { useState, useEffect } from 'react';

interface PlateCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  unit: 'kg' | 'lbs';
  onUnitChange: (unit: 'kg' | 'lbs') => void;
}

const PlateCalculator: React.FC<PlateCalculatorProps> = ({ isOpen, onClose, unit, onUnitChange }) => {
  const [targetWeight, setTargetWeight] = useState<string>('');
  // Default bars: 20kg or 45lbs
  const [barWeight, setBarWeight] = useState<number>(unit === 'kg' ? 20 : 45);
  
  // Update bar weight default when unit changes
  useEffect(() => {
    setBarWeight(unit === 'kg' ? 20 : 45);
  }, [unit]);

  if (!isOpen) return null;

  const calculatePlates = () => {
    const totalWeight = parseFloat(targetWeight);
    if (isNaN(totalWeight) || totalWeight < barWeight) return [];

    let remainingWeight = (totalWeight - barWeight) / 2;
    const plates: number[] = [];
    
    // Define available plates based on unit
    const availablePlates = unit === 'kg' 
        ? [25, 20, 15, 10, 5, 2.5, 1.25] 
        : [45, 35, 25, 10, 5, 2.5]; // Standard commercial gym lbs plates

    for (const plate of availablePlates) {
      while (remainingWeight >= plate) {
        plates.push(plate);
        remainingWeight -= plate;
      }
    }
    return plates;
  };

  const platesPerSide = calculatePlates();

  // Color mapping logic
  const getPlateStyle = (plate: number) => {
    if (unit === 'kg') {
        if (plate === 25) return { height: 'h-16', color: 'bg-red-600' };
        if (plate === 20) return { height: 'h-16', color: 'bg-blue-600' };
        if (plate === 15) return { height: 'h-14', color: 'bg-yellow-500' };
        if (plate === 10) return { height: 'h-12', color: 'bg-green-600' };
        return { height: 'h-10', color: 'bg-white text-black' };
    } else {
        // LBS coloring (Standard Iron or loosely based on bumper equivalent mass)
        if (plate === 45) return { height: 'h-16', color: 'bg-gray-800 border border-gray-600' }; // Standard 45 plate
        if (plate === 35) return { height: 'h-14', color: 'bg-gray-700 border border-gray-600' };
        if (plate === 25) return { height: 'h-12', color: 'bg-gray-600 border border-gray-500' };
        if (plate === 10) return { height: 'h-10', color: 'bg-gray-500' };
        return { height: 'h-8', color: 'bg-gray-400 text-black' };
    }
  };

  return (
    <div className="modal-backdrop animate-fadeIn" onClick={onClose}>
      <div className="card w-full max-w-sm rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition">✕</button>
        
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--color-text)]">
            🧮 Calculadora
            </h3>
            <div className="flex bg-[var(--color-bg)] rounded-lg p-1 border border-[var(--color-border)]">
                <button 
                    onClick={() => onUnitChange('kg')}
                    className={`px-3 py-1 text-xs font-bold rounded ${unit === 'kg' ? 'bg-[var(--color-primary)] text-[var(--color-bg)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
                >
                    KG
                </button>
                <button 
                    onClick={() => onUnitChange('lbs')}
                    className={`px-3 py-1 text-xs font-bold rounded ${unit === 'lbs' ? 'bg-[var(--color-primary)] text-[var(--color-bg)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
                >
                    LBS
                </button>
            </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[var(--color-text-muted)] text-xs mb-1">Peso Total ({unit})</label>
            <input 
              type="number" 
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder={unit === 'kg' ? "Ej. 100" : "Ej. 225"}
              autoFocus
              className="input-modern w-full text-2xl font-bold p-3 rounded-lg text-center"
            />
          </div>

          <div className="flex justify-center gap-2 text-xs">
             {unit === 'kg' ? (
                <>
                    <button onClick={() => setBarWeight(20)} className={`px-3 py-2 rounded border transition ${barWeight === 20 ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)] font-bold' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Barra 20kg</button>
                    <button onClick={() => setBarWeight(15)} className={`px-3 py-2 rounded border transition ${barWeight === 15 ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)] font-bold' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Barra 15kg</button>
                </>
             ) : (
                <>
                    <button onClick={() => setBarWeight(45)} className={`px-3 py-2 rounded border transition ${barWeight === 45 ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)] font-bold' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Barra 45lbs</button>
                    <button onClick={() => setBarWeight(35)} className={`px-3 py-2 rounded border transition ${barWeight === 35 ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)] font-bold' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Barra 35lbs</button>
                </>
             )}
          </div>

          <div className="bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)] min-h-[120px] flex flex-col items-center justify-center">
             {targetWeight ? (
               <>
                 <p className="text-[var(--color-text-subtle)] text-[10px] mb-3 uppercase tracking-widest">Placas por lado</p>
                 <div className="flex flex-wrap justify-center gap-1 items-end mb-2">
                    <div className="w-1.5 h-12 bg-gray-400 mr-1 rounded-sm"></div> {/* Bar end */}
                    {platesPerSide.length > 0 ? (
                      platesPerSide.map((plate, idx) => {
                        const style = getPlateStyle(plate);
                        return (
                          <div key={idx} className={`w-3 md:w-4 ${style.height} ${style.color} rounded-sm flex items-center justify-center shadow-lg relative group`}>
                             <span className="absolute -top-6 text-[10px] bg-black/80 px-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 text-white">
                                {plate}
                             </span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[var(--color-text-subtle)] text-sm italic">Peso insuficiente</span>
                    )}
                 </div>
                 {platesPerSide.length > 0 && (
                   <div className="mt-2 text-sm font-mono text-[var(--color-text)]">
                     {platesPerSide.join(' + ')} <span className="text-[var(--color-text-subtle)] text-xs">{unit}</span>
                   </div>
                 )}
               </>
             ) : (
               <span className="text-[var(--color-text-subtle)] text-sm">Introduce peso objetivo</span>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlateCalculator;