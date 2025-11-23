import { WeaponType, Weapon } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const PLAYER_SPEED = 4;
export const PLAYER_DASH_SPEED = 12;
export const PLAYER_RADIUS = 20;

export const WEAPONS: Weapon[] = [
  {
    type: WeaponType.PISTOL,
    damage: 15,
    fireRate: 250,
    lastFired: 0,
    spread: 0.05,
    projectileSpeed: 12,
    projectileCount: 1,
    color: '#FFD700',
    ammo: -1,
    maxAmmo: -1
  },
  {
    type: WeaponType.SHOTGUN,
    damage: 12,
    fireRate: 800,
    lastFired: 0,
    spread: 0.4,
    projectileSpeed: 10,
    projectileCount: 5,
    color: '#FF4500',
    ammo: 24,
    maxAmmo: 24
  },
  {
    type: WeaponType.PLASMA,
    damage: 8,
    fireRate: 100,
    lastFired: 0,
    spread: 0.1,
    projectileSpeed: 15,
    projectileCount: 1,
    color: '#00BFFF',
    ammo: 100,
    maxAmmo: 100
  }
];

export const ZOMBIE_STATS = {
  walker: { hp: 40, speed: 1.5, radius: 18, damage: 10, color: '#556B2F' },
  runner: { hp: 20, speed: 5, radius: 15, damage: 5, color: '#8B4513' },
  spitter: { hp: 60, speed: 1, radius: 22, damage: 15, color: '#2E8B57' },
  boss: { hp: 500, speed: 2, radius: 40, damage: 30, color: '#800000' }
};

export const COLORS = {
  background: '#2F4F4F', // Dark Slate Gray
  road: '#363636',
  water: '#1E90FF',
  blood: '#8B0000',
  highlight: '#FFD700'
};