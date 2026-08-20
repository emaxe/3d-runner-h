import { SKINS } from '../config/skins.js';
import { ShopModal } from './ShopModal.js';
import { AchievementsModal } from './AchievementsModal.js';
import { QuestsModal } from './QuestsModal.js';
import { SettingsModal } from './SettingsModal.js';
import { StoryModal } from './StoryModal.js';
import { CutsceneManager } from './CutsceneManager.js';
import { STORY_PROLOGUE, BIOME_STORY_TOASTS } from '../config/story.js';

/**
 * UIManager - High-level UI orchestrator managing all HUD indicators, screen transitions, and modals.
 */
export class UIManager {
  constructor(game) {
    this.game = game;

    // Sub-modal controllers
    this.shop = new ShopModal(game);
    this.achievements = new AchievementsModal(game);
    this.quests = new QuestsModal(game);
    this.settings = new SettingsModal(game);
    this.story = new StoryModal(game);
    this.cutscene = new CutsceneManager(game);

    this.alertTimeout = null;
    this.currentSkinIndex = 0;

    // HUD Dirty-checking cache to avoid redundant DOM writes each frame
    this._hudCache = {
      distance: -1,
      coins: -1,
      level: -1,
      combo: -1,
      nitroPct: -1,
      nitroState: '',
      bossActive: false,
      bossHp: -1,
      powerups: ''
    };

    this.initScreensAndButtons();
    this.initSkinSelector();
    this.initModals();
  }

  initScreensAndButtons() {
    // Menu buttons
    const btnPlay = document.getElementById('btn-play-game');
    if (btnPlay) btnPlay.addEventListener('click', () => {
      if (this.game.storage.data.storyPrologueSeen) {
        this.game.startGame();
      } else {
        this.showPrologueOverlay();
      }
    });

    const btnPause = document.getElementById('btn-pause-game');
    if (btnPause) btnPause.addEventListener('click', () => this.game.pauseGame());

    const btnResume = document.getElementById('btn-resume-game');
    if (btnResume) btnResume.addEventListener('click', () => this.game.resumeGame());

    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) btnRestart.addEventListener('click', () => this.game.startGame());

    const btnPauseMenu = document.getElementById('btn-pause-menu');
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => {
        document.getElementById('pause-screen')?.classList.add('hidden');
        document.getElementById('hud-screen')?.classList.add('hidden');
        document.getElementById('menu-screen')?.classList.remove('hidden');
        this.game.setMenuState();
      });
    }

    const btnGameOverMenu = document.getElementById('btn-gameover-menu');
    if (btnGameOverMenu) {
      btnGameOverMenu.addEventListener('click', () => {
        document.getElementById('gameover-screen')?.classList.add('hidden');
        document.getElementById('menu-screen')?.classList.remove('hidden');
        this.game.setMenuState();
      });
    }

    const btnGameOverRetry = document.getElementById('btn-gameover-retry');
    if (btnGameOverRetry) btnGameOverRetry.addEventListener('click', () => this.game.startGame());
  }

  initSkinSelector() {
    const savedSkinId = this.game.storage.data.selectedSkin;
    const foundIdx = SKINS.findIndex((s) => s.id === savedSkinId);
    if (foundIdx >= 0) this.currentSkinIndex = foundIdx;

    const updateDisplay = () => {
      const skin = SKINS[this.currentSkinIndex];
      const skinNameEl = document.getElementById('menu-skin-name');
      if (skinNameEl) skinNameEl.textContent = skin.name;
      this.game.player.model.applySkin(skin);
      this.game.storage.data.selectedSkin = skin.id;
      this.game.storage.save();
    };

    const btnPrevSkin = document.getElementById('btn-prev-skin');
    const btnNextSkin = document.getElementById('btn-next-skin');

    if (btnPrevSkin) {
      btnPrevSkin.addEventListener('click', () => {
        this.currentSkinIndex = (this.currentSkinIndex - 1 + SKINS.length) % SKINS.length;
        updateDisplay();
      });
    }

    if (btnNextSkin) {
      btnNextSkin.addEventListener('click', () => {
        this.currentSkinIndex = (this.currentSkinIndex + 1) % SKINS.length;
        updateDisplay();
      });
    }
  }

  initModals() {
    const bindModal = (openBtnId, closeBtnId, modalId, onOpen) => {
      const openBtn = document.getElementById(openBtnId);
      const closeBtn = document.getElementById(closeBtnId);
      const modal = document.getElementById(modalId);

      if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
          modal.classList.remove('hidden');
          if (onOpen) onOpen();
        });
      }
      if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
          modal.classList.add('hidden');
          this.updateMenuStats();
        });
      }
    };

    bindModal('btn-open-shop', 'btn-close-shop', 'shop-modal', () => this.shop.render());
    document.getElementById('btn-done-shop')?.addEventListener('click', () => {
      document.getElementById('shop-modal')?.classList.add('hidden');
      this.updateMenuStats();
    });

    bindModal('btn-open-achievements', 'btn-close-achievements', 'achievements-modal', () =>
      this.achievements.render()
    );
    document.getElementById('btn-done-achievements')?.addEventListener('click', () => {
      document.getElementById('achievements-modal')?.classList.add('hidden');
    });

    bindModal('btn-open-quests', 'btn-close-quests', 'quests-modal', () => this.quests.render());
    document.getElementById('btn-done-quests')?.addEventListener('click', () => {
      document.getElementById('quests-modal')?.classList.add('hidden');
    });

    bindModal('btn-open-settings', 'btn-close-settings', 'settings-modal');
    document.getElementById('btn-done-settings')?.addEventListener('click', () => {
      document.getElementById('settings-modal')?.classList.add('hidden');
    });

    bindModal('btn-open-tutorial', 'btn-close-tutorial', 'tutorial-modal');
    document.getElementById('btn-done-tutorial')?.addEventListener('click', () => {
      document.getElementById('tutorial-modal')?.classList.add('hidden');
    });

    bindModal('btn-open-story', 'btn-close-story', 'story-modal', () => this.story.render());
    document.getElementById('btn-done-story')?.addEventListener('click', () => {
      document.getElementById('story-modal')?.classList.add('hidden');
    });
  }

  updateMenuStats() {
    const coinsEl = document.getElementById('menu-coins');
    const highscoreEl = document.getElementById('menu-highscore');
    const shopCoinsEl = document.getElementById('shop-coins-counter');

    if (coinsEl) coinsEl.textContent = this.game.storage.data.coins;
    if (highscoreEl) highscoreEl.textContent = `${Math.floor(this.game.storage.data.bestDistance)} m`;
    if (shopCoinsEl) shopCoinsEl.textContent = this.game.storage.data.coins;
  }

  showAlert(title, subtitle) {
    const banner = document.getElementById('hud-alert-banner');
    const titleEl = document.getElementById('hud-alert-title');
    const subEl = document.getElementById('hud-alert-sub');
    if (!banner || !titleEl || !subEl) return;

    titleEl.textContent = title;
    subEl.textContent = subtitle;

    // Shift to top when running on floor, shift to bottom when running on ceiling
    const isFloor = this.game.player.gravityDirection === 1;
    if (isFloor) {
      banner.style.top = '74px';
      banner.style.bottom = 'auto';
    } else {
      banner.style.top = 'auto';
      banner.style.bottom = '96px';
    }

    banner.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
    banner.classList.add('opacity-100', 'scale-100');

    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      banner.classList.remove('opacity-100', 'scale-100');
      banner.classList.add('opacity-0', 'scale-90');
    }, 1400);
  }

  showPrologueOverlay() {
    const modal = document.getElementById('prologue-modal');
    const titleEl = document.getElementById('prologue-title');
    const subtitleEl = document.getElementById('prologue-subtitle');
    const textEl = document.getElementById('prologue-text');
    const btnStart = document.getElementById('btn-prologue-start');

    if (titleEl) titleEl.textContent = STORY_PROLOGUE.title;
    if (subtitleEl) subtitleEl.textContent = STORY_PROLOGUE.subtitle;
    if (textEl) textEl.innerHTML = STORY_PROLOGUE.transmission.map(line => `<p class="mb-2 last:mb-0">${line}</p>`).join('');
    if (modal) modal.classList.remove('hidden');

    if (btnStart) {
      btnStart.onclick = () => {
        modal?.classList.add('hidden');
        this.game.storage.data.storyPrologueSeen = true;
        this.game.storage.save();
        this.game.startGame();
      };
    }
  }

  showBiomeFlavor(biomeId) {
    const flavor = BIOME_STORY_TOASTS[biomeId];
    if (flavor) this.showAlert(flavor.title, flavor.subtitle);
  }

  updateHUD(distance, coins, player, boss, level = 1) {
    // Distance
    const d = Math.floor(distance);
    if (d !== this._hudCache.distance) {
      const distEl = document.getElementById('hud-distance');
      if (distEl) {
        distEl.innerHTML = `${d} <span class="text-lg text-cyan-400 font-normal">m</span>`;
      }
      this._hudCache.distance = d;
    }

    // Level
    if (level !== this._hudCache.level) {
      const levelEl = document.getElementById('hud-level');
      if (levelEl) levelEl.textContent = level;
      this._hudCache.level = level;
    }

    // Coins
    const c = Math.floor(coins);
    if (c !== this._hudCache.coins) {
      const coinsEl = document.getElementById('hud-coins');
      if (coinsEl) coinsEl.textContent = c;
      this._hudCache.coins = c;
    }

    // Multiplier / Combo
    if (player.combo !== this._hudCache.combo) {
      const multEl = document.getElementById('hud-multiplier');
      if (multEl) multEl.textContent = `x${player.combo}`;
      this._hudCache.combo = player.combo;
    }

    // Nitro Bar
    const nitroPct = Math.floor(player.nitroEnergy);
    if (nitroPct !== this._hudCache.nitroPct) {
      const nitroFill = document.getElementById('hud-nitro-fill');
      if (nitroFill) nitroFill.style.width = `${nitroPct}%`;
      this._hudCache.nitroPct = nitroPct;
    }

    let nitroState = 'charging';
    if (player.isNitroActive) {
      nitroState = 'boosting';
    } else if (player.nitroEnergy >= 30) {
      nitroState = 'ready';
    }

    if (nitroState !== this._hudCache.nitroState) {
      const nitroReady = document.getElementById('hud-nitro-ready');
      if (nitroReady) {
        if (nitroState === 'boosting') {
          nitroReady.textContent = 'BOOSTING!';
          nitroReady.className =
            'text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded border border-amber-500/60 animate-pulse';
        } else if (nitroState === 'ready') {
          nitroReady.textContent = 'READY [F]';
          nitroReady.className =
            'text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40';
        } else {
          nitroReady.textContent = 'CHARGING';
          nitroReady.className =
            'text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-slate-700/40 text-slate-400 rounded border border-slate-700';
        }
      }
      this._hudCache.nitroState = nitroState;
    }

    // Boss Bar
    const isBossActive = Boolean(boss && boss.active);
    if (isBossActive !== this._hudCache.bossActive) {
      const bossContainer = document.getElementById('hud-boss-bar-container');
      if (bossContainer) {
        if (isBossActive) {
          bossContainer.classList.remove('hidden');
        } else {
          bossContainer.classList.add('hidden');
        }
      }
      this._hudCache.bossActive = isBossActive;
      if (!isBossActive) {
        this._hudCache.bossHp = -1;
      }
    }

    if (isBossActive) {
      const pct = Math.max(0, Math.floor((boss.hp / boss.maxHp) * 100));
      if (pct !== this._hudCache.bossHp) {
        const bossNameEl = document.getElementById('hud-boss-name');
        if (bossNameEl) bossNameEl.textContent = `BOSS: ${boss.name}`;

        const bossHpText = document.getElementById('hud-boss-hp-text');
        if (bossHpText) bossHpText.textContent = `${pct}%`;

        const bossHpFill = document.getElementById('hud-boss-hp-fill');
        if (bossHpFill) bossHpFill.style.width = `${pct}%`;

        this._hudCache.bossHp = pct;
      }
    }

    // Powerups List
    const hasShield = Boolean(player.hasShield);
    const mag = player.magnetTimer > 0 ? Math.ceil(player.magnetTimer) : 0;
    const mult = player.multiplierTimer > 0 ? Math.ceil(player.multiplierTimer) : 0;
    const slow = player.slowmoTimer > 0 ? Math.ceil(player.slowmoTimer) : 0;
    const ghost = player.ghostTimer > 0 ? Math.ceil(player.ghostTimer) : 0;
    const od = player.overdriveTimer > 0 ? Math.ceil(player.overdriveTimer) : 0;
    const powerupsHash = `${hasShield ? 1 : 0}_${mag}_${mult}_${slow}_${ghost}_${od}`;

    if (powerupsHash !== this._hudCache.powerups) {
      const pList = document.getElementById('hud-powerups-list');
      if (pList) {
        let html = '';
        if (hasShield) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>🛡️</span><span>SHIELD</span></div>`;
        }
        if (mag > 0) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>🧲</span><span>${mag}s</span></div>`;
        }
        if (mult > 0) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>⭐ x2</span><span>${mult}s</span></div>`;
        }
        if (slow > 0) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>⏳ SLOW</span><span>${slow}s</span></div>`;
        }
        if (ghost > 0) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>👻 GHOST</span><span>${ghost}s</span></div>`;
        }
        if (od > 0) {
          html += `<div class="px-2.5 py-1 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold font-gaming flex items-center space-x-1"><span>🔥 OVERDRIVE</span><span>${od}s</span></div>`;
        }
        pList.innerHTML = html;
      }
      this._hudCache.powerups = powerupsHash;
    }
  }

  showGameOver(distance, score, coinsGathered, bestDistance, runStats) {
    document.getElementById('hud-screen')?.classList.add('hidden');
    document.getElementById('gameover-screen')?.classList.remove('hidden');

    // Поддержка как позиционных аргументов (легаси), так и единого объекта stats.
    // Принимаем объект { distance, score, coinsGathered, bestDistance, isNewRecord,
    // nearMisses, actionDodges, milestones, bossesDefeated, maxCombo, level }.
    let s = null;
    if (distance && typeof distance === 'object') {
      s = distance;
    } else {
      s = {
        distance, score, coinsGathered, bestDistance,
        isNewRecord: false, nearMisses: 0, actionDodges: 0,
        milestones: 0, bossesDefeated: 0, maxCombo: 1,
        maxNearMissStreak: 0, level: 1
      };
    }

    const distEl = document.getElementById('gameover-dist');
    const scoreEl = document.getElementById('gameover-score');
    const coinsEl = document.getElementById('gameover-coins');
    const bestEl = document.getElementById('gameover-best');

    if (distEl) distEl.textContent = `${Math.floor(s.distance)} m`;
    if (scoreEl) scoreEl.textContent = Math.floor(s.score);
    if (coinsEl) coinsEl.textContent = `+${s.coinsGathered} $`;
    if (bestEl) bestEl.textContent = `${Math.floor(s.bestDistance)} m`;

    // NEW RECORD badge
    const recordBadge = document.getElementById('gameover-record-badge');
    if (recordBadge) {
      if (s.isNewRecord) recordBadge.classList.remove('hidden');
      else recordBadge.classList.add('hidden');
    }

    // Detailed run performance stats
    const nmEl = document.getElementById('gameover-near-misses');
    const adEl = document.getElementById('gameover-action-dodges');
    const maxComboEl = document.getElementById('gameover-max-combo');
    const maxStreakEl = document.getElementById('gameover-max-streak');
    const bossesEl = document.getElementById('gameover-bosses');
    const milestonesEl = document.getElementById('gameover-milestones');
    const levelEl = document.getElementById('gameover-level');

    if (nmEl) nmEl.textContent = s.nearMisses;
    if (adEl) adEl.textContent = s.actionDodges;
    if (maxComboEl) maxComboEl.textContent = `x${s.maxCombo}`;
    if (maxStreakEl) maxStreakEl.textContent = `x${s.maxNearMissStreak || 0}`;
    if (bossesEl) bossesEl.textContent = s.bossesDefeated;
    if (milestonesEl) milestonesEl.textContent = s.milestones;
    if (levelEl) levelEl.textContent = `LEVEL ${s.level}`;

    this.updateMenuStats();
  }
}
