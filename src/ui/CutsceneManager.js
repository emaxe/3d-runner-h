/**
 * src/ui/CutsceneManager.js
 * Контроллер кинематографичных кат-сцен: посимвольная печать (typewriter),
 * скип по клику/ESC, кнопка «ПРОДОЛЖИТЬ», авто-переход для смерти.
 * Zero external assets — только DOM + синтезированный звук.
 */
export class CutsceneManager {
  constructor(game) {
    this.game = game;
    this.overlay = document.getElementById('cutscene-overlay');
    this.badgeEl = document.getElementById('cutscene-badge');
    this.senderEl = document.getElementById('cutscene-sender');
    this.titleEl = document.getElementById('cutscene-title');
    this.textEl = document.getElementById('cutscene-text');
    this.cursorEl = document.getElementById('cutscene-cursor');
    this.actionsEl = document.getElementById('cutscene-actions');

    this._typeTimer = null;
    this._advanceTimer = null;
    this._skipHandler = null;
    this._continueHandler = null;
    this._active = false;
    this._typing = false;
  }

  /**
   * Показать кат-сцену.
   * @param {Object} cfg - { badge, sender, title, color, soundCue, lines|getLines, buttonText, autoAdvanceMs, onComplete }
   */
  show(cfg) {
    if (!this.overlay) return;
    const lines = typeof cfg.getLines === 'function' ? cfg.getLines() : cfg.lines;

    this._active = true;
    this._cfg = cfg;
    this._lines = lines || [];

    // Заполняем метаданные
    if (this.badgeEl) this.badgeEl.textContent = cfg.badge || '';
    if (this.senderEl) this.senderEl.textContent = cfg.sender || '';
    if (this.titleEl) this.titleEl.textContent = cfg.title || '';
    if (this.textEl) this.textEl.textContent = '';
    if (this.actionsEl) this.actionsEl.innerHTML = '';
    if (this.cursorEl) this.cursorEl.classList.remove('hidden');

    // Цветовая схема бейджа/заголовка по cfg.color
    this._applyColor(cfg.color || 'cyan');

    this.overlay.classList.remove('hidden');

    // Звуковой сигнал начала сцены
    if (cfg.soundCue && this.game.audio && typeof this.game.audio.playSound === 'function') {
      this.game.audio.playSound(cfg.soundCue);
    }

    // Скип по ESC и клику по оверлею
    this._bindSkip();

    // Запуск typewriter
    this._typeLines(0, 0);
  }

  hide() {
    this._active = false;
    this._cleanup();
    if (this.overlay) this.overlay.classList.add('hidden');
  }

  get isActive() {
    return this._active;
  }

  // ---------- Typewriter ----------
  _typeLines(lineIdx, charIdx) {
    if (!this._active) return;
    if (lineIdx >= this._lines.length) {
      // Все строки напечатаны
      this._typing = false;
      this._showCursor(false);
      this._finish();
      return;
    }
    const line = this._lines[lineIdx];
    if (charIdx > line.length) {
      // Переход к следующей строке
      this._typeLines(lineIdx + 1, 0);
      return;
    }
    this._typing = true;
    this._showCursor(true);
    // Рендер всех строк до текущей + части текущей
    const text = this._renderText(lineIdx, charIdx);
    if (this.textEl) this.textEl.textContent = text;

    // Тихий чирп печатной машинки (не каждый символ)
    if (charIdx % 3 === 0 && this.game.audio && typeof this.game.audio.playSound === 'function') {
      this.game.audio.playSound('type_blip');
    }

    const self = this;
    this._typeTimer = setTimeout(() => {
      self._typeLines(lineIdx, charIdx + 1);
    }, charIdx === 0 ? 300 : 16);
  }

  _renderText(upToLine, upToChar) {
    const parts = [];
    for (let i = 0; i <= upToLine; i++) {
      const line = this._lines[i];
      if (line === undefined) break;
      parts.push(i < upToLine ? line : line.slice(0, upToChar));
    }
    return parts.join('\n\n');
  }

  // ---------- Кнопки ----------
  _finish() {
    if (!this._active) return;
    const cfg = this._cfg;
    if (cfg.autoAdvanceMs) {
      // Смерть: авто-переход + кнопка для быстрого скипа
      this._showActionButton(cfg.buttonText || 'ДАЛЕЕ', () => this._complete());
      this._advanceTimer = setTimeout(() => {
        if (this._active) this._complete();
      }, cfg.autoAdvanceMs);
    } else {
      // Босс/старт: обязательная кнопка «ПРОДОЛЖИТЬ»
      this._showContinueButton(cfg.buttonText || 'ПРОДОЛЖИТЬ');
    }
  }

  _showContinueButton(label) {
    if (!this.actionsEl) return;
    const btn = document.createElement('button');
    btn.id = 'btn-cutscene-continue';
    btn.className = 'px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-red-500 text-slate-950 font-gaming text-xl font-black tracking-wider shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition cursor-pointer uppercase w-full';
    btn.textContent = label;
    btn.addEventListener('click', () => this._complete());
    this.actionsEl.appendChild(btn);
  }

  _showActionButton(label, onClick) {
    if (!this.actionsEl) return;
    const btn = document.createElement('button');
    btn.className = 'w-full px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-red-500 text-slate-950 font-gaming text-xl font-black tracking-wider shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition cursor-pointer uppercase';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    this.actionsEl.appendChild(btn);
  }

  // ---------- Skip ----------
  _bindSkip() {
    const self = this;
    this._skipHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        self.skip();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!self._active) return;
        if (self._typing) {
          self.skipTyping();
        } else {
          // Если текст допечатан и есть кнопка — не дублируем клик (кнопка сама).
          // Клик по overlay завершает сцену.
        }
      }
    };
    document.addEventListener('keydown', this._skipHandler);

    this._overlayClickHandler = (e) => {
      if (!self._active) return;
      // Не скипать при клике по кнопкам внутри
      if (e.target.closest('button')) return;
      if (self._typing) {
        self.skipTyping();
      } else if (self._lines.length && !self._cfg.autoAdvanceMs) {
        // Если текст готов и сцена босса — клик по фону тоже завершает
        self._complete();
      }
    };
    if (this.overlay) this.overlay.addEventListener('pointerdown', this._overlayClickHandler);
  }

  /** Полный скип сцены (ESC): допечатывает текст и завершает. */
  skip() {
    if (!this._active) return;
    if (this._typing) this.skipTyping();
    else this._complete();
  }

  skipTyping() {
    if (!this._active) return;
    this._typing = false;
    this._showCursor(false);
    if (this._typeTimer) clearTimeout(this._typeTimer);
    // Допечатываем весь текст сразу
    if (this.textEl) this.textEl.textContent = this._lines.join('\n\n');
    this._finish();
  }

  // ---------- Internals ----------
  _showCursor(show) {
    if (!this.cursorEl) return;
    if (show) this.cursorEl.classList.remove('hidden');
    else this.cursorEl.classList.add('hidden');
  }

  _applyColor(color) {
    // Простая подсветка бейджа/заголовка в зависимости от цвета сцены
    if (!this.badgeEl) return;
    const map = {
      rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
    this.badgeEl.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-widest border ${map[color] || map.cyan}`;
  }

  _complete() {
    if (!this._active) return;
    const onComplete = this._cfg.onComplete;
    this.hide();
    if (typeof onComplete === 'function') onComplete();
  }

  _cleanup() {
    if (this._typeTimer) clearTimeout(this._typeTimer);
    this._typeTimer = null;
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    this._advanceTimer = null;
    if (this._skipHandler) {
      document.removeEventListener('keydown', this._skipHandler);
      this._skipHandler = null;
    }
    if (this._overlayClickHandler && this.overlay) {
      this.overlay.removeEventListener('pointerdown', this._overlayClickHandler);
      this._overlayClickHandler = null;
    }
    if (this._onContinue) {
      this._onContinue = null;
    }
  }
}
