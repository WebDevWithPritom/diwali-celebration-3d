// ==========================================================================
// ULTRA-FAST, ZERO-LAG REAL DIWALI CELEBRATION HUB
// Real HD Videos • Authentic Audios • 60 FPS Particle Crackers • Deepotsav
// ==========================================================================

class DiwaliCelebrationApp {
  constructor() {
    this.audioPlayer = document.getElementById('realAudioPlayer');
    this.bgVideo = document.getElementById('bgVideo');
    this.theaterVideo = document.getElementById('theaterVideo');
    this.isPlayingAudio = false;

    // Cracker Canvas & Particle Engine
    this.crackerCanvas = document.getElementById('crackerCanvas');
    this.crackerCtx = this.crackerCanvas ? this.crackerCanvas.getContext('2d') : null;
    this.currentCracker = 'rocket';
    this.particles = [];
    this.crackers = [];

    // Deepotsav State
    this.diyas = [];
    this.totalDiyas = 16;
    this.litCount = 0;

    this.init();
  }

  init() {
    this.setupFairyLights();
    this.setupRealAudio();
    this.setupRealVideos();
    this.setupSuperGlow();
    this.setupNavigation();
    this.setupDeepotsav();
    this.setupCrackerArena();
    this.setupCardStudio();

    this.showToast("✨ Shubh Deepavali! May the sacred light bless your life! 🪔");
  }

  // Fairy Lights Generator
  setupFairyLights() {
    const container = document.getElementById('fairyLights');
    if (!container) return;
    const colors = ['#ff3b30', '#ff9500', '#ffd60a', '#30d158', '#00c7be', '#bf5af2', '#ff2d55'];
    for (let i = 0; i < 28; i++) {
      const bulb = document.createElement('div');
      bulb.className = 'fairy-light';
      bulb.style.color = colors[i % colors.length];
      bulb.style.backgroundColor = colors[i % colors.length];
      bulb.style.animationDelay = `${(i * 0.12).toFixed(2)}s`;
      container.appendChild(bulb);
    }
  }

  // ==========================================================================
  // 1. REAL AUDIO JUKEBOX
  // ==========================================================================
  setupRealAudio() {
    const playBtn = document.getElementById('playAudioBtn');
    const trackSelect = document.getElementById('audioTrackSelect');
    const volumeSlider = document.getElementById('volumeSlider');
    const statusText = document.getElementById('audioStatusText');
    const icon = document.getElementById('audioIcon');

    // Set initial track
    this.audioPlayer.src = trackSelect.value;
    this.audioPlayer.volume = parseFloat(volumeSlider.value);

    playBtn.addEventListener('click', () => {
      if (this.audioPlayer.paused) {
        this.audioPlayer.play().then(() => {
          this.isPlayingAudio = true;
          statusText.textContent = "Playing Real Music";
          icon.textContent = "⏸️";
          this.showToast(`🎶 Playing: ${trackSelect.options[trackSelect.selectedIndex].text}`);
        }).catch(err => {
          console.warn("Audio autoplay blocked, click again", err);
        });
      } else {
        this.audioPlayer.pause();
        this.isPlayingAudio = false;
        statusText.textContent = "Play Real Music";
        icon.textContent = "▶️";
      }
    });

    trackSelect.addEventListener('change', () => {
      const wasPlaying = !this.audioPlayer.paused;
      this.audioPlayer.src = trackSelect.value;
      if (wasPlaying) {
        this.audioPlayer.play();
      }
      this.showToast(`🎵 Switched Track: ${trackSelect.options[trackSelect.selectedIndex].text}`);
    });

    volumeSlider.addEventListener('input', (e) => {
      this.audioPlayer.volume = parseFloat(e.target.value);
    });

    // Auto-loop tracks
    this.audioPlayer.addEventListener('ended', () => {
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.play();
    });
  }

  // ==========================================================================
  // 2. REAL VIDEO BACKGROUND & THEATER
  // ==========================================================================
  setupRealVideos() {
    const vidButtons = document.querySelectorAll('.vid-btn');
    const playlistCards = document.querySelectorAll('.playlist-card');
    const theaterTitle = document.getElementById('theaterVideoTitle');

    const switchVideo = (src, title) => {
      // 1. Switch background video
      if (this.bgVideo) {
        this.bgVideo.src = src;
        this.bgVideo.play().catch(() => {});
      }
      // 2. Switch theater video
      if (this.theaterVideo) {
        this.theaterVideo.src = src;
        this.theaterVideo.play().catch(() => {});
      }
      if (theaterTitle && title) {
        theaterTitle.textContent = title;
      }

      // Update button active state
      vidButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.vid === src);
      });
      // Update playlist cards
      playlistCards.forEach(c => {
        const isActive = c.dataset.src === src;
        c.classList.toggle('active', isActive);
        const badge = c.querySelector('.play-badge');
        if (badge) badge.textContent = isActive ? "▶ Playing" : "Play";
      });

      this.showToast(`📹 Real Video Loaded: ${title || 'Festive Celebration'}`);
    };

    vidButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchVideo(btn.dataset.vid, btn.textContent.trim());
      });
    });

    playlistCards.forEach(card => {
      card.addEventListener('click', () => {
        switchVideo(card.dataset.src, card.dataset.title);
      });
    });
  }

  // ==========================================================================
  // 3. SUPER GLOW TOGGLE (BRIGHTNESS ENHANCER)
  // ==========================================================================
  setupSuperGlow() {
    const btn = document.getElementById('brightnessToggleBtn');
    let isSuperGlow = true;
    document.body.classList.add('super-glow');

    btn.addEventListener('click', () => {
      isSuperGlow = !isSuperGlow;
      document.body.classList.toggle('super-glow', isSuperGlow);
      btn.querySelector('span').textContent = `☀️ Super Glow: ${isSuperGlow ? 'ON' : 'OFF'}`;
      this.showToast(isSuperGlow ? "☀️ Maximum Festive Radiant Golden Illumination ON!" : "🌙 Normal Glow");
    });
  }

  // ==========================================================================
  // 4. NAVIGATION TABS
  // ==========================================================================
  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.tab-section');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        tab.classList.add('active');
        const targetSection = document.getElementById(`tab-${tab.dataset.tab}`);
        if (targetSection) {
          targetSection.classList.add('active');
        }

        // If switched to card tab, re-render card
        if (tab.dataset.tab === 'card') {
          this.renderGreetingCard();
        }
      });
    });
  }

  // ==========================================================================
  // 5. HOLY DEEPOTSAV (BRIGHT INTERACTIVE DIYAS)
  // ==========================================================================
  setupDeepotsav() {
    const grid = document.getElementById('ghatGrid');
    const counterDisplay = document.getElementById('diyaCounterText');
    const lightAllBtn = document.getElementById('lightAllDiyasBtn');
    const resetBtn = document.getElementById('resetDiyasBtn');
    const floatingBtn = document.getElementById('spawnFloatingDiyaBtn');

    if (!grid) return;

    // Generate 16 Auspicious Diyas
    for (let i = 0; i < this.totalDiyas; i++) {
      const isBrass = i === 0 || i === 5 || i === 10;
      const diya = document.createElement('div');
      diya.className = 'diya-node';
      diya.dataset.id = i;

      diya.innerHTML = `
        <div class="diya-flame-box">
          <div class="flame-core"></div>
        </div>
        <svg class="diya-svg" viewBox="0 0 100 65" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="clayGrad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${isBrass ? '#ffe066' : '#d84a1b'}" />
              <stop offset="50%" stop-color="${isBrass ? '#d4af37' : '#9c2a0c'}" />
              <stop offset="100%" stop-color="${isBrass ? '#997300' : '#571203'}" />
            </linearGradient>
            <linearGradient id="goldRim${i}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#fff275" />
              <stop offset="50%" stop-color="#ffd700" />
              <stop offset="100%" stop-color="#ff9900" />
            </linearGradient>
          </defs>
          <!-- Diya Bowl -->
          <ellipse cx="50" cy="48" rx="42" ry="14" fill="url(#clayGrad${i})" />
          <path d="M 8 48 C 12 25, 88 25, 92 48 Z" fill="url(#clayGrad${i})" />
          <!-- Diya Rim -->
          <ellipse cx="50" cy="30" rx="38" ry="9" fill="url(#goldRim${i})" />
          <!-- Oil Well -->
          <ellipse cx="50" cy="30" rx="32" ry="7" fill="#4a1a08" />
          <!-- Cotton Wick with Spark -->
          <line x1="50" y1="30" x2="50" y2="18" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
          <circle cx="50" cy="18" r="3" fill="#ffcc00" />
        </svg>
      `;

      diya.addEventListener('click', () => {
        if (!diya.classList.contains('lit')) {
          this.lightDiya(diya);
        }
      });

      grid.appendChild(diya);
      this.diyas.push(diya);
    }

    // Light central eternal diya by default
    this.lightDiya(this.diyas[0], false);

    lightAllBtn.addEventListener('click', () => {
      this.diyas.forEach((d, idx) => {
        setTimeout(() => this.lightDiya(d, true), idx * 80);
      });
      this.showToast("🔥 All Holy Diyas Illuminated! May Light Fill Your Soul!");
    });

    resetBtn.addEventListener('click', () => {
      this.diyas.forEach((d, idx) => {
        if (idx !== 0) { // keep central diya
          d.classList.remove('lit');
        }
      });
      this.litCount = 1;
      counterDisplay.textContent = `${this.litCount} / ${this.totalDiyas} Lit`;
      this.showToast("💨 Courtyard Diyas Reset");
    });

    floatingBtn.addEventListener('click', () => {
      this.spawnFloatingLotusDiya();
    });

    // Seed floating lotus diyas
    for (let f = 0; f < 5; f++) {
      this.spawnFloatingLotusDiya(f * 200);
    }
  }

  lightDiya(diya, triggerToast = true) {
    if (diya.classList.contains('lit')) return;
    diya.classList.add('lit');
    this.litCount = this.diyas.filter(d => d.classList.contains('lit')).length;
    const counterDisplay = document.getElementById('diyaCounterText');
    if (counterDisplay) {
      counterDisplay.textContent = `${this.litCount} / ${this.totalDiyas} Lit`;
      if (this.litCount === this.totalDiyas) {
        counterDisplay.textContent = `${this.litCount} / ${this.totalDiyas} Lit ✨ Courtyard Blessed!`;
      }
    }
    if (triggerToast) {
      this.showToast("🪔 Diya Lit with Auspicious Golden Flame!");
    }
  }

  spawnFloatingLotusDiya(initialOffset = null) {
    const layer = document.getElementById('floatingDiyasLayer');
    if (!layer) return;

    const lotus = document.createElement('div');
    lotus.className = 'floating-lotus-diya';
    const topY = 15 + Math.random() * 60;
    lotus.style.top = `${topY}px`;
    lotus.style.left = initialOffset !== null ? `${initialOffset}px` : `-50px`;

    lotus.innerHTML = `
      <div style="font-size:2.4rem; position:relative;">
        <span style="position:absolute; top:-16px; left:12px; font-size:1.1rem; filter:drop-shadow(0 0 10px #ffd700);">🔥</span>
        🪷
      </div>
    `;

    layer.appendChild(lotus);
  }

  // ==========================================================================
  // 6. 60 FPS CRACKER CANVAS ARENA (ZERO LAG!)
  // ==========================================================================
  setupCrackerArena() {
    if (!this.crackerCanvas || !this.crackerCtx) return;

    const resizeCanvas = () => {
      const rect = this.crackerCanvas.parentElement.getBoundingClientRect();
      this.crackerCanvas.width = rect.width;
      this.crackerCanvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Select Cracker Type
    const crackerBtns = document.querySelectorAll('.cracker-select-btn');
    crackerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        crackerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCracker = btn.dataset.type;
        this.showToast(`🎯 Selected: ${btn.querySelector('.c-title').textContent}`);
      });
    });

    // Click on canvas to spawn cracker
    this.crackerCanvas.addEventListener('pointerdown', (e) => {
      const rect = this.crackerCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.igniteCrackerAt(x, y, this.currentCracker);
    });

    // Run 60 FPS Animation Loop
    this.renderCrackers = this.renderCrackers.bind(this);
    requestAnimationFrame(this.renderCrackers);
  }

  igniteCrackerAt(x, y, type) {
    if (type === 'rocket') {
      // Rocket shoots from bottom up to clicked Y
      this.crackers.push({
        type: 'rocket',
        x: x,
        y: this.crackerCanvas.height,
        targetY: y,
        vy: -14,
        color: this.getRandomColor()
      });
      this.showToast("🚀 Rocket Launched!");
    } else if (type === 'anar') {
      // Golden Flowerpot Fountain
      this.crackers.push({
        type: 'anar',
        x: x,
        y: y,
        age: 0,
        maxAge: 180 // ~3 seconds
      });
      this.showToast("🌋 Sparkling Anar Fountain Erupting!");
    } else if (type === 'chakri') {
      // Ground Spinner
      this.crackers.push({
        type: 'chakri',
        x: x,
        y: y,
        angle: 0,
        age: 0,
        maxAge: 160
      });
      this.showToast("🌀 Chakri Whirling on Ground!");
    } else if (type === 'sparkler') {
      // Phuljhadi burst
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: '#ffd700',
          life: 1.0,
          decay: 0.03
        });
      }
    } else if (type === 'ladi') {
      // 1000-Wala Rhythmic Pops
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const offsetX = x + (Math.random() - 0.5) * 60;
          const offsetY = y + (Math.random() - 0.5) * 60;
          this.createBurst(offsetX, offsetY, '#ff3b30', 25);
        }, i * 140);
      }
      this.showToast("🧨 1000-Wala Ladi Popping!");
    }
  }

  createBurst(x, y, color, count = 120) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.01
      });
    }
  }

  renderCrackers() {
    requestAnimationFrame(this.renderCrackers);
    const ctx = this.crackerCtx;
    const w = this.crackerCanvas.width;
    const h = this.crackerCanvas.height;

    // Semi-transparent fade for glowing particle trails
    ctx.fillStyle = 'rgba(10, 4, 25, 0.25)';
    ctx.fillRect(0, 0, w, h);

    // Update & Draw Active Crackers
    for (let i = this.crackers.length - 1; i >= 0; i--) {
      const c = this.crackers[i];
      if (c.type === 'rocket') {
        c.y += c.vy;
        // Draw rocket head & spark trail
        ctx.fillStyle = '#ffe600';
        ctx.fillRect(c.x - 2, c.y, 4, 10);
        // Trail sparks
        this.particles.push({
          x: c.x,
          y: c.y + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: 2 + Math.random() * 2,
          color: '#ff9900',
          life: 0.5,
          decay: 0.08
        });
        if (c.y <= c.targetY) {
          this.createBurst(c.x, c.y, c.color, 140);
          this.crackers.splice(i, 1);
        }
      } else if (c.type === 'anar') {
        c.age++;
        // Emit upward fountain sparks
        for (let k = 0; k < 6; k++) {
          this.particles.push({
            x: c.x + (Math.random() - 0.5) * 8,
            y: c.y,
            vx: (Math.random() - 0.5) * 5,
            vy: -8 - Math.random() * 7,
            color: Math.random() > 0.4 ? '#ffd700' : '#ffffff',
            life: 1.0,
            decay: 0.025
          });
        }
        if (c.age >= c.maxAge) {
          this.crackers.splice(i, 1);
        }
      } else if (c.type === 'chakri') {
        c.age++;
        c.angle += 0.35;
        // Tangent sparks
        for (let k = 0; k < 4; k++) {
          const spd = 5 + Math.random() * 4;
          this.particles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(c.angle) * spd,
            vy: Math.sin(c.angle) * spd,
            color: '#ff9900',
            life: 0.6,
            decay: 0.04
          });
        }
        if (c.age >= c.maxAge) {
          this.crackers.splice(i, 1);
        }
      }
    }

    // Update & Draw Particles
    for (let j = this.particles.length - 1; j >= 0; j--) {
      const p = this.particles[j];
      p.life -= p.decay;
      p.vy += 0.15; // Gravity
      p.x += p.vx;
      p.y += p.vy;

      if (p.life <= 0) {
        this.particles.splice(j, 1);
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  }

  getRandomColor() {
    const colors = ['#ff2a55', '#ffd700', '#00ff88', '#00e5ff', '#ff9900', '#e040fb', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ==========================================================================
  // 7. GREETING CARD STUDIO
  // ==========================================================================
  setupCardStudio() {
    const recipientInput = document.getElementById('cardRecipientInput');
    const blessingSelect = document.getElementById('cardBlessingSelect');
    const customMsgInput = document.getElementById('customMsgInput');
    const customMsgWrapper = document.getElementById('customMsgWrapper');
    const senderInput = document.getElementById('cardSenderInput');
    const downloadBtn = document.getElementById('downloadCardBtn');
    const copyBtn = document.getElementById('copyWishBtn');
    const waBtn = document.getElementById('whatsappBtn');

    blessingSelect.addEventListener('change', () => {
      customMsgWrapper.style.display = blessingSelect.value === 'Custom' ? 'block' : 'none';
      this.renderGreetingCard();
    });

    [recipientInput, customMsgInput, senderInput].forEach(el => {
      if (el) el.addEventListener('input', () => this.renderGreetingCard());
    });

    downloadBtn.addEventListener('click', () => {
      const canvas = document.getElementById('greetingCardCanvas');
      const link = document.createElement('a');
      link.download = `Shubh_Deepavali_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast("📥 Diwali Greeting Card Downloaded!");
    });

    copyBtn.addEventListener('click', () => {
      const text = `✨ Shubh Deepavali! ✨\n\nTo: ${recipientInput.value}\n\n${this.getCardMessage()}\n\n— ${senderInput.value}\n\n🪔 Happy Diwali!`;
      navigator.clipboard.writeText(text).then(() => {
        this.showToast("📋 Greeting Text Copied to Clipboard!");
      });
    });

    waBtn.addEventListener('click', () => {
      const text = `✨ Shubh Deepavali! ✨\n\nTo: ${recipientInput.value}\n\n${this.getCardMessage()}\n\n— ${senderInput.value}\n\n🪔 Happy Diwali!`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    });

    this.renderGreetingCard();
  }

  getCardMessage() {
    const select = document.getElementById('cardBlessingSelect');
    if (select.value === 'Custom') {
      return document.getElementById('customMsgInput').value.trim() || "May this holy Diwali shower you with infinite health, happiness, and peace!";
    }
    return select.value;
  }

  renderGreetingCard() {
    const canvas = document.getElementById('greetingCardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 800;
    const h = 520;
    canvas.width = w;
    canvas.height = h;

    // Rich Regal Gradient Background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w * 0.7);
    bgGrad.addColorStop(0, '#381358');
    bgGrad.addColorStop(0.6, '#1e0836');
    bgGrad.addColorStop(1, '#0e031a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Royal Gold Frame
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Corner Ornaments
    const drawCorner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 35);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 35, y);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    };
    drawCorner(26, 26, 1, 1);
    drawCorner(w - 26, 26, -1, 1);
    drawCorner(26, h - 26, 1, -1);
    drawCorner(w - 26, h - 26, -1, -1);

    // Symbols & Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px "Yatra One", cursive, sans-serif';
    ctx.fillText('✨ शुभ दीपावली ✨', w / 2, 65);

    ctx.fillStyle = '#ffd700';
    ctx.font = '900 38px "Cinzel Decorative", serif';
    ctx.shadowColor = 'rgba(255, 183, 3, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fillText('HAPPY DIWALI', w / 2, 115);
    ctx.shadowBlur = 0;

    // Recipient
    const recipient = document.getElementById('cardRecipientInput').value.trim() || "Dear Loved Ones";
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText(`To: ${recipient}`, w / 2, 185);

    // Message (Multi-line wrap)
    const msg = this.getCardMessage();
    ctx.fillStyle = '#f3edfa';
    ctx.font = 'italic 18px "Outfit", sans-serif';
    this.wrapText(ctx, msg, w / 2, 235, 620, 28);

    // Divider
    ctx.fillStyle = '#ffd700';
    ctx.font = '20px serif';
    ctx.fillText('✦  🪔  ✦', w / 2, 350);

    // Sender
    const sender = document.getElementById('cardSenderInput').value.trim() || "With Warm Wishes";
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Rozha One", serif';
    ctx.fillText(`— ${sender}`, w / 2, 415);
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  showToast(msg) {
    const toast = document.getElementById('festiveToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new DiwaliCelebrationApp();
});

