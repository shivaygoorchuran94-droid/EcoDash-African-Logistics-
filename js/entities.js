/* ==========================================================================
   entities.js — World objects
   Contains:  EcoDash.Entity, EcoDash.Drone,
              EcoDash.Pylon, EcoDash.Baobab, EcoDash.Crane,
              EcoDash.Bird,  EcoDash.StormCell,
              EcoDash.CargoPod, EcoDash.SolarZone
   ========================================================================== */
window.EcoDash = window.EcoDash || {};

/* ==========================================================================
   Entity base + Drone
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var C = EcoDash.Config;
  var TAU = U.TAU;

  /* ===================== Entity base ===================== */
  function Entity(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 0;
    this.h = 0;
    this.radius = 0;
    this.shape = 'rect';
    this.kind = 'entity';
    this.dead = false;
    this.passed = false;
    this.age = 0;
  }

  Entity.prototype.update = function (dt) { this.age += dt; };
  Entity.prototype.draw = function () {};

  Entity.prototype.isOffScreen = function () {
    if (this.shape === 'circle') return (this.x + this.radius) < -260;
    return (this.x + this.w) < -300;
  };

  /* ===================== Drone ===================== */
  function Drone(x, y) {
    Entity.call(this, x, y);
    this.shape = 'circle';
    this.kind = 'player';
    this.radius = C.player.radius;

    this.vy = 0;
    this.thrusting = false;
    this.diving = false;

    this.battery = C.player.batteryMax;
    this.totalDrain = 0;
    this.inSolar = false;
    this.wasInSolar = false;

    this.angle = 0;
    this.rotorPhase = 0;
    this.bobPhase = 0;
    this.hitGround = false;
    this.lowBatteryPulse = 0;
    this.warnCooldown = 0;
    this.headlight = 0;
  }

  Drone.prototype = Object.create(Entity.prototype);
  Drone.prototype.constructor = Drone;

  Drone.prototype.reset = function (x, y) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.battery = C.player.batteryMax;
    this.totalDrain = 0;
    this.angle = 0;
    this.rotorPhase = 0;
    this.bobPhase = 0;
    this.hitGround = false;
    this.inSolar = false;
    this.wasInSolar = false;
    this.warnCooldown = 0;
    this.dead = false;
  };

  Drone.prototype.update = function (dt, game) {
    var p = C.player;
    this.age += dt;

    this.thrusting = game.input.thrust;
    this.diving = game.input.descend;

    var accel = p.gravity;
    if (this.thrusting) accel += p.thrust;
    if (this.diving)    accel += p.dive;
    accel += game.weather.windY;

    this.vy += accel * dt;
    this.vy -= this.vy * p.drag * dt;
    this.vy = U.clamp(this.vy, -p.maxVy, p.maxVy);

    this.y += this.vy * dt;

    var groundY = game.groundY;
    var ceiling = p.ceilingPad;

    if (this.y - this.radius < ceiling) {
      this.y = ceiling + this.radius;
      if (this.vy < 0) this.vy *= -0.25;
    }

    if (this.y + this.radius >= groundY) {
      this.y = groundY - this.radius;
      this.hitGround = true;
      this.vy = 0;
    } else {
      this.hitGround = false;
    }

    /* ------------------------------------------------------------------
       Battery drain — gentle glide vs. thrust.
       Solar recharge only when the flag was set by a collision with a
       SolarZone in the previous frame (see Game.handleInteractions).
       ------------------------------------------------------------------ */
    var drain = p.drainBase;
    if (this.thrusting) drain += p.drainThrust;
    if (game.weather.type !== 'clear') drain += p.drainWeather * game.weather.intensity;

    this.battery -= drain * dt;
    this.totalDrain += drain * dt;

    if (this.inSolar && !game.loadShedding.active) {
      var before = this.battery;
      this.battery = Math.min(p.batteryMax, this.battery + p.solarRegen * dt);

      if (before < p.batteryMax - 0.5 && Math.random() < 0.35) {
        game.particles.spawn({
          x: this.x + U.rand(-24, 24),
          y: this.y + U.rand(6, 26),
          vx: U.rand(-16, 16),
          vy: U.rand(-90, -40),
          life: U.rand(0.4, 0.9),
          size: U.rand(1.2, 2.6),
          color: '255, 214, 110',
          drag: 0.6
        });
      }
    }

    this.battery = U.clamp(this.battery, 0, p.batteryMax);

    this.warnCooldown -= dt;
    if (this.battery <= p.lowBattery && this.battery > 0 && this.warnCooldown <= 0) {
      game.audio.play('lowBattery');
      this.warnCooldown = 1.15;
    }

    var targetAngle = U.clamp(this.vy / p.maxVy, -1, 1) * 0.42;
    this.angle += (targetAngle - this.angle) * Math.min(1, dt * 8);

    this.rotorPhase += dt * (this.thrusting ? 44 : 26);
    this.bobPhase += dt * 3.1;
    this.headlight = game.background.night;

    if (game.particles && Math.random() < (this.thrusting ? 0.75 : 0.25)) {
      game.particles.spawn({
        x: this.x + U.rand(-14, 14),
        y: this.y + 14,
        vx: U.rand(-70, -10) - game.worldSpeed * 0.12,
        vy: U.rand(14, 60),
        life: U.rand(0.35, 0.8),
        size: U.rand(1.2, 3.2),
        grow: 8,
        color: '196, 168, 120',
        drag: 1.4,
        alpha: 0.5
      });
    }
  };

  Drone.prototype.draw = function (ctx, game) {
    var bob = Math.sin(this.bobPhase) * 1.6;
    var cx = this.x;
    var cy = this.y + bob;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    var ax = 30, ay = 15;
    ctx.strokeStyle = '#2b3846';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 0);  ctx.lineTo(-ax, -ay);
    ctx.moveTo(8, 0);   ctx.lineTo(ax, -ay);
    ctx.moveTo(-8, 0);  ctx.lineTo(-ax, ay);
    ctx.moveTo(8, 0);   ctx.lineTo(ax, ay);
    ctx.stroke();

    var hubPositions = [[-ax, -ay], [ax, -ay], [-ax, ay], [ax, ay]];
    var rotorR = this.thrusting ? 21 : 16;
    var spin = Math.abs(Math.sin(this.rotorPhase));

    for (var i = 0; i < hubPositions.length; i++) {
      var hx = hubPositions[i][0];
      var hy = hubPositions[i][1];

      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#cfe9ff';
      ctx.beginPath();
      ctx.ellipse(hx, hy, rotorR, rotorR * (0.16 + spin * 0.55), 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#3a4a5c';
      ctx.beginPath();
      ctx.arc(hx, hy, 3.4, 0, TAU);
      ctx.fill();
    }

    var bodyGrad = ctx.createLinearGradient(0, -13, 0, 13);
    bodyGrad.addColorStop(0, '#43536a');
    bodyGrad.addColorStop(0.55, '#2b3746');
    bodyGrad.addColorStop(1, '#161d26');

    ctx.fillStyle = bodyGrad;
    U.roundRect(ctx, -30, -11, 60, 22, 10);
    ctx.fill();

    ctx.fillStyle = '#f2b134';
    ctx.fillRect(-30, -1.6, 60, 3.4);
    ctx.fillStyle = '#2fa84f';
    ctx.fillRect(-30, 1.8, 60, 1.6);

    ctx.save();
    ctx.translate(0, -11);
    ctx.fillStyle = '#12325c';
    U.roundRect(ctx, -21, -8, 42, 9, 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(140, 200, 255, 0.55)';
    ctx.lineWidth = 0.8;
    for (var gx = -21; gx <= 21; gx += 7) {
      ctx.beginPath();
      ctx.moveTo(gx, -8);
      ctx.lineTo(gx, 1);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-21, -3.5);
    ctx.lineTo(21, -3.5);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#c8813a';
    U.roundRect(ctx, -13, 11, 26, 15, 3);
    ctx.fill();

    ctx.strokeStyle = '#7a4a1c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(0, 26);
    ctx.stroke();

    ctx.fillStyle = '#eaf7ee';
    ctx.fillRect(-2, 15, 4, 8);
    ctx.fillRect(-5, 18, 10, 3.5);

    ctx.fillStyle = 'rgba(160, 230, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(12, -1, 8, 5, 0, 0, TAU);
    ctx.fill();

    ctx.restore();

    var led = 0.5 + 0.5 * Math.sin(game.elapsed * 8);
    var ledColor = this.battery <= C.player.lowBattery ? '#ff4d4d' : '#4dff88';

    ctx.save();
    ctx.globalAlpha = 0.30 + led * 0.70;
    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(cx, cy - 24, 3.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (this.inSolar && !game.loadShedding.active) {
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.16 * Math.sin(game.elapsed * 9);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 44 + Math.sin(game.elapsed * 5) * 4, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  };

  Drone.prototype.drawHeadlight = function (ctx) {
    if (this.headlight < 0.25) return;
    var a = (this.headlight - 0.25) / 0.75;

    var g = ctx.createRadialGradient(this.x, this.y, 6, this.x, this.y, 170);
    g.addColorStop(0, 'rgba(255, 240, 190, ' + (0.26 * a).toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(255, 235, 170, ' + (0.09 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255, 235, 170, 0)');

    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 170, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  EcoDash.Entity = Entity;
  EcoDash.Drone = Drone;
})(window.EcoDash);

/* ==========================================================================
   Obstacles — pylons, trees, cranes, birds, storm cells
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var TAU = U.TAU;
  var Entity = EcoDash.Entity;

  /* Pylon --------------------------------------------------------------- */
  function Pylon(x, y, w, h) {
    Entity.call(this, x, y);
    this.w = w; this.h = h;
    this.shape = 'rect';
    this.kind = 'obstacle';
    this.type = 'pylon';
    this.sparkPhase = Math.random() * TAU;
  }
  Pylon.prototype = Object.create(Entity.prototype);
  Pylon.prototype.constructor = Pylon;

  Pylon.prototype.draw = function (ctx, game) {
    var x = this.x, y = this.y, w = this.w, h = this.h;
    var cx = x + w / 2;
    var groundY = y + h;

    ctx.fillStyle = '#4a4640';
    ctx.fillRect(x + w * 0.16, groundY - 12, w * 0.68, 12);

    ctx.strokeStyle = '#59626d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 5, groundY - 10);
    ctx.lineTo(cx - 9, y + 14);
    ctx.moveTo(x + w - 5, groundY - 10);
    ctx.lineTo(cx + 9, y + 14);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 132, 146, 0.75)';
    ctx.lineWidth = 1.6;
    var rungs = Math.max(4, Math.floor(h / 46));
    for (var i = 0; i < rungs; i++) {
      var t0 = i / rungs, t1 = (i + 1) / rungs;
      var y0 = groundY - 10 - (h - 24) * t0;
      var y1 = groundY - 10 - (h - 24) * t1;
      var s0 = w * 0.42 * (1 - t0 * 0.78);
      var s1 = w * 0.42 * (1 - t1 * 0.78);

      ctx.beginPath();
      ctx.moveTo(cx - s0, y0);
      ctx.lineTo(cx + s1, y1);
      ctx.moveTo(cx + s0, y0);
      ctx.lineTo(cx - s1, y1);
      ctx.moveTo(cx - s1, y1);
      ctx.lineTo(cx + s1, y1);
      ctx.stroke();
    }

    ctx.strokeStyle = '#6d7885';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.72, y + 14);
    ctx.lineTo(cx + w * 0.72, y + 14);
    ctx.stroke();

    ctx.fillStyle = '#8fa0b2';
    var insX = [-w * 0.66, 0, w * 0.66];
    for (var k = 0; k < insX.length; k++) {
      ctx.fillRect(cx + insX[k] - 2.4, y + 14, 4.8, 11);
    }

    var blink = 0.5 + 0.5 * Math.sin(game.elapsed * 4 + this.sparkPhase);
    ctx.save();
    ctx.globalAlpha = 0.35 + blink * 0.65;
    ctx.fillStyle = '#ff5a4d';
    ctx.beginPath();
    ctx.arc(cx, y + 7, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /* Baobab -------------------------------------------------------------- */
  function Baobab(x, canopyY, radius, trunkHeight) {
    Entity.call(this, x, canopyY);
    this.shape = 'circle';
    this.radius = radius;
    this.kind = 'obstacle';
    this.type = 'tree';
    this.trunkHeight = trunkHeight;
    this.seed = Math.random() * 1000;
    this.sway = Math.random() * TAU;
  }
  Baobab.prototype = Object.create(Entity.prototype);
  Baobab.prototype.constructor = Baobab;

  Baobab.prototype.draw = function (ctx, game) {
    var sway = Math.sin(game.elapsed * 1.4 + this.sway) * 2.4;
    var cx = this.x + sway;
    var cy = this.y;
    var baseY = cy + this.radius + this.trunkHeight;
    var r = this.radius;

    ctx.fillStyle = '#5a3a20';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.20, baseY);
    ctx.quadraticCurveTo(cx - r * 0.13, cy + r * 0.6, cx - r * 0.10, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.10, cy + r * 0.2);
    ctx.quadraticCurveTo(cx + r * 0.13, cy + r * 0.6, cx + r * 0.20, baseY);
    ctx.closePath();
    ctx.fill();

    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#4e7a3a');
    grad.addColorStop(0.6, '#33562a');
    grad.addColorStop(1, '#1e3620');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(80, 122, 58, 0.85)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.36, cy - r * 0.30, r * 0.46, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.34, cy - r * 0.14, r * 0.38, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(24, 44, 26, 0.55)';
    ctx.beginPath();
    ctx.arc(cx + r * 0.22, cy + r * 0.36, r * 0.52, 0, TAU);
    ctx.fill();
  };

  /* Crane --------------------------------------------------------------- */
  function Crane(x, y, w, h) {
    Entity.call(this, x, y);
    this.w = w; this.h = h;
    this.shape = 'rect';
    this.kind = 'obstacle';
    this.type = 'crane';
    this.hookPhase = Math.random() * TAU;
  }
  Crane.prototype = Object.create(Entity.prototype);
  Crane.prototype.constructor = Crane;

  Crane.prototype.draw = function (ctx, game) {
    var x = this.x, y = this.y, w = this.w, h = this.h;

    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#b8860b');
    g.addColorStop(0.4, '#f0b429');
    g.addColorStop(1, '#a8760a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(90, 62, 4, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var yy = y; yy < y + h - 18; yy += 22) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy + 22);
      ctx.moveTo(x + w, yy);
      ctx.lineTo(x, yy + 22);
    }
    ctx.stroke();

    ctx.fillStyle = '#3d3d44';
    ctx.fillRect(x + w * 0.18, y + h, w * 0.64, 14);

    var swing = Math.sin(game.elapsed * 1.1 + this.hookPhase) * 0.16;
    ctx.save();
    ctx.translate(x + w / 2, y + h + 14);
    ctx.rotate(swing);
    ctx.strokeStyle = '#2c2c33';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 34);
    ctx.stroke();
    ctx.fillStyle = '#8a8f99';
    ctx.beginPath();
    ctx.arc(0, 38, 5.5, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(20, 20, 24, 0.85)';
    for (var s = 0; s < w; s += 16) {
      ctx.fillRect(x + s, y + h * 0.5, 8, 5);
    }
  };

  /* Bird ---------------------------------------------------------------- */
  function Bird(x, y, radius) {
    Entity.call(this, x, y);
    this.shape = 'circle';
    this.radius = radius;
    this.kind = 'obstacle';
    this.type = 'bird';
    this.baseY = y;
    this.amp = U.rand(26, 62);
    this.freq = U.rand(1.2, 2.4);
    this.phase = Math.random() * TAU;
    this.wingPhase = Math.random() * TAU;
    this.extraSpeed = U.rand(60, 130);
  }
  Bird.prototype = Object.create(Entity.prototype);
  Bird.prototype.constructor = Bird;

  Bird.prototype.update = function (dt) {
    this.age += dt;
    this.x -= this.extraSpeed * dt;
    this.y = this.baseY + Math.sin(this.age * this.freq + this.phase) * this.amp;
    this.wingPhase += dt * 7;
  };

  Bird.prototype.draw = function (ctx) {
    var cx = this.x;
    var cy = this.y;
    var flap = Math.sin(this.wingPhase);
    var span = this.radius * 1.9;

    ctx.save();
    ctx.strokeStyle = '#2a2a30';
    ctx.fillStyle = '#2a2a30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.ellipse(cx, cy, this.radius * 0.72, this.radius * 0.34, 0, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.quadraticCurveTo(cx - span * 0.5, cy - 14 - flap * 12, cx - span, cy - 4 - flap * 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.quadraticCurveTo(cx + span * 0.5, cy - 14 - flap * 12, cx + span, cy - 4 - flap * 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + this.radius * 0.55, cy - 3, this.radius * 0.22, 0, TAU);
    ctx.fill();

    ctx.restore();
  };

  /* StormCell ----------------------------------------------------------- */
  function StormCell(x, y, radius) {
    Entity.call(this, x, y);
    this.shape = 'circle';
    this.radius = radius;
    this.kind = 'obstacle';
    this.type = 'storm';
    this.extraSpeed = U.rand(20, 55);
    this.flashTimer = U.rand(0.5, 2.2);
    this.flash = 0;
    this.puffs = [];
    for (var i = 0; i < 7; i++) {
      this.puffs.push({
        ox: U.rand(-0.8, 0.8),
        oy: U.rand(-0.55, 0.35),
        r: U.rand(0.35, 0.62)
      });
    }
  }
  StormCell.prototype = Object.create(Entity.prototype);
  StormCell.prototype.constructor = StormCell;

  StormCell.prototype.update = function (dt, game) {
    this.age += dt;
    this.x -= this.extraSpeed * dt;

    this.flashTimer -= dt;
    if (this.flashTimer <= 0) {
      this.flashTimer = U.rand(1.4, 4.0);
      this.flash = 1;
      game.weather.triggerFlash();
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
  };

  StormCell.prototype.draw = function (ctx) {
    var cx = this.x, cy = this.y, r = this.radius;

    ctx.save();

    for (var i = 0; i < this.puffs.length; i++) {
      var p = this.puffs[i];
      var px = cx + p.ox * r;
      var py = cy + p.oy * r;
      var pr = p.r * r;

      var g = ctx.createRadialGradient(px, py - pr * 0.3, pr * 0.1, px, py, pr);
      g.addColorStop(0, 'rgba(96, 104, 122, 0.96)');
      g.addColorStop(1, 'rgba(38, 44, 60, 0.92)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(150, 190, 225, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var j = 0; j < 16; j++) {
      var rx = cx + U.rand(-r * 0.75, r * 0.75);
      ctx.moveTo(rx, cy + r * 0.35);
      ctx.lineTo(rx - 5, cy + r * 0.9);
    }
    ctx.stroke();

    if (this.flash > 0.05) {
      ctx.globalAlpha = this.flash;
      ctx.strokeStyle = '#e8f4ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + r * 0.1);
      ctx.lineTo(cx - 6, cy + r * 0.42);
      ctx.lineTo(cx + 3, cy + r * 0.48);
      ctx.lineTo(cx - 7, cy + r * 0.92);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };

  EcoDash.Pylon = Pylon;
  EcoDash.Baobab = Baobab;
  EcoDash.Crane = Crane;
  EcoDash.Bird = Bird;
  EcoDash.StormCell = StormCell;
})(window.EcoDash);

/* ==========================================================================
   Pickups — CargoPod + SolarZone
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var TAU = U.TAU;
  var Entity = EcoDash.Entity;

  /* CargoPod ------------------------------------------------------------ */
  function CargoPod(x, y) {
    Entity.call(this, x, y);
    this.shape = 'circle';
    this.radius = 15;
    this.kind = 'cargo';
    this.type = 'cargo';
    this.phase = Math.random() * TAU;
    this.collected = false;
  }
  CargoPod.prototype = Object.create(Entity.prototype);
  CargoPod.prototype.constructor = CargoPod;

  CargoPod.prototype.update = function (dt) {
    this.age += dt;
    this.phase += dt * 2.6;
  };

  CargoPod.prototype.draw = function (ctx) {
    var bob = Math.sin(this.phase) * 4;
    var cx = this.x;
    var cy = this.y + bob;

    ctx.save();

    var halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    halo.addColorStop(0, 'rgba(255, 214, 110, 0.42)');
    halo.addColorStop(1, 'rgba(255, 214, 110, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(240, 240, 245, 0.92)';
    ctx.beginPath();
    ctx.arc(cx, cy - 20 + bob * 0.3, 12, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = 'rgba(220, 220, 230, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 20 + bob * 0.3);
    ctx.lineTo(cx - 7, cy - 6);
    ctx.moveTo(cx + 11, cy - 20 + bob * 0.3);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.stroke();

    ctx.fillStyle = '#c8813a';
    U.roundRect(ctx, cx - 12, cy - 8, 24, 18, 3);
    ctx.fill();

    ctx.strokeStyle = '#8a5620';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    ctx.fillStyle = '#f4fff7';
    ctx.fillRect(cx - 2, cy - 4, 4, 9);
    ctx.fillRect(cx - 5, cy - 1, 10, 3.6);

    ctx.restore();
  };

  /* SolarZone ----------------------------------------------------------- */
  function SolarZone(x, y, w, h) {
    Entity.call(this, x, y);
    this.w = w; this.h = h;
    this.shape = 'rect';
    this.kind = 'solar';
    this.type = 'solar';
    this.phase = Math.random() * TAU;
    this.panels = [];
    var count = Math.max(3, Math.floor(w / 46));
    for (var i = 0; i < count; i++) {
      this.panels.push({
        ox: 10 + i * ((w - 20) / count),
        s: U.rand(0.85, 1.15)
      });
    }
  }
  SolarZone.prototype = Object.create(Entity.prototype);
  SolarZone.prototype.constructor = SolarZone;

  SolarZone.prototype.update = function (dt) {
    this.age += dt;
    this.phase += dt * 2.2;
  };

  SolarZone.prototype.draw = function (ctx, game) {
    var active = !game.loadShedding.active;
    var pulse = 0.5 + 0.5 * Math.sin(this.phase);

    ctx.save();

    var beam = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
    if (active) {
      beam.addColorStop(0, 'rgba(255, 214, 110, ' + (0.05 + pulse * 0.06).toFixed(3) + ')');
      beam.addColorStop(0.55, 'rgba(255, 200, 80, ' + (0.13 + pulse * 0.08).toFixed(3) + ')');
      beam.addColorStop(1, 'rgba(255, 190, 60, ' + (0.22 + pulse * 0.10).toFixed(3) + ')');
    } else {
      beam.addColorStop(0, 'rgba(120, 120, 130, 0.04)');
      beam.addColorStop(1, 'rgba(90, 90, 100, 0.12)');
    }
    ctx.fillStyle = beam;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = active
      ? 'rgba(255, 214, 110, ' + (0.45 + pulse * 0.35).toFixed(3) + ')'
      : 'rgba(130, 130, 140, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.h);
    ctx.moveTo(this.x + this.w, this.y);
    ctx.lineTo(this.x + this.w, this.y + this.h);
    ctx.stroke();
    ctx.setLineDash([]);

    var baseY = this.y + this.h;
    for (var i = 0; i < this.panels.length; i++) {
      var p = this.panels[i];
      var px = this.x + p.ox;
      var pw = 34 * p.s;
      var ph = 10 * p.s;

      ctx.save();
      ctx.translate(px, baseY - ph - 12);
      ctx.transform(1, 0, -0.45, 1, 0, 0);

      ctx.fillStyle = active ? '#17457e' : '#2c3138';
      ctx.fillRect(0, 0, pw, ph);

      ctx.strokeStyle = active ? 'rgba(140, 200, 255, 0.55)' : 'rgba(110, 115, 125, 0.4)';
      ctx.lineWidth = 0.9;
      for (var gx = 4; gx < pw; gx += 7) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ph);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = active ? '#8a8f99' : '#4a4e55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.3, baseY - 12);
      ctx.lineTo(px + pw * 0.3, baseY);
      ctx.stroke();
    }

    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? '#ffd166' : '#8b939e';
    ctx.fillText(active ? '⚡ SOLAR MICROGRID' : '⚡ OFFLINE',
                 this.x + this.w / 2, this.y + 18);

    ctx.restore();
  };

  EcoDash.CargoPod = CargoPod;
  EcoDash.SolarZone = SolarZone;
})(window.EcoDash);