/* ═══════════════════════════════════════════════════════════════════════════
 * flappyQuizGame.js — Mini-game Flappy Bird tích hợp quiz ôn tập
 *
 * Dùng cho userscript Tampermonkey VLearn Tutor:
 *   const game = createFlappyQuiz();
 *   game.open({ quiz: [...], onClose: () => {...} });
 *   game.close();
 *
 * Đặc điểm:
 *   - Canvas render chim + pipe scroll ngang
 *   - Banner câu hỏi hiển thị ngay khi game bắt đầu
 *   - Countdown 10s trước khi 4 đáp án (gates) xuất hiện
 *   - Click/Space/ArrowUp để chim bay
 *   - Va vào gate đúng → xuyên qua + câu tiếp theo
 *   - Va vào gate sai → game over, có nút "Chơi lại"
 *   - Thứ tự câu hỏi + đáp án xáo trộn mỗi lần chơi lại
 *   - Nút ✕ đóng popup
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────── CSS ──────────────── */
  const CSS = `
    .fq-overlay {
      position: fixed; inset: 0; z-index: 2147483600;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
      display: flex; justify-content: center; align-items: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: fq-fadein 0.2s ease-out;
    }
    @keyframes fq-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fq-popin { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .fq-window {
      position: relative; width: 520px; height: 760px; max-width: 95vw; max-height: 95vh;
      background: #fff; border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: flex; flex-direction: column; overflow: hidden;
      animation: fq-popin 0.25s ease-out;
    }
    .fq-head {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #f8b500, #f47b00);
      color: #fff; user-select: none;
    }
    .fq-head h3 { margin: 0; flex: 1; font-size: 15px; font-weight: 700; }
    .fq-btn {
      background: rgba(255,255,255,0.25); border: none; border-radius: 6px;
      padding: 6px 10px; color: #fff; cursor: pointer; font-size: 14px; font-weight: 700;
      transition: background 0.15s;
    }
    .fq-btn:hover { background: rgba(255,255,255,0.35); }
    .fq-btn.close { background: #e53935; }
    .fq-btn.close:hover { background: #c62828; }

    .fq-body {
      flex: 1; position: relative; overflow: hidden;
      background: linear-gradient(180deg, #4ec0ca 0%, #87ceeb 100%);
    }
    .fq-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: pointer; }

    .fq-banner {
      position: absolute; top: 0; left: 0; right: 0; z-index: 30;
      background: rgba(255,255,255,0.97);
      border-bottom: 3px solid #543847;
      padding: 12px 60px 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
    }
    .fq-banner.show { display: block; }
    .fq-banner-label {
      font-size: 11px; font-weight: 700; color: #ec407a;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    }
    .fq-banner-q { font-size: 15px; color: #2c3e50; font-weight: 600; line-height: 1.4; }
    .fq-banner-countdown {
      position: absolute; top: 8px; right: 14px;
      font-size: 20px; font-weight: 800; color: #ec407a;
    }

    .fq-hud {
      position: absolute; top: 80px; right: 14px; z-index: 25;
      background: rgba(0,0,0,0.55); color: #fff; padding: 6px 14px;
      border-radius: 8px; font-size: 11px; font-weight: 700; text-align: center;
      display: none;
    }
    .fq-hud.show { display: block; }
    .fq-hud-score { font-size: 24px; color: #ffe066; font-weight: 800; line-height: 1.1; }
    .fq-hud-progress { font-size: 10px; opacity: 0.85; margin-top: 2px; }

    .fq-gate {
      position: absolute; z-index: 20;
      background: linear-gradient(90deg, rgba(255,255,255,0.97), #fff);
      border: 2px solid #543847; border-radius: 8px;
      display: flex; align-items: center; padding: 0 10px;
      font-size: 13px; font-weight: 600; color: #2c3e50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
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
    .fq-gate-text { flex: 1; line-height: 1.25; }
    .fq-gate.correct {
      background: linear-gradient(90deg, #c8e6c9, #a5d6a7) !important;
      border-color: #2e7d32; box-shadow: 0 0 20px rgba(76,175,80,0.85);
    }
    .fq-gate.correct .fq-gate-letter { background: #2e7d32; }
    .fq-gate.wrong {
      background: linear-gradient(90deg, #ffcdd2, #ef9a9a) !important;
      border-color: #c62828; box-shadow: 0 0 20px rgba(244,67,54,0.85);
    }
    .fq-gate.wrong .fq-gate-letter { background: #c62828; }

    .fq-modal {
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.6); color: #fff;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      padding: 30px; text-align: center;
    }
    .fq-modal h2 {
      font-size: 38px; color: #ffe066;
      text-shadow: 3px 3px 0 #543847;
      margin: 0 0 16px; letter-spacing: 1px;
    }
    .fq-modal p { max-width: 360px; line-height: 1.5; font-size: 14px; }
    .fq-modal button {
      margin-top: 16px; padding: 12px 32px; font-size: 16px; font-weight: 700;
      border: 3px solid #543847; border-radius: 8px;
      background: linear-gradient(180deg, #f8b500, #f47b00); color: #fff;
      cursor: pointer; box-shadow: 0 4px 0 #543847;
      transition: transform 0.1s;
    }
    .fq-modal button:hover { transform: translateY(-2px); }
    .fq-modal button:active { transform: translateY(2px); box-shadow: 0 2px 0 #543847; }
    .fq-modal button.secondary { background: linear-gradient(180deg, #78909c, #546e7a); margin-left: 8px; }
    .fq-modal .hint {
      margin-top: 14px; padding: 8px 14px;
      background: rgba(255,255,255,0.15); border-radius: 6px; font-size: 12px;
    }
    .fq-foot {
      padding: 8px 14px;
      background: #f5f5f5; border-top: 1px solid #e0e0e0;
      font-size: 11px; color: #666;
      display: flex; justify-content: space-between;
    }
  `;

  /* ─────────────────────────────────────────────── UTIL ──────────────── */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffleOptions(q) {
    const opts = q.options.map((o, i) => ({ ...o, _idx: i }));
    const shuffled = shuffle(opts);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return {
      ...q,
      options: shuffled.map((o, i) => ({ ...o, key: letters[i] })),
      correct: shuffled.findIndex((o) => o._idx === q.correct),
    };
  }

  function shuffleQuiz(items) {
    return shuffle(items.map(shuffleOptions));
  }

  function escapeHtml(s) {
    return String(s)
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
    // Element refs
    let overlay, win, canvas, ctx, banner, bannerQ, bannerCD, hud, hudScore, hudProgress, gatesLayer;
    let styleEl, currentModal = null;

    // State
    let state = 'idle'; // idle | playing | won | lost
    let bird = null, bgPipes = [];
    let raf = null, countdownTimer = null;
    let currentQ = 0, shuffledQuiz = [], score = 0;
    let gateSpawned = false;
    let countdownValue = 10;
    let size = { w: 520, h: 720 };
    const SIZE_DEFAULT = { w: 520, h: 720 };

    // Constants
    const GRAVITY = 0.35;
    const FLAP = -7;
    const GATE_WIDTH = 130;
    const GATE_HEIGHT = 64;
    const GATE_GAP_Y = 180;
    const SPEED = 2;

    // Cleanup callbacks
    let onCloseCb = null;

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
      // Khởi game với quiz (lưu gốc để restart shuffle lại)
      const input = (quiz && quiz.length) ? quiz : defaultQuiz();
      shuffledQuiz = input.slice();
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

      const head = document.createElement('div');
      head.className = 'fq-head';
      head.innerHTML = `
        <span style="font-size:20px;">🐦</span>
        <h3>${escapeHtml(title)}</h3>
        <button class="fq-btn close" data-act="close" title="Đóng (ESC)" aria-label="Đóng">✕</button>
      `;

      const body = document.createElement('div');
      body.className = 'fq-body';

      canvas = document.createElement('canvas');
      canvas.className = 'fq-canvas';
      canvas.width = SIZE_DEFAULT.w;
      canvas.height = SIZE_DEFAULT.h;
      size.w = SIZE_DEFAULT.w;
      size.h = SIZE_DEFAULT.h;
      ctx = canvas.getContext('2d');
      body.appendChild(canvas);

      // Banner
      banner = document.createElement('div');
      banner.className = 'fq-banner';
      const bannerLabel = document.createElement('div');
      bannerLabel.className = 'fq-banner-label';
      bannerLabel.textContent = 'Câu hỏi';
      bannerQ = document.createElement('div');
      bannerQ.className = 'fq-banner-q';
      bannerCD = document.createElement('div');
      bannerCD.className = 'fq-banner-countdown';
      bannerCD.textContent = '10';
      banner.append(bannerLabel, bannerQ, bannerCD);
      body.appendChild(banner);

      // HUD
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

      // Gates layer
      gatesLayer = document.createElement('div');
      gatesLayer.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;';
      body.appendChild(gatesLayer);

      win.append(head, body);

      const foot = document.createElement('div');
      foot.className = 'fq-foot';
      foot.innerHTML = `
        <span>🖱️ Click chuột / Space / ↑ để chim bay</span>
        <span>ESC để đóng</span>
      `;
      win.appendChild(foot);

      overlay.appendChild(win);
      overlay.addEventListener('click', onOverlayClick);
    }

    function onOverlayClick(e) {
      // Click ngoài window → đóng
      if (e.target === overlay) doClose();
      // Click button trong modal
      const btn = e.target.closest('button[data-act]');
      if (btn) {
        const act = btn.dataset.act;
        if (act === 'start' || act === 'restart') startGame();
        else if (act === 'close') doClose();
      }
    }

    /* ──────────────── Modals ──────────────── */

    function showModal(html) {
      removeModal();
      const m = document.createElement('div');
      m.className = 'fq-modal';
      m.innerHTML = html;
      canvas.parentNode.appendChild(m);
      currentModal = m;
    }
    function removeModal() {
      if (currentModal && currentModal.parentNode) currentModal.parentNode.removeChild(currentModal);
      currentModal = null;
    }

    function showStart() {
      showModal(`
        <h2>🐦 FLAPPY QUIZ</h2>
        <p>Bay qua các chướng ngại vật bằng cách va vào đáp án đúng.<br/>
           Câu hỏi hiện ngay khi bắt đầu, đáp án xuất hiện sau <b>10 giây</b>.</p>
        <div>
          <button data-act="start">Bắt đầu chơi</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
        <div class="hint">💡 Sai 1 lần = thua. Đáp án xáo trộn mỗi lượt chơi.</div>
      `);
    }
    function showGameOver() {
      showModal(`
        <h2>💥 THUA RỒI!</h2>
        <p>Bạn đã va vào đáp án sai.</p>
        <p style="margin-top:10px;font-size:18px;color:#ffe066;font-weight:700;">
          Điểm: ${score}/${shuffledQuiz.length} câu đúng
        </p>
        <div>
          <button data-act="restart">Chơi lại</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
      `);
    }
    function showWin() {
      showModal(`
        <h2>🏆 HOÀN HẢO!</h2>
        <p>Bạn đã trả lời đúng toàn bộ câu hỏi!</p>
        <p style="margin-top:10px;font-size:18px;color:#ffe066;font-weight:700;">
          ${score}/${shuffledQuiz.length} câu đúng
        </p>
        <div>
          <button data-act="restart">Chơi lại</button>
          <button class="secondary" data-act="close">Đóng</button>
        </div>
      `);
    }

    /* ──────────────── Events ──────────────── */

    function bindEvents() {
      document.addEventListener('keydown', onKey);
      canvas.addEventListener('mousedown', flap);
      canvas.addEventListener('touchstart', onTouch, { passive: false });
      window.addEventListener('resize', sizeCanvas);
    }

    function unbindEvents() {
      document.removeEventListener('keydown', onKey);
      if (canvas) {
        canvas.removeEventListener('mousedown', flap);
        canvas.removeEventListener('touchstart', onTouch);
      }
      window.removeEventListener('resize', sizeCanvas);
    }

    function onTouch(e) { e.preventDefault(); flap(); }

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
        try { onCloseCb(); } catch {}
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
      // Chỉ resize khi cần, để tránh giật
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
      bird = { x: size.w * 0.18, y: size.h / 2, vy: 0, r: 14, rotation: 0 };
      initBgPipes();
      state = 'idle';
      showStart();
    }

    function startGame() {
      // Shuffle lại câu hỏi + đáp án
      shuffledQuiz = shuffleQuiz(shuffledQuiz);
      currentQ = 0;
      score = 0;
      hudScore.textContent = '0';
      hudProgress.textContent = `0/${shuffledQuiz.length}`;
      resetBird();
      initBgPipes();
      removeModal();
      banner.classList.remove('show');
      hud.classList.add('show');
      gatesLayer.innerHTML = '';
      gateSpawned = false;
      state = 'playing';
      loadQuestion();
    }

    function resetBird() {
      bird = { x: size.w * 0.18, y: size.h * 0.4, vy: 0, r: 14, rotation: 0 };
    }

    function flap() {
      if (state === 'playing' && bird) bird.vy = FLAP;
    }

    /* ──────────────── Pipes (background) ──────────────── */

    function initBgPipes() {
      bgPipes = [];
      const w = size.w, h = size.h;
      for (let i = 0; i < 5; i++) {
        bgPipes.push({ x: w + i * 250, gapY: h * 0.3 + Math.random() * h * 0.3 });
      }
    }

    function drawBgPipes() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      ctx.fillStyle = '#73bf2e';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      bgPipes.forEach((p) => {
        ctx.fillRect(p.x, 0, 60, p.gapY - GATE_GAP_Y / 2);
        ctx.strokeRect(p.x, 0, 60, p.gapY - GATE_GAP_Y / 2);
        ctx.fillRect(p.x, p.gapY + GATE_GAP_Y / 2, 60, h - (p.gapY + GATE_GAP_Y / 2));
        ctx.strokeRect(p.x, p.gapY + GATE_GAP_Y / 2, 60, h - (p.gapY + GATE_GAP_Y / 2));
        ctx.fillStyle = '#558b2f';
        ctx.fillRect(p.x - 4, p.gapY - GATE_GAP_Y / 2 - 20, 68, 20);
        ctx.fillRect(p.x - 4, p.gapY + GATE_GAP_Y / 2, 68, 20);
        ctx.fillStyle = '#73bf2e';
      });
    }

    function updateBgPipes() {
      bgPipes.forEach((p) => { p.x -= SPEED; });
      const w = size.w;
      if (bgPipes.length && bgPipes[0].x < -80) {
        bgPipes.shift();
        bgPipes.push({
          x: bgPipes[bgPipes.length - 1].x + 250,
          gapY: size.h * 0.3 + Math.random() * size.h * 0.3,
        });
      }
    }

    function drawGround() {
      if (!ctx) return;
      const w = size.w, h = size.h;
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      ctx.fillStyle = '#c8b878';
      for (let i = 0; i < w; i += 20) ctx.fillRect(i, h * 0.6, 10, 6);
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
      const q = shuffledQuiz[currentQ];
      bannerQ.textContent = q.q || q.question || 'Câu hỏi';
      banner.classList.add('show');
      bannerCD.textContent = '10';
      countdownValue = 10;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      countdownTimer = setInterval(() => {
        countdownValue--;
        bannerCD.textContent = String(countdownValue);
        if (countdownValue <= 0) {
          clearInterval(countdownTimer);
          countdownTimer = null;
          spawnGates();
        }
      }, 1000);
    }

    function spawnGates() {
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = true;
      const q = shuffledQuiz[currentQ];
      const opts = (q.options || []).slice();
      const h = size.h;
      const count = Math.max(2, opts.length);
      const startY = 90;
      const usable = h - startY - 60;
      const step = Math.min(120, usable / count);
      opts.forEach((opt, i) => {
        const y = startY + i * step;
        const g = document.createElement('div');
        g.className = 'fq-gate';
        g.style.top = y + 'px';
        g.style.left = (size.w + 50) + 'px';
        g.style.width = GATE_WIDTH + 'px';
        g.style.height = GATE_HEIGHT + 'px';
        const letter = opt.key || String.fromCharCode(65 + i);
        const correctIdx = (typeof q.correct === 'number') ? q.correct : (q.correctIndex || 0);
        g.innerHTML = `<span class="fq-gate-letter">${escapeHtml(letter)}</span><span class="fq-gate-text">${escapeHtml(opt.text || opt.label || '')}</span>`;
        gatesLayer.appendChild(g);
        gates.push({
          el: g,
          x: size.w + 50,
          y: y,
          w: GATE_WIDTH,
          h: GATE_HEIGHT,
          correct: (i === correctIdx),
        });
      });
    }

    function updateGates() {
      gates.forEach((g) => {
        g.x -= SPEED;
        g.el.style.left = g.x + 'px';
      });
    }

    function checkGateHit() {
      for (const g of gates) {
        if (
          bird.x + bird.r > g.x &&
          bird.x - bird.r < g.x + g.w &&
          bird.y + bird.r > g.y &&
          bird.y - bird.r < g.y + g.h
        ) {
          handleGateCollision(g);
          return true;
        }
      }
      return false;
    }

    function handleGateCollision(g) {
      if (g.correct) {
        g.el.classList.add('correct');
        score++;
        hudScore.textContent = String(score);
        hudProgress.textContent = `${score}/${shuffledQuiz.length}`;
        setTimeout(() => nextQuestion(), 700);
        // Dừng chim 1 chút cho đẹp
        bird.vy = -3;
      } else {
        g.el.classList.add('wrong');
        endGame(false);
      }
    }

    function nextQuestion() {
      gatesLayer.innerHTML = '';
      gates = [];
      gateSpawned = false;
      currentQ++;
      if (currentQ >= shuffledQuiz.length) {
        endGame(true);
        return;
      }
      loadQuestion();
    }

    function endGame(won) {
      state = won ? 'won' : 'lost';
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (!won) showGameOver();
      else showWin();
    }

    /* ──────────────── Main loop ──────────────── */

    function loop() {
      if (!ctx) return;
      raf = requestAnimationFrame(loop);
      const w = size.w, h = size.h;

      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#4ec0ca');
      sky.addColorStop(1, '#87ceeb');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.6);

      if (state === 'playing' && bird) {
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        updateBgPipes();
        if (bird.y + bird.r > h * 0.6) {
          bird.y = h * 0.6 - bird.r;
          bird.vy = -2;
        }
        if (bird.y - bird.r < 0) bird.y = bird.r;
      }

      drawGround();
      drawBgPipes();

      if (state === 'playing' && gateSpawned) {
        updateGates();
        checkGateHit();
      }

      if (bird) drawBird();
    }

    function cleanup() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      gates = [];
      gateSpawned = false;
      state = 'idle';
      unbindEvents();
    }

    return { open, close, isOpen };
  }

  /* ──────────────── Expose to unsafeWindow cho userscript ──────────────── */

  if (typeof window !== 'undefined') {
    window.FlappyQuiz = { create: createFlappyQuiz };
  }
  if (typeof unsafeWindow !== 'undefined') {
    try { unsafeWindow.FlappyQuiz = window.FlappyQuiz; } catch (e) {}
  }
})();