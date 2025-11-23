import React, { useState, useCallback } from 'react';
import GameCanvas, { AudioSystem } from './components/GameCanvas';
import HUD from './components/HUD';
import { Player } from './types';
import { WEAPONS } from './constants';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [hudState, setHudState] = useState({
    player: {
      id: 'player',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 20,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      color: '#FFFFFF',
      dead: false,
      speed: 0,
      dashCooldown: 0,
      isDashing: false,
      dashDuration: 0,
      dashVector: { x: 0, y: 0 },
      currentWeaponIndex: 0,
      weapons: WEAPONS,
      score: 0
    } as Player,
    wave: 1,
    score: 0,
    fps: 60,
    gameOver: false,
    objective: 'Initialize...'
  });

  const handleUpdateHUD = useCallback((player: Player, wave: number, score: number, fps: number, gameOver: boolean, objective: string) => {
    setHudState({ player, wave, score, fps, gameOver, objective });
  }, []);

  const handleRestart = () => {
     // @ts-ignore - interacting with Canvas imperative handle via global for simplicity in this setup
     if (window.restartGame) window.restartGame();
  };

  if (!gameStarted) {
    return (
      <div className="relative w-full h-screen bg-slate-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?blur=10')] opacity-30 bg-cover bg-center"></div>
        <div className="z-10 text-center p-12 bg-black/60 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl max-w-2xl">
          <div className="mb-6 inline-block p-4 rounded-full bg-kana-yellow shadow-[0_0_30px_rgba(255,215,0,0.5)]">
            <img src="https://picsum.photos/100/100" alt="Logo" className="w-24 h-24 rounded-full object-cover grayscale contrast-125" />
          </div>
          <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">PROJECT <span className="text-kana-yellow">KANA</span></h1>
          <p className="text-blue-300 text-lg font-mono mb-8 tracking-widest">TACTICAL RABBIT OPERATIONS</p>
          
          <div className="grid grid-cols-2 gap-4 text-left text-gray-400 text-sm mb-8 bg-black/40 p-4 rounded-lg">
             <div>• ANTHROPOMORPHIC ASSAULT UNIT</div>
             <div>• ZOMBIE ERADICATION PROTOCOL</div>
             <div>• DYNAMIC WEAPON SYSTEMS</div>
             <div>• CYBERNETIC ENHANCEMENTS</div>
          </div>

          <button 
            onClick={() => {
              // Audio must be initialized on a user gesture (click)
              AudioSystem.init();
              setGameStarted(true);
            }}
            className="group relative px-8 py-4 bg-kana-yellow text-black font-bold text-xl rounded-sm overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,215,0,0.6)]"
          >
            <span className="relative z-10">INITIATE MISSION</span>
            <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 mix-blend-overlay"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-900">
      <GameCanvas onUpdateHUD={handleUpdateHUD} />
      <HUD 
        player={hudState.player} 
        wave={hudState.wave} 
        score={hudState.score} 
        fps={hudState.fps}
        gameOver={hudState.gameOver}
        objective={hudState.objective}
        onRestart={handleRestart}
      />
    </div>
  );
}

export default App;