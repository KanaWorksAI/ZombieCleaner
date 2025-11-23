export interface Vector2 {
  x: number;
  y: number;
}

export enum WeaponType {
  PISTOL = 'Pistol',
  SHOTGUN = 'Shotgun',
  PLASMA = 'Carrot Plasma',
}

export interface Weapon {
  type: WeaponType;
  damage: number;
  fireRate: number; // ms between shots
  lastFired: number;
  spread: number;
  projectileSpeed: number;
  projectileCount: number;
  color: string;
  ammo: number; // -1 for infinite
  maxAmmo: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  rotation: number; // radians
  health: number;
  maxHealth: number;
  color: string;
  dead: boolean;
}

export interface Player extends Entity {
  speed: number;
  dashCooldown: number;
  isDashing: boolean;
  dashDuration: number;
  dashVector: Vector2;
  currentWeaponIndex: number;
  switchCooldown: number; // Added for weapon switching debounce
  weapons: Weapon[];
  score: number;
}

export enum EnemyType {
  WALKER = 'walker',
  RUNNER = 'runner',
  SPITTER = 'spitter',
  BOSS = 'boss'
}

export interface Enemy extends Entity {
  type: EnemyType;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  lastAttack: number;
}

export interface Bullet {
  id: string;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  radius: number;
  color: string;
  lifeTime: number; // frames or ms
  owner: 'player' | 'enemy';
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: string;
  position: Vector2;
  text: string;
  life: number;
  color: string;
  size: number;
}

export interface GameState {
  isRunning: boolean;
  isGameOver: boolean;
  wave: number;
  score: number;
  missionObjective: string;
}