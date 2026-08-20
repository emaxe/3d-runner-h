/**
 * Global game balance, physics, and gameplay configuration constants.
 */
export const CONFIG = {
  // Lane dimensions
  LANE_WIDTH: 2.8,
  LANES_COUNT: 3,

  // Level chunking
  CHUNK_LENGTH: 50,
  MAX_ACTIVE_CHUNKS: 5,

  // Speed & Progression
  INITIAL_SPEED: 14.0,
  MAX_SPEED: 32.0,
  SPEED_ACCELERATION: 0.08, // per second

  // Physics & Bounds
  GRAVITY: 48.0,
  JUMP_VELOCITY: 14.5,
  MAX_JUMP_HOLD_TIME: 0.18,
  DOUBLE_JUMP_VELOCITY: 13.5,
  DOUBLE_JUMP_COOLDOWN: 1.2,
  GRAVITY_FLIP_VELOCITY: 18.0,
  SLIDE_DURATION: 0.75,
  SLIDE_HEIGHT: 0.7,
  NORMAL_HEIGHT: 1.8,
  FLOOR_Y: 0.0,
  CEILING_HEIGHT: 5.6,

  // Powerups & Special Boosts
  NITRO_DURATION: 3.5,
  NITRO_SPEED_MULTIPLIER: 1.6,
  NITRO_ENERGY_REQ: 30,
  NITRO_MAX_ENERGY: 100,
  NITRO_RECHARGE_RATE: 4.0,

  // Ghost Phase powerup
  GHOST_DURATION: 4.5,

  // Plasma Overdrive powerup
  OVERDRIVE_DURATION: 6.0,
  OVERDRIVE_FIRE_RATE: 0.14, // интервал автострельбы в секундах

  // Near Miss System (близкий промах)
  NEAR_MISS_X_MARGIN: 0.6, // допустимый зазор по X (м) от хитбокса
  NEAR_MISS_Y_MARGIN: 0.6, // допустимый зазор по Y (м) от хитбокса
  NEAR_MISS_Z_WINDOW: 2.2, // окно Z за препятствием для регистрации промаха
  NEAR_MISS_SCORE: 50, // базовые очки за Near Miss (умножаются на combo)
  NEAR_MISS_STREAK_BONUS: 3, // прибавка к comboScoreStreak за Near Miss

  // Action Dodge System (точный прыжок/подкат в своей полосе — вертикальный клиренс)
  ACTION_DODGE_Z_THRESHOLD: 0.3, // мин. зазор Z после прохождения препятствия
  ACTION_DODGE_SCORE: 60, // базовые очки за Action Dodge (умножаются на combo)
  ACTION_DODGE_MAX_CLEARANCE: 1.8, // макс. вертикальный зазор — только плотный проход
  ACTION_DODGE_COMBO_BONUS: 2, // прибавка к comboScoreStreak за Action Dodge

  // World Events
  BOSS_INTERVAL_METERS: 400,
  BIOME_INTERVAL_METERS: 650,

  // Level progression (после каждого босса — новый уровень с усложнением)
  LEVEL_BOSS_INTERVAL_DECREASE: 25, // на сколько метров сокращается дистанция до босса за уровень
  LEVEL_MIN_BOSS_INTERVAL: 220, // минимальная дистанция до босса
  LEVEL_SPEED_BONUS: 0.6, // прибавка к базовой скорости за уровень
  LEVEL_MAX_SPEED_BONUS: 6.0, // потолок прибавки скорости
  LEVEL_OBSTACLE_DENSITY: 0.08, // прибавка плотности препятствий за уровень
  LEVEL_MAX_OBSTACLE_DENSITY: 0.5, // потолок плотности
  LEVEL_BOSS_HP_BONUS: 30, // прибавка HP босса за уровень
  LEVEL_BOSS_ATTACK_BONUS: 0.14, // прибавка к скорости атак босса за уровень (было 0.08 — заметнее)
  LEVEL_BOSS_PROJECTILE_SPEED_STEP: 2.0, // прирост скорости снарядов босса (м/с) за уровень, clamp до 52
  BOSS_BASE_ATTACK_INTERVAL: 2.2, // базовый интервал атак босса на L1 (было 1.6 — старт медленнее для новичков)
  BOSS_MIN_ATTACK_INTERVAL: 0.85, // минимальный порог перезарядки атак босса на высоких уровнях

  // Object Pooling
  PARTICLE_POOL_SIZE: 160,

  // Milestone Rewards (награды за дистанцию)
  MILESTONE_INTERVAL: 500,        // каждые 500м — малый бонус
  MILESTONE_MAJOR_INTERVAL: 1000, // каждые 1000м — крупный бонус
  MILESTONE_SMALL_COINS: 25,
  MILESTONE_SMALL_SCORE: 500,
  MILESTONE_MAJOR_COINS: 100,
  MILESTONE_MAJOR_SCORE: 2000,
  MILESTONE_MAJOR_SHAKE: 0.25
};

export const COIN_TYPES = {
  gold:    { id: 'gold',    name: 'Gold Coin',       valueMult: 1,  nitro: 3.0,  score: 25,  color: 0xfbbf24, ringColor: 0xfef08a, particleCount: 6,  sound: 'coin' },
  grav:    { id: 'grav',    name: 'Grav Coin',       valueMult: 2,  nitro: 5.0,  score: 50,  color: 0xa855f7, ringColor: 0xe879f9, particleCount: 10, sound: 'coin' },
  emerald: { id: 'emerald', name: 'Cyber Emerald',   valueMult: 3,  nitro: 7.0,  score: 75,  color: 0x10b981, ringColor: 0x6ee7b7, particleCount: 8,  sound: 'coin_emerald' },
  diamond: { id: 'diamond', name: 'Quantum Diamond', valueMult: 5,  nitro: 12.0, score: 150, color: 0x06b6d4, ringColor: 0xa5f3fc, particleCount: 12, sound: 'coin_diamond' },
  ruby:    { id: 'ruby',    name: 'Plasma Ruby',     valueMult: 10, nitro: 20.0, score: 300, color: 0xf43f5e, ringColor: 0xfca5a5, particleCount: 16, sound: 'coin_ruby' }
};
