/**
 * StorageService - Manages game persistence via LocalStorage with schema validation and fallback memory store.
 */
import { QUESTS_CONFIG } from '../config/quests.js';

export class StorageService {
  constructor() {
    this.key = 'lowpoly_rush_savedata_v2';
    this.data = this.getDefaults();
    this.load();
  }

  getDefaults() {
    return {
      coins: 0,
      bestDistance: 0,
      runsCompleted: 0,
      totalCoins: 0,
      totalGravityFlips: 0,
      bossesDefeated: 0,
      totalNitroUsed: 0,
      maxComboReached: 1,
      totalNearMisses: 0,
      totalMilestones: 0,
      selectedSkin: 'cyber',
      unlockedSkins: ['cyber'],
      upgrades: {
        shield_start: 0,
        magnet_boost: 0,
        nitro_eff: 0,
        coin_multiplier: 0
      },
      boosts: {
        head_start: false,
        score_booster: false
      },
      achievementsClaimed: [],
      achievementsNotified: [],
      questDate: '',
      questClaimed: new Array(QUESTS_CONFIG.length).fill(false),
      settings: {
        sfxVolume: 80,
        musicVolume: 70,
        quality: 'high', // 'low', 'med', 'high'
        showTouchControls: true,
        hideTouchControls: false
      }
    };
  }

  load() {
    try {
      // Check for v2 or v1 migration
      let raw = localStorage.getItem(this.key);
      if (!raw) {
        // Migration check from v1
        const legacy = localStorage.getItem('lowpoly_rush_savedata_v1');
        if (legacy) {
          raw = legacy;
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        const defaults = this.getDefaults();

        // Safe migration: pad questClaimed to the current quest count (old saves had length 3)
        const savedClaimed = Array.isArray(parsed.questClaimed) ? parsed.questClaimed : [];
        const questClaimed = defaults.questClaimed.map((defVal, idx) =>
          typeof savedClaimed[idx] === 'boolean' ? savedClaimed[idx] : defVal
        );

        this.data = {
          ...defaults,
          ...parsed,
          questClaimed,
          achievementsNotified: Array.isArray(parsed.achievementsNotified) ? parsed.achievementsNotified : [],
          upgrades: { ...defaults.upgrades, ...(parsed.upgrades || {}) },
          boosts: { ...defaults.boosts, ...(parsed.boosts || {}) },
          settings: { ...defaults.settings, ...(parsed.settings || {}) }
        };

        // Ежедневная ротация квестов на загрузке (переход через полночь)
        this.checkDailyQuestsRotation();
      }
    } catch (e) {
      console.warn('[StorageService] Failed to load localStorage data, fallback to defaults:', e);
      this.data = this.getDefaults();
    }
  }

  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[StorageService] Failed to save localStorage data:', e);
    }
  }

  reset() {
    this.data = this.getDefaults();
    this.save();
  }

  /** Локальная календарная дата устройства игрока в формате YYYY-MM-DD (без смещений UTC). */
  getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ежедневная ротация квестов: при смене календарного дня сбрасывает questClaimed
   * и фиксирует новую дату. Вызывается на загрузке, при открытии модалки квестов и в меню.
   */
  checkDailyQuestsRotation() {
    const today = this.getLocalDateString();
    if (this.data.questDate !== today) {
      this.data.questDate = today;
      // .map(() => false) — работает с массивом любой длины (добавление квестов не ломает)
      this.data.questClaimed = this.data.questClaimed.map(() => false);
      this.save();
      return true;
    }
    return false;
  }

  addCoins(amount) {
    this.data.coins += amount;
    this.data.totalCoins += amount;
    this.save();
  }

  updateBestDistance(dist) {
    if (dist > this.data.bestDistance) {
      this.data.bestDistance = dist;
      this.save();
      return true;
    }
    return false;
  }
}
