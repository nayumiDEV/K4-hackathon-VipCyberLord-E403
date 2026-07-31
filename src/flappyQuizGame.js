/* ═══════════════════════════════════════════════════════════════════════════
 * flappyQuizGame.js — Mini-game Flappy Bird tích hợp quiz ôn tập
 *
 * Dùng cho userscript Tampermonkey VLearn Tutor:
 *   const game = FlappyQuiz.create();
 *   game.open({ quiz: [...], onClose: () => {...}, title: '...' });
 *   game.close();
 *
 * Luồng chơi:
 *   1. Popup glassmorphism + nút ✕ đóng
 *   2. Banner câu hỏi + 4 đáp án A/B/C/D hiển thị NGAY khi game bắt đầu
 *      (Người chơi đọc đáp án từ banner để biết cần bay vào vị trí nào của cột)
 *   3. Chim bay trong vùng an toàn 10 giây, click/space/↑ để giữ
 *   4. Sau 10s, 1 CỘT TRƠ (không chữ) trôi ngang từ phải sang trái
 *      Chia 4 ô ngang dọc: trên cùng = A, kế = B, kế = C, dưới cùng = D
 *   5. Chim phải lọt vào ô ĐÚNG (khớp với đáp án đúng trong banner):
 *        - ĐÚNG  → sáng xanh, +1 điểm, qua câu mới (reset 10s)
 *        - SAI   → sáng đỏ, GAME OVER
 *        - BAY LƯỚT (chim vượt qua cột mà không vào ô) → GAME OVER
 *   6. Chạm đất/trần = THUA
 *   7. Hết câu hỏi → WIN
 *   8. Chơi lại → xáo trộn cả câu hỏi lẫn đáp án
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

    /* QUESTION BANNER: câu hỏi + 4 đáp án A/B/C/D + countdown */
    .fq-banner {
      position: absolute; top: 0; left: 0; right: 0;
      z-index: 30;
      background: rgba(255,255,255,0.97);
      border-bottom: 3px solid #543847;
      padding: 10px 56px 10px 16px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      display: none;
      max-height: 50%;
      overflow-y: auto;
    }
    .fq-banner.show { display: block; }
    .fq-banner-label {
      font-size: 10px; font-weight: 700; color: #ec407a;
      text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 3px;
    }
    .fq-banner-q {
      font-size: 14px; color: #2c3e50; font-weight: 700; line-height: 1.35;
      margin-bottom: 8px;
    }
    .fq-banner-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
    }
    .fq-banner-opt {
      display: flex; align-items: flex-start;
      font-size: 11px; color: #2c3e50; line-height: 1.3;
      padding: 4px 6px;
      background: #f7f7fa;
      border-radius: 6px;
      border: 1px solid #e7e7ec;
    }
    .fq-banner-opt-letter {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%;
      background: #543847; color: #fff;
      font-size: 10px; font-weight: 800;
      margin-right: 6px; flex-shrink: 0;
    }
    .fq-banner-opt-text {
      flex: 1;
      overflow: hidden;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .fq-banner-countdown {
      position: absolute; top: 8px; right: 12px;
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

    /* CỘT CHƯỚNG NGẠI VẬT = 1 pillar TRƠ, không có chữ.
       Các ô A/B/C/D chỉ hiện dạng indicator nhỏ ở mép trái để người chơi
       dễ hình dung khi đáp án đã công bố. */
    .fq-pillar {
      position: absolute; z-index: 20;
      background: linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.55));
      border-left: 3px solid #543847;
      border-right: 3px solid #543847;
      border-radius: 6px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.28);
      pointer-events: none;
      overflow: hidden;
    }
    /* Indicator nhỏ A/B/C/D nằm ngoài cột (bên trái), chỉ hiện sau khi va */
    .fq-pillar-indicator {
      position: absolute; z-index: 21;
      pointer-events: none;
      display: none;
    }
    .fq-pillar-indicator.show { display: block; }
    .fq-pillar-letter {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      background: #543847; color: #fff;
      font-size: 11px; font-weight: 800;
      margin-right: 6px; flex-shrink: 0;
    }

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
        banner = null, bannerQ = null, bannerOptions = null, bannerCD = null,
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
    let pillar = null;            // 1 cột duy nhất, TRƠ
    let pillarSpawned = false;
    let pillarAnimating = false;

    // Cleanup callbacks
    let onCloseCb = null;
    let size = { w: 520, h: 720 };
    const SIZE_DEFAULT = { w: 520, h: 720 };

    // Constants
    const GRAVITY = 0.32;
    const FLAP = -6.5;
    const PILLAR_WIDTH = 90;          // cột mỏng vì không cần chứa chữ
    const SPEED = 2.2;
    const COUNTDOWN_SECS = 10;
    const SLOT_COUNT = 4;             // luôn 4 ô A/B/C/D

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

      /* BANNER: câu hỏi + 4 đáp án A/B/C/D + countdown */
      banner = document.createElement('div');
      banner.className = 'fq-banner';
      const bannerLabel = document.createElement('div');
      bannerLabel.className = 'fq-banner-label';
      bannerLabel.textContent = 'Câu hỏi';
      bannerQ = document.createElement('div');
      bannerQ.className = 'fq-banner-q';
      bannerOptions = document.createElement('div');
      bannerOptions.className = 'fq-banner-options';
      bannerCD = document.createElement('div');
      bannerCD.className = 'fq-banner-countdown';
      bannerCD.textContent = String(COUNTDOWN_SECS);
      banner.append(bannerLabel, bannerQ, bannerOptions, bannerCD);
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

      /* Pillar layer */
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

    /* ──────────────── Banner render ──────────────── */

    function renderBanner(q) {
      bannerQ.textContent = q.q || '';
      bannerOptions.innerHTML = '';
      const opts = (q.options || []).slice(0, SLOT_COUNT);
      // Luôn đảm bảo 4 vị trí A B C D — nếu câu chỉ có <4 đáp án, padding
      while (opts.length < SLOT_COUNT) {
        opts.push({ key: opts.length === 0 ? 'A' : (opts.length === 1 ? 'B' : (opts.length === 2 ? 'C' : 'D')), text: '—' });
      }
      const letters = ['A', 'B', 'C', 'D'];
      opts.forEach((opt, i) => {
        const row = document.createElement('div');
        row.className = 'fq-banner-opt';
        row.innerHTML = `
          <span class="fq-banner-opt-letter">${escapeHtml(letters[i] || opt.key)}</span>
          <span class="fq-banner-opt-text">${escapeHtml(opt.text || '')}</span>
        `;
        bannerOptions.appendChild(row);
      });
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
        <p><b>Bay vào đúng ô đáp án</b> trên cột chướng ngại vật.</p>
        <p>Banner hiện <b>câu hỏi + 4 đáp án</b>; cột xuất hiện sau <b>${COUNTDOWN_SECS}s</b>.</p>
        <div class="fq-modal-buttons">
          <button data-act="start">Bắt đầu chơi</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
        <div class="hint">
          💡 Trên cùng cột = A, kế = B, C, dưới cùng = D.<br/>
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

    function gameArea() {
      return {
        top: 76,
        bottom: size.h - 50,   // đất dưới cùng ~50px
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

    /* ──────────────── Sky & Ground ──────────────── */
    function drawSkyAndGround() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      const ga = gameArea();

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#4ec0ca');
      sky.addColorStop(1, '#87ceeb');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const gy = ga.bottom;
      ctx.fillStyle = '#8d6e3a';
      ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, gy, w, 8);
      ctx.fillStyle = '#558b2f';
      ctx.fillRect(0, gy, w, 3);
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
      renderBanner(q);
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
     * Cột TRƠ, không chữ.
     * Chia dọc thành 4 ô A/B/C/D (ẩn cho đến khi va để hiện đáp án).
     * Slot 0 = trên cùng = A; slot 3 = dưới cùng = D.
     */
    function spawnPillar() {
      pillarSpawned = true;
      const q = shuffledQuiz[currentQ];
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
      pillarLayer.appendChild(pEl);

      pillar = {
        el: pEl,
        x: startX,
        y: yTop,
        w: PILLAR_WIDTH,
        h: pillarH,
        slotCount: SLOT_COUNT,
        slotH: pillarH / SLOT_COUNT,
        resolved: false,
        correctSlot: q.correct,        // index 0..3
        indicatorEl: null,
      };

      // Vẽ 4 indicator A/B/C/D nằm ngoài cột (bên trái), ẩn cho tới khi resolved
      const letters = ['A', 'B', 'C', 'D'];
      const indEl = document.createElement('div');
      indEl.className = 'fq-pillar-indicator';
      indEl.style.left = (startX - 32) + 'px';
      indEl.style.top = yTop + 'px';
      indEl.style.width = '26px';
      indEl.style.height = pillarH + 'px';
      indEl.style.display = 'flex';
      indEl.style.flexDirection = 'column';
      indEl.style.gap = '2px';
      for (let i = 0; i < SLOT_COUNT; i++) {
        const slot = document.createElement('div');
        slot.style.flex = '1';
        slot.style.display = 'flex';
        slot.style.alignItems = 'center';
        slot.style.justifyContent = 'center';
        const circle = document.createElement('span');
        circle.className = 'fq-pillar-letter';
        circle.textContent = letters[i];
        slot.appendChild(circle);
        indEl.appendChild(slot);
      }
      pillarLayer.appendChild(indEl);
      pillar.indicatorEl = indEl;
    }

    function updatePillar() {
      if (!pillar || pillar.resolved) return;
      pillar.x -= SPEED;
      pillar.el.style.left = pillar.x + 'px';
      if (pillar.indicatorEl) pillar.indicatorEl.style.left = (pillar.x - 32) + 'px';
    }

    /**
     * Va chạm:
     * - Chim chạm đất/trần → THUA
     * - Tâm chim overlap X với pillar:
     *    → tính slot dựa trên (bird.y - pillar.y) / slotH
     *    → đúng → cộng điểm, qua câu
     *    → sai → THUA
     * - Pillar trôi hẳn sang trái mà chim không vào ô nào → THUA (bay lướt)
     */
    function checkCollision() {
      const ga = gameArea();

      if (bird.y - bird.r < ga.top) {
        endGame(false, 'Chạm trần!');
        return;
      }
      if (bird.y + bird.r > ga.bottom) {
        endGame(false, 'Chạm đất!');
        return;
      }

      if (!pillar || pillar.resolved) return;

      const birdOverlapX = (bird.x + bird.r > pillar.x) &&
                           (bird.x - bird.r < pillar.x + pillar.w);

      if (birdOverlapX && !pillar.resolved) {
        const slotIdx = Math.floor((bird.y - pillar.y) / pillar.slotH);
        if (slotIdx >= 0 && slotIdx < SLOT_COUNT) {
          handleCollision(slotIdx);
          return;
        }
      }

      // Cột đã qua chim mà không va
      if (!pillar.resolved && pillar.x + pillar.w + 6 < bird.x - bird.r) {
        pillar.resolved = true;
        showIndicators(true);
        shakeWindow();
        setTimeout(() => endGame(false, 'Bạn đã bay lướt qua cột!'), 500);
      }
    }

    function handleCollision(slotIdx) {
      pillar.resolved = true;
      pillarAnimating = true;
      const correct = slotIdx === pillar.correctSlot;
      // Làm sáng pillar theo kết quả
      if (correct) {
        pillar.el.style.background = 'linear-gradient(180deg, #c8e6c9, #a5d6a7)';
        pillar.el.style.boxShadow = '0 0 24px rgba(76,175,80,0.8)';
        pillar.el.style.borderColor = '#2e7d32';
        showIndicators();
        score++;
        hudScore.textContent = String(score);
        hudProgress.textContent = `${score}/${shuffledQuiz.length}`;
        bird.vy = -4;
        stopCountdown();
        setTimeout(() => nextQuestion(), 650);
      } else {
        pillar.el.style.background = 'linear-gradient(180deg, #ffcdd2, #ef9a9a)';
        pillar.el.style.boxShadow = '0 0 24px rgba(244,67,54,0.8)';
        pillar.el.style.borderColor = '#c62828';
        showIndicators();
        shakeWindow();
        setTimeout(() => endGame(false, 'Sai đáp án!'), 600);
      }
    }

    /** Hiển thị chữ A/B/C/D ngoài cột.
     *  khi thắng/thua: viền + màu theo đúng/sai */
    function showIndicators(/* forMissed */) {
      if (!pillar || !pillar.indicatorEl) return;
      const children = pillar.indicatorEl.children;
      const letters = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < children.length; i++) {
        const slotEl = children[i];
        const circle = slotEl.querySelector('.fq-pillar-letter');
        if (i === pillar.correctSlot) {
          circle.style.background = '#2e7d32';
        } else {
          circle.style.background = (pillar.correctSlot != null && pillar.resolved) ? '#c62828' : '#543847';
        }
        circle.textContent = letters[i];
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
        const letters = ['A', 'B', 'C', 'D'];
        const correctLetter = letters[q.correct] || (correctOpt ? correctOpt.key : '');
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
        if (!pillarAnimating) {
          bird.vy += GRAVITY;
          bird.y += bird.vy;
        } else {
          bird.vy += GRAVITY * 0.5;
          bird.y += bird.vy;
        }

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
