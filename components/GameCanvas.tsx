import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Vector2, Player, Enemy, Bullet, GameState, EnemyType, 
  WeaponType, Particle, FloatingText 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, WEAPONS, 
  ZOMBIE_STATS, COLORS, PLAYER_DASH_SPEED 
} from '../constants';

interface GameCanvasProps {
  onUpdateHUD: (player: Player, wave: number, score: number, fps: number, gameOver: boolean, objective: string) => void;
}

const TILE_SIZE = 512;
const GROUND_SIZE = 4000;

// --- Simple Audio Synthesizer ---
export const AudioSystem = {
  ctx: null as AudioContext | null,
  bgmNodes: [] as AudioNode[],
  bgmInterval: null as number | null,
  
  init: () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioSystem.ctx) {
      AudioSystem.ctx = new AudioContextClass();
    }

    // CRITICAL: Always try to resume if suspended. 
    // This must happen inside a user interaction (click/key).
    if (AudioSystem.ctx.state === 'suspended') {
      AudioSystem.ctx.resume();
    }

    // Only start BGM if not already playing
    if (!AudioSystem.bgmInterval) {
      AudioSystem.startBGM();
    }
  },

  playTone: (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (!AudioSystem.ctx) return;
    const osc = AudioSystem.ctx.createOscillator();
    const gain = AudioSystem.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, AudioSystem.ctx.currentTime);
    gain.gain.setValueAtTime(vol, AudioSystem.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, AudioSystem.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(AudioSystem.ctx.destination);
    osc.start();
    osc.stop(AudioSystem.ctx.currentTime + duration);
  },

  playNoise: (duration: number, vol: number = 0.2) => {
    if (!AudioSystem.ctx) return;
    const bufferSize = AudioSystem.ctx.sampleRate * duration;
    const buffer = AudioSystem.ctx.createBuffer(1, bufferSize, AudioSystem.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = AudioSystem.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = AudioSystem.ctx.createGain();
    const filter = AudioSystem.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    gain.gain.setValueAtTime(vol, AudioSystem.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, AudioSystem.ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(AudioSystem.ctx.destination);
    noise.start();
  },

  playShot: (weaponIdx: number) => {
    if (!AudioSystem.ctx) return;
    const t = AudioSystem.ctx.currentTime;
    const osc = AudioSystem.ctx.createOscillator();
    const gain = AudioSystem.ctx.createGain();
    osc.connect(gain);
    gain.connect(AudioSystem.ctx.destination);

    if (weaponIdx === 0) { // Pistol
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start();
      osc.stop(t + 0.1);
    } else if (weaponIdx === 1) { // Shotgun
      AudioSystem.playNoise(0.2, 0.3);
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.start();
      osc.stop(t + 0.2);
    } else { // Plasma
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.linearRampToValueAtTime(500, t + 0.15);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
      osc.start();
      osc.stop(t + 0.15);
    }
  },

  playHit: () => {
      if (!AudioSystem.ctx) return;
      const t = AudioSystem.ctx.currentTime;
      const osc = AudioSystem.ctx.createOscillator();
      const gain = AudioSystem.ctx.createGain();
      osc.connect(gain);
      gain.connect(AudioSystem.ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start();
      osc.stop(t + 0.1);
  },

  playSwitch: () => {
      if (!AudioSystem.ctx) return;
      const t = AudioSystem.ctx.currentTime;
      const osc = AudioSystem.ctx.createOscillator();
      const gain = AudioSystem.ctx.createGain();
      osc.connect(gain);
      gain.connect(AudioSystem.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.1);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
      osc.start();
      osc.stop(t + 0.1);
  },

  startBGM: () => {
    if (!AudioSystem.ctx) return;
    if (AudioSystem.bgmInterval) return;

    // --- Pleasant Generative Music ---
    // Style: Relaxing, Soft, Pentatonic, Lo-fi vibe
    
    const ctx = AudioSystem.ctx;

    const playNote = (freq: number, type: OscillatorType, vol: number, decay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        // Soft Attack
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
        // Long Decay
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + decay);
    };

    // Scale: C Major Pentatonic (Peaceful)
    // C4, D4, E4, G4, A4, C5
    const melodyNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    
    // Chords: C Maj 7 -> F Maj 7
    const chords = [
        [130.81, 164.81, 196.00, 246.94], // C3 E3 G3 B3
        [174.61, 220.00, 261.63, 329.63]  // F3 A3 C4 E4
    ];

    let tick = 0;

    // @ts-ignore
    AudioSystem.bgmInterval = window.setInterval(() => {
        if (ctx.state === 'suspended') ctx.resume();

        // 600ms per beat (~100 BPM)
        // 8 beats per bar
        const bar = Math.floor(tick / 8) % 2;
        const beat = tick % 8;

        // Play Chord Pad on Beat 1
        if (beat === 0) {
            const chord = chords[bar];
            chord.forEach(freq => {
                playNote(freq, 'sine', 0.03, 4.0);
            });
        }

        // Play Melody on random beats (Improvisation)
        // Higher chance on strong beats (0, 2, 4, 6)
        const chance = (beat % 2 === 0) ? 0.5 : 0.3;
        
        if (Math.random() < chance) {
            const note = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
            // Variation: sometimes play higher octave
            const freq = Math.random() > 0.8 ? note * 2 : note;
            playNote(freq, 'sine', 0.04, 1.0);
        }

        tick++;
    }, 600);
  },

  stop: () => {
      if (AudioSystem.bgmInterval) {
          clearInterval(AudioSystem.bgmInterval);
          AudioSystem.bgmInterval = null;
      }
      AudioSystem.bgmNodes.forEach((n: any) => n.disconnect ? n.disconnect() : n.stop && n.stop());
      AudioSystem.bgmNodes = [];
  }
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onUpdateHUD }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  
  // Three.js Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const particlesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mousePlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Mobile Input Refs
  const joystickVector = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  // Game State
  const gameState = useRef<{
    player: Player;
    enemies: Enemy[];
    bullets: Bullet[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    keys: { [key: string]: boolean };
    mouse: Vector2; // World coordinates
    waveTimer: number;
    lastEnemySpawn: number;
    status: GameState;
  }>({
    player: {
      id: 'player',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 10,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      color: '#FFFFFF',
      dead: false,
      speed: PLAYER_SPEED,
      dashCooldown: 0,
      isDashing: false,
      dashDuration: 0,
      dashVector: { x: 0, y: 0 },
      currentWeaponIndex: 0,
      switchCooldown: 0,
      weapons: JSON.parse(JSON.stringify(WEAPONS)),
      score: 0
    },
    enemies: [],
    bullets: [],
    particles: [],
    floatingTexts: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    waveTimer: 0,
    lastEnemySpawn: 0,
    status: {
      isRunning: true,
      isGameOver: false,
      wave: 1,
      score: 0,
      missionObjective: 'Clear the coastline of infected units.'
    }
  });

  // --- Texture Generation for Infinite Ground ---
  const generateGroundTexture = (): THREE.CanvasTexture => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Asphalt base
    ctx.fillStyle = '#1a1a1a'; 
    ctx.fillRect(0, 0, size, size);

    // Noise
    for (let i = 0; i < 150000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = Math.random();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, 2, 2);
    }

    // Cracks
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let j = 0; j < 12; j++) {
        x += (Math.random() - 0.5) * 100;
        y += (Math.random() - 0.5) * 100;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  };

  // --- 3D Mesh Creators ---

  const createPlayerMesh = (): THREE.Group => {
    const group = new THREE.Group();

    // --- Articulated Legs ---
    const legGeo = new THREE.CapsuleGeometry(2, 6, 4, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: '#101025' });
    const bootGeo = new THREE.BoxGeometry(3.5, 3, 5);
    const bootMat = new THREE.MeshStandardMaterial({ color: '#FFD700' });

    // Left Leg Group
    const legLGroup = new THREE.Group();
    legLGroup.name = 'legL';
    legLGroup.position.set(-3, 11, 0); 
    const legLMesh = new THREE.Mesh(legGeo, legMat);
    legLMesh.position.set(0, -3, 0);
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(0, -6, 1);
    legLGroup.add(legLMesh, bootL);

    // Right Leg Group
    const legRGroup = new THREE.Group();
    legRGroup.name = 'legR';
    legRGroup.position.set(3, 11, 0);
    const legRMesh = new THREE.Mesh(legGeo, legMat);
    legRMesh.position.set(0, -3, 0);
    const bootR = new THREE.Mesh(bootGeo, bootMat);
    bootR.position.set(0, -6, 1);
    legRGroup.add(legRMesh, bootR);

    // Body (Jacket)
    const bodyGeo = new THREE.BoxGeometry(12, 10, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#FFD700', roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 15, 0);

    // Zipper
    const zipGeo = new THREE.BoxGeometry(2, 10, 8.2);
    const zipMat = new THREE.MeshStandardMaterial({ color: '#111' });
    const zip = new THREE.Mesh(zipGeo, zipMat);
    zip.position.set(0, 15, 0);

    // Head
    const headGeo = new THREE.SphereGeometry(6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: '#FFF' });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 23, 0);

    // Ears
    const earGeo = new THREE.CapsuleGeometry(1.5, 8, 4, 8);
    const earLeft = new THREE.Mesh(earGeo, headMat);
    earLeft.position.set(-3, 30, 0);
    earLeft.rotation.z = 0.2;
    
    // White Right Ear (Fixed: Changed from mechMat to headMat)
    const earRight = new THREE.Mesh(earGeo, headMat);
    earRight.position.set(3, 30, 0);
    earRight.rotation.z = -0.2;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const blueEye = new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({ color: '#00BFFF', emissive: '#00BFFF', emissiveIntensity: 0.8 }));
    blueEye.position.set(-2, 24, 4.5);
    const redEye = new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({ color: '#FF0000', emissive: '#FF0000', emissiveIntensity: 1.2 }));
    redEye.position.set(2, 24, 4.5);

    // --- Distinct Weapons ---
    const armRGroup = new THREE.Group();
    armRGroup.position.set(8, 16, 0);

    const armGeo = new THREE.BoxGeometry(3, 8, 3);
    const armMesh = new THREE.Mesh(armGeo, bodyMat);
    armMesh.rotation.x = -Math.PI / 2;
    armRGroup.add(armMesh);

    // 1. Pistol
    const pistolGroup = new THREE.Group();
    pistolGroup.name = 'weapon0'; // Index 0
    const pGeo = new THREE.BoxGeometry(2, 3, 6);
    const pMat = new THREE.MeshStandardMaterial({ color: '#555' });
    const pistol = new THREE.Mesh(pGeo, pMat);
    pistol.position.set(0, 0, 4);
    pistolGroup.add(pistol);

    // 2. Shotgun (Double Barrel)
    const shotgunGroup = new THREE.Group();
    shotgunGroup.name = 'weapon1'; // Index 1
    shotgunGroup.visible = false;
    const sGeo = new THREE.CylinderGeometry(0.8, 0.8, 10, 8);
    const sMat = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.5 });
    const barrel1 = new THREE.Mesh(sGeo, sMat);
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(-1, 0, 5);
    const barrel2 = new THREE.Mesh(sGeo, sMat);
    barrel2.rotation.x = Math.PI / 2;
    barrel2.position.set(1, 0, 5);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 6), new THREE.MeshStandardMaterial({ color: '#5c4033' }));
    stock.position.set(0, 0, 0);
    shotgunGroup.add(barrel1, barrel2, stock);

    // 3. Plasma (Coil)
    const plasmaGroup = new THREE.Group();
    plasmaGroup.name = 'weapon2'; // Index 2
    plasmaGroup.visible = false;
    const plBody = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 8), new THREE.MeshStandardMaterial({ color: '#EEE' }));
    plBody.position.set(0, 0, 3);
    const plCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6), new THREE.MeshStandardMaterial({ color: '#00BFFF', emissive: '#00BFFF', emissiveIntensity: 2 }));
    plCore.rotation.x = Math.PI / 2;
    plCore.position.set(0, 0, 3);
    plasmaGroup.add(plBody, plCore);

    armRGroup.add(pistolGroup, shotgunGroup, plasmaGroup);

    group.add(legLGroup, legRGroup, body, zip, head, earLeft, earRight, blueEye, redEye, armRGroup);
    
    group.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
  };

  const createEnemyMesh = (type: EnemyType, color: string): THREE.Group => {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: color });
    const clothesMat = new THREE.MeshStandardMaterial({ color: '#3a3a3a' });

    let s = 1;
    if (type === EnemyType.BOSS) s = 2.5;
    if (type === EnemyType.RUNNER) s = 0.9;

    // Legs with Pivots (for animation)
    const legGeo = new THREE.BoxGeometry(3 * s, 10 * s, 3 * s);

    const legLGroup = new THREE.Group();
    legLGroup.name = 'legL';
    legLGroup.position.set(-2 * s, 10 * s, 0); // Hip position
    const legL = new THREE.Mesh(legGeo, clothesMat);
    legL.position.set(0, -5 * s, 0); // Offset geometry down
    legLGroup.add(legL);

    const legRGroup = new THREE.Group();
    legRGroup.name = 'legR';
    legRGroup.position.set(2 * s, 10 * s, 0); // Hip position
    const legR = new THREE.Mesh(legGeo, clothesMat);
    legR.position.set(0, -5 * s, 0); // Offset geometry down
    legRGroup.add(legR);

    const torsoGeo = new THREE.BoxGeometry(10 * s, 12 * s, 6 * s);
    const torso = new THREE.Mesh(torsoGeo, type === EnemyType.SPITTER ? new THREE.MeshStandardMaterial({color: '#4a5e4a'}) : clothesMat);
    torso.position.set(0, 14 * s, 0);

    const headGeo = new THREE.BoxGeometry(7 * s, 7 * s, 7 * s);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 23 * s, 0);

    const armGeo = new THREE.BoxGeometry(3 * s, 10 * s, 3 * s);
    const armL = new THREE.Mesh(armGeo, type === EnemyType.SPITTER ? skinMat : clothesMat);
    armL.position.set(-6 * s, 16 * s, 4 * s);
    armL.rotation.x = -Math.PI / 2.2;
    const armR = new THREE.Mesh(armGeo, type === EnemyType.SPITTER ? skinMat : clothesMat);
    armR.position.set(6 * s, 16 * s, 4 * s);
    armR.rotation.x = -Math.PI / 2.2;

    const eyeGeo = new THREE.BoxGeometry(1 * s, 1 * s, 1 * s);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#FFFF00' });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-2 * s, 24 * s, 3.6 * s);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(2 * s, 24 * s, 3.6 * s);

    group.add(legLGroup, legRGroup, torso, head, armL, armR, eyeL, eyeR);

    group.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
  };

  // --- Game Logic Functions ---
  
  const getDistance = (p1: Vector2, p2: Vector2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const spawnBullet = (x: number, y: number, angle: number, weaponIndex: number) => {
    AudioSystem.playShot(weaponIndex); // Play Sound
    const state = gameState.current;
    const weapon = state.player.weapons[weaponIndex];
    
    const rightOffset = 8; 
    const forwardOffset = 15;
    const spawnX = x + Math.cos(angle) * forwardOffset - Math.sin(angle) * rightOffset;
    const spawnY = y + Math.sin(angle) * forwardOffset + Math.cos(angle) * rightOffset;

    for(let i=0; i < weapon.projectileCount; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * weapon.spread;
      state.bullets.push({
        id: Math.random().toString(),
        position: { x: spawnX, y: spawnY }, 
        velocity: { 
          x: Math.cos(spreadAngle) * weapon.projectileSpeed, 
          y: Math.sin(spreadAngle) * weapon.projectileSpeed 
        },
        damage: weapon.damage,
        radius: weapon.type === WeaponType.PLASMA ? 6 : 3,
        color: weapon.color,
        lifeTime: 100,
        owner: 'player'
      });
    }
  };

  const spawnShockwave = (x: number, y: number, color: string) => {
      gameState.current.particles.push({
          id: Math.random().toString(),
          position: { x, y },
          velocity: { x: 0, y: 0 },
          life: 1.0,
          maxLife: 1.0,
          color: color,
          size: 1 // Used as scale
      });
  }

  const spawnEnemy = () => {
    const state = gameState.current;
    const angle = Math.random() * Math.PI * 2;
    const dist = 700; 
    const spawnPos = {
      x: state.player.position.x + Math.cos(angle) * dist,
      y: state.player.position.y + Math.sin(angle) * dist
    };

    let type = EnemyType.WALKER;
    const rand = Math.random();
    if (state.status.wave > 2 && rand > 0.8) type = EnemyType.RUNNER;
    if (state.status.wave > 4 && rand > 0.9) type = EnemyType.SPITTER;

    const stats = ZOMBIE_STATS[type];

    state.enemies.push({
      id: Math.random().toString(),
      position: spawnPos,
      velocity: { x: 0, y: 0 },
      radius: stats.radius,
      rotation: 0,
      health: stats.hp * (1 + state.status.wave * 0.1),
      maxHealth: stats.hp * (1 + state.status.wave * 0.1),
      color: stats.color,
      dead: false,
      type: type,
      damage: stats.damage,
      attackRange: type === EnemyType.SPITTER ? 300 : 40,
      attackCooldown: 1000,
      lastAttack: 0
    });
  };

  const spawnParticle = (x: number, y: number, color: string, count: number, speed: number) => {
     for (let i = 0; i < count; i++) {
       const angle = Math.random() * Math.PI * 2;
       const v = Math.random() * speed;
       gameState.current.particles.push({
         id: Math.random().toString(),
         position: { x, y },
         velocity: { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
         life: 1.0,
         maxLife: 1.0,
         color: color,
         size: Math.random() * 3 + 2
       });
     }
  };
  
  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    gameState.current.floatingTexts.push({
      id: Math.random().toString(),
      position: { x, y }, 
      text,
      life: 1.0,
      color,
      size: 16
    });
  };

  const restartGame = () => {
    const state = gameState.current;
    state.player.health = 100;
    state.player.position = { x: 0, y: 0 };
    state.player.dead = false;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.status.score = 0;
    state.status.wave = 1;
    state.status.isGameOver = false;
    state.player.weapons = JSON.parse(JSON.stringify(WEAPONS));
    state.player.currentWeaponIndex = 0;
  };

  const updateGameLogic = (deltaTime: number, time: number) => {
    const state = gameState.current;
    if (state.status.isGameOver) return;

    // Input Movement (Keyboard + Joystick)
    const moveDir = { x: 0, y: 0 };
    if (state.keys['w']) moveDir.y -= 1;
    if (state.keys['s']) moveDir.y += 1;
    if (state.keys['a']) moveDir.x -= 1;
    if (state.keys['d']) moveDir.x += 1;

    // Add Joystick Input
    moveDir.x += joystickVector.current.x;
    moveDir.y += joystickVector.current.y;

    // Clamp length
    const moveLen = Math.sqrt(moveDir.x*moveDir.x + moveDir.y*moveDir.y);
    if (moveLen > 1) {
      moveDir.x /= moveLen;
      moveDir.y /= moveLen;
    }
    
    // Init Audio on movement
    if (moveLen > 0 || state.keys['mousedown']) {
        AudioSystem.init();
    }

    // Dash
    if (state.player.dashCooldown > 0) state.player.dashCooldown -= deltaTime;
    if (state.keys[' '] && state.player.dashCooldown <= 0 && moveLen > 0) {
      state.player.isDashing = true;
      state.player.dashDuration = 200;
      state.player.dashCooldown = 2000;
      state.player.dashVector = { ...moveDir };
      spawnParticle(state.player.position.x, state.player.position.y, '#FFF', 8, 3);
      AudioSystem.playTone(300, 'sawtooth', 0.1); // Dash sound
    }

    let currentSpeed = state.player.speed;
    let velocity = { x: 0, y: 0 };

    if (state.player.isDashing) {
      state.player.dashDuration -= deltaTime;
      currentSpeed = PLAYER_DASH_SPEED;
      velocity = { 
        x: state.player.dashVector.x * currentSpeed, 
        y: state.player.dashVector.y * currentSpeed 
      };
      if (state.player.dashDuration <= 0) state.player.isDashing = false;
    } else {
      velocity = { x: moveDir.x * currentSpeed, y: moveDir.y * currentSpeed };
    }

    state.player.velocity = velocity; // Store for animation
    state.player.position.x += velocity.x;
    state.player.position.y += velocity.y;
    
    // Rotation to Mouse
    const dx = state.mouse.x - state.player.position.x;
    const dy = state.mouse.y - state.player.position.y;
    state.player.rotation = Math.atan2(dy, dx);

    // Shooting
    const currentWeapon = state.player.weapons[state.player.currentWeaponIndex];
    if (state.keys['mousedown'] && !state.player.isDashing) {
      if (time - currentWeapon.lastFired > currentWeapon.fireRate) {
        if (currentWeapon.ammo !== 0) {
           spawnBullet(state.player.position.x, state.player.position.y, state.player.rotation, state.player.currentWeaponIndex);
           currentWeapon.lastFired = time;
           if (currentWeapon.ammo > 0) currentWeapon.ammo--;
        }
      }
    }

    // Enemies (omitted detailed logic for brevity, same as before)
    const now = Date.now();
    if (now - state.lastEnemySpawn > (2000 / Math.sqrt(state.status.wave))) {
      if (state.enemies.length < 12 * state.status.wave) {
         spawnEnemy();
         state.lastEnemySpawn = now;
      }
    }

    state.enemies.forEach(enemy => {
      const pdx = state.player.position.x - enemy.position.x;
      const pdy = state.player.position.y - enemy.position.y;
      const dist = Math.sqrt(pdx*pdx + pdy*pdy);
      
      if (dist > 0) {
        let pushX = 0, pushY = 0;
        state.enemies.forEach(other => {
          if (enemy === other) return;
          const odx = enemy.position.x - other.position.x;
          const ody = enemy.position.y - other.position.y;
          const odist = Math.sqrt(odx*odx + ody*ody);
          if (odist < enemy.radius + other.radius) {
             pushX += odx / odist;
             pushY += ody / odist;
          }
        });

        const stats = ZOMBIE_STATS[enemy.type];
        enemy.velocity = {
            x: (pdx / dist) * stats.speed + pushX * 0.5,
            y: (pdy / dist) * stats.speed + pushY * 0.5
        };
        enemy.position.x += enemy.velocity.x;
        enemy.position.y += enemy.velocity.y;
        enemy.rotation = Math.atan2(pdy, pdx);
      }

      if (dist < enemy.radius + state.player.radius + 10) {
         if (now - enemy.lastAttack > enemy.attackCooldown && !state.player.isDashing) {
            state.player.health -= enemy.damage;
            enemy.lastAttack = now;
            spawnFloatingText(state.player.position.x, state.player.position.y, `-${enemy.damage}`, '#FF0000');
            AudioSystem.playHit(); // Hit sound
            if (state.player.health <= 0) {
              state.player.dead = true;
              state.status.isGameOver = true;
            }
         }
      }
    });

    // Bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.position.x += b.velocity.x;
      b.position.y += b.velocity.y;
      b.lifeTime--;
      if (b.lifeTime <= 0) { state.bullets.splice(i, 1); continue; }

      let hit = false;
      if (b.owner === 'player') {
         for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            const dist = getDistance(b.position, e.position);
            if (dist < e.radius + b.radius + 10) {
               e.health -= b.damage;
               spawnParticle(e.position.x, e.position.y, COLORS.blood, 4, 2);
               spawnFloatingText(e.position.x, e.position.y, `${b.damage}`, '#FFF');
               AudioSystem.playTone(100, 'sawtooth', 0.05, 0.05); // Soft hit sound
               hit = true;
               if (e.health <= 0) {
                 state.status.score += 100;
                 state.enemies.splice(j, 1);
                 if (state.status.score % 1000 === 0) state.status.wave++;
               }
               break;
            }
         }
      }
      if (hit) state.bullets.splice(i, 1);
    }

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      if (p.velocity.x === 0 && p.velocity.y === 0) {
          // Shockwave
          p.size += 2;
          p.life -= 0.05;
      } else {
          // Normal particle
          p.position.x += p.velocity.x;
          p.position.y += p.velocity.y;
          p.life -= 0.05;
      }
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const t = state.floatingTexts[i];
      t.position.y -= 0.5; 
      t.life -= 0.02;
      if (t.life <= 0) state.floatingTexts.splice(i, 1);
    }
  };

  // --- Update Three.js Scene from Game State ---

  const updateMeshesFromState = (time: number) => {
    const state = gameState.current;
    if (!sceneRef.current) return;

    const activeIds = new Set<string>();

    const syncMesh = (id: string, type: 'player' | 'enemy' | 'bullet', x: number, y: number, r: number, extra: any) => {
       activeIds.add(id);
       let mesh = meshesRef.current.get(id);
       
       if (!mesh) {
          if (type === 'player') mesh = createPlayerMesh();
          else if (type === 'enemy') mesh = createEnemyMesh(extra.type, extra.color);
          else if (type === 'bullet') {
             mesh = new THREE.Mesh(
               new THREE.SphereGeometry(extra.radius, 8, 8),
               new THREE.MeshBasicMaterial({ color: extra.color })
             );
          } 
          
          if (mesh) {
             meshesRef.current.set(id, mesh);
             sceneRef.current?.add(mesh);
          }
       }

       if (mesh) {
          mesh.position.set(x, 0, y);
          if (type === 'bullet') mesh.position.y = 12; 
          
          // Rotation (Fixed: +PI/2)
          mesh.rotation.y = -r + Math.PI / 2; 

          // Animations
          if (type === 'player') {
              const velocity = state.player.velocity;
              const isMoving = Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1;
              
              // Walk Animation (Legs)
              const legL = mesh.getObjectByName('legL');
              const legR = mesh.getObjectByName('legR');
              if (legL && legR) {
                  if (isMoving) {
                      legL.rotation.x = Math.sin(time * 0.015) * 0.8;
                      legR.rotation.x = Math.sin(time * 0.015 + Math.PI) * 0.8;
                  } else {
                      legL.rotation.x = 0;
                      legR.rotation.x = 0;
                  }
              }

              // Weapon Visibility
              const currentWeaponIdx = state.player.currentWeaponIndex;
              for(let i=0; i<3; i++) {
                  const w = mesh.getObjectByName('weapon' + i);
                  if (w) w.visible = (i === currentWeaponIdx);
              }
          } else if (type === 'enemy') {
              // Zombie Animation
              const legL = mesh.getObjectByName('legL');
              const legR = mesh.getObjectByName('legR');
              if (legL && legR) {
                   const speed = extra.type === EnemyType.RUNNER ? 0.02 : 0.01;
                   legL.rotation.x = Math.sin(time * speed) * 0.6;
                   legR.rotation.x = Math.sin(time * speed + Math.PI) * 0.6;
              }
          }
       }
    };

    syncMesh('player', 'player', state.player.position.x, state.player.position.y, state.player.rotation, null);

    state.enemies.forEach(e => {
       syncMesh(e.id, 'enemy', e.position.x, e.position.y, e.rotation, { type: e.type, color: e.color });
    });

    state.bullets.forEach(b => {
       syncMesh(b.id, 'bullet', b.position.x, b.position.y, 0, { radius: b.radius, color: b.color });
    });

    const idsToRemove: string[] = [];
    meshesRef.current.forEach((_, id) => {
        if (!activeIds.has(id)) {
            idsToRemove.push(id);
        }
    });
    idsToRemove.forEach(id => {
        const mesh = meshesRef.current.get(id);
        if (mesh) {
            sceneRef.current?.remove(mesh);
            meshesRef.current.delete(id);
        }
    });

    // Sync Particles
    const activeParticleIds = new Set<string>();
    state.particles.forEach(p => {
        activeParticleIds.add(p.id);
        let pMesh = particlesRef.current.get(p.id);
        
        if (!pMesh) {
            if (p.velocity.x === 0 && p.velocity.y === 0) {
                // Shockwave Ring
                pMesh = new THREE.Mesh(
                    new THREE.RingGeometry(10, 15, 32),
                    new THREE.MeshBasicMaterial({ color: p.color, transparent: true, side: THREE.DoubleSide })
                );
                pMesh.rotation.x = -Math.PI / 2;
            } else {
                // Box Particle
                pMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(p.size, p.size, p.size),
                    new THREE.MeshBasicMaterial({ color: p.color, transparent: true })
                );
            }
            sceneRef.current?.add(pMesh);
            particlesRef.current.set(p.id, pMesh);
        }

        pMesh.position.set(p.position.x, 10, p.position.y);
        // @ts-ignore
        pMesh.material.opacity = p.life;

        if (p.velocity.x === 0 && p.velocity.y === 0) {
            // Expand shockwave
            pMesh.scale.set(p.size, p.size, 1);
        } else {
            pMesh.rotation.x += 0.1;
            pMesh.rotation.y += 0.1;
        }
    });
    
    const pIdsToRemove: string[] = [];
    particlesRef.current.forEach((_, id) => {
        if (!activeParticleIds.has(id)) {
            pIdsToRemove.push(id);
        }
    });
    pIdsToRemove.forEach(id => {
        const mesh = particlesRef.current.get(id);
        if (mesh) {
            sceneRef.current?.remove(mesh);
            particlesRef.current.delete(id);
        }
    });
  };

  // --- Initialization ---

  useEffect(() => {
    if (!containerRef.current) return;
    meshesRef.current.clear();
    particlesRef.current.clear();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(new THREE.Color('#333333'));
    
    if (containerRef.current.children.length === 0) {
        containerRef.current.appendChild(renderer.domElement);
    } else {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#252530');
    scene.fog = new THREE.Fog('#252530', 200, 900);
    sceneRef.current = scene;

    // Zoomed Camera (d=220 approx 2x zoom compared to 400)
    const d = 220;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 2000);
    camera.position.set(200, 200, 200); 
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    scene.add(dirLight.target);
    lightRef.current = dirLight;

    const texture = generateGroundTexture();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(GROUND_SIZE / TILE_SIZE, GROUND_SIZE / TILE_SIZE);

    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({ 
        map: texture, 
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; 
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshRef.current = ground;

    // 2. Event Listeners
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      rendererRef.current.setSize(w, h);
      const aspect = w / h;
      cameraRef.current.left = -d * aspect;
      cameraRef.current.right = d * aspect;
      cameraRef.current.top = d;
      cameraRef.current.bottom = -d;
      cameraRef.current.updateProjectionMatrix();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      gameState.current.keys[key] = true;
      const state = gameState.current;
      AudioSystem.init(); // Init audio on any key

      let switched = false;
      if (key === 'q') {
        state.player.currentWeaponIndex = (state.player.currentWeaponIndex - 1 + state.player.weapons.length) % state.player.weapons.length;
        switched = true;
      }
      if (key === 'e') {
        state.player.currentWeaponIndex = (state.player.currentWeaponIndex + 1) % state.player.weapons.length;
        switched = true;
      }
      if (switched) {
          AudioSystem.playSwitch();
          const w = state.player.weapons[state.player.currentWeaponIndex];
          spawnShockwave(state.player.position.x, state.player.position.y, w.color);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => gameState.current.keys[e.key.toLowerCase()] = false;
    const handleMouseDown = () => {
        gameState.current.keys['mousedown'] = true;
        AudioSystem.init();
    };
    const handleMouseUp = () => gameState.current.keys['mousedown'] = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cameraRef.current || !rendererRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const target = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(mousePlane.current, target);
      gameState.current.mouse.x = target.x;
      gameState.current.mouse.y = target.z; 
    };

    // Custom Events for Mobile / UI
    const handleJoystick = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        joystickVector.current = detail;
        // Initialize audio on first joystick move if not already
        if (Math.abs(detail.x) > 0.1 || Math.abs(detail.y) > 0.1) {
            AudioSystem.init();
        }
    };

    const handleTouchAim = (e: Event) => {
        const detail = (e as CustomEvent).detail; // { x, y, firing } (Screen coords)
        if (!cameraRef.current || !rendererRef.current) return;
        AudioSystem.init();
        
        // Convert screen relative (0-1) to world
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        // Map detail.x/y (0-1) to NDC
        const ndcX = (detail.x * 2) - 1;
        const ndcY = -(detail.y * 2) + 1;

        raycaster.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);
        const target = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(mousePlane.current, target);
        
        gameState.current.mouse.x = target.x;
        gameState.current.mouse.y = target.z;
        
        if (detail.firing !== undefined) {
            gameState.current.keys['mousedown'] = detail.firing;
        }
    };

    const handleWeaponSelect = (e: Event) => {
        AudioSystem.init(); // Ensure audio context is ready
        const detail = (e as CustomEvent).detail; // index
        const state = gameState.current;
        state.player.currentWeaponIndex = detail;
        const w = state.player.weapons[state.player.currentWeaponIndex];
        spawnShockwave(state.player.position.x, state.player.position.y, w.color);
        AudioSystem.playSwitch();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    window.addEventListener('joystick-move', handleJoystick);
    window.addEventListener('touch-aim', handleTouchAim);
    window.addEventListener('weapon-select', handleWeaponSelect);

    // 3. Game Loop
    const loop = (time: number) => {
      const deltaTime = time - previousTimeRef.current;
      previousTimeRef.current = time;
      
      updateGameLogic(deltaTime, time);
      updateMeshesFromState(time);

      // Update Camera & Light
      const pPos = gameState.current.player.position;
      if (cameraRef.current) {
          const offset = new THREE.Vector3(200, 200, 200); 
          const targetX = pPos.x;
          const targetZ = pPos.y;
          
          const currentPos = cameraRef.current.position;
          const targetPos = new THREE.Vector3(targetX + offset.x, offset.y, targetZ + offset.z);
          
          currentPos.lerp(targetPos, 0.1);
          cameraRef.current.lookAt(currentPos.x - offset.x, 0, currentPos.z - offset.z);

          if (lightRef.current) {
             lightRef.current.position.set(currentPos.x - 50, 300, currentPos.z + 50);
             lightRef.current.target.position.set(currentPos.x - offset.x, 0, currentPos.z - offset.z);
             lightRef.current.target.updateMatrixWorld();
          }
      }

      if (groundMeshRef.current && cameraRef.current) {
         const cx = cameraRef.current.position.x;
         const cz = cameraRef.current.position.z;
         groundMeshRef.current.position.set(cx, -1, cz);
         const map = (groundMeshRef.current.material as THREE.MeshStandardMaterial).map;
         if (map) {
            map.offset.x = cx / TILE_SIZE;
            map.offset.y = -cz / TILE_SIZE;
         }
      }

      renderer.render(scene, camera);

      const s = gameState.current;
      onUpdateHUD(
        { ...s.player }, 
        s.status.wave, 
        s.status.score, 
        1000 / (deltaTime || 16),
        s.status.isGameOver,
        s.status.missionObjective
      );

      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);

    return () => {
       window.removeEventListener('resize', handleResize);
       window.removeEventListener('keydown', handleKeyDown);
       window.removeEventListener('keyup', handleKeyUp);
       window.removeEventListener('mousemove', handleMouseMove);
       window.removeEventListener('mousedown', handleMouseDown);
       window.removeEventListener('mouseup', handleMouseUp);
       window.removeEventListener('joystick-move', handleJoystick);
       window.removeEventListener('touch-aim', handleTouchAim);
       window.removeEventListener('weapon-select', handleWeaponSelect);
       
       AudioSystem.stop();
       cancelAnimationFrame(requestRef.current);
       if (containerRef.current && rendererRef.current) {
          if (containerRef.current.contains(rendererRef.current.domElement)) {
             containerRef.current.removeChild(rendererRef.current.domElement);
          }
       }
       renderer.dispose();
    };
  }, [onUpdateHUD]);

  useEffect(() => {
      // @ts-ignore
      window.restartGame = restartGame;
      return () => {
        // @ts-ignore
        delete window.restartGame;
      }
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-zinc-900 cursor-crosshair touch-none" />
  );
};

export default GameCanvas;