import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { audio } from './audio.js';
import { DiwaliScene } from './scene.js';
import { ParticleEngine } from './particles.js';
import { DiyaManager } from './diyas.js';
import { LanternManager } from './lanterns.js';

// ==========================================================================
// APP CONTROLLER: wires the 3D scene to the controls
// ==========================================================================

const $ = (id) => document.getElementById(id);
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const MODE_HINTS = {
  diya: 'Tap an unlit diya to light it.',
  sparkler: 'Move across the scene to write with light. On touch, drag.',
  aarti: 'Circle the brass thali clockwise around the rangoli.',
  rocket: 'Tap the sky to launch a rocket from below it.',
  anar: 'Tap the courtyard floor to light an anar.',
  chakri: 'Tap the courtyard floor to spin a chakri.',
  lantern: 'Write a wish, or tap a lantern in the sky to read one.'
};

const VIEWS = {
  orbit: { pos: [0, 15, 27], look: [0, 1.5, -2] },
  courtyard: { pos: [0, 5.5, 7.5], look: [0, 0.5, -5] },
  ghat: { pos: [-6, 3.5, 20], look: [4, -1, 34] },
  sky: { pos: [0, 6, 22], look: [0, 34, -16] }
};

class DiwaliApp {
  constructor() {
    this.container = $('canvas-container');
    this.currentMode = 'diya';
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDown = null;
    this.targetCamPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.isTransitioningCam = false;
    this.reduceMotion = reduceMotionQuery.matches;
    this.nextAmbient = 4;
    this.started = false;
    this.allLitAnnounced = false;
    this.openModalEl = null;
    this.init();
  }

  init() {
    this.diwaliScene = new DiwaliScene(this.container);
    this.scene = this.diwaliScene.scene;
    this.camera = this.diwaliScene.camera;
    this.renderer = this.diwaliScene.renderer;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 70;
    this.controls.enablePan = false;
    this.controls.addEventListener('start', () => { this.isTransitioningCam = false; });

    this.particleEngine = new ParticleEngine(this.scene);
    this.particleEngine.setCamera(this.camera);
    this.diyaManager = new DiyaManager(this.scene, this.particleEngine, { onChange: () => this.updateDiyaCounter() });
    this.lanternManager = new LanternManager(this.scene);

    this.diwaliScene.onAartiStart = () => this.syncMusicUI();

    const onResize = () => {
      this.diwaliScene.onWindowResize();
      this.particleEngine.setViewport(this.renderer.domElement.height, this.camera.fov);
    };
    window.addEventListener('resize', onResize);
    onResize();

    this.applyMotionPreference();
    reduceMotionQuery.addEventListener('change', (e) => {
      this.reduceMotion = e.matches;
      this.applyMotionPreference();
    });

    this.setView('orbit', true);
    this.setupIntro();
    this.setupTopBar();
    this.setupPanel();
    this.setupModes();
    this.setupActions();
    this.setupModals();
    this.setupPointer();
    this.setupKeyboard();
    this.updateDiyaCounter();

    if (window.innerWidth >= 1280) document.body.classList.add('panel-open');
    this.syncPanelButton();

    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
  }

  applyMotionPreference() {
    const m = this.reduceMotion ? 0.15 : 1;
    this.diwaliScene.setMotion(m);
    this.particleEngine.setMotion(m);
    this.diyaManager.setMotion(m);
    this.lanternManager.setMotion(m);
    this.controls.enableDamping = !this.reduceMotion;
  }

  // ------------------------------------------------------------------------
  setupIntro() {
    const enter = (withMusic) => {
      if (this.started) return;
      this.started = true;
      audio.ensureContext();
      document.body.classList.remove('is-intro');
      if (withMusic) audio.playRealTrack($('realTrackSelector').value);
      this.syncMusicUI();
      setTimeout(() => this.showToast('Shubh Deepavali! Tap a diya to begin.'), 900);
    };
    $('enterWithMusic').addEventListener('click', () => enter(true));
    $('enterQuiet').addEventListener('click', () => enter(false));
    $('enterWithMusic').focus({ preventScroll: true });
  }

  setupTopBar() {
    const selects = [$('realTrackSelector'), $('trackSelectPanel')];
    $('playRealMusicBtn').addEventListener('click', () => {
      audio.ensureContext();
      if (audio.bgAudio.paused) audio.playRealTrack(selects[0].value);
      else audio.stopRealTrack();
    });
    selects.forEach((sel) => sel.addEventListener('change', () => {
      selects.forEach((s) => { s.value = sel.value; });
      audio.playRealTrack(sel.value);
      this.showToast(`Now playing: ${sel.options[sel.selectedIndex].text}`);
    }));
    audio.bgAudio.addEventListener('play', () => this.syncMusicUI());
    audio.bgAudio.addEventListener('pause', () => this.syncMusicUI());
    audio.bgAudio.addEventListener('error', () => {
      this.syncMusicUI();
      this.showToast('That track could not be loaded.');
    });

    $('soundBtn').addEventListener('click', () => {
      audio.soundEnabled = !audio.soundEnabled;
      if (!audio.soundEnabled) audio.stopSparklerSound();
      else if (this.currentMode === 'sparkler') audio.startSparklerSound();
      const btn = $('soundBtn');
      btn.setAttribute('aria-pressed', String(audio.soundEnabled));
      btn.setAttribute('aria-label', audio.soundEnabled ? 'Sound effects on' : 'Sound effects off');
      $('soundIcon').setAttribute('href', audio.soundEnabled ? '#i-sound' : '#i-mute');
    });

    $('megaFinaleBtn').addEventListener('click', () => this.triggerGrandFinale());
    $('menuBtn').addEventListener('click', () => {
      document.body.classList.toggle('panel-open');
      this.syncPanelButton();
    });
  }

  syncMusicUI() {
    const playing = !audio.bgAudio.paused;
    $('musicIcon').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('playRealMusicBtn').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    document.querySelector('.music').classList.toggle('is-playing', playing);
    if (audio.currentTrack) {
      $('realTrackSelector').value = audio.currentTrack;
      $('trackSelectPanel').value = audio.currentTrack;
    }
  }

  syncPanelButton() {
    const open = document.body.classList.contains('panel-open');
    $('menuBtn').setAttribute('aria-expanded', String(open));
    $('menuIcon').setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  closePanelOnSmall() {
    if (window.innerWidth <= 760) {
      document.body.classList.remove('panel-open');
      this.syncPanelButton();
    }
  }

  setupPanel() {
    const camButtons = document.querySelectorAll('.cam-btn');
    camButtons.forEach((btn) => btn.addEventListener('click', () => {
      this.setView(btn.dataset.view);
      this.closePanelOnSmall();
    }));

    const chips = document.querySelectorAll('.atmo-chip');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.toggle('active', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      this.diwaliScene.setAtmosphere(chip.dataset.atmo);
    }));

    $('laserBtn').addEventListener('click', () => this.toggleLasers());
    $('streamViewBtn').addEventListener('click', () => this.toggleStreamMode());
    $('showUiBtn').addEventListener('click', () => this.toggleStreamMode());
    $('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
  }

  setView(view, instant = false) {
    const v = VIEWS[view] || VIEWS.orbit;
    // phones are tall and narrow: pull back so the courtyard still fits
    const pull = this.camera.aspect < 0.8 ? 1.08 : 1;
    this.targetCamPos.set(v.pos[0], v.pos[1], v.pos[2]);
    this.targetLookAt.set(v.look[0], v.look[1], v.look[2]);
    if (pull !== 1) {
      const dir = this.targetCamPos.clone().sub(this.targetLookAt).multiplyScalar(pull);
      this.targetCamPos.copy(this.targetLookAt).add(dir);
    }
    document.querySelectorAll('.cam-btn').forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (instant || this.reduceMotion) {
      this.camera.position.copy(this.targetCamPos);
      this.controls.target.copy(this.targetLookAt);
      this.isTransitioningCam = false;
    } else {
      this.isTransitioningCam = true;
    }
  }

  setupModes() {
    const tabs = document.querySelectorAll('.mode-tab');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-pressed', String(t === tab));
      });
      this.setMode(tab.dataset.mode);
    }));
  }

  setMode(mode) {
    this.currentMode = mode;
    Object.keys(MODE_HINTS).forEach((m) => { $(`panel-${m}`).hidden = m !== mode; });
    $('interactionHint').textContent = MODE_HINTS[mode];
    const sparkler = mode === 'sparkler';
    this.particleEngine.setSparklerActive(sparkler);
    document.body.classList.toggle('sparkler-cursor', sparkler);
    // dragging paints with the sparkler instead of turning the camera
    this.controls.enableRotate = !sparkler;
  }

  setupActions() {
    $('lightAllDiyasBtn').addEventListener('click', () => this.diyaManager.lightAll());
    $('resetDiyasBtn').addEventListener('click', () => {
      this.diyaManager.resetAll();
      this.allLitAnnounced = false;
    });
    $('spawnFloatingDiyaBtn').addEventListener('click', () => {
      this.diyaManager.createFloatingLotusDiya(-24 + Math.random() * 12, 18 + Math.random() * 10);
      audio.playDiyaChime();
      this.showToast('A lotus diya floats out onto the river.');
      this.setView('ghat');
    });
    $('clearTrailBtn').addEventListener('click', () => this.particleEngine.clearLightTrail());
    $('performAartiBtn').addEventListener('click', () => this.performAarti());
    $('soundShankhaBtn').addEventListener('click', () => audio.playShankha());
    $('barrageRocketsBtn').addEventListener('click', () => {
      for (let i = 0; i < 3; i++) setTimeout(() => this.particleEngine.launchRocket(), i * 380);
    });
    $('multiAnarBtn').addEventListener('click', () => {
      [[-6, -6], [0, -9], [6, -6]].forEach(([x, z], i) =>
        setTimeout(() => this.particleEngine.createAnarFountain(new THREE.Vector3(x, 0, z)), i * 300));
    });
    $('twinChakriBtn').addEventListener('click', () => {
      this.particleEngine.createChakriSpinner(new THREE.Vector3(-4, 0, 1));
      this.particleEngine.createChakriSpinner(new THREE.Vector3(4, 0, 1));
    });
    $('openWishModalBtn').addEventListener('click', () => this.openModal('wishModalOverlay'));

    document.querySelectorAll('.quick-wish-chip').forEach((chip) => chip.addEventListener('click', () => {
      $('wishInput').value = chip.dataset.text;
    }));
    $('releaseLanternBtn').addEventListener('click', () => {
      const wish = $('wishInput').value.trim() || 'May light always win over darkness.';
      const author = $('wishAuthor').value.trim() || 'A fellow celebrant';
      this.lanternManager.releaseLantern(wish, author);
      audio.playDiyaChime();
      this.closeModal();
      $('wishInput').value = '';
      this.showToast('Your lantern is rising. Tap it any time to read your wish.');
    });
    $('closePopupBtn').addEventListener('click', () => this.closeWishPopup());
  }

  performAarti() {
    if (this.diwaliScene.performMahaAarti()) {
      this.showToast('The aarti begins. The thali circles the rangoli.');
    }
  }

  // ------------------------------------------------------------------------
  // Modals
  // ------------------------------------------------------------------------
  setupModals() {
    $('openCinemaBtn').addEventListener('click', () => {
      this.openModal('cinemaModalOverlay');
      const video = $('realCinemaVideo');
      if (!video.getAttribute('src')) video.src = document.querySelector('.channel-pill.active').dataset.src;
      video.play().catch(() => {});
    });
    $('postcardBtn').addEventListener('click', async () => {
      this.closePanelOnSmall();
      await this.renderFestivePostcard(true);
      this.openModal('postcardModalOverlay');
    });

    [['closeCinemaModalBtn'], ['closeWishModalBtn'], ['closePostcardModalBtn']].forEach(([id]) =>
      $(id).addEventListener('click', () => this.closeModal()));
    document.querySelectorAll('.modal-overlay').forEach((ov) => ov.addEventListener('click', (e) => {
      if (e.target === ov) this.closeModal();
    }));

    const video = $('realCinemaVideo');
    const pills = document.querySelectorAll('.channel-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => {
          p.classList.toggle('active', p === pill);
          p.setAttribute('aria-pressed', String(p === pill));
        });
        video.src = pill.dataset.src;
        video.play().catch(() => {});
      });
    });

    ['postcardRecipient', 'postcardSender'].forEach((id) =>
      $(id).addEventListener('input', () => this.renderFestivePostcard(false)));
    $('downloadPostcardBtn').addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'Shubh_Deepavali_Postcard.png';
      link.href = $('postcardCanvas').toDataURL('image/png');
      link.click();
      this.showToast('Postcard saved. Share the light!');
    });
  }

  openModal(id) {
    this.closeModal();
    const el = $(id);
    this.lastFocus = document.activeElement;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    this.openModalEl = el;
    const first = el.querySelector('textarea, input, .modal-close');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  }

  closeModal() {
    const el = this.openModalEl;
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (el.id === 'cinemaModalOverlay') $('realCinemaVideo').pause();
    this.openModalEl = null;
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
  }

  openWishPopup(wish, author) {
    $('popupWishText').textContent = `“${wish}”`;
    $('popupWishAuthor').textContent = `— ${author}`;
    const pop = $('wishCardPopup');
    pop.classList.add('show');
    pop.setAttribute('aria-hidden', 'false');
    audio.playDiyaChime();
  }

  closeWishPopup() {
    const pop = $('wishCardPopup');
    pop.classList.remove('show');
    pop.setAttribute('aria-hidden', 'true');
  }

  // ------------------------------------------------------------------------
  // Pointer & keyboard
  // ------------------------------------------------------------------------
  setPointerFromEvent(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  setupPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => {
      this.pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (this.currentMode === 'sparkler') this.moveSparkler(e);
    });

    let pending = null;
    canvas.addEventListener('pointermove', (e) => {
      if (this.currentMode !== 'sparkler') return;
      if (e.pointerType !== 'mouse' && !this.pointerDown) return;
      pending = e;
      if (this.sparkFrame) return;
      this.sparkFrame = requestAnimationFrame(() => {
        this.sparkFrame = null;
        if (pending) this.moveSparkler(pending);
      });
    });

    const up = (e) => {
      const down = this.pointerDown;
      this.pointerDown = null;
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 8 && performance.now() - down.t < 600) this.handleSceneClick(e);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { this.pointerDown = null; });
  }

  moveSparkler(e) {
    this.setPointerFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // paint on a plane facing the camera, a few metres in front of the target
    const normal = this.camera.getWorldDirection(new THREE.Vector3()).negate();
    const anchor = this.controls.target.clone().addScaledVector(normal, 2);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, anchor);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, hit)) {
      hit.y = Math.max(0.3, hit.y);
      this.particleEngine.updateSparklerTip(hit);
    }
  }

  groundHit() {
    const hit = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit);
    if (!ok || Math.abs(hit.x) > 17 || hit.z < -16.5 || hit.z > 8.8) return null;
    return hit;
  }

  handleSceneClick(e) {
    this.setPointerFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const lanternHit = this.raycaster.intersectObjects(this.lanternManager.lanternMeshesForRaycast, false)[0];
    if (lanternHit) {
      const l = lanternHit.object.userData.lanternParent;
      this.openWishPopup(l.userData.wish, l.userData.author);
      return;
    }

    const sweetHit = this.raycaster.intersectObjects(this.diwaliScene.sweetMeshes, false)[0];
    if (sweetHit) {
      audio.playDiyaChime();
      this.showToast(`Mmm, ${sweetHit.object.userData.name}. Happy Diwali!`);
      return;
    }

    switch (this.currentMode) {
      case 'diya': {
        const hit = this.raycaster.intersectObjects(this.diyaManager.diyaMeshesForRaycast, false)[0];
        if (hit) {
          const diya = hit.object.userData.diyaParent;
          if (diya && !diya.userData.isLit) this.diyaManager.igniteDiya(diya, true);
        }
        break;
      }
      case 'rocket': {
        const hit = new THREE.Vector3();
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 12); // z = -12, behind the courtyard
        if (this.raycaster.ray.intersectPlane(plane, hit)) {
          hit.x = THREE.MathUtils.clamp(hit.x, -30, 30);
          this.particleEngine.launchRocket(hit);
        } else {
          this.particleEngine.launchRocket();
        }
        break;
      }
      case 'anar': {
        const g = this.groundHit();
        if (g) this.particleEngine.createAnarFountain(g);
        else this.showToast('Place the anar on the courtyard floor.');
        break;
      }
      case 'chakri': {
        const g = this.groundHit();
        if (g) this.particleEngine.createChakriSpinner(g);
        else this.showToast('Place the chakri on the courtyard floor.');
        break;
      }
      case 'lantern': {
        const g = this.groundHit();
        this.lanternManager.releaseLantern(null, null, g ? new THREE.Vector3(g.x, 1.2, g.z) : null);
        break;
      }
      case 'aarti':
        this.performAarti();
        break;
      default:
        break;
    }
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.openModalEl) this.closeModal();
        else if ($('wishCardPopup').classList.contains('show')) this.closeWishPopup();
        else if (document.body.classList.contains('clean-stream-view')) this.toggleStreamMode();
        else if (document.body.classList.contains('panel-open')) {
          document.body.classList.remove('panel-open');
          this.syncPanelButton();
        }
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!this.started || this.openModalEl) return;
      const t = e.target;
      if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
      // let Space/Enter press the focused button instead of firing a hotkey
      if ((e.code === 'Space' || e.code === 'Enter') && t.closest && t.closest('button, a')) return;

      switch (e.code) {
        case 'KeyH': this.toggleStreamMode(); break;
        case 'Space': e.preventDefault(); this.triggerGrandFinale(); break;
        case 'KeyR': this.particleEngine.launchRocket(); break;
        case 'KeyA': this.performAarti(); break;
        case 'KeyW': this.lanternManager.releaseLantern(null, null); break;
        case 'KeyL': this.toggleLasers(); break;
        case 'KeyF': this.toggleFullscreen(); break;
        default: break;
      }
    });
  }

  toggleStreamMode() {
    const on = document.body.classList.toggle('clean-stream-view');
    this.closePanelOnSmall();
    if (on) this.showToast('Controls hidden. Press H or Esc to bring them back.');
  }

  toggleLasers() {
    const on = this.diwaliScene.toggleLaserShow();
    $('laserBtn').setAttribute('aria-pressed', String(on));
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  // ------------------------------------------------------------------------
  // Postcard: the live view, cropped (not stretched) into a 3:2 card
  // ------------------------------------------------------------------------
  async renderFestivePostcard(capture) {
    const canvas = $('postcardCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    if (capture || !this.snapshot) {
      // render now and copy before the browser clears the drawing buffer
      this.diwaliScene.render();
      const src = this.renderer.domElement;
      const snap = document.createElement('canvas');
      snap.width = W; snap.height = H;
      const s = Math.max(W / src.width, H / src.height);
      const sw = W / s, sh = H / s;
      snap.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H);
      this.snapshot = snap;
    }
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    ctx.drawImage(this.snapshot, 0, 0);

    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(10,5,2,0.55)');
    shade.addColorStop(0.35, 'rgba(10,5,2,0.05)');
    shade.addColorStop(0.62, 'rgba(10,5,2,0.15)');
    shade.addColorStop(1, 'rgba(10,5,2,0.88)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    // thin brass frame
    ctx.strokeStyle = 'rgba(255,214,140,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = 'rgba(255,214,140,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(38, 38, W - 76, H - 76);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5b54a';
    ctx.font = '34px "Tiro Devanagari Hindi", serif';
    ctx.fillText('शुभ दीपावली', W / 2, 110);

    const recipient = $('postcardRecipient').value.trim() || 'Dear loved ones';
    const sender = $('postcardSender').value.trim() || 'With love and blessings';

    ctx.fillStyle = 'rgba(251,239,217,0.85)';
    ctx.font = 'italic 500 34px "Cormorant Garamond", serif';
    ctx.fillText(`To ${recipient},`, W / 2, H - 230);

    const grad = ctx.createLinearGradient(0, H - 200, 0, H - 120);
    grad.addColorStop(0, '#fff3da');
    grad.addColorStop(1, '#f2b65e');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255,150,50,0.55)';
    ctx.shadowBlur = 28;
    ctx.font = '600 96px "Cormorant Garamond", serif';
    ctx.fillText('Happy Diwali', W / 2, H - 140);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(251,239,217,0.8)';
    ctx.font = '500 22px "Manrope", sans-serif';
    ctx.fillText('May the lamps light your home with health, joy and prosperity.', W / 2, H - 95);
    ctx.fillStyle = '#ffd88a';
    ctx.font = 'italic 600 30px "Cormorant Garamond", serif';
    ctx.fillText(`— ${sender}`, W / 2, H - 56);
  }

  updateDiyaCounter() {
    if (!this.diyaManager) return;
    const lit = this.diyaManager.getLitCount();
    const total = this.diyaManager.getTotalCount();
    $('diyaCounterDisplay').textContent = `${lit} / ${total}`;
    if (lit === total && !this.allLitAnnounced && this.started) {
      this.allLitAnnounced = true;
      this.showToast('Every diya is lit. The courtyard glows!');
    }
  }

  triggerGrandFinale() {
    if (this.finaleRunning) return;
    this.finaleRunning = true;
    setTimeout(() => { this.finaleRunning = false; }, 6000);
    this.showToast('Grand finale!');
    audio.playShankha();
    this.diwaliScene.triggerLaserShow(9000);
    this.setView('sky');
    this.diyaManager.lightAll();

    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        const p = new THREE.Vector3((Math.random() - 0.5) * 30, 0, -14 + (Math.random() - 0.5) * 12);
        this.particleEngine.launchRocket(p, { silent: i % 2 === 1 });
      }, i * 260);
    }
    setTimeout(() => {
      this.particleEngine.createAnarFountain(new THREE.Vector3(-7, 0, -8));
      this.particleEngine.createAnarFountain(new THREE.Vector3(7, 0, -8));
    }, 900);
    for (let j = 0; j < 5; j++) {
      setTimeout(() => this.lanternManager.releaseLantern('Peace, light and prosperity to all.', 'The grand finale'), 1500 + j * 450);
    }
  }

  showToast(message) {
    const toast = $('toastNotice');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ------------------------------------------------------------------------
  animate(timestamp) {
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), 0.05);
    const time = this.timer.getElapsed();

    if (this.isTransitioningCam) {
      const k = 1 - Math.exp(-delta * 2.6);
      this.camera.position.lerp(this.targetCamPos, k);
      this.controls.target.lerp(this.targetLookAt, k);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.05) this.isTransitioningCam = false;
    }
    this.controls.update();

    // distant neighbourhood fireworks keep the night alive (silent, far away)
    if (this.started && !this.reduceMotion && time > this.nextAmbient && !document.hidden) {
      this.nextAmbient = time + 4 + Math.random() * 6;
      this.particleEngine.launchRocket(new THREE.Vector3((Math.random() - 0.5) * 140, 0, -70 - Math.random() * 40), { silent: true, far: true });
    }

    this.diwaliScene.update(delta, time);
    this.particleEngine.update(delta);
    this.diyaManager.update(delta, time);
    this.lanternManager.update(delta, time);
    this.diwaliScene.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.diwaliApp = new DiwaliApp();
});
