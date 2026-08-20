import { CONFIG } from '../config/gameConfig.js';
import { BIOMES } from '../config/biomes.js';
import { SKINS } from '../config/skins.js';
import { ACHIEVEMENTS } from '../config/achievements.js';

import { StorageService } from '../services/StorageService.js';
import { AudioService } from '../services/AudioService.js';
import { InputService } from '../services/InputService.js';

import { Engine } from './Engine.js';
import { CameraManager } from './CameraManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { CollisionSystem } from './CollisionSystem.js';

import { Player } from '../entities/Player.js';
import { MiniBoss } from '../entities/MiniBoss.js';
import { LevelGenerator } from '../entities/LevelGenerator.js';

import { UIManager } from '../ui/UIManager.js';

/**
 * Game - Main application coordinator, state machine, and animation loop runner.
 */
export class Game {
  constructor() {
    // 1. Core Services
    this.storage = new StorageService();
    this.audio = new AudioService();
    this.input = new InputService();

    // 2. Engine & Systems
    this.engine = new Engine();
    this.cameraManager = new CameraManager(this.engine.camera);
    this.particles = new ParticleSystem(this.engine.scene);
    this.collision = new CollisionSystem(this);

    // 3. Game Entities
    this.player = new Player(this.engine.scene, this.particles, this.audio);
    this.boss = new MiniBoss(this.engine.scene, this.particles, this.audio);
    this.levelGen = new LevelGenerator(this.engine.scene, this.particles, this.audio);

    // 4. UI Manager
    this.ui = new UIManager(this);

    // 5. Game State variables
    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.runSpeed = CONFIG.INITIAL_SPEED;
    this.distance = 0;
    this.score = 0;
    this.coinsGathered = 0;
    this.nextBossDistance = CONFIG.BOSS_INTERVAL_METERS;
    this.nextBiomeDistance = CONFIG.BIOME_INTERVAL_METERS;
    this.nextMilestoneDistance = CONFIG.MILESTONE_INTERVAL;
    this.currentBiomeIndex = 0;
    this.level = 1; // текущий уровень (растёт после каждого босса)

    // Watchdog & HUD throttling
    this.adaptivePx = null;
    this.fpsWindow = [];
    this.lastAdaptiveChangeTime = 0;
    this.stableFpsFrames = 0;
    this.hudTimer = 0;

    // 6. Bind Input to Player actions
    this.bindInputs();

    // 7. Apply Settings
    this.applySavedSettings();
    this.setMenuState();

    // 8. Start RAF Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindInputs() {
    this.input.setHandlers({
      onMoveLeft: () => {
        if (this.state === 'PLAYING') this.player.setLane(this.player.currentLane - 1);
      },
      onMoveRight: () => {
        if (this.state === 'PLAYING') this.player.setLane(this.player.currentLane + 1);
      },
      onJumpStart: () => {
        if (this.state === 'PLAYING') this.player.jump(true);
      },
      onJumpEnd: () => {
        if (this.state === 'PLAYING') this.player.jump(false);
      },
      onSlide: () => {
        if (this.state === 'PLAYING') this.player.slide();
      },
      onGravityFlip: () => {
        if (this.state === 'PLAYING') {
          this.player.flipGravity();
          this.storage.data.totalGravityFlips++;
        }
      },
      onNitro: () => {
        if (this.state === 'PLAYING') {
          if (this.player.nitroEnergy >= CONFIG.NITRO_ENERGY_REQ) {
            this.player.activateNitro();
            this.storage.data.totalNitroUsed++;
          }
        }
      },
      onPauseToggle: () => {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }
    });

    // Bind virtual buttons
    this.input.bindVirtualButtons({
      jump: document.getElementById('touch-btn-jump'),
      slide: document.getElementById('touch-btn-slide'),
      gravity: document.getElementById('touch-btn-gravity'),
      nitro: document.getElementById('touch-btn-nitro')
    });
  }

  applySavedSettings() {
    const s = this.storage.data.settings;
    this.audio.setSfxVolume(s.sfxVolume / 100);
    this.audio.setMusicVolume(s.musicVolume / 100);
    this.engine.setQuality(s.quality || 'high');

    const touchOverlay = document.getElementById('hud-touch-controls');
    if (touchOverlay) {
      touchOverlay.style.display = s.hideTouchControls ? 'none' : (s.showTouchControls ? 'flex' : 'none');
    }

    const skin = SKINS.find((sk) => sk.id === this.storage.data.selectedSkin) || SKINS[0];
    this.player.model.applySkin(skin);
    const skinNameEl = document.getElementById('menu-skin-name');
    if (skinNameEl) skinNameEl.textContent = skin.name;
  }

  setMenuState() {
    this.state = 'MENU';
    this.player.reset();
    this.player.model.group.position.set(0, 0.9, 0);
    this.cameraManager.setupMenu();
    this.ui.updateMenuStats();
    // Сброс босса при выходе в меню (иначе активный босс телепортируется на старт нового забега)
    this.boss.reset();
    this.audio.bossMusicMode = false;
    // Ежедневная ротация квестов при возврате в меню
    this.storage.checkDailyQuestsRotation();
  }

  startGame() {
    this.state = 'PLAYING';
    this.runSpeed = CONFIG.INITIAL_SPEED;
    this.distance = 0;
    this.score = 0;
    this.coinsGathered = 0;
    this.nextBossDistance = CONFIG.BOSS_INTERVAL_METERS;
    this.nextBiomeDistance = CONFIG.BIOME_INTERVAL_METERS;
    this.nextMilestoneDistance = CONFIG.MILESTONE_INTERVAL;
    this.currentBiomeIndex = 0;
    this.level = 1;
    const hasStartShield = (this.storage.data.upgrades.shield_start || 0) > 0;
    this.player.reset(hasStartShield);
    // Применяем уровень апгрейда "Hyper Nitro Tank" (длительность буста и перезарядка)
    this.player.setNitroUpgradeLevel(this.storage.data.upgrades.nitro_eff || 0);

    // Boost: Head start
    if (this.storage.data.boosts.head_start) {
      this.distance = 250;
      this.player.z = 250;
      this.storage.data.boosts.head_start = false;
      this.storage.save();
      this.ui.showAlert('HEAD START ACTIVATED!', 'Launched +250m ahead');
    }

    // Boost: Score multiplier
    if (this.storage.data.boosts.score_booster) {
      this.player.multiplierTimer = 999999;
      this.storage.data.boosts.score_booster = false;
      this.storage.save();
      this.ui.showAlert('PERMANENT 2X ACTIVE!', 'Double score during run');
    }

    this.levelGen.initTrack();
    this.levelGen.setBiome(0);
    this.engine.setBiomeVisuals(BIOMES[0]);
    // Сброс босса при старте забега (защита от Boss Persistence Exploit)
    this.boss.reset();
    this.audio.bossMusicMode = false;

    // UI screen switches
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('gameover-screen')?.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('hud-screen')?.classList.remove('hidden');

    this.audio.startMusic();
    this.audio.playSound('powerup');
  }

  /**
   * Переход на следующий уровень после убийства босса.
   * Игрок продолжает бежать, но сложность растёт: скорость выше,
   * препятствий больше, следующий босс ближе и сильнее.
   */
  startNextLevel() {
    this.level++;
    this.boss.active = false;

    // Следующий босс — через уменьшенный интервал (но не меньше минимума)
    const interval = Math.max(
      CONFIG.LEVEL_MIN_BOSS_INTERVAL,
      CONFIG.BOSS_INTERVAL_METERS - (this.level - 1) * CONFIG.LEVEL_BOSS_INTERVAL_DECREASE
    );
    this.nextBossDistance = this.distance + interval;

    // Уведомление о новом уровне
    this.ui.showAlert(`LEVEL ${this.level}!`, 'Speed Up & More Obstacles');
    this.audio.playSound('powerup');
    this.cameraManager.shake(0.3);
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-screen')?.classList.remove('hidden');
    this.audio.stopMusic();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    document.getElementById('pause-screen')?.classList.add('hidden');
    this.audio.startMusic();
  }

  gameOver() {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.audio.stopMusic();
    this.audio.playSound('crash');
    this.cameraManager.shake(1.2);

    // Trigger explosive impact particles & ragdoll tumble
    this.particles.spawn(this.player.x, this.player.y, this.player.z, 35, 0xef4444, 10, 0.35, 0.8);
    this.particles.spawn(this.player.x, this.player.y, this.player.z, 20, 0xf59e0b, 7, 0.25, 0.6);
    this.player.startDeathTumble(this.runSpeed);

    // Save statistics & highscore
    this.storage.data.runsCompleted++;
    this.storage.data.totalCoins += this.coinsGathered;
    this.storage.data.coins += this.coinsGathered;
    this.storage.updateBestDistance(this.distance);
    this.checkAchievements();

    setTimeout(() => {
      this.ui.showGameOver(this.distance, this.score, this.coinsGathered, this.storage.data.bestDistance);
    }, 1800);
  }

  onPlayerHitObstacle(obs) {
    // Ghost Phase: игрок фазирует сквозь препятствия — без урона, без траты щита,
    // без разрушения препятствия и без очков SMASHED. Проверка стоит ПЕРВОЙ.
    if (this.player.ghostTimer > 0) {
      return;
    }
    if (obs) obs.wasHit = true;

    if (this.player.invulnerableTimer > 0 || this.player.isNitroActive) {
      // Smashed obstacle — уничтожаем препятствие и деактивируем его хитбокс,
      // чтобы не начислять очки каждый кадр перекрытия (эксплойт бесконечных очков).
      if (obs) {
        obs.destroyed = true;
        if (obs.mesh) obs.mesh.visible = false;
        if (obs.hitbox) {
          obs.hitbox.minY = -999;
          obs.hitbox.maxY = -999;
        }
        this.score += 150 * this.player.combo;
        this.ui.showAlert('SMASHED!', 'Obstacle Destroyed');
        this.audio.playSound('hit');
        this.cameraManager.shake(0.25);
        this.particles.spawn(obs.mesh.position.x, obs.mesh.position.y, obs.mesh.position.z, 15, 0xf59e0b, 6);
      }
      // Если obs отсутствует (снаряд босса) — просто поглощаем урон без очков SMASHED.
      return;
    }

    if (this.player.hasShield) {
      // Shield Absorbed Hit — уничтожаем препятствие, чтобы то же самое препятствие
      // не начислило SMASHED-очки на следующем кадре (после установки invulnerableTimer).
      if (obs) {
        obs.destroyed = true;
        if (obs.mesh) obs.mesh.visible = false;
        if (obs.hitbox) {
          obs.hitbox.minY = -999;
          obs.hitbox.maxY = -999;
        }
      }
      this.player.hasShield = false;
      this.player.invulnerableTimer = 1.0;
      this.audio.playSound('hit');
      this.cameraManager.shake(0.35);
      this.particles.spawn(this.player.x, this.player.y + 0.9, this.player.z, 20, 0x38bdf8, 6);
      this.ui.showAlert('SHIELD BROKEN!', 'Damage Absorbed');
      return;
    }

    // Fatal crash
    this.gameOver();
  }

  collectCoin(coin) {
    coin.active = false;
    coin.mesh.visible = false;
    const multiplierLevel = this.storage.data.upgrades.coin_multiplier || 0;
    const baseVal = 1 + multiplierLevel;
    const val = coin.isGravBonus ? baseVal * 2 : baseVal;
    this.coinsGathered += val;
    this.player.nitroEnergy = Math.min(CONFIG.NITRO_MAX_ENERGY, this.player.nitroEnergy + (coin.isGravBonus ? 5.0 : 3.0));
    this.score += (coin.isGravBonus ? 50 : 25) * this.player.combo;
    this.audio.playSound('coin');

    const particleColor = coin.isGravBonus ? 0xa855f7 : 0xfbbf24;
    this.particles.spawn(
      coin.mesh.position.x,
      coin.mesh.position.y,
      coin.mesh.position.z,
      coin.isGravBonus ? 10 : 6,
      particleColor,
      3,
      0.2,
      0.35
    );

    // Occasional confetti burst on coin pickup
    if (Math.random() < 0.12) {
      const confettiColors = [0x00f0ff, 0xff007f, 0xffe600, 0x00ff66, 0x9d00ff, 0xffffff];
      for (let ci = 0; ci < 8; ci++) {
        this.particles.spawn(
          coin.mesh.position.x,
          coin.mesh.position.y,
          coin.mesh.position.z,
          1,
          confettiColors[Math.floor(Math.random() * confettiColors.length)],
          3 + Math.random() * 2,
          0.1,
          0.5,
          'sphere',
          2
        );
      }
    }

    // Combo streak
    this.player.comboScoreStreak++;
    if (this.player.comboScoreStreak >= 10 && this.player.combo < 10) {
      this.player.combo++;
      this.player.comboScoreStreak = 0;
      if (this.player.combo > this.storage.data.maxComboReached) {
        this.storage.data.maxComboReached = this.player.combo;
        this.storage.save();
      }
      this.ui.showAlert(`COMBO x${this.player.combo}!`, 'Multiplier Boost');
    }
  }

  collectPowerup(p) {
    p.active = false;
    p.mesh.visible = false;
    this.audio.playSound('powerup');
    this.particles.spawn(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, 15, 0x38bdf8, 5);

    const magnetLevel = this.storage.data.upgrades.magnet_boost || 0;

    switch (p.type) {
      case 'shield':
        this.player.hasShield = true;
        this.ui.showAlert('ENERGY SHIELD', 'Protected against 1 hit');
        break;
      case 'magnet':
        this.player.magnetTimer = 8.0 + magnetLevel * 2.5;
        this.ui.showAlert('COIN MAGNET', 'Drawing nearby gold');
        break;
      case 'multiplier':
        this.player.multiplierTimer = 12.0;
        this.ui.showAlert('2x SCORE', 'Double score active');
        break;
      case 'slowmo':
        this.player.slowmoTimer = 5.0;
        this.ui.showAlert('CHRONO SLOW', 'Time slowed down');
        break;
      case 'ghost':
        this.player.ghostTimer = CONFIG.GHOST_DURATION;
        this.player.model.setGhostMode(true);
        this.ui.showAlert('GHOST PHASE', 'Phasing through obstacles');
        break;
      case 'overdrive':
        this.player.overdriveTimer = CONFIG.OVERDRIVE_DURATION;
        this.player.overdriveShootTimer = 0;
        this.ui.showAlert('PLASMA OVERDRIVE', 'Rapid Blaster Cannons Active');
        break;
    }
  }

  onNearMiss(obs) {
    if (this.state !== 'PLAYING' || this.player.isDead) return;

    // Очки с учётом множителя комбо и пауэрапа 2x
    const multiplier = this.player.multiplierTimer > 0 ? 2 : 1;
    const scoreGain = CONFIG.NEAR_MISS_SCORE * this.player.combo * multiplier;
    this.score += scoreGain;

    // Буст комбо-стрика (приближает к следующему xN)
    this.player.comboScoreStreak = Math.min(9, this.player.comboScoreStreak + CONFIG.NEAR_MISS_STREAK_BONUS);
    if (this.player.comboScoreStreak >= 10 && this.player.combo < 10) {
      this.player.combo++;
      this.player.comboScoreStreak = 0;
      if (this.player.combo > this.storage.data.maxComboReached) {
        this.storage.data.maxComboReached = this.player.combo;
        this.storage.save();
      }
      this.ui.showAlert(`COMBO x${this.player.combo}!`, 'Multiplier Boost');
    } else {
      this.ui.showAlert('NEAR MISS!', `+${scoreGain} Score`);
    }

    // Статистика (поле totalNearMisses уже есть в StorageService)
    this.storage.data.totalNearMisses = (this.storage.data.totalNearMisses || 0) + 1;

    // Звук и визуал
    this.audio.playSound('near_miss');
    this.particles.spawn(this.player.x, this.player.y, this.player.z, 8, 0x00f0ff, 2.5, 0.1, 0.3, 'spark', 1);
    this.cameraManager.shake(0.12);

    // Проверка ачивок
    this.checkAchievements();
  }

  /**
   * Action Dodge — игрок впритирку перепрыгнул или проскользнул под препятствием
   * В СВОЕЙ полосе. Награждает вертикальную точность (прыжок/подкат), дополняя
   * Near Miss, который поощряет горизонтальную точность (зазор по X/Y).
   */
  onActionDodge(obs) {
    if (this.state !== 'PLAYING' || this.player.isDead) return;

    // Очки с учётом множителя комбо и пауэрапа 2x
    const multiplier = this.player.multiplierTimer > 0 ? 2 : 1;
    const scoreGain = CONFIG.ACTION_DODGE_SCORE * this.player.combo * multiplier;
    this.score += scoreGain;

    // Буст комбо-стрика (чуть меньше, чем у Near Miss, т.к. встречается чаще)
    this.player.comboScoreStreak = Math.min(9, this.player.comboScoreStreak + CONFIG.ACTION_DODGE_COMBO_BONUS);
    if (this.player.comboScoreStreak >= 10 && this.player.combo < 10) {
      this.player.combo++;
      this.player.comboScoreStreak = 0;
      if (this.player.combo > this.storage.data.maxComboReached) {
        this.storage.data.maxComboReached = this.player.combo;
        this.storage.save();
      }
      this.ui.showAlert(`COMBO x${this.player.combo}!`, 'Multiplier Boost');
    } else {
      this.ui.showAlert('ACTION DODGE!', `+${scoreGain} Score`);
    }

    // Статистика (для будущих ачивок/квестов)
    this.storage.data.totalActionDodges = (this.storage.data.totalActionDodges || 0) + 1;

    // Звук и визуал (зелёные искры — отличимы от голубых у Near Miss)
    this.audio.playSound('near_miss');
    this.particles.spawn(this.player.x, this.player.y, this.player.z, 10, 0x00ff66, 3, 0.1, 0.35, 'spark', 1);
    this.cameraManager.shake(0.18);

    // Проверка ачивок
    this.checkAchievements();
  }

  checkAchievements() {
    if (!Array.isArray(this.storage.data.achievementsNotified)) {
      this.storage.data.achievementsNotified = [];
    }

    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      const isClaimed = this.storage.data.achievementsClaimed.includes(ach.id);
      const isNotified = this.storage.data.achievementsNotified.includes(ach.id);

      if (!isClaimed && !isNotified) {
        const currentVal = this.storage.data[ach.key] || 0;
        if (currentVal >= ach.target) {
          newlyUnlocked.push(ach);
        }
      }
    }

    if (newlyUnlocked.length === 1) {
      const ach = newlyUnlocked[0];
      this.storage.data.achievementsNotified.push(ach.id);
      this.ui.showAlert('ACHIEVEMENT UNLOCKED!', ach.name);
      this.audio.playSound('powerup');
    } else if (newlyUnlocked.length > 1) {
      newlyUnlocked.forEach((ach) => this.storage.data.achievementsNotified.push(ach.id));
      this.ui.showAlert('ACHIEVEMENTS UNLOCKED!', `${newlyUnlocked.length} New Milestones Ready!`);
      this.audio.playSound('powerup');
    }

    if (newlyUnlocked.length > 0) {
      this.storage.save();
    }
  }

  loop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastFrameTime) * 0.001);
    this.lastFrameTime = timestamp;

    if (this.state === 'PLAYING') {
      // 1. Progressive speed increase (базовая скорость растёт с уровнем)
      const levelSpeedBonus = Math.min(
        CONFIG.LEVEL_MAX_SPEED_BONUS,
        (this.level - 1) * CONFIG.LEVEL_SPEED_BONUS
      );
      this.runSpeed = Math.min(CONFIG.MAX_SPEED + levelSpeedBonus, this.runSpeed + CONFIG.SPEED_ACCELERATION * dt);

      let effectiveSpeed = this.runSpeed;
      if (this.player.isNitroActive) effectiveSpeed *= CONFIG.NITRO_SPEED_MULTIPLIER;
      if (this.player.slowmoTimer > 0) effectiveSpeed *= 0.55;

      // 2. Audio Tempo Sync
      this.audio.setMusicTempo(effectiveSpeed);

      // 3. Player Forward Movement & Score
      const deltaZ = effectiveSpeed * dt;
      this.player.z += deltaZ;
      this.distance += deltaZ;

      const scoreRate = 10 * (this.player.multiplierTimer > 0 ? 2 : 1) * this.player.combo;
      this.score += scoreRate * dt;

      // 4. Update Subsystems
      this.player.update(dt, effectiveSpeed);
      this.input.setOnCeiling(this.player.gravityDirection === -1);
      this.levelGen.update(this.player.z, this.level);
      this.particles.update(dt);
      this.collision.update(dt);

      // 4c. Overdrive: player projectiles vaporize track obstacles
      for (let i = this.player.projectiles.length - 1; i >= 0; i--) {
        const proj = this.player.projectiles[i];
        const pPos = proj.mesh.position;
        for (let j = this.levelGen.obstacles.length - 1; j >= 0; j--) {
          const obs = this.levelGen.obstacles[j];
          if (obs.destroyed) continue;
          const h = obs.hitbox;
          if (
            pPos.x >= h.minX - 0.25 && pPos.x <= h.maxX + 0.25 &&
            pPos.y >= h.minY - 0.25 && pPos.y <= h.maxY + 0.25 &&
            pPos.z >= h.minZ - 0.5 && pPos.z <= h.maxZ + 0.5
          ) {
            obs.destroyed = true;
            if (obs.mesh) obs.mesh.visible = false;
            h.minY = -999;
            h.maxY = -999; // исключаем из коллизий без правки CollisionSystem

            this.score += 150 * this.player.combo;
            this.ui.showAlert('VAPORIZED!', '+150 Score');
            this.audio.playSound('hit');
            this.particles.spawn(pPos.x, pPos.y, pPos.z, 15, 0xf97316, 6);
            this.cameraManager.shake(0.15);

            this.engine.scene.remove(proj.mesh);
            this.player.projectiles.splice(i, 1);
            break;
          }
        }
      }

      // 4b. Speed lines at high velocity
      if (effectiveSpeed > 24 && Math.random() < 0.3) {
        this.particles.spawn(
          this.player.x + (Math.random() - 0.5) * 6,
          this.player.y + (Math.random() - 0.5) * 4,
          this.player.z - 8 - Math.random() * 6,
          1,
          Math.random() > 0.5 ? 0x38bdf8 : 0xff007f,
          0,
          0.06,
          0.25,
          'spark',
          0
        );
      }
      if (this.player.isNitroActive && Math.random() < 0.5) {
        this.particles.spawn(
          this.player.x + (Math.random() - 0.5) * 6,
          this.player.y + (Math.random() - 0.5) * 4,
          this.player.z - 8 - Math.random() * 6,
          1,
          0xffe600,
          0,
          0.08,
          0.3,
          'spark',
          0
        );
      }

      // 5. Biome Transitions
      if (this.distance >= this.nextBiomeDistance) {
        this.currentBiomeIndex = (this.currentBiomeIndex + 1) % BIOMES.length;
        this.nextBiomeDistance += CONFIG.BIOME_INTERVAL_METERS;
        this.levelGen.setBiome(this.currentBiomeIndex);
        const biome = BIOMES[this.currentBiomeIndex];
        this.engine.setBiomeVisuals(biome);
        this.ui.showAlert(`ENTERING: ${biome.name.toUpperCase()}`, 'Biome Transition');
      }

      // 6a. Milestone Rewards (награды за дистанцию)
      if (this.distance >= this.nextMilestoneDistance) {
        const isMajor = this.nextMilestoneDistance % CONFIG.MILESTONE_MAJOR_INTERVAL === 0;
        const coins = isMajor ? CONFIG.MILESTONE_MAJOR_COINS : CONFIG.MILESTONE_SMALL_COINS;
        const scoreBonus = isMajor ? CONFIG.MILESTONE_MAJOR_SCORE : CONFIG.MILESTONE_SMALL_SCORE;
        this.coinsGathered += coins;
        this.score += scoreBonus * this.player.combo;
        this.storage.data.totalMilestones = (this.storage.data.totalMilestones || 0) + 1;
        this.ui.showAlert(
          isMajor ? 'MILESTONE!' : `${Math.floor(this.nextMilestoneDistance)}m!`,
          `+${coins} Coins & +${scoreBonus} Score`
        );
        this.audio.playSound(isMajor ? 'powerup' : 'coin');
        this.particles.spawn(this.player.x, this.player.y + 0.9, this.player.z, 10, isMajor ? 0xffe600 : 0x38bdf8, 4);
        if (isMajor) this.cameraManager.shake(CONFIG.MILESTONE_MAJOR_SHAKE);
        this.nextMilestoneDistance += CONFIG.MILESTONE_INTERVAL;
      }

      // 7. Mini-Boss Encounter Spawning & Combat
      if (this.distance >= this.nextBossDistance && !this.boss.active) {
        this.boss.spawn(this.player.z, this.currentBiomeIndex, this.level);
        this.nextBossDistance += CONFIG.BOSS_INTERVAL_METERS;
        this.ui.showAlert('WARNING: BOSS DETECTED!', this.boss.name);
        this.audio.bossMusicMode = true;
      }

      if (this.boss.active) {
        this.boss.update(dt, this.player, () => this.onPlayerHitObstacle());
        if (!this.boss.active) {
          // Boss Defeated Reward
          this.audio.bossMusicMode = false;
          this.storage.data.bossesDefeated++;
          this.coinsGathered += 100;
          this.score += 2000 * this.player.combo;
          this.player.hasShield = true;
          this.player.nitroEnergy = CONFIG.NITRO_MAX_ENERGY;
          this.ui.showAlert('BOSS DEFEATED!', '+100 Coins & Shield Boost');
          this.cameraManager.shake(0.6);
          // Confetti celebration
          const confettiColors = [0x00f0ff, 0xff007f, 0xffe600, 0x00ff66, 0x9d00ff, 0xffffff];
          for (let ci = 0; ci < 30; ci++) {
            this.particles.spawn(
              this.player.x + (Math.random() - 0.5) * 4,
              this.player.y + 2 + Math.random() * 2,
              this.player.z,
              1,
              confettiColors[Math.floor(Math.random() * confettiColors.length)],
              3 + Math.random() * 3,
              0.12,
              0.6,
              'sphere',
              2
            );
          }
          // Новый уровень: снова долгий забег с препятствиями, затем следующий босс
          this.startNextLevel();
        }
      }

      // 8. Dynamic Camera
      this.cameraManager.update(dt, this.player, this.player.isNitroActive);

      // FPS Watchdog for adaptive resolution
      this.fpsWindow.push(dt);
      if (this.fpsWindow.length > 45) {
        this.fpsWindow.shift();
      }

      if (this.fpsWindow.length >= 30) {
        const sumDt = this.fpsWindow.reduce((a, b) => a + b, 0);
        const avgDt = sumDt / this.fpsWindow.length;
        const timeSinceLastChange = timestamp - this.lastAdaptiveChangeTime;

        if (avgDt > 0.028 && timeSinceLastChange >= 2500) {
          const currentDpr = this.engine.getCurrentPixelRatio();
          if (currentDpr > 0.75) {
            const newDpr = Math.max(0.75, currentDpr * 0.9);
            this.engine.setAdaptivePixelRatio(newDpr);
            this.lastAdaptiveChangeTime = timestamp;
            this.fpsWindow.length = 0;
            this.stableFpsFrames = 0;
          }
        } else if (avgDt < 0.016 && timeSinceLastChange >= 2500) {
          this.stableFpsFrames += this.fpsWindow.length;
          this.fpsWindow.length = 0;
          if (this.stableFpsFrames >= 60) {
            const currentDpr = this.engine.getCurrentPixelRatio();
            if (this.engine.maxPixelRatio && currentDpr < this.engine.maxPixelRatio) {
              const newDpr = Math.min(this.engine.maxPixelRatio, currentDpr * 1.1);
              this.engine.setAdaptivePixelRatio(newDpr);
              this.lastAdaptiveChangeTime = timestamp;
            }
            this.stableFpsFrames = 0;
          }
        } else if (avgDt >= 0.017) {
          this.stableFpsFrames = 0;
        }
      }

      // 9. Update HUD (throttled ~20Hz / 0.05s)
      this.hudTimer += dt;
      if (this.hudTimer >= 0.05) {
        this.hudTimer = 0;
        this.ui.updateHUD(this.distance, this.coinsGathered, this.player, this.boss, this.level);
      }
    } else if (this.state === 'GAMEOVER') {
      const dtSlow = dt * 0.75;
      this.player.updateDeath(dtSlow);
      this.particles.update(dtSlow);
      this.cameraManager.updateDeath(dtSlow, this.player);
    } else if (this.state === 'MENU') {
      const t = timestamp * 0.001;
      this.player.model.group.rotation.y = t * 1.2;
      this.player.model.animate({ isGrounded: true }, t, 0.4);
    }

    this.engine.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}
