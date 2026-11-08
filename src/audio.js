// ==========================================================================
// DIWALI AUDIO ENGINE: REAL AUDIOS & RESPONSIVE CRACKER SOUND EFFECTS
// ==========================================================================

class DiwaliAudioEngine {
  constructor() {
    this.soundEnabled = true;
    this.currentTrack = null;
    this.bgAudio = new Audio();
    this.bgAudio.loop = true;
    this.bgAudio.volume = 0.75;

    // Real audio track library
    this.tracks = {
      aarti: '/audio/real_aarti.ogg',
      flute: '/audio/real_flute.ogg',
      sitar: '/audio/real_sitar.ogg'
    };

    // Web Audio Context for crisp instant responsive SFX
    this.ctx = null;
    this.sfxGain = null;
    this.sparklerNode = null;
    this.sparklerGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.sfxGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- PLAY REAL AUTHENTIC AUDIOS ---
  playRealTrack(trackKey) {
    if (!this.soundEnabled) return;
    const src = this.tracks[trackKey] || this.tracks.aarti;
    this.bgAudio.src = src;
    this.bgAudio.play().catch(e => console.log('Autoplay policy caught', e));
    this.currentTrack = trackKey;
  }

  stopRealTrack() {
    this.bgAudio.pause();
    this.currentTrack = null;
  }

  playRealAarti() {
    this.playRealTrack('aarti');
  }

  playRealFlute() {
    this.playRealTrack('flute');
  }

  playRealSitar() {
    this.playRealTrack('sitar');
  }

  toggleMusic() {
    if (this.bgAudio.paused) {
      this.playRealTrack(this.currentTrack || 'aarti');
      return true;
    } else {
      this.stopRealTrack();
      return false;
    }
  }

  setVolume(val) {
    this.bgAudio.volume = Math.max(0, Math.min(1, val));
  }

  // --- RESPONSIVE SOUND EFFECTS (ROCKET, BURST, ANAR, CHAKRI, CHIME) ---
  playRocketLaunch() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  playFireworkBurst() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.6);

    const bufferSize = this.ctx.sampleRate * 0.7;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.7);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.7);
  }

  playAnarFountain() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const durSec = 3.8;

    const bufferSize = this.ctx.sampleRate * durSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bqFilter = this.ctx.createBiquadFilter();
    bqFilter.type = 'bandpass';
    bqFilter.frequency.setValueAtTime(1800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    noise.connect(bqFilter);
    bqFilter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + durSec);
  }

  playChakriSpin() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const durSec = 3.5;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(360, now + 0.8);
    osc.frequency.exponentialRampToValueAtTime(90, now + durSec);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + durSec);
  }

  playDiyaChime() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    [528, 1056, 1584].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  startSparklerSound() {
    if (!this.soundEnabled || this.sparklerNode) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    this.sparklerNode = this.ctx.createBufferSource();
    this.sparklerNode.buffer = buffer;
    this.sparklerNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2600, now);

    this.sparklerGain = this.ctx.createGain();
    this.sparklerGain.gain.setValueAtTime(0.01, now);
    this.sparklerGain.gain.linearRampToValueAtTime(0.18, now + 0.2);

    this.sparklerNode.connect(filter);
    filter.connect(this.sparklerGain);
    this.sparklerGain.connect(this.sfxGain);
    this.sparklerNode.start(now);
  }

  stopSparklerSound() {
    if (!this.sparklerNode || !this.ctx) return;
    try {
      this.sparklerGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      setTimeout(() => {
        if (this.sparklerNode) {
          this.sparklerNode.stop();
          this.sparklerNode.disconnect();
          this.sparklerNode = null;
        }
      }, 120);
    } catch (e) {
      this.sparklerNode = null;
    }
  }

  playShankha() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const dur = 3.2;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(329.63, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(196, now + dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) {
      this.bgAudio.pause();
    }
    return this.soundEnabled;
  }
}

export const audio = new DiwaliAudioEngine();
