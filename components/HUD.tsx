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

// Simple Virtual Joystick Component
const Joystick = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    
    useEffect(() => {
        const container = containerRef.current;
        const knob = knobRef.current;
        if (!container || !knob) return;

        let startX = 0, startY = 0;
        const maxDist = 40;

        const handleStart = (e: TouchEvent | MouseEvent) => {
            setActive(true);
            const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
            startX = clientX;
            startY = clientY;
        };

        const handleMove = (e: TouchEvent | MouseEvent) => {
            if (!active) return;
            // e.preventDefault(); // Handled by touch-action: none
            const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
            
            const dx = clientX - startX;
            const dy = clientY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const clampedDist = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);
            
            const moveX = Math.cos(angle) * clampedDist;
            const moveY = Math.sin(angle) * clampedDist;

            knob.style.transform = `translate(${moveX}px, ${moveY}px)`;

            // Normalize -1 to 1
            const normX = moveX / maxDist;
            const normY = moveY / maxDist;

            window.dispatchEvent(new CustomEvent('joystick-move', { detail: { x: normX, y: normY } }));
        };

        const handleEnd = () => {
            setActive(false);
            knob.style.transform = `translate(0px, 0px)`;
            window.dispatchEvent(new CustomEvent('joystick-move', { detail: { x: 0, y: 0 } }));
        };

        container.addEventListener('touchstart', handleStart);
        container.addEventListener('touchmove', handleMove);
        container.addEventListener('touchend', handleEnd);
        // Mouse fallback for testing
        container.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        return () => {
            container.removeEventListener('touchstart', handleStart);
            container.removeEventListener('touchmove', handleMove);
            container.removeEventListener('touchend', handleEnd);
            container.removeEventListener('mousedown', handleStart);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
        }
    }, [active]);

    return (
        <div ref={containerRef} className="w-32 h-32 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm flex items-center justify-center pointer-events-auto touch-none">
            <div ref={knobRef} className="w-12 h-12 bg-kana-yellow/80 rounded-full shadow-lg" />
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

    return <div ref={ref} className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto touch-none z-0" />
}

const HUD: React.FC<HUDProps> = ({ player, wave, score, fps, objective, onRestart, gameOver }) => {
  const healthPercent = (player.health / player.maxHealth) * 100;

  const selectWeapon = (idx: number) => {
      window.dispatchEvent(new CustomEvent('weapon-select', { detail: idx }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-white overflow-hidden font-sans touch-none">
      
      {/* Touch Aim Zone (Right Half) */}
      {!gameOver && <TouchAimArea />}

      {/* Top Bar: Status & Mission */}
      <div className="flex justify-between items-start p-6 z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-br-2xl border-l-4 border-kana-yellow backdrop-blur-sm shadow-lg">
             <div className="relative">
               <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border-2 border-white">
                  <img src="https://picsum.photos/100/100" alt="Kana" className="opacity-80" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] px-1 rounded font-bold">Lvl. {wave}</div>
             </div>
             <div>
               <h1 className="text-xl font-bold text-white tracking-widest">KANA</h1>
               <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mt-1">
                 <div 
                    className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-200"
                    style={{ width: `${healthPercent}%` }}
                 />
               </div>
               <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                 <Heart size={12} className="text-red-500"/> {Math.floor(player.health)}/{player.maxHealth}
               </div>
             </div>
          </div>
          
          {/* Mission Objective */}
          <div className="mt-4 bg-black/60 p-3 rounded text-sm max-w-md border-l-2 border-blue-400">
            <p className="text-blue-300 font-bold mb-1 flex items-center gap-2"><Activity size={14}/> MISSION LOG</p>
            <p className="opacity-90">{objective}</p>
          </div>
        </div>

        {/* Top Right: Controls & Stats */}
        <div className="flex flex-col items-end gap-2">
           <div className="bg-slate-900/80 p-4 rounded-bl-2xl border-r-4 border-kana-yellow backdrop-blur-sm">
             <div className="text-2xl font-black text-kana-yellow">{score.toLocaleString()} <span className="text-xs text-white font-normal">PTS</span></div>
             <div className="text-xs text-gray-400 text-right">WAVE {wave}</div>
           </div>
           <div className="bg-black/40 p-2 rounded text-[10px] text-gray-300 font-mono hidden md:block">
              WASD: Move | Mouse: Aim | Click: Fire <br/>
              Space: Dash | Q/E: Switch Weapon
           </div>
           <div className="text-[10px] text-gray-500">FPS: {Math.round(fps)}</div>
        </div>
      </div>

      {/* Center: Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm z-50">
          <div className="text-center p-8 border-2 border-kana-yellow bg-slate-900 rounded-xl shadow-2xl transform scale-110">
            <Skull size={64} className="mx-auto text-red-500 mb-4 animate-pulse" />
            <h2 className="text-4xl font-bold text-white mb-2 tracking-widest uppercase">Mission Failed</h2>
            <p className="text-gray-400 mb-6">KANA system critical. Reboot required.</p>
            <div className="text-2xl text-kana-yellow mb-8 font-mono">SCORE: {score}</div>
            <button 
              onClick={onRestart}
              className="bg-kana-yellow text-black px-8 py-3 rounded-full font-bold hover:bg-white transition-all flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={20} /> REBOOT SYSTEM
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar: Controls & Weapons */}
      <div className="flex justify-between items-end p-6 pb-8 z-10">
        
        {/* Left: Joystick */}
        <div className="ml-4 mb-4 opacity-80 hover:opacity-100 transition-opacity">
            {!gameOver && <Joystick />}
        </div>

        {/* Right: Weapons & Skills */}
        <div className="flex items-end gap-6 mr-4">
            {/* Skill Button */}
            <div className={`relative group`}>
            <div className={`w-16 h-16 rounded-full border-2 ${player.dashCooldown <= 0 ? 'border-blue-400 bg-blue-900/50' : 'border-gray-700 bg-gray-900'} flex items-center justify-center shadow-lg transition-all`}>
                <Zap size={24} className={player.dashCooldown <= 0 ? 'text-white' : 'text-gray-500'} />
            </div>
            <div className="absolute -bottom-6 w-full text-center text-[10px] font-bold text-gray-400">DASH</div>
            {player.dashCooldown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-xs font-mono">
                {(player.dashCooldown / 1000).toFixed(1)}
                </div>
            )}
            </div>

            {/* Weapon Slots */}
            <div className="flex gap-2 bg-slate-900/90 p-2 rounded-2xl border border-gray-700 backdrop-blur-md pointer-events-auto">
            {player.weapons.map((w, idx) => (
                <div 
                key={idx}
                onClick={() => selectWeapon(idx)}
                className={`relative w-16 h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer
                    ${player.currentWeaponIndex === idx 
                    ? 'border-kana-yellow bg-yellow-900/20 scale-110 -translate-y-2 shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                    : 'border-gray-700 bg-gray-800/50 opacity-60 hover:opacity-100'}
                `}
                >
                    <Crosshair size={20} style={{ color: w.color }} />
                    <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{w.type}</span>
                    
                    {w.maxAmmo > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div 
                        className="h-full bg-white" 
                        style={{ width: `${(w.ammo / w.maxAmmo) * 100}%`}}
                        />
                    </div>
                    )}
                    {w.maxAmmo === -1 && <div className="absolute bottom-1 text-[9px] text-gray-400">∞</div>}

                    <div className="absolute top-1 right-1 text-[8px] text-gray-500">{idx + 1}</div>
                </div>
            ))}
            </div>
        </div>
      </div>
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] z-0" />
    </div>
  );
};

export default HUD;