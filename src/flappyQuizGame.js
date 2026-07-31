/* ═══════════════════════════════════════════════════════════════════════════
 * flappyQuizGame.js — Mini-game Flappy Bird tích hợp quiz ôn tập
 *
 * Dùng cho userscript Tampermonkey VLearn Tutor:
 *   const game = FlappyQuiz.create();
 *   game.open({ quiz: [...], onClose: () => {...}, title: '...' });
 *   game.close();
 *
 * Luồng chơi (cập nhật):
 *   1. Popup glassmorphism + nút ✕ đóng
 *   2. Banner câu hỏi hiển thị NGAY khi game bắt đầu
 *   3. Chim bay được, click/space/↑ để giữ
 *   4. Đếm ngược 10s — KHÔNG có cột, chim chỉ bay qua "vùng an toàn"
 *   5. Sau 10s xuất hiện 1 CỘT duy nhất chứa 4 ô đáp án A/B/C/D xếp dọc,
 *      trôi từ phải sang trái
 *   6. Chim phải đi vào ô đúng trong cột:
 *        - ĐÚNG  → sáng xanh, +1 điểm, reset 10s cho câu mới
 *        - SAI   → sáng đỏ, GAME OVER
 *        - TRÁNH (bay qua khe hở không phải ô đúng) → GAME OVER
 *   7. Chạm đất/trần = THUA
 *   8. Hết câu hỏi → Win
 *   9. Chơi lại → xáo trộn cả câu hỏi lẫn đáp án
 *
 * API exposed: window.FlappyQuiz.create (và unsafeWindow.FlappyQuiz nếu có)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────── CSS ──────────────── */
  const CSS = `
    .fq-overlay {
      position: fixed; inset: 0; z-index: 2147483600;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      display: flex; justify-content: center; align-items: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: fq-fadein 0.18s ease-out;
    }
    @keyframes fq-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fq-popin {
      from { transform: scale(0.88); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    @keyframes fq-shake {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-6px, 4px); }
      40% { transform: translate(5px, -3px); }
      60% { transform: translate(-4px, 2px); }
      80% { transform: translate(3px, -1px); }
    }
    @keyframes fq-flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .fq-window {
      position: relative;
      width: 520px; height: 760px;
      max-width: 95vw; max-height: 95vh;
      background: linear-gradient(180deg, #4ec0ca 0%, #87ceeb 100%);
      border-radius: 18px;
      box-shadow:
        0 20px 60px rgba(0,0,0,0.45),
        0 0 0 1px rgba(255,255,255,0.08);
      display: flex; flex-direction: column; overflow: hidden;
      animation: fq-popin 0.22s ease-out;
    }

    /* HEADER */
    .fq-head {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 16px;
      background: linear-gradient(135deg, #f8b500, #f47b00);
      color: #fff; user-select: none;
    }
    .fq-head h3 { margin: 0; flex: 1; font-size: 15px; font-weight: 700; }
    .fq-head-info {
      font-size: 12px; opacity: 0.92; font-weight: 600;
      padding: 4px 10px; background: rgba(255,255,255,0.18);
      border-radius: 6px;
    }
    .fq-btn {
      background: rgba(255,255,255,0.25); border: none; border-radius: 6px;
      padding: 6px 12px; color: #fff; cursor: pointer;
      font-size: 16px; font-weight: 700; line-height: 1;
      transition: background 0.15s, transform 0.1s;
    }
    .fq-btn:hover { background: rgba(255,255,255,0.4); }
    .fq-btn:active { transform: scale(0.94); }
    .fq-btn.close {
      width: 32px; height: 32px; padding: 0;
      background: #e53935; font-size: 18px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .fq-btn.close:hover { background: #c62828; }

    /* BODY (canvas + overlays) */
    .fq-body {
      flex: 1; position: relative; overflow: hidden;
    }
    .fq-canvas {
      position: absolute; inset: 0; width: 100%; height: 100%;
      display: block; cursor: pointer;
    }
    .fq-body.shake { animation: fq-shake 0.35s ease; }

    /* QUESTION BANNER */
    .fq-banner {
      position: absolute; top: 0; left: 0; right: 0;
      z-index: 30;
      background: rgba(255,255,255,0.97);
      border-bottom: 3px solid #543847;
      padding: 11px 64px 11px 16px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      display: none;
    }
    .fq-banner.show { display: block; }
    .fq-banner-label {
      font-size: 10px; font-weight: 700; color: #ec407a;
      text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 3px;
    }
    .fq-banner-q {
      font-size: 14px; color: #2c3e50; font-weight: 700; line-height: 1.35;
    }
    .fq-banner-countdown {
      position: absolute; top: 9px; right: 14px;
      font-size: 22px; font-weight: 800; color: #ec407a;
      font-variant-numeric: tabular-nums;
    }
    .fq-banner-countdown.warn { color: #e53935; animation: fq-flash 0.6s infinite; }

    /* HUD (điểm) */
    .fq-hud {
      position: absolute; top: 78px; right: 14px;
      z-index: 25;
      background: rgba(0,0,0,0.55); color: #fff;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 10px; font-weight: 700; text-align: center;
      display: none;
      letter-spacing: 0.5px;
    }
    .fq-hud.show { display: block; }
    .fq-hud-score {
      font-size: 24px; color: #ffe066; font-weight: 800; line-height: 1.05;
      font-variant-numeric: tabular-nums;
    }
    .fq-hud-progress {
      font-size: 10px; opacity: 0.92; margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }

    /* CỘT CHƯỚNG NGẠI VẬT = 1 pillar chứa các ô đáp án */
    .fq-pillar {
      position: absolute; z-index: 20;
      /* kích thước set bằng JS */
      background: linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.45));
      border-left: 3px solid #543847;
      border-right: 3px solid #543847;
      border-radius: 6px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.28);
      pointer-events: none;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .fq-pillar-slot {
      flex: 1;
      display: flex; align-items: center;
      padding: 4px 8px;
      background: linear-gradient(90deg, rgba(255,255,255,0.97), #fff);
      border-top: 1px solid rgba(0,0,0,0.15);
      font-size: 11px; font-weight: 700; color: #2c3e50;
      overflow: hidden;
      transition: background 0.18s, box-shadow 0.18s;
    }
    .fq-pillar-slot:first-child { border-top: 0; }
    .fq-pillar-letter {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      background: #543847; color: #fff;
      font-size: 11px; font-weight: 800;
      margin-right: 6px; flex-shrink: 0;
    }
    .fq-pillar-text {
      flex: 1; line-height: 1.15;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .fq-pillar-slot.correct {
      background: linear-gradient(90deg, #c8e6c9, #a5d6a7) !important;
      box-shadow: inset 0 0 14px rgba(76,175,80,0.65);
    }
    .fq-pillar-slot.correct .fq-pillar-letter { background: #2e7d32; }
    .fq-pillar-slot.wrong {
      background: linear-gradient(90deg, #ffcdd2, #ef9a9a) !important;
      box-shadow: inset 0 0 14px rgba(244,67,54,0.65);
    }
    .fq-pillar-slot.wrong .fq-pillar-letter { background: #c62828; }

    /* MODAL overlay */
    .fq-modal {
      position: absolute; inset: 0; z-index: 60;
      background: rgba(0,0,0,0.65);
      color: #fff;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      padding: 30px; text-align: center;
      backdrop-filter: blur(2px);
    }
    .fq-modal h2 {
      font-size: 36px; color: #ffe066;
      text-shadow: 3px 3px 0 #543847;
      margin: 0 0 14px; letter-spacing: 1px;
      line-height: 1.1;
    }
    .fq-modal p { max-width: 360px; line-height: 1.5; font-size: 14px; margin: 6px 0; }
    .fq-modal-buttons { margin-top: 18px; display: flex; gap: 8px; }
    .fq-modal button {
      padding: 11px 28px; font-size: 15px; font-weight: 700;
      border: 3px solid #543847; border-radius: 8px;
      background: linear-gradient(180deg, #f8b500, #f47b00); color: #fff;
      cursor: pointer; box-shadow: 0 4px 0 #543847;
      transition: transform 0.1s;
    }
    .fq-modal button:hover { transform: translateY(-2px); }
    .fq-modal button:active { transform: translateY(2px); box-shadow: 0 2px 0 #543847; }
    .fq-modal button.secondary {
      background: linear-gradient(180deg, #78909c, #546e7a);
    }
    .fq-modal .hint {
      margin-top: 14px; padding: 8px 14px;
      background: rgba(255,255,255,0.16);
      border-radius: 6px; font-size: 12px; line-height: 1.45;
    }
    .fq-modal .correct-answer {
      margin-top: 8px;
      padding: 6px 14px;
      background: rgba(76,175,80,0.25);
      border: 1px solid rgba(76,175,80,0.5);
      border-radius: 6px;
      font-size: 13px;
    }
    .fq-modal .score-line {
      font-size: 19px; color: #ffe066; font-weight: 700; margin: 12px 0 4px;
    }

    .fq-foot {
      padding: 8px 16px;
      background: rgba(0,0,0,0.06);
      border-top: 1px solid rgba(0,0,0,0.08);
      font-size: 11px; color: #4a4a4a;
      display: flex; justify-content: space-between;
      font-weight: 600;
    }
  `;

  /* ─────────────────────────────────────────────── UTIL ──────────────── */
  function shuffle(arr) {
    const a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffleQuestion(q) {
    if (!q || !q.options) return q;
    const opts = q.options.map((o, i) => ({
      text: (o && (o.text || o.label || o.value)) || String(o || ''),
      _idx: i,
    }));
    const shuffled = shuffle(opts);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const correctIdx = (typeof q.correct === 'number')
      ? q.correct
      : (q.correctIndex != null ? q.correctIndex : 0);
    const newCorrectIdx = shuffled.findIndex((o) => o._idx === correctIdx);
    return {
      q: q.q || q.question || '',
      options: shuffled.map((o, i) => ({ key: letters[i], text: o.text })),
      correct: newCorrectIdx >= 0 ? newCorrectIdx : 0,
    };
  }

  function shuffleQuiz(items) {
    return shuffle((items || []).map(shuffleQuestion));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ─────────────────────────────────────────────── DEFAULT QUIZ ─────── */
  function defaultQuiz() {
    return [
      {
        q: 'AI Agent khác LLM truyền thống ở điểm nào?',
        options: [
          { key: 'A', text: 'Tạo văn bản' },
          { key: 'B', text: 'Gọi Tools/APIs để hành động' },
          { key: 'C', text: 'Dùng ít token hơn' },
          { key: 'D', text: 'Chỉ chạy offline' },
        ],
        correct: 1,
      },
      {
        q: 'Trong ReAct pattern, agent làm gì trước khi hành động?',
        options: [
          { key: 'A', text: 'Sleep 1s' },
          { key: 'B', text: 'Suy luận (Reasoning)' },
          { key: 'C', text: 'Reset bộ nhớ' },
          { key: 'D', text: 'Gọi API ngẫu nhiên' },
        ],
        correct: 1,
      },
      {
        q: 'Tool calling dùng để làm gì?',
        options: [
          { key: 'A', text: 'Format JSON' },
          { key: 'B', text: 'Tô màu UI' },
          { key: 'C', text: 'Mở rộng khả năng của LLM' },
          { key: 'D', text: 'Nén file PDF' },
        ],
        correct: 2,
      },
      {
        q: 'Nên bắt đầu học AI từ đâu khi mất gốc?',
        options: [
          { key: 'A', text: 'Nhảy vào code API' },
          { key: 'B', text: 'Đọc bức tranh AI tổng quan' },
          { key: 'C', text: 'Học fine-tuning' },
          { key: 'D', text: 'Mua GPU mới' },
        ],
        correct: 1,
      },
    ];
  }

  /* ─────────────────────────────────────────────── FACTORY ──────────── */
  function createFlappyQuiz() {
    let overlay = null, win = null, body = null,
        canvas = null, ctx = null,
        banner = null, bannerQ = null, bannerCD = null,
        hud = null, hudScore = null, hudProgress = null,
        headInfo = null,
        pillarLayer = null;
    let styleEl = null;
    let currentModal = null;

    // State
    let state = 'idle';
    let bird = null;
    let bgClouds = [];
    let raf = null;
    let countdownTimer = null;
    let countdownValue = 10;
    let currentQ = 0;
    let shuffledQuiz = [];
    let originalQuiz = [];
    let score = 0;
    let pillar = null;            // 1 cột duy nhất
    let pillarSpawned = false;
    let pillarAnimating = false;

    // Cleanup callbacks
    let onCloseCb = null;
    let size = { w: 520, h: 720 };
    const SIZE_DEFAULT = { w: 520, h: 720 };

    // Constants
    const GRAVITY = 0.32;
    const FLAP = -6.5;
    const PILLAR_WIDTH = 150;
    const SPEED = 2.2;
    const COUNTDOWN_SECS = 10;
    const GROUND_TOP_RATIO = 0;   // đất sát đáy màn hình (chiếm 60px cuối)

    /* ──────────────── Public API ──────────────── */

    function open({ quiz, onClose, parent, title } = {}) {
      if (overlay) return;
      onCloseCb = onClose || null;
      injectStyle();
      const root = parent || document.body;
      buildDom(title || '🐦 Flappy Quiz');
      root.appendChild(overlay);
      sizeCanvas();
      bindEvents();

      originalQuiz = (quiz && quiz.length) ? quiz : defaultQuiz();
      shuffledQuiz = shuffleQuiz(originalQuiz);

      state = 'idle';
      resetToStart();
      loop();
    }

    function close() {
      cleanup();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      removeStyle();
    }

    function isOpen() { return !!overlay; }

    /* ──────────────── Style ──────────────── */

    function injectStyle() {
      if (styleEl) return;
      styleEl = document.createElement('style');
      styleEl.id = 'fq-style';
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
    }
    function removeStyle() {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }

    /* ──────────────── Build DOM ──────────────── */

    function buildDom(title) {
      overlay = document.createElement('div');
      overlay.className = 'fq-overlay';

      win = document.createElement('div');
      win.className = 'fq-window';

      /* HEADER */
      const head = document.createElement('div');
      head.className = 'fq-head';
      head.innerHTML = `
        <span style="font-size:20px;line-height:1;">🐦</span>
        <h3>${escapeHtml(title)}</h3>
        <span class="fq-head-info" data-info>Q 1/${escapeHtml('0')}</span>
        <button class="fq-btn close" data-act="close" title="Đóng (ESC)" aria-label="Đóng">✕</button>
      `;
      headInfo = head.querySelector('[data-info]');

      /* BODY */
      body = document.createElement('div');
      body.className = 'fq-body';

      canvas = document.createElement('canvas');
      canvas.className = 'fq-canvas';
      canvas.width = SIZE_DEFAULT.w;
      canvas.height = SIZE_DEFAULT.h;
      size.w = SIZE_DEFAULT.w;
      size.h = SIZE_DEFAULT.h;
      ctx = canvas.getContext('2d');
      body.appendChild(canvas);

      /* BANNER */
      banner = document.createElement('div');
      banner.className = 'fq-banner';
      const bannerLabel = document.createElement('div');
      bannerLabel.className = 'fq-banner-label';
      bannerLabel.textContent = 'Câu hỏi';
      bannerQ = document.createElement('div');
      bannerQ.className = 'fq-banner-q';
      bannerCD = document.createElement('div');
      bannerCD.className = 'fq-banner-countdown';
      bannerCD.textContent = String(COUNTDOWN_SECS);
      banner.append(bannerLabel, bannerQ, bannerCD);
      body.appendChild(banner);

      /* HUD */
      hud = document.createElement('div');
      hud.className = 'fq-hud';
      hudScore = document.createElement('div');
      hudScore.className = 'fq-hud-score';
      hudScore.textContent = '0';
      hudProgress = document.createElement('div');
      hudProgress.className = 'fq-hud-progress';
      hudProgress.textContent = '0/0';
      hud.append(hudScore, hudProgress);
      body.appendChild(hud);

      /* Pillar layer (1 cột trôi ngang) */
      pillarLayer = document.createElement('div');
      pillarLayer.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;';
      body.appendChild(pillarLayer);

      win.append(head, body);

      /* FOOTER */
      const foot = document.createElement('div');
      foot.className = 'fq-foot';
      foot.innerHTML = `
        <span>🖱️ Click / Space / ↑ để chim bay</span>
        <span>ESC để đóng</span>
      `;
      win.appendChild(foot);

      overlay.appendChild(win);
      overlay.addEventListener('click', onOverlayClick);

      headInfo.textContent = `Q 1/${shuffledQuiz.length}`;
    }

    /* ──────────────── Modal helpers ──────────────── */

    function showModal(html) {
      removeModal();
      const m = document.createElement('div');
      m.className = 'fq-modal';
      m.innerHTML = html;
      body.appendChild(m);
      currentModal = m;
    }
    function removeModal() {
      if (currentModal && currentModal.parentNode) currentModal.parentNode.removeChild(currentModal);
      currentModal = null;
    }

    function modalStart() {
      showModal(`
        <h2>🐦 FLAPPY QUIZ</h2>
        <p><b>Bay qua đáp án đúng</b> trong cột chướng ngại vật.</p>
        <p>Câu hỏi hiện ngay, cột xuất hiện sau <b>${COUNTDOWN_SECS}s</b>.</p>
        <div class="fq-modal-buttons">
          <button data-act="start">Bắt đầu chơi</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
        <div class="hint">
          💡 Chạm đất = thua. <br/>
          Đáp án & câu hỏi xáo trộn mỗi lượt chơi lại.
        </div>
      `);
    }
    function modalLose(reason, correctLetter, correctText) {
      const detail = correctLetter
        ? `<div class="correct-answer">Đáp án đúng: <b>${escapeHtml(correctLetter)}</b>. ${escapeHtml(correctText || '')}</div>`
        : '';
      showModal(`
        <h2>💥 THUA RỒI!</h2>
        <p>${escapeHtml(reason || 'Bạn đã thua!')}</p>
        ${detail}
        <p class="score-line">Điểm: ${score}/${shuffledQuiz.length} câu đúng</p>
        <div class="fq-modal-buttons">
          <button data-act="restart">Chơi lại</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
      `);
    }
    function modalWin() {
      showModal(`
        <h2>🏆 HOÀN HẢO!</h2>
        <p>Bạn đã trả lời đúng toàn bộ câu hỏi!</p>
        <p class="score-line">${score}/${shuffledQuiz.length} câu đúng</p>
        <div class="fq-modal-buttons">
          <button data-act="restart">Chơi lại</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
      `);
    }

    /* ──────────────── Events ──────────────── */

    function bindEvents() {
      document.addEventListener('keydown', onKey);
      canvas.addEventListener('mousedown', onFlap);
      canvas.addEventListener('touchstart', onTouch, { passive: false });
      window.addEventListener('resize', sizeCanvas);
    }
    function unbindEvents() {
      document.removeEventListener('keydown', onKey);
      if (canvas) {
        canvas.removeEventListener('mousedown', onFlap);
        canvas.removeEventListener('touchstart', onTouch);
      }
      window.removeEventListener('resize', sizeCanvas);
    }

    function onOverlayClick(e) {
      if (e.target === overlay) { doClose(); return; }
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'start') startGame();
      else if (act === 'restart') startGame();
      else if (act === 'close') doClose();
    }

    function onTouch(e) {
      e.preventDefault();
      flap();
    }
    function onFlap() { flap(); }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); doClose(); return; }
      if (state === 'playing' && (e.code === 'Space' || e.code === 'ArrowUp')) {
        e.preventDefault();
        flap();
      }
    }

    function doClose() {
      cleanup();
      if (onCloseCb) {
        try { onCloseCb(); } catch (_) {}
      }
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      removeStyle();
    }

    /* ──────────────── Canvas sizing ──────────────── */

    function sizeCanvas() {
      if (!canvas) return;
      const rect = canvas.parentNode.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(480, Math.floor(rect.height));
      if (canvas.width !== w) {
        canvas.width = w;
        size.w = w;
      }
      if (canvas.height !== h) {
        canvas.height = h;
        size.h = h;
      }
    }

    /* ──────────────── Helpers ──────────────── */

    // Vùng chơi game: trừ banner trên (~76px) và đất dưới (~50px)
    function gameArea() {
      return {
        top: 76,
        bottom: size.h - 50,   // đất ở dưới cùng, chiếm ~50px
      };
    }

    /* ──────────────── Game flow ──────────────── */

    function resetToStart() {
      currentQ = 0;
      score = 0;
      hudScore.textContent = '0';
      hudProgress.textContent = `0/${shuffledQuiz.length}`;
      hud.classList.remove('show');
      banner.classList.remove('show');
      if (headInfo) headInfo.textContent = `Q 1/${shuffledQuiz.length}`;

      resetBird();
      initClouds();
      pillarLayer.innerHTML = '';
      pillar = null;
      pillarSpawned = false;
      pillarAnimating = false;
      stopCountdown();

      state = 'idle';
      modalStart();
    }

    function startGame() {
      shuffledQuiz = shuffleQuiz(originalQuiz);

      currentQ = 0;
      score = 0;
      hudScore.textContent = '0';
      hudProgress.textContent = `0/${shuffledQuiz.length}`;

      resetBird();
      initClouds();
      removeModal();
      pillarLayer.innerHTML = '';
      pillar = null;
      pillarSpawned = false;
      pillarAnimating = false;
      stopCountdown();

      hud.classList.add('show');
      if (headInfo) headInfo.textContent = `Q 1/${shuffledQuiz.length}`;

      state = 'playing';
      loadQuestion();
    }

    function resetBird() {
      const ga = gameArea();
      bird = {
        x: size.w * 0.22,
        y: (ga.top + ga.bottom) / 2,
        vy: 0,
        r: 14,
        rotation: 0,
      };
    }

    function flap() {
      if (state === 'playing' && bird && !pillarAnimating) bird.vy = FLAP;
    }

    /* ──────────────── Clouds (background trang trí) ──────────────── */
    function initClouds() {
      bgClouds = [];
      for (let i = 0; i < 6; i++) {
        bgClouds.push({
          x: Math.random() * size.w,
          y: 90 + Math.random() * 120,
          r: 18 + Math.random() * 16,
          speed: 0.3 + Math.random() * 0.4,
        });
      }
    }
    function updateClouds() {
      bgClouds.forEach((c) => {
        c.x -= c.speed;
        if (c.x < -c.r * 2) {
          c.x = size.w + c.r * 2;
          c.y = 90 + Math.random() * 120;
        }
      });
    }
    function drawClouds() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      bgClouds.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.arc(c.x + c.r * 0.7, c.y + 4, c.r * 0.85, 0, Math.PI * 2);
        ctx.arc(c.x - c.r * 0.7, c.y + 4, c.r * 0.85, 0, Math.PI * 2);
        ctx.arc(c.x, c.y + c.r * 0.4, c.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    /* ──────────────── Ground & sky ──────────────── */
    function drawSkyAndGround() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      const ga = gameArea();

      // Sky gradient (full body)
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#4ec0ca');
      sky.addColorStop(1, '#87ceeb');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Ground ở 50px cuối
      const gy = ga.bottom;
      ctx.fillStyle = '#8d6e3a';
      ctx.fillRect(0, gy, w, h - gy);
      // cỏ
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, gy, w, 8);
      ctx.fillStyle = '#558b2f';
      ctx.fillRect(0, gy, w, 3);
      // sọc
      ctx.fillStyle = '#6d5128';
      for (let i = 0; i < w; i += 28) ctx.fillRect(i, gy + 18, 14, 4);
    }

    /* ──────────────── Bird ──────────────── */
    function drawBird() {
      if (!ctx || !bird) return;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      bird.rotation = Math.max(-0.5, Math.min(1.2, bird.vy / 10));
      ctx.rotate(bird.rotation);
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f8b500';
      ctx.beginPath();
      ctx.ellipse(-3, 3, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(5, -5, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(6, -5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f47b00';
      ctx.beginPath();
      ctx.moveTo(12, -2); ctx.lineTo(22, 0); ctx.lineTo(12, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    /* ──────────────── Quiz flow ──────────────── */

    function loadQuestion() {
      if (currentQ >= shuffledQuiz.length) {
        endGame(true);
        return;
      }
      const q = shuffledQuiz[currentQ];
      bannerQ.textContent = q.q || '';
      banner.classList.add('show');
      bannerCD.classList.remove('warn');
      bannerCD.textContent = String(COUNTDOWN_SECS);
      countdownValue = COUNTDOWN_SECS;
      if (headInfo) headInfo.textContent = `Q ${currentQ + 1}/${shuffledQuiz.length}`;
      hudProgress.textContent = `${score}/${shuffledQuiz.length}`;

      pillarLayer.innerHTML = '';
      pillar = null;
      pillarSpawned = false;
      pillarAnimating = false;

      stopCountdown();
      countdownTimer = setInterval(() => {
        countdownValue--;
        bannerCD.textContent = String(countdownValue);
        if (countdownValue <= 3 && countdownValue > 0) bannerCD.classList.add('warn');
        if (countdownValue <= 0) {
          bannerCD.classList.remove('warn');
          stopCountdown();
          spawnPillar();
        }
      }, 1000);
    }

    /**
     * Tạo 1 cột chứa N ô đáp án (N = số options).
     * Cột có chiều cao = bottom - top (chiếm trọn vùng chơi).
     * Mỗi ô đáp án cách đều, không có khe hở ngoài ý muốn — chim phải lọt vào
     * đúng 1 ô để tính điểm; chạm vào "pillar body" hoặc bay trượt qua là THUA.
     */
    function spawnPillar() {
      pillarSpawned = true;
      const q = shuffledQuiz[currentQ];
      const opts = (q.options || []).slice();
      const ga = gameArea();
      const pillarH = ga.bottom - ga.top;
      const startX = size.w + 30;
      const yTop = ga.top;

      const pEl = document.createElement('div');
      pEl.className = 'fq-pillar';
      pEl.style.left = startX + 'px';
      pEl.style.top = yTop + 'px';
      pEl.style.width = PILLAR_WIDTH + 'px';
      pEl.style.height = pillarH + 'px';

      const slots = [];
      opts.forEach((opt, i) => {
        const s = document.createElement('div');
        s.className = 'fq-pillar-slot';
        s.innerHTML = `<span class="fq-pillar-letter">${escapeHtml(opt.key)}</span><span class="fq-pillar-text">${escapeHtml(opt.text || '')}</span>`;
        pEl.appendChild(s);
        slots.push({
          el: s,
          correct: (i === q.correct),
          resolved: false,
        });
      });
      pillarLayer.appendChild(pEl);

      pillar = {
        el: pEl,
        x: startX,
        y: yTop,
        w: PILLAR_WIDTH,
        h: pillarH,
        slotCount: opts.length,
        slots,
        resolved: false,
      };

      // Chia vùng trong cột thành các ô đáp án dọc
      const slotH = pillarH / opts.length;
      pillar.slots.forEach((s, i) => {
        s.slotY = yTop + i * slotH;
        s.slotH = slotH;
        s.x = startX;
        s.w = PILLAR_WIDTH;
      });
    }

    function updatePillar() {
      if (!pillar || pillar.resolved) return;
      pillar.x -= SPEED;
      pillar.el.style.left = pillar.x + 'px';
      pillar.slots.forEach((s) => { s.x = pillar.x; });
    }

    /**
     * Va chạm:
     * - Nếu chim có phần nào đó overlap với pillar body (không nằm trong slot → vì các slot
     *   chiếm trọn pillar nên overlap pillar = overlap 1 slot nào đó)
     * - Tìm slot mà tâm chim rơi vào:
     *    • đúng → correct
     *    • sai → wrong
     * - Nếu cột trôi qua hẳn bên trái mà chim không lọt ô nào → "missed" (bay lướt qua) = THUA
     */
    function checkCollision() {
      const ga = gameArea();

      // 1. chim chạm trần
      if (bird.y - bird.r < ga.top) {
        endGame(false, 'Chạm trần!');
        return;
      }
      // 2. chim chạm đất
      if (bird.y + bird.r > ga.bottom) {
        endGame(false, 'Chạm đất!');
        return;
      }

      if (!pillar || pillar.resolved) return;

      // Va cột: tâm chim nằm trong vùng x của pillar
      const birdOverlapX = (bird.x + bird.r > pillar.x) &&
                           (bird.x - bird.r < pillar.x + pillar.w);

      if (birdOverlapX && !pillar.resolved) {
        // tìm slot chứa tâm chim
        const idx = Math.floor((bird.y - pillar.y) / (pillar.h / pillar.slotCount));
        if (idx >= 0 && idx < pillar.slotCount) {
          const slot = pillar.slots[idx];
          // tâm chim có nằm trong slot đó (vì slotY/2)
          const slotTop = pillar.y + idx * (pillar.h / pillar.slotCount);
          const slotBot = slotTop + (pillar.h / pillar.slotCount);
          if (bird.y >= slotTop && bird.y <= slotBot) {
            handleCollision(slot, idx);
            return;
          }
        }
        // Nếu overlap X nhưng không rơi vào slot nào (rơi vào viền/vạch chia)
        // → tính là sai để rõ ràng
        endGame(false, 'Bạn đã đâm vào thành cột!');
        return;
      }

      // Cột trôi hẳn qua chim mà không có va chạm nào
      if (!pillar.resolved && pillar.x + pillar.w + 6 < bird.x - bird.r) {
        pillar.resolved = true;
        // highlight đáp án đúng
        const correctSlot = pillar.slots.find((s) => s.correct);
        if (correctSlot) correctSlot.el.classList.add('correct');
        shakeWindow();
        setTimeout(() => endGame(false, 'Bạn đã bay lướt qua cột!'), 500);
      }
    }

    function handleCollision(slot, idx) {
      pillar.resolved = true;
      pillarAnimating = true;
      if (slot.correct) {
        slot.el.classList.add('correct');
        score++;
        hudScore.textContent = String(score);
        hudProgress.textContent = `${score}/${shuffledQuiz.length}`;
        bird.vy = -4;
        stopCountdown();
        setTimeout(() => nextQuestion(), 650);
      } else {
        slot.el.classList.add('wrong');
        const correctSlot = pillar.slots.find((s) => s.correct);
        if (correctSlot) correctSlot.el.classList.add('correct');
        shakeWindow();
        setTimeout(() => endGame(false, 'Sai đáp án!'), 600);
      }
    }

    function shakeWindow() {
      if (!body) return;
      body.classList.remove('shake');
      void body.offsetWidth;
      body.classList.add('shake');
    }

    function nextQuestion() {
      pillarLayer.innerHTML = '';
      pillar = null;
      pillarSpawned = false;
      pillarAnimating = false;
      currentQ++;
      if (currentQ >= shuffledQuiz.length) {
        endGame(true);
        return;
      }
      loadQuestion();
    }

    function endGame(won, reason) {
      if (state !== 'playing') return;
      state = won ? 'won' : 'lost';
      stopCountdown();

      if (won) {
        modalWin();
      } else {
        const q = shuffledQuiz[currentQ];
        const correctOpt = (q && q.options && q.options[q.correct]) || null;
        const correctLetter = correctOpt ? correctOpt.key : '';
        const correctText = correctOpt ? correctOpt.text : '';
        modalLose(reason || 'Bạn đã thua!', correctLetter, correctText);
      }
    }

    /* ──────────────── Main loop ──────────────── */

    function loop() {
      if (!ctx) return;
      raf = requestAnimationFrame(loop);

      drawSkyAndGround();
      updateClouds();
      drawClouds();

      if (state === 'playing' && bird) {
        // Vật lý chim
        if (!pillarAnimating) {
          bird.vy += GRAVITY;
          bird.y += bird.vy;
        } else {
          bird.vy += GRAVITY * 0.5;
          bird.y += bird.vy;
        }

        // Di chuyển cột & kiểm tra va chạm
        if (pillarSpawned && state === 'playing' && !pillarAnimating) {
          updatePillar();
          checkCollision();
        } else if (pillarSpawned && pillarAnimating && state === 'playing') {
          updatePillar();
        }
      }

      if (bird) drawBird();
    }

    /* ──────────────── Cleanup ──────────────── */

    function stopCountdown() {
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    }

    function cleanup() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      stopCountdown();
      pillar = null;
      pillarSpawned = false;
      pillarAnimating = false;
      state = 'idle';
      unbindEvents();
    }

    return { open, close, isOpen };
  }

  /* ──────────────── Expose ──────────────── */

  function expose() {
    const api = { create: createFlappyQuiz };
    if (typeof window !== 'undefined') {
      try { window.FlappyQuiz = api; } catch (_) {}
    }
    if (typeof unsafeWindow !== 'undefined') {
      try { unsafeWindow.FlappyQuiz = api; } catch (_) {}
    }
  }
  expose();
})();
