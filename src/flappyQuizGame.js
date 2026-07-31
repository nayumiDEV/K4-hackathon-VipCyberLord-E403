/* ═══════════════════════════════════════════════════════════════════════════
 * flappyQuizGame.js — Mini-game Flappy Bird tích hợp quiz ôn tập
 *
 * Dùng cho userscript Tampermonkey VLearn Tutor:
 *   const game = FlappyQuiz.create();
 *   game.open({ quiz: [...], onClose: () => {...}, title: '...' });
 *   game.close();
 *
 * Luồng chơi (khớp spec):
 *   1. Popup glassmorphism + nút ✕ đóng
 *   2. Banner câu hỏi hiển thị NGAY khi game bắt đầu
 *   3. Chim bay được, click/space/↑ để giữ
 *   4. Đếm ngược 10s → 4 cửa đáp án A/B/C/D xuất hiện bên phải, trôi sang trái
 *   5. Va vào cửa ĐÚNG → cửa sáng xanh, +điểm, qua câu mới (reset 10s)
 *   6. Va vào cửa SAI → cửa sáng đỏ → Game Over
 *   7. KHÔNG va vào cửa nào (cửa trôi hết) → Game Over (bỏ lỡ)
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

    /* QUESTION BANNER (top of body) */
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

    /* GATES (4 đáp án) */
    .fq-gate {
      position: absolute; z-index: 20;
      background: linear-gradient(90deg, rgba(255,255,255,0.97), #fff);
      border: 2px solid #543847; border-radius: 10px;
      display: flex; align-items: center;
      padding: 0 10px;
      font-size: 13px; font-weight: 600; color: #2c3e50;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      overflow: hidden; text-align: left;
    }
    .fq-gate:hover { transform: scale(1.04); box-shadow: 0 0 18px rgba(255,215,0,0.7); }
    .fq-gate-letter {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: #543847; color: #fff;
      font-size: 13px; font-weight: 800;
      margin-right: 8px; flex-shrink: 0;
    }
    .fq-gate-text {
      flex: 1; line-height: 1.25;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .fq-gate.missed {
      background: linear-gradient(90deg, #ffe0b2, #ffcc80) !important;
      border-color: #ef6c00;
      box-shadow: 0 0 16px rgba(239,108,0,0.7);
      opacity: 0.7;
    }
    .fq-gate.missed .fq-gate-letter { background: #ef6c00; }
    .fq-gate.correct {
      background: linear-gradient(90deg, #c8e6c9, #a5d6a7) !important;
      border-color: #2e7d32;
      box-shadow: 0 0 22px rgba(76,175,80,0.85);
    }
    .fq-gate.correct .fq-gate-letter { background: #2e7d32; }
    .fq-gate.wrong {
      background: linear-gradient(90deg, #ffcdd2, #ef9a9a) !important;
      border-color: #c62828;
      box-shadow: 0 0 22px rgba(244,67,54,0.85);
    }
    .fq-gate.wrong .fq-gate-letter { background: #c62828; }

    /* MODAL overlay (start / game over / win) */
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

    /* FOOTER */
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

  /**
   * Trộn đáp án trong 1 câu + cập nhật chỉ số correct.
   * Input options: array of { key, text } (key optional)
   * Input correct: number (index)
   */
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

  /** Trộn cả câu hỏi lẫn đáp án */
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
    // Element refs (assigned in buildDom)
    let overlay = null, win = null, body = null,
        canvas = null, ctx = null,
        banner = null, bannerQ = null, bannerCD = null,
        hud = null, hudScore = null, hudProgress = null,
        headInfo = null,
        gatesLayer = null;
    let styleEl = null;
    let currentModal = null;

    // State
    let state = 'idle';                  // idle | playing | won | lost
    let bird = null;
    let bgPipes = [];
    let raf = null;
    let countdownTimer = null;
    let countdownValue = 10;
    let currentQ = 0;
    let shuffledQuiz = [];
    let originalQuiz = [];
    let score = 0;
    let gates = [];
    let gateSpawned = false;
    let gateAnimating = false;            // khóa input khi đang xử lý va chạm

    // Cleanup callbacks
    let onCloseCb = null;
    let size = { w: 520, h: 720 };
    const SIZE_DEFAULT = { w: 520, h: 720 };

    // Constants
    const GRAVITY = 0.35;
    const FLAP = -7;
    const GATE_WIDTH = 130;
    const GATE_HEIGHT = 64;
    const SPEED = 2;
    const COUNTDOWN_SECS = 10;
    const GROUND_LINE = 0.6;             // tỉ lệ chiều cao đặt đất

    /* ──────────────── Public API ──────────────── */

    function open({ quiz, onClose, parent, title } = {}) {
      if (overlay) return;                // đã mở rồi thì bỏ qua
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
        <span class="fq-head-info" data-info>Q 1/${escapeHtml(String(0))}</span>
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

      /* BANNER (câu hỏi + countdown) */
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

      /* HUD (điểm) */
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

      /* Gates layer */
      gatesLayer = document.createElement('div');
      gatesLayer.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;';
      body.appendChild(gatesLayer);

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
        <p><b>Bay qua đáp án đúng</b> trong 4 cửa trôi ngang.</p>
        <p>Câu hỏi hiện ngay, đáp án xuất hiện sau <b>${COUNTDOWN_SECS}s</b>.</p>
        <div class="fq-modal-buttons">
          <button data-act="start">Bắt đầu chơi</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
        <div class="hint">
          💡 Sai / bỏ lỡ = thua. <br/>
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
        <p>${escapeHtml(reason || 'Bạn đã trả lời sai.')}</p>
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
      // Click ra ngoài window → đóng
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
      initBgPipes();
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = false;
      gateAnimating = false;
      stopCountdown();

      state = 'idle';
      modalStart();
    }

    function startGame() {
      // Shuffle lại câu hỏi + đáp án mỗi lần chơi
      shuffledQuiz = shuffleQuiz(originalQuiz);

      currentQ = 0;
      score = 0;
      hudScore.textContent = '0';
      hudProgress.textContent = `0/${shuffledQuiz.length}`;

      resetBird();
      initBgPipes();
      removeModal();
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = false;
      gateAnimating = false;
      stopCountdown();

      hud.classList.add('show');
      if (headInfo) headInfo.textContent = `Q 1/${shuffledQuiz.length}`;

      state = 'playing';
      loadQuestion();
    }

    function resetBird() {
      bird = { x: size.w * 0.18, y: size.h * 0.42, vy: 0, r: 14, rotation: 0 };
    }

    function flap() {
      if (state === 'playing' && bird && !gateAnimating) bird.vy = FLAP;
    }

    /* ──────────────── Background pipes (trang trí) ──────────────── */
    function initBgPipes() {
      bgPipes = [];
      const w = size.w, h = size.h;
      for (let i = 0; i < 5; i++) {
        bgPipes.push({
          x: w + i * 260,
          gapY: h * 0.28 + Math.random() * h * 0.28,
        });
      }
    }

    function drawBgPipes() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      const GAP = 180;
      ctx.fillStyle = '#73bf2e';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      bgPipes.forEach((p) => {
        const top = p.gapY - GAP / 2;
        const botY = p.gapY + GAP / 2;
        const topH = Math.max(0, top);
        const botH = Math.max(0, h - botY);
        // Top pipe
        ctx.fillRect(p.x, 0, 60, topH);
        ctx.strokeRect(p.x, 0, 60, topH);
        // Top cap
        ctx.fillStyle = '#558b2f';
        ctx.fillRect(p.x - 4, topH - 20, 68, 20);
        // Bottom pipe
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(p.x, botY, 60, botH);
        ctx.strokeRect(p.x, botY, 60, botH);
        // Bottom cap
        ctx.fillStyle = '#558b2f';
        ctx.fillRect(p.x - 4, botY, 68, 20);
        ctx.fillStyle = '#73bf2e';
      });
    }

    function updateBgPipes() {
      bgPipes.forEach((p) => { p.x -= SPEED; });
      if (bgPipes.length && bgPipes[0].x < -80) {
        bgPipes.shift();
        bgPipes.push({
          x: bgPipes[bgPipes.length - 1].x + 260,
          gapY: size.h * 0.28 + Math.random() * size.h * 0.28,
        });
      }
    }

    function drawGround() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      const gy = h * GROUND_LINE;
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, gy, w, h * (1 - GROUND_LINE));
      ctx.fillStyle = '#c8b878';
      for (let i = 0; i < w; i += 20) ctx.fillRect(i, gy, 10, 6);
      ctx.fillStyle = '#a0885a';
      ctx.fillRect(0, gy - 4, w, 4);
    }

    /* ──────────────── Bird draw ──────────────── */
    function drawBird() {
      if (!ctx || !bird) return;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      bird.rotation = Math.max(-0.5, Math.min(1.2, bird.vy / 10));
      ctx.rotate(bird.rotation);
      // body
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // wing
      ctx.fillStyle = '#f8b500';
      ctx.beginPath();
      ctx.ellipse(-3, 3, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(5, -5, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // pupil
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(6, -5, 2, 0, Math.PI * 2); ctx.fill();
      // beak
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

      // Clear gates cũ (nếu còn)
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = false;
      gateAnimating = false;

      stopCountdown();
      countdownTimer = setInterval(() => {
        countdownValue--;
        bannerCD.textContent = String(countdownValue);
        if (countdownValue <= 3 && countdownValue > 0) bannerCD.classList.add('warn');
        if (countdownValue <= 0) {
          bannerCD.classList.remove('warn');
          stopCountdown();
          spawnGates();
        }
      }, 1000);
    }

    function spawnGates() {
      gateSpawned = true;
      const q = shuffledQuiz[currentQ];
      const opts = (q.options || []).slice();
      const w = size.w, h = size.h;
      const count = Math.max(2, opts.length);
      // Bố trí 4 cửa dọc theo chiều cao, cách đều
      // (chừa 80px trên cho banner, 80px dưới cho đất)
      const topMargin = 80;
      const bottomMargin = 80;
      const usable = h - topMargin - bottomMargin - GATE_HEIGHT;
      const step = Math.max(80, Math.min(130, usable / Math.max(1, count - 1)));
      const totalH = step * (count - 1);
      const startY = topMargin + Math.max(0, (usable - totalH) / 2);
      const startX = w + 50;

      opts.forEach((opt, i) => {
        const y = startY + i * step;
        const g = document.createElement('div');
        g.className = 'fq-gate';
        g.style.top = y + 'px';
        g.style.left = startX + 'px';
        g.style.width = GATE_WIDTH + 'px';
        g.style.height = GATE_HEIGHT + 'px';
        g.innerHTML = `<span class="fq-gate-letter">${escapeHtml(opt.key)}</span><span class="fq-gate-text">${escapeHtml(opt.text || '')}</span>`;
        gatesLayer.appendChild(g);
        gates.push({
          el: g,
          x: startX,
          y: y,
          w: GATE_WIDTH,
          h: GATE_HEIGHT,
          correct: (i === q.correct),
          resolved: false,            // đã va/bỏ lỡ
        });
      });
    }

    function updateGates() {
      gates.forEach((g) => {
        g.x -= SPEED;
        g.el.style.left = g.x + 'px';
      });
    }

    /**
     * Kiểm tra va chạm mỗi frame.
     * - Nếu chim đang ở trong hình chữ nhật của 1 gate:
     *    + correct = true  → flash xanh, cộng điểm, qua câu mới
     *    + correct = false → flash đỏ, GAME OVER
     * - Nếu 1 gate trôi hết sang trái (x + w < 0) mà chim không va → "bỏ lỡ" → GAME OVER
     */
    function checkCollisionAndMiss() {
      // Va chạm đầu tiên với gate mà chim đang overlap
      for (const g of gates) {
        if (g.resolved) continue;
        if (
          bird.x + bird.r > g.x &&
          bird.x - bird.r < g.x + g.w &&
          bird.y + bird.r > g.y &&
          bird.y - bird.r < g.y + g.h
        ) {
          handleCollision(g);
          return;
        }
      }
      // Kiểm tra bỏ lỡ: gate đã qua hẳn sang trái mà chưa resolved
      for (const g of gates) {
        if (g.resolved) continue;
        if (g.x + g.w + 8 < bird.x - bird.r) {
          handleMiss(g);
          break;
        }
      }
    }

    function handleCollision(g) {
      g.resolved = true;
      if (g.correct) {
        g.el.classList.add('correct');
        score++;
        hudScore.textContent = String(score);
        hudProgress.textContent = `${score}/${shuffledQuiz.length}`;
        // bay lên một chút cho đẹp
        bird.vy = -4;
        gateAnimating = true;
        stopCountdown();
        setTimeout(() => nextQuestion(true), 650);
      } else {
        g.el.classList.add('wrong');
        // đánh dấu cả correct để người chơi biết
        const correctGate = gates.find((x) => x.correct);
        if (correctGate && correctGate !== g) correctGate.el.classList.add('correct');
        gateAnimating = true;
        shakeWindow();
        setTimeout(() => endGame(false, 'wrong'), 600);
      }
    }

    function handleMiss(g) {
      g.resolved = true;
      g.el.classList.add('missed');
      // highlight correct để người chơi biết
      const correctGate = gates.find((x) => x.correct);
      if (correctGate) correctGate.el.classList.add('correct');
      gateAnimating = true;
      shakeWindow();
      setTimeout(() => endGame(false, 'missed'), 500);
    }

    function shakeWindow() {
      if (!body) return;
      body.classList.remove('shake');
      // Force reflow để restart animation
      void body.offsetWidth;
      body.classList.add('shake');
    }

    function nextQuestion(/* fromCorrect */) {
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = false;
      gateAnimating = false;
      currentQ++;
      if (currentQ >= shuffledQuiz.length) {
        endGame(true);
        return;
      }
      loadQuestion();
    }

    function endGame(won, reason) {
      if (state !== 'playing') return;          // tránh gọi 2 lần
      state = won ? 'won' : 'lost';
      stopCountdown();

      if (won) {
        modalWin();
      } else {
        const q = shuffledQuiz[currentQ];
        const correctOpt = (q && q.options && q.options[q.correct]) || null;
        const correctLetter = correctOpt ? correctOpt.key : '';
        const correctText = correctOpt ? correctOpt.text : '';
        const msg = reason === 'missed'
          ? 'Bạn đã không bay qua cửa nào — bỏ lỡ đáp án!'
          : 'Bạn đã va vào đáp án sai!';
        modalLose(msg, correctLetter, correctText);
      }
    }

    /* ──────────────── Main loop ──────────────── */

    function loop() {
      if (!ctx) return;
      raf = requestAnimationFrame(loop);
      const w = size.w, h = size.h;

      // Nền trời
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#4ec0ca');
      sky.addColorStop(1, '#87ceeb');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.6);

      // Mặt đất
      const groundY = h * GROUND_LINE;
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, groundY, w, h * (1 - GROUND_LINE));
      ctx.fillStyle = '#c8b878';
      for (let i = 0; i < w; i += 20) ctx.fillRect(i, groundY, 10, 6);
      ctx.fillStyle = '#a0885a';
      ctx.fillRect(0, groundY - 4, w, 4);

      if (state === 'playing' && bird) {
        // Áp dụng trọng lực (kể cả lúc gateAnimating để chim rơi xuống khi đụng)
        if (!gateAnimating) {
          bird.vy += GRAVITY;
          bird.y += bird.vy;
        } else {
          bird.vy += GRAVITY * 0.5;
          bird.y += bird.vy;
        }

        // Chim chạm trần → kẹt lên
        if (bird.y - bird.r < 0) bird.y = bird.r;
        // Chim chạm đất → coi như "không bay được nữa"
        if (bird.y + bird.r > groundY) {
          bird.y = groundY - bird.r;
          bird.vy = 0;
        }

        updateBgPipes();

        if (gateSpawned && !gateAnimating) {
          updateGates();
          checkCollisionAndMiss();
        } else if (gateSpawned && gateAnimating) {
          // vẫn cho gate trôi tiếp cho mượt (trừ khi đã thắng/thua)
          if (state === 'playing') updateGates();
        }
      }

      drawBgPipes();

      if (bird) drawBird();
    }

    /* ──────────────── Cleanup ──────────────── */

    function stopCountdown() {
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    }

    function cleanup() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      stopCountdown();
      gates = [];
      gateSpawned = false;
      gateAnimating = false;
      state = 'idle';
      unbindEvents();
    }

    return { open, close, isOpen };
  }

  /* ──────────────── Expose to unsafeWindow cho userscript ──────────────── */

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
