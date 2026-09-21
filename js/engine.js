/* ==========================================================================
   engine.js — Engine layer
   Contains:  EcoDash.Audio, EcoDash.Input, EcoDash.Particle, EcoDash.ParticleSystem
   ========================================================================== */
window.EcoDash = window.EcoDash || {};

/* ==========================================================================
   Audio — procedural Web Audio synthesis (no external files)
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var ctx = null;
  var master = null, musicBus = null, sfxBus = null;

  var muted = false;
  var musicPlaying = false;
  var musicTimer = null;
  var nextNoteTime = 0;
  var step = 0;

  var MELODY = [0, 3, 5, 7, 10, 7, 5, 3, 0, 5, 7, 12, 10, 7, 5, 3];
  var BASS   = [0, 0, -5, -5, -7, -7, -5, -5];
  var ROOT_HZ = 196.00;

  function freqOf(semitones) { return ROOT_HZ * Math.pow(2, semitones / 12); }

  function ensureContext() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = EcoDash.Config.audio.musicVolume;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = EcoDash.Config.audio.sfxVolume;
    sfxBus.connect(master);

    return true;
  }

  function tone(opts) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.2;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + dur);
    }

    var peak = opts.gain === undefined ? 0.28 : opts.gain;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(opts.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
  }

  function noiseBurst(opts) {
    if (!ctx) return;
    var dur = opts.dur || 0.45;
    var frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    for (var i = 0; i < frames; i++) {
      var decay = 1 - (i / frames);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    var src = ctx.createBufferSource();
    src.buffer = buffer;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.filterFrom || 1600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(opts.filterTo || 180, ctx.currentTime + dur);

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain === undefined ? 0.4 : opts.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    src.start();
  }

  var SFX = {
    horn: function () {
      tone({ freq: 392.00, dur: 0.30, type: 'sawtooth', gain: 0.20, attack: 0.02 });
      tone({ freq: 523.25, dur: 0.34, type: 'square',   gain: 0.11, attack: 0.02, delay: 0.055 });
      tone({ freq: 659.25, dur: 0.38, type: 'triangle', gain: 0.14, attack: 0.02, delay: 0.11 });
    },
    collect: function () {
      tone({ freq: 880, dur: 0.10, type: 'triangle', gain: 0.22 });
      tone({ freq: 1318.5, dur: 0.14, type: 'triangle', gain: 0.16, delay: 0.06 });
    },
    delivery: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ freq: f, dur: 0.24, type: 'triangle', gain: 0.20, delay: i * 0.075 });
      });
    },
    crash: function () {
      noiseBurst({ dur: 0.6, gain: 0.5, filterFrom: 2200, filterTo: 120 });
      tone({ freq: 180, freqEnd: 42, dur: 0.55, type: 'sawtooth', gain: 0.3 });
    },
    warn: function () {
      tone({ freq: 660, dur: 0.16, type: 'square', gain: 0.14 });
      tone({ freq: 495, dur: 0.20, type: 'square', gain: 0.14, delay: 0.19 });
    },
    lowBattery: function () {
      tone({ freq: 1180, dur: 0.09, type: 'square', gain: 0.10 });
    },
    charge: function () {
      tone({ freq: 320, freqEnd: 900, dur: 0.5, type: 'sine', gain: 0.14 });
    },
    click: function () {
      tone({ freq: 720, dur: 0.06, type: 'square', gain: 0.12 });
    }
  };

  function scheduleNote(semitone, time, dur, gain, type) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqOf(semitone), time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function scheduler() {
    if (!ctx || !musicPlaying) return;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      var melody = MELODY[step % MELODY.length];
      var bass = BASS[Math.floor(step / 2) % BASS.length];

      scheduleNote(melody + 12, nextNoteTime, 0.42, 0.075, 'triangle');
      if (step % 4 === 0) {
        scheduleNote(melody + 24, nextNoteTime + 0.02, 0.30, 0.030, 'sine');
      }
      if (step % 2 === 0) {
        scheduleNote(bass, nextNoteTime, 0.55, 0.085, 'sine');
      }

      nextNoteTime += 0.26;
      step = (step + 1) % 64;
    }
  }

  EcoDash.Audio = {
    unlock: function () {
      if (!ensureContext()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },

    play: function (name) {
      if (muted) return;
      if (!ensureContext()) return;
      if (ctx.state === 'suspended') ctx.resume();
      var fn = SFX[name];
      if (fn) fn();
    },

    startMusic: function () {
      if (!ensureContext()) return;
      if (musicPlaying) return;
      musicPlaying = true;
      nextNoteTime = ctx.currentTime + 0.1;
      step = 0;
      clearInterval(musicTimer);
      musicTimer = setInterval(scheduler, 60);
    },

    stopMusic: function () {
      musicPlaying = false;
      clearInterval(musicTimer);
      musicTimer = null;
    },

    setMuted: function (value) {
      muted = !!value;
      if (master && ctx) {
        master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
      }
      EcoDash.Storage.setPref('muted', muted);
    },

    isMuted: function () { return muted; },

    toggleMute: function () {
      EcoDash.Audio.setMuted(!muted);
      return muted;
    }
  };
})(window.EcoDash);

/* ==========================================================================
   Input — unified keyboard + pointer/touch
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var BLOCK_DEFAULT = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  var down    = Object.create(null);
  var pressed = Object.create(null);
  var pointerHeld = false;
  var attached = false;

  function onKeyDown(e) {
    if (BLOCK_DEFAULT.indexOf(e.code) !== -1) e.preventDefault();
    if (e.repeat) return;
    if (!down[e.code]) pressed[e.code] = true;
    down[e.code] = true;
    EcoDash.Audio.unlock();
  }

  function onKeyUp(e) { down[e.code] = false; }

  function clearAll() {
    for (var k in down) down[k] = false;
    pointerHeld = false;
  }

  EcoDash.Input = {
    attach: function (canvas) {
      if (attached) return;
      attached = true;

      window.addEventListener('keydown', onKeyDown, { passive: false });
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearAll);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearAll();
      });

      if (canvas) {
        canvas.addEventListener('pointerdown', function (e) {
          if (e.target !== canvas) return;
          pointerHeld = true;
          pressed['Pointer'] = true;
          EcoDash.Audio.unlock();
          e.preventDefault();
        });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      }

      window.addEventListener('pointerup', function () { pointerHeld = false; });
      window.addEventListener('pointercancel', function () { pointerHeld = false; });
    },

    get thrust() {
      return !!(down['ArrowUp'] || down['KeyW'] || down['Space'] || pointerHeld);
    },
    get descend() {
      return !!(down['ArrowDown'] || down['KeyS']);
    },

    pressed: function (code) { return !!pressed[code]; },

    anyPressed: function (codes) {
      for (var i = 0; i < codes.length; i++) {
        if (pressed[codes[i]]) return true;
      }
      return false;
    },

    endFrame: function () {
      for (var k in pressed) delete pressed[k];
    },

    clear: clearAll
  };
})(window.EcoDash);

/* ==========================================================================
   Particles — pooled particle system
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var TAU = U.TAU;

  function Particle() {
    this.active = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.life = 0; this.maxLife = 1;
    this.size = 3; this.grow = 0;
    this.gravity = 0;
    this.drag = 0;
    this.color = '255,255,255';
    this.alpha = 1;
    this.shape = 'circle';
    this.rot = 0; this.spin = 0;
  }

  Particle.prototype.reset = function (o) {
    this.active = true;
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.maxLife = o.life || 1;
    this.life = this.maxLife;
    this.size = o.size || 3;
    this.grow = o.grow || 0;
    this.gravity = o.gravity || 0;
    this.drag = o.drag || 0;
    this.color = o.color || '255,255,255';
    this.alpha = o.alpha === undefined ? 1 : o.alpha;
    this.shape = o.shape || 'circle';
    this.rot = o.rot || 0;
    this.spin = o.spin || 0;
  };

  Particle.prototype.update = function (dt) {
    this.life -= dt;
    if (this.life <= 0) { this.active = false; return; }

    this.vy += this.gravity * dt;

    if (this.drag > 0) {
      var damp = Math.max(0, 1 - this.drag * dt);
      this.vx *= damp;
      this.vy *= damp;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
    this.size += this.grow * dt;
  };

  Particle.prototype.draw = function (ctx) {
    var t = this.life / this.maxLife;
    var a = this.alpha * (t < 0.35 ? t / 0.35 : 1);
    if (a <= 0.01 || this.size <= 0.1) return;

    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(' + this.color + ',1)';

    if (this.shape === 'rect') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillRect(-this.size, -this.size * 0.45, this.size * 2, this.size * 0.9);
      ctx.restore();
    } else if (this.shape === 'streak') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillRect(-this.size * 2, -0.9, this.size * 4, 1.8);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, TAU);
      ctx.fill();
    }
  };

  function ParticleSystem() {
    this.pool = [];
    this.activeCount = 0;
    this.max = 520;
  }

  ParticleSystem.prototype._obtain = function () {
    for (var i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    if (this.pool.length >= this.max) return null;
    var p = new Particle();
    this.pool.push(p);
    return p;
  };

  ParticleSystem.prototype.spawn = function (opts) {
    var p = this._obtain();
    if (!p) return null;
    p.reset(opts);
    return p;
  };

  ParticleSystem.prototype.burst = function (x, y, count, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      var ang = opts.angle !== undefined
        ? opts.angle + U.rand(-(opts.spread || 0.6), (opts.spread || 0.6))
        : U.rand(0, TAU);
      var speed = U.rand(opts.speedMin || 40, opts.speedMax || 180);

      this.spawn({
        x: x + U.rand(-(opts.jitter || 0), (opts.jitter || 0)),
        y: y + U.rand(-(opts.jitter || 0), (opts.jitter || 0)),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: U.rand(opts.lifeMin || 0.4, opts.lifeMax || 1.1),
        size: U.rand(opts.sizeMin || 1.5, opts.sizeMax || 4),
        grow: opts.grow || 0,
        gravity: opts.gravity || 0,
        drag: opts.drag === undefined ? 1.1 : opts.drag,
        color: opts.color || '255,255,255',
        shape: opts.shape || 'circle',
        spin: U.rand(-6, 6)
      });
    }
  };

  ParticleSystem.prototype.update = function (dt) {
    var n = 0;
    for (var i = 0; i < this.pool.length; i++) {
      var p = this.pool[i];
      if (!p.active) continue;
      p.update(dt);
      if (p.active) n++;
    }
    this.activeCount = n;
  };

  ParticleSystem.prototype.draw = function (ctx) {
    ctx.save();
    for (var i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.pool[i].draw(ctx);
    }
    ctx.restore();
  };

  ParticleSystem.prototype.clear = function () {
    for (var i = 0; i < this.pool.length; i++) this.pool[i].active = false;
    this.activeCount = 0;
  };

  EcoDash.Particle = Particle;
  EcoDash.ParticleSystem = ParticleSystem;
})(window.EcoDash);