/**
 * SettingsModal - Manages audio sliders, graphics fidelity buttons, touch overlay toggles, and data reset.
 */
export class SettingsModal {
  constructor(game) {
    this.game = game;
    this.initControls();
  }

  initControls() {
    // SFX Slider
    const sfxSlider = document.getElementById('slider-sfx-vol');
    if (sfxSlider) {
      sfxSlider.value = this.game.storage.data.settings.sfxVolume;
      const sfxVal = document.getElementById('settings-sfx-val');
      if (sfxVal) sfxVal.textContent = `${sfxSlider.value}%`;

      sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (sfxVal) sfxVal.textContent = `${val}%`;
        this.game.audio.setSfxVolume(val / 100);
        this.game.storage.data.settings.sfxVolume = val;
        this.game.storage.save();
      });
    }

    // Music Slider
    const musicSlider = document.getElementById('slider-music-vol');
    if (musicSlider) {
      musicSlider.value = this.game.storage.data.settings.musicVolume;
      const musicVal = document.getElementById('settings-music-val');
      if (musicVal) musicVal.textContent = `${musicSlider.value}%`;

      musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (musicVal) musicVal.textContent = `${val}%`;
        this.game.audio.setMusicVolume(val / 100);
        this.game.storage.data.settings.musicVolume = val;
        this.game.storage.save();
      });
    }

    // Graphics Quality buttons
    const gfxButtons = {
      low: document.getElementById('gfx-low'),
      med: document.getElementById('gfx-med'),
      high: document.getElementById('gfx-high')
    };

    const updateGfxBtnState = (selected) => {
      Object.keys(gfxButtons).forEach((key) => {
        const btn = gfxButtons[key];
        if (!btn) return;
        if (key === selected) {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold border-cyan-400 text-cyan-300 transition';
        } else {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold text-slate-400 hover:border-slate-400 transition';
        }
      });
    };

    const currentGfx = this.game.storage.data.settings.quality || 'high';
    updateGfxBtnState(currentGfx);

    Object.keys(gfxButtons).forEach((key) => {
      const btn = gfxButtons[key];
      if (btn) {
        btn.addEventListener('click', () => {
          this.game.engine.setQuality(key);
          this.game.storage.data.settings.quality = key;
          this.game.storage.save();
          updateGfxBtnState(key);
        });
      }
    });

    // Touch controls checkbox
    const touchToggle = document.getElementById('toggle-touch-controls');
    if (touchToggle) {
      touchToggle.checked = !!this.game.storage.data.settings.showTouchControls;
      const touchOverlay = document.getElementById('hud-touch-controls');
      if (touchOverlay) {
        touchOverlay.style.display = touchToggle.checked ? 'flex' : 'none';
      }

      touchToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        if (touchOverlay) {
          touchOverlay.style.display = val ? 'flex' : 'none';
        }
        this.game.storage.data.settings.showTouchControls = val;
        this.game.storage.save();
      });
    }

    // Hide Touch Buttons checkbox
    const hideTouchToggle = document.getElementById('toggle-hide-touch-controls');
    if (hideTouchToggle) {
      hideTouchToggle.checked = !!this.game.storage.data.settings.hideTouchControls;
      const touchOverlay = document.getElementById('hud-touch-controls');
      if (touchOverlay) {
        touchOverlay.style.display = hideTouchToggle.checked ? 'none' : (this.game.storage.data.settings.showTouchControls ? 'flex' : 'none');
      }

      hideTouchToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        if (touchOverlay) {
          touchOverlay.style.display = val ? 'none' : (this.game.storage.data.settings.showTouchControls ? 'flex' : 'none');
        }
        this.game.storage.data.settings.hideTouchControls = val;
        this.game.storage.save();
      });
    }

    // Mobile Control Mode buttons (swipe / gyro tilt)
    const ctrlButtons = {
      swipe: document.getElementById('ctrl-swipe'),
      gyro: document.getElementById('ctrl-gyro')
    };

    const updateCtrlBtnState = (selected) => {
      Object.keys(ctrlButtons).forEach((key) => {
        const btn = ctrlButtons[key];
        if (!btn) return;
        if (key === selected) {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold border-cyan-400 text-cyan-300 transition cursor-pointer';
        } else {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold text-slate-400 hover:border-slate-400 transition cursor-pointer';
        }
      });
    };

    const currentCtrl = this.game.storage.data.settings.controlMode || 'swipe';
    updateCtrlBtnState(currentCtrl);

    const applyControlMode = (mode) => {
      this.game.storage.data.settings.controlMode = mode;
      this.game.storage.save();
      this.game.input.setControlMode(mode);
      updateCtrlBtnState(mode);
    };

    if (ctrlButtons.swipe) {
      ctrlButtons.swipe.addEventListener('click', () => applyControlMode('swipe'));
    }
    if (ctrlButtons.gyro) {
      ctrlButtons.gyro.addEventListener('click', () => {
        // iOS 13+ требует явного разрешения на DeviceOrientationEvent
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then((permissionState) => {
              if (permissionState === 'granted') {
                applyControlMode('gyro');
              } else {
                alert('Гироскоп: разрешение не получено. Управление останется на свайпах.');
                updateCtrlBtnState(this.game.storage.data.settings.controlMode || 'swipe');
              }
            })
            .catch((err) => {
              console.warn('[SettingsModal] DeviceOrientation permission error:', err);
              applyControlMode('gyro');
            });
        } else if (typeof DeviceOrientationEvent !== 'undefined') {
          applyControlMode('gyro');
        } else {
          alert('Гироскоп не поддерживается на этом устройстве.');
          updateCtrlBtnState(this.game.storage.data.settings.controlMode || 'swipe');
        }
      });
    }

    // Accessibility: Camera Shake toggle
    const shakeToggle = document.getElementById('toggle-camera-shake');
    if (shakeToggle) {
      shakeToggle.checked = this.game.storage.data.settings.shakeEnabled !== false;
      shakeToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.game.storage.data.settings.shakeEnabled = val;
        this.game.cameraManager.enabled = val;
        this.game.storage.save();
      });
    }

    // Accessibility: Particle Density buttons
    const particleButtons = {
      low: document.getElementById('gfx-particles-low'),
      normal: document.getElementById('gfx-particles-normal'),
      high: document.getElementById('gfx-particles-high')
    };

    const updateParticleBtnState = (selected) => {
      Object.keys(particleButtons).forEach((key) => {
        const btn = particleButtons[key];
        if (!btn) return;
        if (key === selected) {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold border-cyan-400 text-cyan-300 transition cursor-pointer';
        } else {
          btn.className =
            'py-2 rounded-xl glass-panel text-xs font-bold text-slate-400 hover:border-slate-400 transition cursor-pointer';
        }
      });
    };

    const currentDensity = this.game.storage.data.settings.particleDensity || 'normal';
    updateParticleBtnState(currentDensity);

    Object.keys(particleButtons).forEach((key) => {
      const btn = particleButtons[key];
      if (btn) {
        btn.addEventListener('click', () => {
          this.game.storage.data.settings.particleDensity = key;
          this.game.particles.setDensity(key);
          this.game.storage.save();
          updateParticleBtnState(key);
        });
      }
    });

    // Accessibility: Large Text toggle
    const largeTextToggle = document.getElementById('toggle-large-text');
    if (largeTextToggle) {
      largeTextToggle.checked = !!this.game.storage.data.settings.largeText;
      largeTextToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.game.storage.data.settings.largeText = val;
        document.body.classList.toggle('large-text', val);
        this.game.storage.save();
      });
    }

    // Reset Save Progress
    const resetBtn = document.getElementById('btn-reset-save');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all game progress, upgrades, and high scores?')) {
          this.game.storage.reset();
          this.game.applySavedSettings();
          this.game.ui.updateMenuStats();
          alert('Save data reset successfully!');
        }
      });
    }
  }
}
