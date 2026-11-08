import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { audio } from './audio.js';
import { DiwaliScene } from './scene.js';
import { ParticleEngine } from './particles.js';
import { DiyaManager } from './diyas.js';
import { LanternManager } from './lanterns.js';

// ==========================================================================
// MAIN 3D APP CONTROLLER - INTERACTIVE, BRIGHT & ZERO-LAG
// ==========================================================================

class DiwaliApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.currentMode = 'diya'; // diya, sparkler, aarti, rocket, anar, chakri, lantern
    this.clock = new THREE.Clock();

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isPointerDown = false;
    this.pointerDownPos = { x: 0, y: 0 };

    // Camera viewpoints
    this.targetCamPos = new THREE.Vector3(0, 16, 28);
    this.targetLookAt = new THREE.Vector3(0, 2, 0);
    this.isTransitioningCam = false;

    this.init();
  }

  init() {
    // 1. Setup Radiant 3D Scene
    this.diwaliScene = new DiwaliScene(this.container);
    this.scene = this.diwaliScene.scene;
    this.camera = this.diwaliScene.camera;
    this.renderer = this.diwaliScene.renderer;

    // 2. Setup Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 120;
    this.controls.target.set(0, 2, 0);

    // 3. Setup Subsystems
    this.particleEngine = new ParticleEngine(this.scene);
    this.diyaManager = new DiyaManager(this.scene, this.particleEngine);
    this.lanternManager = new LanternManager(this.scene);

    // 4. Setup Fairy Lights in HTML DOM
    this.setupDOMFairyLights();

    // 5. Setup UI & Media Controls
    this.setupUI();
    this.setupRealAudioControls();
    this.setupRealVideoCinema();
    this.setupPointerInteractions();

    // 6. Update Counter
    this.updateDiyaCounter();

    // 7. Start 60 FPS Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    setTimeout(() => {
      this.showToast("✨ Shubh Deepavali! May the sacred light bless your life! 🪔");
    }, 1000);
  }

  setupDOMFairyLights() {
    const fairyContainer = document.getElementById('fairyLights');
    if (!fairyContainer) return;
    const colors = ['#ff3b30', '#ff9500', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2', '#ff375f'];
    for (let i = 0; i < 28; i++) {
      const bulb = document.createElement('div');
      bulb.className = 'fairy-light';
      bulb.style.color = colors[i % colors.length];
      bulb.style.backgroundColor = colors[i % colors.length];
      bulb.style.animationDelay = `${(i * 0.12).toFixed(2)}s`;
      fairyContainer.appendChild(bulb);
    }
  }

  setupRealAudioControls() {
    const playMusicBtn = document.getElementById('playRealMusicBtn');
    const trackSelector = document.getElementById('realTrackSelector');
    const playIcon = document.getElementById('musicPlayIcon');
    const playLabel = document.getElementById('musicPlayLabel');

    playMusicBtn.addEventListener('click', () => {
      const isPlaying = audio.toggleMusic();
      playIcon.textContent = isPlaying ? "⏸️" : "▶️";
      playLabel.textContent = isPlaying ? "Playing Music" : "Play Real Music";
      this.showToast(isPlaying ? `🎵 Real Audio: ${trackSelector.options[trackSelector.selectedIndex].text}` : "🔇 Music Paused");
    });

    trackSelector.addEventListener('change', () => {
      const selected = trackSelector.value;
      audio.playRealTrack(selected);
      playIcon.textContent = "⏸️";
      playLabel.textContent = "Playing Music";
      this.showToast(`🎶 Switched to: ${trackSelector.options[trackSelector.selectedIndex].text}`);
    });
  }

  setupRealVideoCinema() {
    const cinemaModal = document.getElementById('cinemaModalOverlay');
    const openCinemaBtn = document.getElementById('openCinemaBtn');
    const closeCinemaBtn = document.getElementById('closeCinemaModalBtn');
    const cinemaVideo = document.getElementById('realCinemaVideo');
    const channelPills = document.querySelectorAll('.channel-pill');

    openCinemaBtn.addEventListener('click', () => {
      cinemaModal.classList.add('open');
      if (cinemaVideo) cinemaVideo.play().catch(() => {});
    });

    closeCinemaBtn.addEventListener('click', () => {
      cinemaModal.classList.remove('open');
      if (cinemaVideo) cinemaVideo.pause();
    });

    cinemaModal.addEventListener('click', (e) => {
      if (e.target === cinemaModal) {
        cinemaModal.classList.remove('open');
        if (cinemaVideo) cinemaVideo.pause();
      }
    });

    channelPills.forEach(pill => {
      pill.addEventListener('click', () => {
        channelPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const src = pill.dataset.src;
        if (cinemaVideo) {
          cinemaVideo.src = src;
          cinemaVideo.play().catch(() => {});
        }
        this.showToast(`📹 Loaded Real Video: ${pill.textContent.trim()}`);
      });
    });
  }

  setupUI() {
    // 1. Atmosphere Picker
    document.querySelectorAll('.atmo-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.atmo-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const atmo = chip.dataset.atmo;
        this.diwaliScene.setAtmosphere(atmo);
        this.showToast(`🌅 Sky Mood: ${chip.textContent.trim()}`);
      });
    });

    // 2. Camera View Buttons
    const camButtons = document.querySelectorAll('.cam-btn');
    camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        this.switchCameraView(view);
      });
    });

    // 3. Mode Tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.setMode(tab.dataset.mode);
      });
    });

    // 4. Diya Actions
    document.getElementById('lightAllDiyasBtn').addEventListener('click', () => {
      this.diyaManager.lightAll();
      setTimeout(() => this.updateDiyaCounter(), 1000);
      this.showToast("🔥 All Holy Diyas Illuminated!");
    });

    document.getElementById('resetDiyasBtn').addEventListener('click', () => {
      this.diyaManager.resetAll();
      this.updateDiyaCounter();
      this.showToast("💨 Courtyard Diyas Reset");
    });

    document.getElementById('spawnFloatingDiyaBtn').addEventListener('click', () => {
      this.diyaManager.createFloatingLotusDiya(-25 + Math.random() * 10, 24 + Math.random() * 14);
      audio.playDiyaChime();
      this.showToast("🪷 Floating Lotus Diya released on Pavana Sarovar!");
    });

    // 5. Sparkler Controls
    document.getElementById('clearTrailBtn').addEventListener('click', () => {
      this.particleEngine.lightTrailPoints = [];
      this.showToast("🧹 Light Painting Trail Cleared");
    });

    // 6. Maha Aarti Controls
    document.getElementById('performAartiBtn').addEventListener('click', () => {
      this.diwaliScene.performMahaAarti();
      this.showToast("✨ Divine Maha Aarti Ceremony in Motion!");
    });

    document.getElementById('soundShankhaBtn').addEventListener('click', () => {
      audio.playShankha();
      this.showToast("🐚 Auspicious Shankha Resonating!");
    });

    // 7. Rocket Barrage
    document.getElementById('barrageRocketsBtn').addEventListener('click', () => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.particleEngine.launchRocket();
        }, i * 350);
      }
    });

    // 8. Anar Actions
    document.getElementById('multiAnarBtn').addEventListener('click', () => {
      const positions = [
        new THREE.Vector3(-6, 0, -4),
        new THREE.Vector3(0, 0, -8),
        new THREE.Vector3(6, 0, -4)
      ];
      positions.forEach((pos, i) => {
        setTimeout(() => {
          this.particleEngine.createAnarFountain(pos);
        }, i * 300);
      });
      this.showToast("💥 3 Sparkling Anars Ignited!");
    });

    // 9. Chakri Actions
    document.getElementById('twinChakriBtn').addEventListener('click', () => {
      this.particleEngine.createChakriSpinner(new THREE.Vector3(-5, 0.05, -2));
      this.particleEngine.createChakriSpinner(new THREE.Vector3(5, 0.05, -2));
      this.showToast("🌪️ Twin Ground Chakris Spinning!");
    });

    // 10. Wish Modal
    const wishModal = document.getElementById('wishModalOverlay');
    const openWishBtn = document.getElementById('openWishModalBtn');
    const closeWishBtn = document.getElementById('closeWishModalBtn');
    const releaseWishBtn = document.getElementById('releaseLanternBtn');

    openWishBtn.addEventListener('click', () => {
      wishModal.classList.add('open');
    });

    closeWishBtn.addEventListener('click', () => {
      wishModal.classList.remove('open');
    });

    wishModal.addEventListener('click', (e) => {
      if (e.target === wishModal) wishModal.classList.remove('open');
    });

    document.querySelectorAll('.quick-wish-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('wishInput').value = chip.dataset.text;
      });
    });

    releaseWishBtn.addEventListener('click', () => {
      const wish = document.getElementById('wishInput').value.trim() || "Happy Diwali! May light forever triumph over darkness! 🪔";
      const author = document.getElementById('wishAuthor').value.trim() || "Devotee";

      this.lanternManager.releaseLantern(wish, author);
      audio.playDiyaChime();
      wishModal.classList.remove('open');
      this.showToast(`🏮 Sacred Wish Released into the Heavens!`);
    });

    // 11. Postcard Modal
    const postcardBtn = document.getElementById('postcardBtn');
    const postcardModal = document.getElementById('postcardModalOverlay');
    const closePostcardBtn = document.getElementById('closePostcardModalBtn');
    const downloadPostcardBtn = document.getElementById('downloadPostcardBtn');

    postcardBtn.addEventListener('click', () => {
      this.renderFestivePostcard();
      postcardModal.classList.add('open');
    });

    closePostcardBtn.addEventListener('click', () => {
      postcardModal.classList.remove('open');
    });

    postcardModal.addEventListener('click', (e) => {
      if (e.target === postcardModal) postcardModal.classList.remove('open');
    });

    ['postcardRecipient', 'postcardSender'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        this.renderFestivePostcard();
      });
    });

    downloadPostcardBtn.addEventListener('click', () => {
      const canvas = document.getElementById('postcardCanvas');
      const link = document.createElement('a');
      link.download = `Shubh_Deepavali_Postcard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast("📥 Postcard Downloaded! Share it with loved ones! 🪔");
    });

    // 12. Grand Finale Button
    document.getElementById('megaFinaleBtn').addEventListener('click', () => this.triggerGrandFinale());

    // 13. Stream Mode (Clean OBS View) Toggle & Keyboard Shortcuts
    const streamViewBtn = document.getElementById('streamViewBtn');
    let isCleanStream = false;

    const toggleStreamMode = () => {
      isCleanStream = !isCleanStream;
      document.body.classList.toggle('clean-stream-view', isCleanStream);
      this.showToast(isCleanStream ? "📺 Stream Mode: HUD Hidden (Press 'H' to show)" : "📺 UI Restored");
    };

    if (streamViewBtn) {
      streamViewBtn.addEventListener('click', toggleStreamMode);
    }

    // Keyboard Shortcuts for Live Streamers
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in text inputs or modals
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'KeyH') { // H = Toggle HUD for OBS
        toggleStreamMode();
      } else if (e.code === 'Space') { // Space = Launch Rocket
        e.preventDefault();
        this.particleEngine.launchRocket();
      } else if (e.code === 'KeyF') { // F = Grand Fireworks Finale
        this.triggerGrandFinale();
      } else if (e.code === 'KeyA') { // A = Maha Aarti
        this.diwaliScene.performMahaAarti();
        this.showToast("✨ Divine Maha Aarti Ceremony in Motion!");
      } else if (e.code === 'KeyL') { // L = Sky Lantern
        this.lanternManager.releaseLantern(null, "Live Stream Devotee");
        this.showToast("🏮 Sky Lantern Released on Stream!");
      }
    });

    // Wish Reader Popup close
    document.getElementById('closePopupBtn').addEventListener('click', () => {
      document.getElementById('wishCardPopup').classList.remove('show');
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    const subPanels = ['diya', 'sparkler', 'aarti', 'rocket', 'anar', 'chakri', 'lantern'];
    subPanels.forEach(p => {
      const el = document.getElementById(`panel-${p}`);
      if (el) el.style.display = p === mode ? 'flex' : 'none';
    });

    const isSparkler = mode === 'sparkler';
    this.particleEngine.setSparklerActive(isSparkler);
    document.body.classList.toggle('sparkler-cursor', isSparkler);

    const hint = document.getElementById('interactionHint');
    if (mode === 'diya') {
      hint.innerHTML = '💡 <span>Click on any unlit clay Diya to ignite it with golden flame!</span>';
    } else if (mode === 'sparkler') {
      hint.innerHTML = '💡 <span>Move your pointer to paint with light in the air! Sizzling golden sparks follow your wand!</span>';
    } else if (mode === 'aarti') {
      hint.innerHTML = '💡 <span>Click "Perform Maha Aarti" to witness the sacred clockwise circular offering with real Aarti audio!</span>';
    } else if (mode === 'rocket') {
      hint.innerHTML = '💡 <span>Click anywhere in the night sky to launch a whistling rocket!</span>';
    } else if (mode === 'anar') {
      hint.innerHTML = '💡 <span>Click on the courtyard ground to place & ignite a sparkling Anar!</span>';
    } else if (mode === 'chakri') {
      hint.innerHTML = '💡 <span>Click on the courtyard stone terrace to spin a Chakri!</span>';
    } else if (mode === 'lantern') {
      hint.innerHTML = '💡 <span>Release wish lanterns, or click any floating sky lantern to read its blessing!</span>';
    }
  }

  switchCameraView(view) {
    this.isTransitioningCam = true;

    if (view === 'courtyard') {
      this.targetCamPos.set(0, 6, 8);
      this.targetLookAt.set(0, 0.5, -4);
    } else if (view === 'ghat') {
      this.targetCamPos.set(0, 4, 18);
      this.targetLookAt.set(0, -2, 36);
    } else if (view === 'sky') {
      this.targetCamPos.set(0, 8, 20);
      this.targetLookAt.set(0, 45, -20);
    } else { // orbit
      this.targetCamPos.set(0, 16, 28);
      this.targetLookAt.set(0, 2, 0);
    }
  }

  setupPointerInteractions() {
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.top-nav-hud, .camera-hud, .bottom-action-dock, .sub-toolbar, .modal-overlay, .wish-card-popup')) {
        return;
      }
      this.isPointerDown = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    let sparklerThrottled = false;
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.currentMode === 'sparkler' && !sparklerThrottled) {
        sparklerThrottled = true;
        requestAnimationFrame(() => {
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const targetPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(new THREE.Vector3()).negate(),
            this.controls.target
          );
          const intersectPoint = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(targetPlane, intersectPoint)) {
            this.particleEngine.updateSparklerTip(intersectPoint);
          }
          sparklerThrottled = false;
        });
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist < 6) {
        this.handleSceneClick(e);
      }
    });
  }

  handleSceneClick(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 0. Check if user clicked on Interactive Sweets (Mithai)
    const sweetHits = this.raycaster.intersectObjects(this.diwaliScene.sweetMeshes);
    if (sweetHits.length > 0) {
      const sweet = sweetHits[0].object;
      const name = sweet.userData.name || "Diwali Sweet";
      audio.playDiyaChime();
      this.showToast(`🍬 You tasted delicious ${name}! Sharing sweet joy! 🪔`);
      return;
    }

    const lanternHits = this.raycaster.intersectObjects(this.lanternManager.lanternMeshesForRaycast);
    if (lanternHits.length > 0) {
      const lanternParent = lanternHits[0].object.userData.lanternParent;
      if (lanternParent) {
        this.openWishPopup(lanternParent.userData.wish, lanternParent.userData.author);
        return;
      }
    }

    if (this.currentMode === 'diya') {
      const diyaHits = this.raycaster.intersectObjects(this.diyaManager.diyaMeshesForRaycast);
      if (diyaHits.length > 0) {
        const diyaParent = diyaHits[0].object.userData.diyaParent;
        if (diyaParent && !diyaParent.userData.isLit) {
          this.diyaManager.igniteDiya(diyaParent, true);
          this.updateDiyaCounter();
        }
      }
    } else if (this.currentMode === 'rocket') {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 10);
      const targetPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, targetPoint);
      this.particleEngine.launchRocket(targetPoint);
    } else if (this.currentMode === 'anar') {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const groundHit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(groundPlane, groundHit)) {
        if (Math.abs(groundHit.x) < 16 && groundHit.z < 10) {
          this.particleEngine.createAnarFountain(groundHit);
        } else {
          this.showToast("⚠️ Place Anar on the stone courtyard!");
        }
      }
    } else if (this.currentMode === 'chakri') {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const groundHit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(groundPlane, groundHit)) {
        if (Math.abs(groundHit.x) < 16 && groundHit.z < 10) {
          this.particleEngine.createChakriSpinner(groundHit);
        } else {
          this.showToast("⚠️ Place Chakri on the stone courtyard!");
        }
      }
    } else if (this.currentMode === 'lantern') {
      this.lanternManager.releaseLantern(null, null);
      this.showToast("🏮 Sky Lantern Released!");
    } else if (this.currentMode === 'aarti') {
      this.diwaliScene.performMahaAarti();
    }
  }

  renderFestivePostcard() {
    const pCanvas = document.getElementById('postcardCanvas');
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const width = 900;
    const height = 600;
    pCanvas.width = width;
    pCanvas.height = height;

    // 1. Draw 3D WebGL Snapshot
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

    // 2. Warm vignette
    const grad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(0.7, 'rgba(15, 6, 32, 0.6)');
    grad.addColorStop(1, 'rgba(8, 3, 18, 0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 3. Ornate Royal Golden Borders
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    const cornerSize = 40;
    const drawCorner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * cornerSize, y);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x + dx * 10, y + dy * 10, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawCorner(28, 28, 1, 1);
    drawCorner(width - 28, 28, -1, 1);
    drawCorner(28, height - 28, 1, -1);
    drawCorner(width - 28, height - 28, -1, -1);

    // 4. Header Badge & Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 20px "Yatra One", cursive, sans-serif';
    ctx.fillText('✨ शुभ दीपावली ✨', width / 2, 75);

    ctx.fillStyle = '#ffd700';
    ctx.font = '900 42px "Cinzel Decorative", serif';
    ctx.shadowColor = 'rgba(255, 183, 3, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText('HAPPY DIWALI', width / 2, 125);
    ctx.shadowBlur = 0;

    const recipient = document.getElementById('postcardRecipient').value.trim() || "Dear Loved Ones";
    const sender = document.getElementById('postcardSender').value.trim() || "With Love & Blessings";

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(`To: ${recipient}`, width / 2, 210);

    ctx.fillStyle = '#f1edfa';
    ctx.font = 'italic 19px "Outfit", sans-serif';
    ctx.fillText('May the holy divine lights illuminate your path with boundless joy,', width / 2, 260);
    ctx.fillText('radiant health, peace of mind, and everlasting prosperity!', width / 2, 290);

    ctx.fillStyle = '#ffd700';
    ctx.font = '22px serif';
    ctx.fillText('✦  🪔  ✦', width / 2, 345);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Rozha One", serif';
    ctx.fillText(`— ${sender}`, width / 2, 420);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '13px "Outfit", sans-serif';
    ctx.fillText('Shubh Deepavali 3D Celebration • The Festival of Lights', width / 2, height - 42);
  }

  openWishPopup(wish, author) {
    document.getElementById('popupWishText').textContent = `"${wish}"`;
    document.getElementById('popupWishAuthor').textContent = `— ${author}`;
    document.getElementById('wishCardPopup').classList.add('show');
    audio.playDiyaChime();
  }

  updateDiyaCounter() {
    const lit = this.diyaManager.getLitCount();
    const total = this.diyaManager.getTotalCount();
    const display = document.getElementById('diyaCounterDisplay');
    if (display) {
      display.textContent = `${lit} / ${total} Lit`;
      if (lit === total) {
        display.textContent = `${lit} / ${total} Lit ✨ Courtyard Blessed!`;
      }
    }
  }

  triggerGrandFinale() {
    this.showToast("🎆 SPECTACULAR DIWALI GRAND FINALE & AYODHYA LASER SHOW! 🪔✨");
    audio.playShankha();

    // Activate Ayodhya Volumetric Laser Beams
    if (this.diwaliScene && this.diwaliScene.triggerLaserShow) {
      this.diwaliScene.triggerLaserShow(8500);
    }

    this.switchCameraView('sky');
    const skyBtn = document.querySelector('.cam-btn[data-view="sky"]');
    if (skyBtn) {
      document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
      skyBtn.classList.add('active');
    }

    this.diyaManager.lightAll();
    this.updateDiyaCounter();

    const rocketTotal = 14;
    for (let i = 0; i < rocketTotal; i++) {
      setTimeout(() => {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 24, 0, (Math.random() - 0.5) * 20);
        this.particleEngine.launchRocket(offset);
      }, i * 280);
    }

    setTimeout(() => {
      this.particleEngine.createAnarFountain(new THREE.Vector3(-6, 0, -4));
      this.particleEngine.createAnarFountain(new THREE.Vector3(6, 0, -4));
    }, 1200);

    for (let j = 0; j < 6; j++) {
      setTimeout(() => {
        this.lanternManager.releaseLantern("Universal Peace, Radiance & Prosperity! ✨", "Auspicious Devotee");
      }, 1500 + j * 400);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toastNotice');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.isTransitioningCam) {
      this.camera.position.lerp(this.targetCamPos, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.2) {
        this.isTransitioningCam = false;
      }
    }

    this.controls.update();

    // Update Subsystems
    this.diwaliScene.update(delta);
    this.particleEngine.update(delta);
    this.diyaManager.update(delta, elapsedTime);
    this.lanternManager.update(delta, elapsedTime);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new DiwaliApp();
});
