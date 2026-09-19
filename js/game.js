/* ==========================================================================
   game.js — Application layer (DEBUGGED)
   Contains:  EcoDash.HUD, EcoDash.Game, application bootstrap
   ========================================================================== */
window.EcoDash = window.EcoDash || {};

/* ==========================================================================
   HUD — canvas-rendered heads-up display
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var C = EcoDash.Config;

  /* --------------------------------------------------------- primitives */
  function panel(ctx, x, y, w, h) {
    ctx.save();
    U.roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = 'rgba(6, 16, 29, 0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.font = (weight || 600) + ' ' + size + 'px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /* -------------------------------------------------------------- HUD --- */
  var HUD = {

    draw: function (ctx, game, w, h) {
      var s = U.clamp(w / 1280, 0.72, 1.35);
      ctx.save();
      ctx.textBaseline = 'alphabetic';

      /* -------------------------------------------------- TOP LEFT --- */
      var px = 16 * s, py = 16 * s;
      var pw = 250 * s, ph = 104 * s;

      panel(ctx, px, py, pw, ph);

      label(ctx, 'SCORE', px + 14 * s, py + 22 * s, 11 * s, '#9fb3c8', 'left', 700);
      label(ctx, U.formatNumber(game.score), px + 14 * s, py + 50 * s, 26 * s, '#ffd166', 'left', 700);

      label(ctx, 'DISTANCE', px + 14 * s, py + 70 * s, 10 * s, '#9fb3c8', 'left', 700);
      label(ctx, U.formatDistance(game.distance), px + 14 * s, py + 90 * s, 15 * s, '#eaf2fb', 'left', 600);

      label(ctx, 'DELIVERIES', px + pw - 14 * s, py + 70 * s, 10 * s, '#9fb3c8', 'right', 700);
      label(ctx, String(game.deliveries), px + pw - 14 * s, py + 90 * s, 15 * s, '#66e08a', 'right', 700);

      /* ------------------------------------------------- TOP RIGHT --- */
      var rw = 170 * s;
      var rx = w - rw - 16 * s;
      panel(ctx, rx, py, rw, 62 * s);

      label(ctx, 'BEST SCORE', rx + rw - 14 * s, py + 22 * s, 10 * s, '#9fb3c8', 'right', 700);
      label(ctx, U.formatNumber(game.bestScore), rx + rw - 14 * s, py + 48 * s, 20 * s, '#66e08a', 'right', 700);

      label(ctx, 'CARGO', rx + 14 * s, py + 22 * s, 10 * s, '#9fb3c8', 'left', 700);
      label(ctx, String(game.cargo), rx + 14 * s, py + 48 * s, 20 * s, '#ffd166', 'left', 700);

      /* ----------------------------------------------- TOP CENTRE --- */
      HUD._drawWeatherChip(ctx, game, w / 2, py, s);
      HUD._drawLoadSheddingBanner(ctx, game, w / 2, py + 52 * s, s);

      /* ---------------------------------------------- BOTTOM LEFT --- */
      HUD._drawBattery(ctx, game, px, h - 78 * s, 300 * s, s);

      /* --------------------------------------------- BOTTOM RIGHT --- */
      HUD._drawEfficiency(ctx, game, w - 16 * s, h - 78 * s, s);

      /* -------------------------------------------- WIND INDICATOR --- */
      HUD._drawWind(ctx, game, w / 2, h - 46 * s, s);

      ctx.restore();
    },

    /* ------------------------------------------------------ WEATHER -- */
    _drawWeatherChip: function (ctx, game, cx, y, s) {
      var weather = game.weather;
      var wWidth = 210 * s;
      var wHeight = 38 * s;

      panel(ctx, cx - wWidth / 2, y, wWidth, wHeight);

      var icon = '☀';
      var color = '#ffd166';
      if (weather.type === 'rain')      { icon = '🌧'; color = '#8ec7ff'; }
      else if (weather.type === 'dust') { icon = '🌪'; color = '#e0b070'; }
      else if (weather.type === 'wind') { icon = '💨'; color = '#cfe9ff'; }

      ctx.font = (18 * s) + 'px "Segoe UI Emoji", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(icon, cx - wWidth / 2 + 12 * s, y + wHeight / 2);

      ctx.font = '700 ' + (12.5 * s) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#eaf2fb';
      ctx.fillText(weather.label.toUpperCase(), cx - wWidth / 2 + 40 * s, y + wHeight / 2);

      ctx.textBaseline = 'alphabetic';

      /* Intensity meter */
      var meterW = 46 * s;
      var mx = cx + wWidth / 2 - meterW - 12 * s;
      var my = y + wHeight / 2 - 3 * s;

      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      U.roundRect(ctx, mx, my, meterW, 6 * s, 3 * s);
      ctx.fill();

      ctx.fillStyle = color;
      U.roundRect(ctx, mx, my, meterW * U.clamp01(weather.intensity), 6 * s, 3 * s);
      ctx.fill();
    },

    /* --------------------------------------------- LOAD-SHEDDING ----- */
    _drawLoadSheddingBanner: function (ctx, game, cx, y, s) {
      if (!game.loadShedding.active) return;

      var bw = 250 * s;
      var bh = 32 * s;
      var pulse = 0.55 + 0.45 * Math.sin(game.elapsed * 6);

      ctx.save();
      U.roundRect(ctx, cx - bw / 2, y, bw, bh, 8);
      ctx.fillStyle = 'rgba(120, 16, 16, ' + (0.55 + pulse * 0.22).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 90, 77, ' + (0.55 + pulse * 0.4).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      ctx.font = '700 ' + (12 * s) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd7d3';
      ctx.fillText('⚠ LOAD-SHEDDING — STAGE ' + game.loadShedding.stage + ' — GRID OFFLINE',
                   cx, y + bh / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    },

    /* ------------------------------------------------------ BATTERY -- */
    _drawBattery: function (ctx, game, x, y, w, s) {
      var h = 22 * s;
      var battery = game.drone ? game.drone.battery : 0;
      var ratio = battery / C.player.batteryMax;

      panel(ctx, x, y - 24 * s, w + 24 * s, 58 * s);

      label(ctx, 'SOLAR RESERVE', x + 12 * s, y - 6 * s, 10 * s, '#9fb3c8', 'left', 700);

      U.roundRect(ctx, x + 12 * s, y, w, h, 6 * s);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fill();

      var color;
      if (ratio > 0.55)      color = '#2fa84f';
      else if (ratio > 0.25) color = '#f2b134';
      else                   color = '#ff5a4d';

      var fillW = Math.max(0, (w - 4 * s) * ratio);

      if (ratio <= 0.25) {
        var pulse = 0.6 + 0.4 * Math.sin(game.elapsed * 10);
        ctx.save();
        ctx.globalAlpha = pulse;
        U.roundRect(ctx, x + 2 * s, y + 2 * s, fillW, h - 4 * s, 5 * s);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      } else {
        U.roundRect(ctx, x + 2 * s, y + 2 * s, fillW, h - 4 * s, 5 * s);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (game.drone && game.drone.inSolar && !game.loadShedding.active) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(game.elapsed * 8);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        U.roundRect(ctx, x + 12 * s, y, w, h, 6 * s);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 12 * s + w + 3 * s, y + h * 0.3, 4 * s, h * 0.4);

      ctx.font = '700 ' + (13 * s) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#eaf2fb';
      ctx.fillText(Math.round(battery) + '%', x + 12 * s + w - 8 * s, y + h * 0.72);
      ctx.textAlign = 'left';
    },

    /* --------------------------------------------------- EFFICIENCY -- */
    _drawEfficiency: function (ctx, game, rightX, y, s) {
      var w = 200 * s;
      var x = rightX - w;
      var h = 58 * s;

      panel(ctx, x, y - 24 * s, w, h);

      label(ctx, 'ENERGY EFFICIENCY', x + w - 12 * s, y - 6 * s, 10 * s, '#9fb3c8', 'right', 700);

      var eff = game.efficiency();
      label(ctx, eff.toFixed(1) + ' m/%', x + w - 12 * s, y + 22 * s, 20 * s, '#66e08a', 'right', 700);

      label(ctx, 'FLIGHT TIME', x + 12 * s, y - 6 * s, 10 * s, '#9fb3c8', 'left', 700);
      label(ctx, U.formatTime(game.elapsed), x + 12 * s, y + 22 * s, 20 * s, '#eaf2fb', 'left', 700);
    },

    /* -------------------------------------------------------- WIND --- */
    _drawWind: function (ctx, game, cx, y, s) {
      var wind = game.weather.windY;
      if (Math.abs(wind) < 6) return;

      var strength = U.clamp01(Math.abs(wind) / C.weather.windForce);
      var dir = wind > 0 ? 1 : -1;
      var len = 20 + strength * 30 * s;

      ctx.save();
      ctx.globalAlpha = 0.35 + strength * 0.55;
      ctx.strokeStyle = '#cfe9ff';
      ctx.lineWidth = 2.2 * s;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(cx, y - dir * len * 0.5);
      ctx.lineTo(cx, y + dir * len * 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 6 * s, y + dir * len * 0.5 - dir * 8 * s);
      ctx.lineTo(cx, y + dir * len * 0.5);
      ctx.lineTo(cx + 6 * s, y + dir * len * 0.5 - dir * 8 * s);
      ctx.stroke();

      ctx.restore();

      ctx.font = '700 ' + (10 * s) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(207, 233, 255, 0.8)';
      ctx.fillText('CROSSWIND ' + Math.round(strength * 100) + '%',
                   cx, y + dir * (len * 0.5 + 18 * s));
      ctx.textAlign = 'left';
    },

    /* ---------------------------------------------- GAME OVER PANEL -- */
    renderGameOver: function (game, container) {
      var e = game.lastEntry || {};
      var best = game.bestScore;

      var rows = [
        { k: 'Score',      v: U.formatNumber(e.score || 0), best: (e.score || 0) >= best && best > 0 },
        { k: 'Distance',   v: U.formatDistance(e.distance || 0) },
        { k: 'Cargo Pods', v: String(e.cargo || 0) },
        { k: 'Deliveries', v: String(e.deliveries || 0) },
        { k: 'Efficiency', v: (e.efficiency || 0).toFixed(1) + ' m/%' },
        { k: 'Best Score', v: U.formatNumber(best), best: true }
      ];

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        html += '<div class="stat' + (rows[i].best ? ' best' : '') + '">' +
                  '<span class="k">' + rows[i].k + '</span>' +
                  '<span class="v">' + rows[i].v + '</span>' +
                '</div>';
      }
      container.innerHTML = html;
    }
  };

  EcoDash.HUD = HUD;
})(window.EcoDash);

/* ==========================================================================
   Game — state machine, spawning, physics, rendering
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var C = EcoDash.Config;

  var REASON_TEXT = {
    crash:   'Your drone struck an obstacle. The cargo was lost.',
    ground:  'Ground impact — the drone went down before completing the route.',
    battery: 'Battery depleted. The solar reserve ran dry mid-flight.'
  };

  /* ====================================================================== */
  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.groundY = 0;

    this.state = 'menu';
    this.onStateChange = null;
    this.onMuteChange = null;

    this.input   = EcoDash.Input;
    this.audio   = EcoDash.Audio;
    this.storage = EcoDash.Storage;

    this.background = new EcoDash.Background();
    this.weather    = new EcoDash.Weather();
    this.particles  = new EcoDash.ParticleSystem();

    this.entities = [];
    this.drone = null;

    /* Load and restore persistent state. */
    this.scores = this.storage.getScores();
    this.bestScore = this.scores.length ? this.scores[0].score : 0;
    this.lastEntry = null;

    this.audio.setMuted(this.storage.getPref('muted', false));

    /* Loop bookkeeping. */
    this._rafId = 0;
    this._lastTime = 0;
    this._boundLoop = this.loop.bind(this);

    this.resize();
    this.resetRun();
  }

  /* ======================================================================
     LIFECYCLE
     ====================================================================== */

  Game.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width  = Math.max(320, Math.floor(rect.width  || window.innerWidth));
    this.height = Math.max(240, Math.floor(rect.height || window.innerHeight));

    this.canvas.width  = Math.floor(this.width  * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.groundY = Math.floor(this.height * C.world.groundRatio);

    this.background.resize(this.width, this.height);
    this.weather.resize(this.width, this.height);

    if (this.drone) this.drone.x = this.playerX();
  };

  Game.prototype.playerX = function () {
    return Math.round(U.clamp(this.width * 0.24, 120, 340));
  };

  Game.prototype.resetRun = function () {
    this.entities.length = 0;
    this.particles.clear();

    this.drone = new EcoDash.Drone(this.playerX(), this.height * 0.40);

    this.worldSpeed = C.world.scrollSpeedStart;
    this.distance = 0;
    this.score = 0;
    this.cargo = 0;
    this.deliveries = 0;
    this.cargoSinceDelivery = 0;
    this.elapsed = 0;

    this.spawnTimer = C.spawn.firstDelay;
    this.solarCooldown = 8;

    this.loadShedding = {
      active: false,
      stage: 0,
      timer: U.rand(C.loadShedding.firstDelayMin, C.loadShedding.firstDelayMax)
    };

    this.shake = 0;
    this.overCooldown = 0;
    this.gameOverReason = '';

    this.weather.reset(this.width, this.height);
    this.background.reset();
  };

  Game.prototype.startMission = function () {
    this.resetRun();
    this.setState('playing');

    this.audio.unlock();
    this.audio.play('click');
    this.audio.startMusic();
  };

  Game.prototype.restart = function () { this.startMission(); };

  Game.prototype.pause = function () {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.audio.stopMusic();
  };

  Game.prototype.resume = function () {
    if (this.state !== 'paused') return;
    this.setState('playing');
    this.audio.unlock();
    this.audio.startMusic();
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  };

  Game.prototype.setState = function (state) {
    this.state = state;
    if (typeof this.onStateChange === 'function') this.onStateChange(state);
  };

  Game.prototype.toggleMute = function () {
    // Audio.toggleMute() already persists the pref.
    return this.audio.toggleMute();
  };

  /* ======================================================================
     GAME OVER
     ====================================================================== */

  Game.prototype.gameOver = function (reason) {
    if (this.state !== 'playing') return;

    this.gameOverReason = reason || 'crash';

    /* ------------------------------------------------------------------
       Compute the score entry and persist it BEFORE firing setState(),
       otherwise the HUD reads stale lastEntry / bestScore (bug #2).
       ------------------------------------------------------------------ */
    var entry = {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      cargo: this.cargo,
      deliveries: this.deliveries,
      efficiency: this.efficiency(),
      reason: this.gameOverReason,
      date: new Date().toISOString()
    };

    this.lastEntry = entry;
    this.scores = this.storage.saveScore(entry);
    this.bestScore = this.scores.length ? this.scores[0].score : entry.score;

    /* Now flip state so the overlay reads the fresh values. */
    this.setState('over');
    this.audio.stopMusic();
    this.audio.play('crash');

    this.shake = 1;
    this.overCooldown = 0.85;

    var d = this.drone;

    /* Explosion / debris / sparks. */
    this.particles.burst(d.x, d.y, 34, {
      speedMin: 60, speedMax: 340,
      lifeMin: 0.45, lifeMax: 1.3,
      sizeMin: 1.6, sizeMax: 5.0,
      color: '255, 190, 90',
      drag: 1.3, jitter: 8, gravity: 220
    });
    this.particles.burst(d.x, d.y, 22, {
      speedMin: 30, speedMax: 200,
      lifeMin: 0.6, lifeMax: 1.8,
      sizeMin: 3, sizeMax: 9,
      grow: 6, color: '70, 74, 84',
      drag: 1.6, jitter: 10
    });
    this.particles.burst(d.x, d.y, 16, {
      speedMin: 120, speedMax: 420,
      lifeMin: 0.3, lifeMax: 0.9,
      sizeMin: 1.2, sizeMax: 3,
      color: '255, 240, 200',
      shape: 'rect', drag: 1.1, gravity: 380, jitter: 6
    });
  };

  Game.prototype.efficiency = function () {
    if (!this.drone) return 0;
    return this.distance / Math.max(1, this.drone.totalDrain);
  };

  Game.prototype.difficulty = function () {
    return U.clamp01(this.distance / C.world.rampDistance);
  };

  /* ======================================================================
     UPDATE
     ====================================================================== */

  Game.prototype.update = function (dt) {
    this.handleGlobalKeys();

    var scrollSpeed = 0;
    if (this.state === 'playing')   scrollSpeed = this.worldSpeed;
    else if (this.state === 'menu') scrollSpeed = 95;

    if (this.state !== 'paused') {
      this.background.update(dt, scrollSpeed);
      this.weather.update(dt, this);
      this.particles.update(dt);
    }

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'menu') {
      /* Attract-mode idle hover. */
      if (this.drone) {
        this.drone.bobPhase += dt * 3.1;
        this.drone.rotorPhase += dt * 22;
        this.drone.y = this.height * 0.40 + Math.sin(this.drone.bobPhase) * 10;
      }
    } else if (this.state === 'over') {
      this.overCooldown -= dt;
    }

    this.handleStateKeys();

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);

    this.input.endFrame();
  };

  Game.prototype.handleGlobalKeys = function () {
    if (this.input.pressed('KeyM')) {
      this.toggleMute();
      if (this.onMuteChange) this.onMuteChange(this.audio.isMuted());
    }
  };

  Game.prototype.handleStateKeys = function () {
    var I = this.input;

    switch (this.state) {
      case 'menu':
        if (I.anyPressed(['Space', 'Enter', 'NumpadEnter'])) this.startMission();
        break;

      case 'playing':
        if (I.anyPressed(['KeyP', 'Escape'])) this.pause();
        break;

      case 'paused':
        if (I.anyPressed(['KeyP', 'Escape', 'Space', 'Enter'])) this.resume();
        break;

      case 'over':
        if (this.overCooldown <= 0 &&
            I.anyPressed(['KeyR', 'Space', 'Enter', 'NumpadEnter'])) {
          this.startMission();
        }
        break;
    }
  };

  /* ------------------------------------------------------------ PLAYING - */

  Game.prototype.updatePlaying = function (dt) {
    this.elapsed += dt;

    /* Difficulty ramp. */
    this.worldSpeed = U.lerp(
      C.world.scrollSpeedStart,
      C.world.scrollSpeedMax,
      this.difficulty()
    );

    /* Distance + score. */
    var metres = (this.worldSpeed * dt) / C.world.pixelsPerMetre;
    this.distance += metres;
    this.score += metres * C.scoring.pointPerMetre;

    this.updateLoadShedding(dt);

    /* Scroll + tick entities. */
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      e.x -= this.worldSpeed * dt;
      e.update(dt, this);
    }

    /* Player physics — uses the inSolar flag set by the *previous* frame's
       handleInteractions() call, giving solar regen a one-frame latency
       (imperceptible) but guaranteeing it actually fires. */
    this.drone.update(dt, this);

    /* Spawning. */
    this.spawnTimer -= dt;
    this.solarCooldown -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.nextSpawnGap();
      this.spawnFeature();
    }

    /* Interactions (collisions, pickups, recharge) — also resets inSolar. */
    this.handleInteractions();

    /* Cull dead / off-screen entities. */
    for (var j = this.entities.length - 1; j >= 0; j--) {
      if (this.entities[j].dead || this.entities[j].isOffScreen()) {
        this.entities.splice(j, 1);
      }
    }

    /* Crash checks. */
    if (this.drone.hitGround) {
      this.gameOver('ground');
    } else if (this.drone.battery <= 0) {
      this.gameOver('battery');
    }
  };

  /* ------------------------------------------------------ LOAD-SHEDDING - */

  Game.prototype.updateLoadShedding = function (dt) {
    var ls = this.loadShedding;
    ls.timer -= dt;
    if (ls.timer > 0) return;

    if (ls.active) {
      ls.active = false;
      ls.stage = 0;
      ls.timer = U.rand(C.loadShedding.offMin, C.loadShedding.offMax);
    } else {
      ls.active = true;
      ls.stage = U.randInt(2, 6);
      ls.timer = U.rand(C.loadShedding.onMin, C.loadShedding.onMax);
      this.audio.play('warn');
    }
  };

  /* --------------------------------------------------------- COLLISIONS - */

  Game.prototype.handleInteractions = function () {
    var d = this.drone;

    /* Save previous frame's solar state, then reset — bug #1 & #3 fix. */
    d.wasInSolar = d.inSolar;
    d.inSolar = false;

    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.dead) continue;

      if (e.kind === 'obstacle') {
        if (this.testCollision(d, e)) {
          this.gameOver('crash');
          return;
        }

        /* Horn when an obstacle is safely cleared. */
        var eRight = e.shape === 'circle' ? (e.x + e.radius) : (e.x + e.w);
        if (!e.passed && eRight < d.x - 30) {
          e.passed = true;
          this.audio.play('horn');
          this.score += 15;

          this.particles.burst(d.x, d.y - 26, 4, {
            speedMin: 10, speedMax: 40,
            lifeMin: 0.4, lifeMax: 0.8,
            sizeMin: 1, sizeMax: 2.4,
            color: '102, 224, 138', drag: 2
          });
        }

      } else if (e.kind === 'cargo') {
        var hitR = e.radius + d.radius + 12;
        if (!e.collected && U.dist2(d.x, d.y, e.x, e.y) <= hitR * hitR) {
          this.collectCargo(e);
        }

      } else if (e.kind === 'solar') {
        if (U.circleRect(d.x, d.y, d.radius, e.x, e.y, e.w, e.h)) {
          d.inSolar = true;
          if (!d.wasInSolar && !this.loadShedding.active) {
            this.audio.play('charge');
          }
        }
      }
    }
  };

  Game.prototype.testCollision = function (drone, e) {
    if (e.shape === 'circle') {
      var rr = e.radius + drone.radius;
      return U.dist2(drone.x, drone.y, e.x, e.y) <= rr * rr;
    }
    return U.circleRect(drone.x, drone.y, drone.radius, e.x, e.y, e.w, e.h);
  };

  Game.prototype.collectCargo = function (pod) {
    pod.collected = true;
    pod.dead = true;

    this.cargo++;
    this.cargoSinceDelivery++;
    this.score += C.scoring.cargoPoints;

    this.audio.play('collect');

    this.particles.burst(pod.x, pod.y, 12, {
      speedMin: 40, speedMax: 190,
      lifeMin: 0.35, lifeMax: 0.85,
      sizeMin: 1.4, sizeMax: 3.4,
      color: '255, 214, 110', drag: 1.4
    });

    /* Every N pods completes a delivery. */
    if (this.cargoSinceDelivery >= C.scoring.podsPerDelivery) {
      this.cargoSinceDelivery = 0;
      this.deliveries++;
      this.score += C.scoring.deliveryBonus;
      this.audio.play('delivery');

      this.particles.burst(this.drone.x, this.drone.y, 26, {
        speedMin: 60, speedMax: 260,
        lifeMin: 0.6, lifeMax: 1.4,
        sizeMin: 1.6, sizeMax: 4,
        color: '102, 224, 138', drag: 1.2
      });
    }
  };

  /* ======================================================================
     SPAWNING
     ====================================================================== */

  Game.prototype.nextSpawnGap = function () {
    var diff = this.difficulty();
    var min = U.lerp(C.spawn.gapEasyMin, C.spawn.gapHardMin, diff);
    var max = U.lerp(C.spawn.gapEasyMax, C.spawn.gapHardMax, diff);
    return U.rand(min, max);
  };

  Game.prototype.spawnFeature = function () {
    var roll = Math.random();

    /* 13% chance of a recharge zone (gated by cooldown). */
    if (this.solarCooldown <= 0 && roll < 0.13) {
      this.spawnSolarZone();
      return;
    }

    /* 39% chance of a cargo arc (roll 0.13..0.52). */
    if (roll < 0.52) {
      this.spawnCargoArc();
      return;
    }

    /* Otherwise, an obstacle. */
    this.spawnObstacle();
  };

  Game.prototype.spawnObstacle = function () {
    var diff = this.difficulty();
    var pool = ['pylon', 'pylon', 'tree'];

    if (diff > 0.12) pool.push('crane');
    if (diff > 0.25) pool.push('bird', 'bird');
    if (diff > 0.42) pool.push('storm');

    var type = U.pick(pool);
    var spawnX = this.width + 90;
    var gY = this.groundY;

    if (type === 'pylon') {
      var ph = U.rand(0.24, 0.54) * gY;
      this.entities.push(new EcoDash.Pylon(spawnX, gY - ph, 58, ph));

    } else if (type === 'tree') {
      var trunkH = U.rand(0.10, 0.26) * gY;
      var canopyR = U.rand(34, 54);
      var canopyY = gY - trunkH - canopyR * 0.85;
      this.entities.push(new EcoDash.Baobab(spawnX, canopyY, canopyR, trunkH));

    } else if (type === 'crane') {
      var ch = U.rand(0.20, 0.42) * gY;
      this.entities.push(new EcoDash.Crane(spawnX, 0, 54, ch));

    } else if (type === 'bird') {
      var by = U.rand(0.14, 0.72) * gY;
      this.entities.push(new EcoDash.Bird(spawnX, by, 19));

    } else if (type === 'storm') {
      var sr = U.rand(58, 86);
      var sy = U.rand(0.10, 0.52) * gY;
      this.entities.push(new EcoDash.StormCell(spawnX, sy, sr));
    }
  };

  Game.prototype.spawnCargoArc = function () {
    var count = U.randInt(C.spawn.cargoArcMin, C.spawn.cargoArcMax);
    var gY = this.groundY;

    var baseY = U.rand(0.16, 0.62) * gY;
    var amp = U.rand(18, 68);
    var dir = Math.random() < 0.5 ? 1 : -1;
    var startX = this.width + 70;

    for (var i = 0; i < count; i++) {
      var x = startX + i * C.spawn.cargoSpacing;
      var y = baseY + Math.sin(i * 0.85) * amp * dir;
      y = U.clamp(y, 70, gY - 60);
      this.entities.push(new EcoDash.CargoPod(x, y));
    }
  };

  Game.prototype.spawnSolarZone = function () {
    var gY = this.groundY;
    var w = U.rand(155, 215);
    var top = gY - U.rand(0.45, 0.72) * gY;

    this.entities.push(new EcoDash.SolarZone(this.width + 60, top, w, gY - top));

    this.solarCooldown = C.spawn.solarCooldown;
  };

  /* ======================================================================
     RENDER
     ====================================================================== */

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;

    ctx.save();

    /* Screen shake on impact. */
    if (this.shake > 0) {
      var mag = this.shake * 14;
      ctx.translate(U.rand(-mag, mag), U.rand(-mag, mag));
    }

    /* 1. Backdrop (sky, celestial, parallax layers, ground). */
    this.background.draw(ctx);

    /* 2. Night-time darkening over the world. */
    this.background.drawNightOverlay(ctx);

    /* 3. Headlight cone (drawn before entities so it reads as a glow). */
    if (this.drone && this.state !== 'menu') {
      this.drone.drawHeadlight(ctx);
    }

    /* 4. World entities. */
    for (var i = 0; i < this.entities.length; i++) {
      this.entities[i].draw(ctx, this);
    }

    /* 5. Player — hidden once the crash is registered. */
    if (this.drone && this.state !== 'over') {
      this.drone.draw(ctx, this);
    }

    /* 6. Particles. */
    this.particles.draw(ctx);

    /* 7. Weather effects. */
    this.weather.draw(ctx, w, h);

    /* 8. Light tint so entities sit inside the night. */
    this.background.drawEntityNightTint(ctx);

    /* 9. Load-shedding ambient dim. */
    if (this.loadShedding.active && this.state === 'playing') {
      ctx.fillStyle = 'rgba(10, 6, 4, 0.14)';
      ctx.fillRect(0, 0, w, h);
    }

    /* 10. Lightning flash. */
    this.weather.drawFlash(ctx, w, h);

    ctx.restore();

    /* 11. HUD (never shakes). */
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'over') {
      EcoDash.HUD.draw(ctx, this, w, h);
    }
  };

  /* ======================================================================
     MAIN LOOP
     ====================================================================== */

  Game.prototype.start = function () {
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._boundLoop);
  };

  Game.prototype.stop = function () {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  };

  Game.prototype.loop = function (now) {
    this._rafId = requestAnimationFrame(this._boundLoop);

    var dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    /* Guard against tab-switch spikes and negative deltas. */
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 1 / 30);

    this.update(dt);
    this.draw();
  };

  /* Expose. */
  EcoDash.Game = Game;
  EcoDash.REASON_TEXT = REASON_TEXT;
})(window.EcoDash);

/* ==========================================================================
   BOOTSTRAP — wires the canvas, DOM overlay menus and the Game instance.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.EcoDash;

  function boot() {
    var canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('[EcoDash] Canvas element #game-canvas not found.');
      return;
    }

    /* Input must be attached before Game starts polling it. */
    E.Input.attach(canvas);

    var game = new E.Game(canvas);

    /* Expose for the live code-defence session / debugging. */
    window.ecodash = game;

    /* ------------------------------------------------------ DOM handles */
    var screens = {
      menu:   document.getElementById('screen-start'),
      paused: document.getElementById('screen-pause'),
      over:   document.getElementById('screen-over')
    };

    var overReason = document.getElementById('over-reason');
    var overStats  = document.getElementById('over-stats');
    var muteIcon   = document.getElementById('mute-icon');
    var btnMute    = document.getElementById('btn-mute');

    /* -------------------------------------------------- state -> overlay */
    game.onStateChange = function (state) {
      for (var key in screens) {
        if (!screens[key]) continue;
        screens[key].classList.toggle('hidden', key !== state);
      }
      document.body.dataset.state = state;

      if (state === 'over') {
        var reasonText = E.REASON_TEXT[game.gameOverReason] || 'Mission terminated.';
        if (overReason) overReason.textContent = reasonText;
        if (overStats)  E.HUD.renderGameOver(game, overStats);
      }
    };

    /* -------------------------------------------------------- mute icon */
    function syncMuteIcon() {
      var muted = E.Audio.isMuted();
      if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
      if (btnMute)  btnMute.setAttribute('aria-pressed', String(muted));
    }

    game.onMuteChange = syncMuteIcon;

    /* --------------------------------------------------------- buttons */
    function bind(id, handler) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function (evt) {
        evt.currentTarget.blur();     // stop Space from re-triggering the click
        E.Audio.unlock();
        handler();
      });
    }

    bind('btn-start',         function () { game.startMission(); });
    bind('btn-resume',        function () { game.resume(); });
    bind('btn-restart',       function () { game.startMission(); });
    bind('btn-restart-pause', function () { game.startMission(); });

    if (btnMute) {
      btnMute.addEventListener('click', function (evt) {
        evt.currentTarget.blur();
        game.toggleMute();
        syncMuteIcon();
      });
    }

    /* -------------------------------------------------- window resizing */
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { game.resize(); }, 80);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* Auto-pause on tab blur. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.state === 'playing') game.pause();
    });

    /* ------------------------------------------------------------- go! */
    syncMuteIcon();
    game.onStateChange('menu');
    game.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();