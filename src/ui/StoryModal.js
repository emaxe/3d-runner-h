/**
 * src/ui/StoryModal.js
 * Контроллер окна сюжетного архива (Story / Cyber Archives).
 */
import { STORY_CHAPTERS } from '../config/story.js';

export class StoryModal {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('story-chapters-container');
    this.activeChapterIndex = 0;
  }

  render() {
    if (!this.container) {
      this.container = document.getElementById('story-chapters-container');
      if (!this.container) return;
    }

    const currentChapter = STORY_CHAPTERS[this.activeChapterIndex] || STORY_CHAPTERS[0];

    // Color accents per chapter
    const colorMap = {
      cyan: {
        activeTab: 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-lg shadow-cyan-500/30',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        border: 'border-cyan-500/30'
      },
      amber: {
        activeTab: 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-lg shadow-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        border: 'border-amber-500/30'
      },
      rose: {
        activeTab: 'bg-rose-500 text-slate-950 font-black border-rose-400 shadow-lg shadow-rose-500/30',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        border: 'border-rose-500/30'
      },
      emerald: {
        activeTab: 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-lg shadow-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        border: 'border-emerald-500/30'
      }
    };

    const chapterColors = colorMap[currentChapter.color] || colorMap.cyan;

    // Build Tabs HTML
    const tabsHtml = STORY_CHAPTERS.map((ch, idx) => {
      const isActive = idx === this.activeChapterIndex;
      const activeClass = isActive
        ? (colorMap[ch.color] ? colorMap[ch.color].activeTab : colorMap.cyan.activeTab)
        : 'glass-panel text-slate-400 hover:text-white hover:border-slate-600 font-bold';
      return `
        <button 
          class="btn-story-tab px-3.5 py-2 rounded-xl text-xs sm:text-sm font-gaming transition-all duration-150 active:scale-95 cursor-pointer border ${activeClass}"
          data-index="${idx}">
          ГЛАВА ${idx + 1}
        </button>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="flex flex-col space-y-4">
        <!-- Tabs Row -->
        <div class="flex flex-wrap gap-2 pb-2 border-b border-slate-800">
          ${tabsHtml}
        </div>

        <!-- Active Chapter Card -->
        <div class="glass-panel p-5 rounded-2xl border ${chapterColors.border} bg-slate-900/60 flex flex-col space-y-4 shadow-xl">
          <div class="flex justify-between items-center flex-wrap gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${chapterColors.badge}">
              ${currentChapter.badge}
            </span>
            <span class="text-xs font-mono text-slate-400 font-semibold tracking-wide">
              ${currentChapter.date}
            </span>
          </div>

          <h3 class="font-gaming text-xl sm:text-2xl font-black text-white leading-tight">
            ${currentChapter.title}
          </h3>

          <div class="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-line bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
            ${currentChapter.content}
          </div>
        </div>
      </div>
    `;

    // Bind tab clicks
    this.container.querySelectorAll('.btn-story-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        if (!isNaN(idx) && idx !== this.activeChapterIndex) {
          this.activeChapterIndex = idx;
          if (this.game && this.game.audio && typeof this.game.audio.playSound === 'function') {
            this.game.audio.playSound('coin');
          }
          this.render();
        }
      });
    });
  }
}
