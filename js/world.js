/* ==========================================================================
   world.js — Environment layer
   Contains:  EcoDash.Background, EcoDash.Weather
   ========================================================================== */
window.EcoDash = window.EcoDash || {};

/* ==========================================================================
   Background — procedural African savanna with day/night cycle + parallax
   (ORIGINAL FEATURE — authored without Generative AI)
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var TAU = U.TAU;

  var CYCLE_SECONDS = 115;

  var SKY_KEYS = [
    { t: 0.00, top: '#040915', bot: '#0a1730' },
    { t: 0.17, top: '#0e1b38', bot: '#392a4a' },
    { t: 0.24, top: '#2a4878', bot: '#e2825a' },
    { t: 0.33, top: '#2f74b8', bot: '#a9d8ef' },
    { t: 0.50, top: '#1e7fd0', bot: '#c8ebfa' },
    { t: 0.67, top: '#2f74b8', bot: '#f0c078' },
    { t: 0.76, top: '#7a3f6a', bot: '#ff8a4c' },
    { t: 0.85, top: '#221f45', bot: '#4a2f4f' },
    { t: 1.00, top: '#040915', bot: '#0a1730' }
  ];

  function skyColors(t) {
    for (var i = 0; i < SKY_KEYS.length - 1; i++) {
      var a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
      if (t >= a.t && t <= b.t) {
        var k = (b.t === a.t) ? 0 : (t - a.t) / (b.t - a.t);
        return { top: U.lerpColor(a.top, b.top, k), bot: U.lerpColor(a.bot, b.bot, k) };
      }
    }
    return { top: U.hexToRgb(SKY_KEYS[0].top), bot: U.hexToRgb(SKY_KEYS[0].bot) };
  }

  function buildRidge(seed, segments, tileW, midNorm, ampNorm, waves) {
    var rnd = U.mulberry32(seed);
    var phase = rnd() * TAU;
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var u = i / segments;
      var y = midNorm
        + Math.sin(u * TAU * waves + phase) * ampNorm
        + Math.sin(u * TAU * waves * 2.3 + phase * 1.7) * ampNorm * 0.42
        + Math.sin(u * TAU * waves * 5.7 + phase * 3.1) * ampNorm * 0.14;
      pts.push({ x: u * tileW, y: y });
    }
    return pts;
  }

  function buildTrees(seed, count, tileW, sMin, sMax) {
    var rnd = U.mulberry32(seed);
    var out = [];
    var slot = tileW / count;
    for (var i = 0; i < count; i++) {
      out.push({
        x: i * slot + rnd() * slot * 0.7,
        s: U.lerp(sMin, sMax, rnd()),
        kind: rnd() < 0.58 ? 'acacia' : 'baobab'
      });
    }
    return out;
  }

  function buildStars(seed, count) {
    var rnd = U.mulberry32(seed);
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        x: rnd(), y: rnd() * 0.62,
        r: 0.55 + rnd() * 1.35,
        p: rnd() * TAU,
        sp: 0.6 + rnd() * 2.0
      });
    }
    return out;
  }

  function buildGroundDetail(seed, count, tileW) {
    var rnd = U.mulberry32(seed);
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push({
        x: rnd() * tileW,
        s: 0.5 + rnd() * 0.9,
        kind: rnd() < 0.7 ? 'grass' : 'rock'
      });
    }
    return out;
  }

  function drawAcacia(ctx, x, baseY, s, color) {
    var th = 72 * s, cw = 84 * s;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, baseY);
    ctx.quadraticCurveTo(x - 3 * s, baseY - th * 0.55, x - 2.2 * s, baseY - th);
    ctx.lineTo(x + 2.2 * s, baseY - th);
    ctx.quadraticCurveTo(x + 3 * s, baseY - th * 0.55, x + 5.5 * s, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(x, baseY - th * 0.72);
    ctx.lineTo(x - cw * 0.30, baseY - th - 4 * s);
    ctx.moveTo(x, baseY - th * 0.78);
    ctx.lineTo(x + cw * 0.30, baseY - th - 2 * s);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x, baseY - th - 7 * s, cw * 0.50, 12 * s, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - cw * 0.18, baseY - th - 1 * s, cw * 0.30, 9 * s, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + cw * 0.20, baseY - th - 2 * s, cw * 0.27, 8.5 * s, 0, 0, TAU);
    ctx.fill();
  }

  function drawBaobab(ctx, x, baseY, s, color) {
    var th = 84 * s;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - 15 * s, baseY);
    ctx.quadraticCurveTo(x - 11 * s, baseY - th * 0.5, x - 7 * s, baseY - th);
    ctx.lineTo(x + 7 * s, baseY - th);
    ctx.quadraticCurveTo(x + 11 * s, baseY - th * 0.5, x + 15 * s, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 3.4 * s;
    var branches = [[-1.05, -1.15], [-0.42, -1.32], [0.42, -1.28], [1.05, -1.05]];
    for (var i = 0; i < branches.length; i++) {
      var bx = branches[i][0], by = branches[i][1];
      ctx.beginPath();
      ctx.moveTo(x, baseY - th + 5 * s);
      ctx.quadraticCurveTo(x + bx * 20 * s, baseY - th - 12 * s,
                           x + bx * 42 * s, baseY - th + by * 26 * s);
      ctx.stroke();
    }
  }

  function Background() {
    this.timeOfDay = 0.30;
    this.scrollX = 0;
    this.width = 0;
    this.height = 0;
    this.night = 0;

    this.layers = [
      { kind: 'ridge', parallax: 0.055, tileW: 1600, color: '#1b3550',
        mid: 0.585, amp: 0.085, waves: 3, segments: 120 },
      { kind: 'ridge', parallax: 0.130, tileW: 1280, color: '#223f57',
        mid: 0.665, amp: 0.065, waves: 4, segments: 110 },
      { kind: 'trees', parallax: 0.300, tileW: 1100, color: '#14293a',
        baseline: 0.845, sMin: 0.50, sMax: 1.15, count: 9 },
      { kind: 'trees', parallax: 0.520, tileW: 900, color: '#0e1f2c',
        baseline: 0.862, sMin: 0.85, sMax: 1.65, count: 7 }
    ];

    this.layers[0].pts = buildRidge(1337,  120, 1600, 0.585, 0.085, 3);
    this.layers[1].pts = buildRidge(90210, 110, 1280, 0.665, 0.065, 4);
    this.layers[2].items = buildTrees(4242, 9, 1100, 0.50, 1.15);
    this.layers[3].items = buildTrees(777,  7, 900,  0.85, 1.65);

    this.stars = buildStars(20260828, 140);
    this.groundDetail = buildGroundDetail(555, 26, 720);
  }

  Background.prototype.resize = function (w, h) {
    this.width = w;
    this.height = h;
  };

  Background.prototype.reset = function () {
    this.timeOfDay = 0.30;
    this.scrollX = 0;
  };

  Background.prototype.update = function (dt, scrollSpeed) {
    this.scrollX += scrollSpeed * dt;
    this.timeOfDay = (this.timeOfDay + dt / CYCLE_SECONDS) % 1;
    this.night = 0.5 + 0.5 * Math.cos(this.timeOfDay * TAU);
  };

  Background.prototype._forEachTile = function (layer, cb) {
    var tileW = layer.tileW;
    var offset = -((this.scrollX * layer.parallax) % tileW);
    for (var x = offset - tileW; x < this.width + tileW; x += tileW) cb(x);
  };

  Background.prototype._drawRidge = function (ctx, layer) {
    var pts = layer.pts;
    var h = this.height;

    ctx.fillStyle = layer.color;
    this._forEachTile(layer, function (ox) {
      ctx.beginPath();
      ctx.moveTo(ox + pts[0].x, pts[0].y * h);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(ox + pts[i].x, pts[i].y * h);
      }
      ctx.lineTo(ox + layer.tileW, h);
      ctx.lineTo(ox, h);
      ctx.closePath();
      ctx.fill();
    });
  };

  Background.prototype._drawTreeLayer = function (ctx, layer) {
    var baseY = layer.baseline * this.height;
    var color = layer.color;

    this._forEachTile(layer, function (ox) {
      for (var i = 0; i < layer.items.length; i++) {
        var t = layer.items[i];
        if (t.kind === 'acacia') drawAcacia(ctx, ox + t.x, baseY, t.s, color);
        else                     drawBaobab(ctx, ox + t.x, baseY, t.s, color);
      }
    });
  };

  Background.prototype._drawSky = function (ctx) {
    var w = this.width, h = this.height;
    var sky = skyColors(this.timeOfDay);

    var g = ctx.createLinearGradient(0, 0, 0, h * 0.92);
    g.addColorStop(0, U.rgb(sky.top));
    g.addColorStop(1, U.rgb(sky.bot));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (this.night > 0.04) {
      var t = this.scrollX * 0.002;
      ctx.save();
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        var twinkle = 0.55 + 0.45 * Math.sin(t * s.sp + s.p);
        ctx.globalAlpha = this.night * twinkle * 0.95;
        ctx.fillStyle = '#eaf4ff';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    var dayT = (this.timeOfDay - 0.25) / 0.5;
    if (dayT >= -0.05 && dayT <= 1.05) {
      var dx = U.clamp(dayT, 0, 1);
      var sx = U.lerp(-0.08, 1.08, dx) * w;
      var sy = h * 0.88 - Math.sin(dx * Math.PI) * h * 0.74;

      var sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 190);
      sunGlow.addColorStop(0, 'rgba(255, 236, 170, 0.55)');
      sunGlow.addColorStop(0.35, 'rgba(255, 200, 110, 0.18)');
      sunGlow.addColorStop(1, 'rgba(255, 190, 100, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sx, sy, 190, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(sx, sy, 26, 0, TAU);
      ctx.fill();
    }

    var nightT = ((this.timeOfDay + 0.25) % 1) / 0.5;
    if (nightT >= 0 && nightT <= 1) {
      var mx = U.lerp(-0.08, 1.08, nightT) * w;
      var my = h * 0.88 - Math.sin(nightT * Math.PI) * h * 0.70;

      var moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
      moonGlow.addColorStop(0, 'rgba(200, 225, 255, 0.30)');
      moonGlow.addColorStop(1, 'rgba(200, 225, 255, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(mx, my, 130, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#e6eeff';
      ctx.beginPath();
      ctx.arc(mx, my, 19, 0, TAU);
      ctx.fill();

      ctx.fillStyle = 'rgba(170, 190, 220, 0.55)';
      ctx.beginPath();
      ctx.arc(mx - 6, my - 4, 4.2, 0, TAU);
      ctx.arc(mx + 5, my + 5, 3.1, 0, TAU);
      ctx.fill();
    }
  };

  Background.prototype._drawGround = function (ctx, groundY) {
    var w = this.width, h = this.height;
    var bandH = h - groundY;

    var g = ctx.createLinearGradient(0, groundY, 0, h);
    g.addColorStop(0.00, '#b0703d');
    g.addColorStop(0.22, '#8b5329');
    g.addColorStop(0.70, '#5b3418');
    g.addColorStop(1.00, '#331d0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, w, bandH);

    ctx.fillStyle = 'rgba(255, 205, 130, 0.28)';
    ctx.fillRect(0, groundY, w, 2.5);

    var roadTop = groundY + bandH * 0.26;
    var roadH = bandH * 0.42;

    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(0, roadTop, w, roadH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, roadTop, w, 1.6);
    ctx.fillRect(0, roadTop + roadH - 1.6, w, 1.6);

    var dashW = 48, gapW = 42, period = dashW + gapW;
    var off = -((this.scrollX) % period);
    ctx.fillStyle = 'rgba(242, 201, 92, 0.80)';
    for (var x = off - period; x < w + period; x += period) {
      ctx.fillRect(x, roadTop + roadH * 0.44, dashW, Math.max(2, roadH * 0.11));
    }

    var tileW = 720;
    var dOff = -((this.scrollX) % tileW);
    ctx.save();
    for (var tx = dOff - tileW; tx < w + tileW; tx += tileW) {
      for (var i = 0; i < this.groundDetail.length; i++) {
        var d = this.groundDetail[i];
        var dx2 = tx + d.x;
        var s = d.s;
        if (d.kind === 'grass') {
          ctx.strokeStyle = 'rgba(120, 150, 70, 0.75)';
          ctx.lineWidth = 1.6 * s;
          ctx.lineCap = 'round';
          var gy = groundY - 1;
          ctx.beginPath();
          ctx.moveTo(dx2, gy);
          ctx.quadraticCurveTo(dx2 - 3 * s, gy - 8 * s, dx2 - 5 * s, gy - 13 * s);
          ctx.moveTo(dx2, gy);
          ctx.quadraticCurveTo(dx2 + 2 * s, gy - 9 * s, dx2 + 1 * s, gy - 15 * s);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(90, 62, 40, 0.85)';
          ctx.beginPath();
          ctx.ellipse(dx2, groundY + bandH * 0.14, 7 * s, 3.2 * s, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  Background.prototype.draw = function (ctx) {
    this._drawSky(ctx);
    for (var i = 0; i < this.layers.length; i++) {
      var layer = this.layers[i];
      if (layer.kind === 'ridge') this._drawRidge(ctx, layer);
      else                        this._drawTreeLayer(ctx, layer);
    }
    var groundY = this.height * EcoDash.Config.world.groundRatio;
    this._drawGround(ctx, groundY);
  };

  Background.prototype.drawNightOverlay = function (ctx) {
    if (this.night <= 0.02) return;
    ctx.fillStyle = 'rgba(4, 10, 26, ' + (this.night * 0.50).toFixed(3) + ')';
    ctx.fillRect(0, 0, this.width, this.height);
  };

  Background.prototype.drawEntityNightTint = function (ctx) {
    if (this.night <= 0.02) return;
    ctx.fillStyle = 'rgba(6, 14, 34, ' + (this.night * 0.20).toFixed(3) + ')';
    ctx.fillRect(0, 0, this.width, this.height);
  };

  EcoDash.Background = Background;
})(window.EcoDash);

/* ==========================================================================
   Weather — clear / dust / rain / crosswind with visual effects
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var U = EcoDash.Utils;
  var TAU = U.TAU;
  var C = EcoDash.Config;

  function Weather() {
    this.type = 'clear';
    this.intensity = 0;
    this.targetIntensity = 0;
    this.timer = 14;
    this.windPhase = 0;
    this.windY = 0;
    this.particles = [];
    this.flash = 0;
    this.label = 'Clear Skies';
  }

  Weather.prototype.reset = function (w, h) {
    this.type = 'clear';
    this.intensity = 0;
    this.targetIntensity = 0;
    this.timer = 14;
    this.windPhase = 0;
    this.windY = 0;
    this.flash = 0;
    this.label = 'Clear Skies';
    this.particles.length = 0;
    this._seedParticles(w, h, 90);
  };

  Weather.prototype.resize = function (w, h) {
    this._seedParticles(w, h, 90);
  };

  Weather.prototype._seedParticles = function (w, h, count) {
    this.particles.length = 0;
    for (var i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: U.rand(8, 34),
        speed: U.rand(220, 620),
        drift: U.rand(-90, -260),
        alpha: U.rand(0.15, 0.6),
        size: U.rand(0.7, 2.2)
      });
    }
  };

  Weather.prototype._pickNew = function () {
    var roll = Math.random();
    var type;
    if (roll < 0.50)      type = 'clear';
    else if (roll < 0.70) type = 'wind';
    else if (roll < 0.87) type = 'dust';
    else                  type = 'rain';

    this.type = type;

    if (type === 'clear') {
      this.label = 'Clear Skies';
      this.targetIntensity = 0;
      this.timer = U.rand(C.weather.clearMin, C.weather.clearMax);
    } else if (type === 'wind') {
      this.label = 'Crosswind';
      this.targetIntensity = U.rand(0.55, 1.0);
      this.timer = U.rand(C.weather.badMin, C.weather.badMax);
    } else if (type === 'dust') {
      this.label = 'Dust Storm';
      this.targetIntensity = U.rand(0.6, 1.0);
      this.timer = U.rand(C.weather.badMin, C.weather.badMax);
    } else {
      this.label = 'Heavy Rain';
      this.targetIntensity = U.rand(0.6, 1.0);
      this.timer = U.rand(C.weather.badMin, C.weather.badMax);
    }
  };

  Weather.prototype.update = function (dt, game) {
    this.timer -= dt;
    if (this.timer <= 0) this._pickNew();

    this.intensity += (this.targetIntensity - this.intensity) *
                      Math.min(1, dt * C.weather.fadeSpeed);

    this.windPhase += dt * (0.75 + this.intensity * 1.7);
    this.windY = Math.sin(this.windPhase) * C.weather.windForce * this.intensity;

    var w = game.width, h = game.height;
    var p, i;

    if (this.type === 'rain') {
      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        p.y += p.speed * dt;
        p.x += p.drift * dt * 0.35;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * (w + 260) - 60; }
        if (p.x < -40) p.x = w + 20;
      }
    } else if (this.type === 'dust') {
      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        p.x -= (p.speed * 0.9 + game.worldSpeed) * dt;
        p.y += Math.sin(p.x * 0.01 + i) * 22 * dt;
        if (p.x < -40) { p.x = w + U.rand(10, 260); p.y = Math.random() * h; }
      }
    } else if (this.type === 'wind') {
      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        p.y += (this.windY > 0 ? 1 : -1) * p.speed * 0.55 * dt;
        p.x -= (game.worldSpeed * 0.6) * dt;
        if (p.y < -30) p.y = h + 20;
        if (p.y > h + 30) p.y = -20;
        if (p.x < -40) p.x = w + 20;
      }
    }

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.4);
  };

  Weather.prototype.triggerFlash = function () { this.flash = 1; };

  Weather.prototype.draw = function (ctx, w, h) {
    if (this.intensity < 0.03) return;

    var i, p;
    var k = this.intensity;

    ctx.save();

    if (this.type === 'rain') {
      ctx.fillStyle = 'rgba(30, 52, 82, ' + (0.26 * k).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(180, 215, 255, ' + (0.45 * k).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 0.03, p.y + p.len);
      }
      ctx.stroke();

      var vg = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.25, w * 0.5, h * 0.5, h * 0.95);
      vg.addColorStop(0, 'rgba(10, 20, 38, 0)');
      vg.addColorStop(1, 'rgba(10, 20, 38, ' + (0.5 * k).toFixed(3) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

    } else if (this.type === 'dust') {
      ctx.fillStyle = 'rgba(196, 138, 68, ' + (0.20 * k).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);

      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        ctx.globalAlpha = p.alpha * k * 0.8;
        ctx.fillStyle = '#e0b070';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 1.6, p.size * 0.7, 0, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      var hz = ctx.createLinearGradient(0, 0, w, 0);
      hz.addColorStop(0, 'rgba(214, 158, 88, ' + (0.32 * k).toFixed(3) + ')');
      hz.addColorStop(0.55, 'rgba(214, 158, 88, ' + (0.06 * k).toFixed(3) + ')');
      hz.addColorStop(1, 'rgba(214, 158, 88, ' + (0.30 * k).toFixed(3) + ')');
      ctx.fillStyle = hz;
      ctx.fillRect(0, 0, w, h);

    } else if (this.type === 'wind') {
      ctx.strokeStyle = 'rgba(220, 235, 255, ' + (0.30 * k).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (i = 0; i < this.particles.length; i++) {
        p = this.particles[i];
        var dir = this.windY > 0 ? 1 : -1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y - dir * p.len);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  Weather.prototype.drawFlash = function (ctx, w, h) {
    if (this.flash <= 0.01) return;
    ctx.fillStyle = 'rgba(210, 230, 255, ' + (this.flash * 0.35).toFixed(3) + ')';
    ctx.fillRect(0, 0, w, h);
  };

  EcoDash.Weather = Weather;
})(window.EcoDash);