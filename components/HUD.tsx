import React, { useRef, useEffect, useState } from 'react';
import { Player, Weapon, WeaponType } from '../types';
import { Heart, Zap, Crosshair, Skull, RotateCcw, Activity } from 'lucide-react';

interface HUDProps {
  player: Player;
  wave: number;
  score: number;
  fps: number;
  objective: string;
  onRestart: () => void;
  gameOver: boolean;
}

// Dynamic Virtual Joystick (Appears on touch)
const DynamicJoystick = () => {
    const [origin, setOrigin] = useState<{x: number, y: number} | null>(null);
    const [current, setCurrent] = useState<{x: number, y: number} | null>(null);
    const maxDist = 50; // Visual clamp distance

    const handleStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setOrigin({ x: touch.clientX, y: touch.clientY });
        setCurrent({ x: touch.clientX, y: touch.clientY });
    };

    const handleMove = (e: React.TouchEvent) => {
        if (!origin) return;
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        
        const dx = clientX - origin.x;
        const dy = clientY - origin.y;
        
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        // Clamp visual knob position
        const clampedDist = Math.min(dist, maxDist);
        const knobX = origin.x + Math.cos(angle) * clampedDist;
        const knobY = origin.y + Math.sin(angle) * clampedDist;
        
        setCurrent({ x: knobX, y: knobY });

        // Normalize output -1 to 1 for game logic
        const normX = (Math.cos(angle) * clampedDist) / maxDist;
        const normY = (Math.sin(angle) * clampedDist) / maxDist;

        window.dispatchEvent(new CustomEvent('joystick-move', { detail: { x: normX, y: normY } }));
    };

    const handleEnd = () => {
        setOrigin(null);
        setCurrent(null);
        window.dispatchEvent(new CustomEvent('joystick-move', { detail: { x: 0, y: 0 } }));
    };

    return (
        <div 
            className="absolute top-0 left-0 w-1/2 h-full z-20 touch-none pointer-events-auto"
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {origin && current && (
                <>
                    {/* Base Ring */}
                    <div 
                        className="fixed w-24 h-24 rounded-full border-2 border-white/30 bg-white/10 -translate-x-1/2 -translate-y-1/2 pointer-events-none backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        style={{ left: origin.x, top: origin.y }}
                    />
                    {/* Knob */}
                    <div 
                        className="fixed w-12 h-12 rounded-full bg-kana-yellow/90 shadow-[0_0_15px_rgba(255,215,0,0.6)] -translate-x-1/2 -translate-y-1/2 pointer-events-none border-2 border-white/50"
                        style={{ left: current.x, top: current.y }}
                    />
                </>
            )}
        </div>
    );
};

const TouchAimArea = () => {
    const ref = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const el = ref.current;
        if(!el) return;

        const handleTouch = (e: TouchEvent) => {
            // e.preventDefault(); 
            const touch = e.touches[0];
            if (touch) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                const x = touch.clientX / w;
                const y = touch.clientY / h;
                window.dispatchEvent(new CustomEvent('touch-aim', { detail: { x, y, firing: true } }));
            }
        };
        
        const handleEnd = () => {
             // Just stop firing, don't change aim position abruptly
             window.dispatchEvent(new CustomEvent('touch-aim', { detail: { firing: false } }));
        };

        el.addEventListener('touchstart', handleTouch);
        el.addEventListener('touchmove', handleTouch);
        el.addEventListener('touchend', handleEnd);
        return () => {
            el.removeEventListener('touchstart', handleTouch);
            el.removeEventListener('touchmove', handleTouch);
            el.removeEventListener('touchend', handleEnd);
        }
    }, []);

    // Right half of screen
    return <div ref={ref} className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto touch-none z-20" />
}

const HUD: React.FC<HUDProps> = ({ player, wave, score, fps, objective, onRestart, gameOver }) => {
  const healthPercent = (player.health / player.maxHealth) * 100;

  const selectWeapon = (idx: number) => {
      window.dispatchEvent(new CustomEvent('weapon-select', { detail: idx }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-white overflow-hidden font-sans touch-none select-none">

      {/* Top Bar: Status & Mission */}
      <div className="flex justify-between items-start p-4 md:p-6 z-30 pointer-events-none">
        <div className="flex flex-col gap-2">
          {/* Player Status */}
          <div className="flex items-center gap-3 md:gap-4 bg-slate-900/80 p-2 md:p-3 rounded-br-2xl border-l-4 border-kana-yellow backdrop-blur-sm shadow-lg max-w-[200px] md:max-w-none transition-all">
             <div className="relative">
               <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full overflow-hidden border-2 border-white">
                  <img src="https://picsum.photos/100/100" alt="Kana" className="opacity-80" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[9px] md:text-[10px] px-1 rounded font-bold">Lvl. {wave}</div>
             </div>
             <div className="flex-1 min-w-0">
               <h1 className="text-lg md:text-xl font-bold text-white tracking-widest truncate">KANA</h1>
               <div className="w-24 md:w-48 h-2 md:h-3 bg-gray-700 rounded-full overflow-hidden mt-1">
                 <div 
                    className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-200"
                    style={{ width: `${healthPercent}%` }}
                 />
               </div>
               <div className="text-[10px] md:text-xs text-gray-400 mt-1 flex items-center gap-1">
                 <Heart size={10} className="text-red-500"/> {Math.floor(player.health)}/{player.maxHealth}
               </div>
             </div>
          </div>
          
          {/* Mission Objective (Smaller on Mobile) */}
          <div className="mt-2 md:mt-4 bg-black/60 p-2 md:p-3 rounded text-xs md:text-sm max-w-[200px] md:max-w-md border-l-2 border-blue-400">
            <p className="text-blue-300 font-bold mb-1 flex items-center gap-2"><Activity size={12}/> <span className="hidden md:inline">MISSION LOG</span></p>
            <p className="opacity-90 truncate">{objective}</p>
          </div>
        </div>

        {/* Top Right: Score & Stats */}
        <div className="flex flex-col items-end gap-2">
           <div className="bg-slate-900/80 p-3 md:p-4 rounded-bl-2xl border-r-4 border-kana-yellow backdrop-blur-sm">
             <div className="text-xl md:text-2xl font-black text-kana-yellow">{score.toLocaleString()} <span className="text-[10px] text-white font-normal">PTS</span></div>
             <div className="text-[10px] text-gray-400 text-right">WAVE {wave}</div>
           </div>
           
           {/* Controls Hint (Hide on mobile) */}
           <div className="bg-black/40 p-2 rounded text-[10px] text-gray-300 font-mono hidden lg:block">
              WASD: Move | Mouse: Aim | Click: Fire <br/>
              Space: Dash | Q/E: Switch Weapon
           </div>
           <div className="text-[9px] md:text-[10px] text-gray-500">FPS: {Math.round(fps)}</div>
        </div>
      </div>

      {/* Center: Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm z-50 p-4">
          <div className="text-center p-6 md:p-8 border-2 border-kana-yellow bg-slate-900 rounded-xl shadow-2xl transform scale-100 md:scale-110 max-w-sm md:max-w-lg">
            <Skull size={48} className="mx-auto text-red-500 mb-4 animate-pulse md:w-16 md:h-16" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-widest uppercase">Mission Failed</h2>
            <p className="text-gray-400 mb-6 text-sm md:text-base">KANA system critical. Reboot required.</p>
            <div className="text-xl md:text-2xl text-kana-yellow mb-8 font-mono">SCORE: {score}</div>
            <button 
              onClick={onRestart}
              className="bg-kana-yellow text-black px-6 py-3 md:px-8 md:py-3 rounded-full font-bold hover:bg-white transition-all flex items-center gap-2 mx-auto text-sm md:text-base"
            >
              <RotateCcw size={18} /> REBOOT SYSTEM
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar: Skills & Weapons */}
      {/* Moved to bottom right and adjusted spacing for touch */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-end gap-4 z-30 pointer-events-auto">
        
        {/* Dash Button */}
        <div 
            className={`relative group active:scale-95 transition-transform cursor-pointer`}
            // Add touch handler for Dash if needed, currently mapped to Spacebar, but we can emit key event
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))}
        >
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 ${player.dashCooldown <= 0 ? 'border-blue-400 bg-blue-900/50' : 'border-gray-700 bg-gray-900'} flex items-center justify-center shadow-lg transition-all`}>
                <Zap size={20} className={`md:w-6 md:h-6 ${player.dashCooldown <= 0 ? 'text-white' : 'text-gray-500'}`} />
            </div>
            {/* Label only on bigger screens */}
            <div className="absolute -bottom-5 w-full text-center text-[9px] font-bold text-gray-400 hidden md:block">DASH</div>
            {player.dashCooldown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-xs font-mono">
                {(player.dashCooldown / 1000).toFixed(1)}
                </div>
            )}
        </div>

        {/* Weapon Slots */}
        <div className="flex gap-2 bg-slate-900/90 p-1.5 md:p-2 rounded-2xl border border-gray-700 backdrop-blur-md">
        {player.weapons.map((w, idx) => (
            <div 
            key={idx}
            onClick={(e) => {
                e.stopPropagation(); // Prevent touch-aim firing
                selectWeapon(idx);
            }}
            className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer active:scale-95
                ${player.currentWeaponIndex === idx 
                ? 'border-kana-yellow bg-yellow-900/20 shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                : 'border-gray-700 bg-gray-800/50 opacity-60 hover:opacity-100'}
            `}
            >
                <Crosshair size={16} className="md:w-5 md:h-5" style={{ color: w.color }} />
                <span className="text-[8px] md:text-[9px] font-bold mt-1 uppercase tracking-tighter hidden md:block">{w.type}</span>
                
                {w.maxAmmo > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div 
                    className="h-full bg-white" 
                    style={{ width: `${(w.ammo / w.maxAmmo) * 100}%`}}
                    />
                </div>
                )}
                {w.maxAmmo === -1 && <div className="absolute bottom-1 text-[8px] text-gray-400">∞</div>}

                <div className="absolute top-0.5 right-1 text-[8px] text-gray-500">{idx + 1}</div>
            </div>
        ))}
        </div>
      </div>
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] z-0" />
    </div>
  );
};

export default HUD;