/* ==========================================================================
   config.js — Foundation layer
   Contains:  EcoDash.Config, EcoDash.Utils, EcoDash.Storage
   ========================================================================== */
window.EcoDash = window.EcoDash || {};

/* ==========================================================================
   Config — central tuning constants
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  EcoDash.Config = {
    version: '1.0.0',

    storageKey: 'ecodash.scores.v1',
    prefKey:    'ecodash.prefs.v1',

    world: {
      scrollSpeedStart: 152,
      scrollSpeedMax:   436,
      rampDistance:     2200,
      pixelsPerMetre:   6,
      groundRatio:      0.84
    },

    player: {
      w: 78, h: 46,
      radius: 17,
      gravity: 640,
      thrust: -1250,
      dive: 780,
      drag: 3.4,
      maxVy: 430,
      ceilingPad: 26,
      batteryMax: 100,
      drainBase: 1.05,
      drainThrust: 2.45,
      drainWeather: 0.85,

      /* --------------------------------------------------------------
         Fast-charge tuning:
         Was 34 %/s (~2.9 s for a full top-up) — now 90 %/s (~1.1 s),
         so clipping a SolarZone feels like a proper pit-stop.
         -------------------------------------------------------------- */
      solarRegen: 90,

      lowBattery: 25
    },

    weather: {
      clearMin: 12, clearMax: 20,
      badMin: 9,    badMax: 15,
      windForce: 165,
      fadeSpeed: 1.6
    },

    loadShedding: {
      firstDelayMin: 16, firstDelayMax: 24,
      onMin: 8,          onMax: 14,
      offMin: 16,        offMax: 26
    },

    scoring: {
      cargoPoints: 50,
      deliveryBonus: 250,
      podsPerDelivery: 5,
      pointPerMetre: 1
    },

    spawn: {
      gapEasyMin: 1.30, gapEasyMax: 2.10,
      gapHardMin: 0.72, gapHardMax: 1.15,
      firstDelay: 1.4,
      cargoArcMin: 3, cargoArcMax: 6,
      cargoSpacing: 78,
      solarCooldown: 24
    },

    audio: {
      musicVolume: 0.14,
      sfxVolume: 0.50
    }
  };
})(window.EcoDash);

/* ==========================================================================
   Utils — small maths / drawing helpers
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clamp01(v)      { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function lerp(a, b, t)   { return a + (b - a) * t; }
  function rand(a, b)      { return a + Math.random() * (b - a); }
  function randInt(a, b)   { return Math.floor(a + Math.random() * (b - a + 1)); }
  function pick(arr)       { return arr[(Math.random() * arr.length) | 0]; }

  function dist2(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  }
  function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }

  function smoothstep(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  /* Circle vs. AABB */
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    var nx = clamp(cx, rx, rx + rw);
    var ny = clamp(cy, ry, ry + rh);
    return dist2(cx, cy, nx, ny) <= r * r;
  }

  /* Deterministic PRNG for procedural art */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Colours */
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function lerpColor(hexA, hexB, t) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function rgb(c)      { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function rgba(c, a)  { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  /* Rounded rectangle path */
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,     x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x,     y + h, rr);
    ctx.arcTo(x,     y + h, x,     y,     rr);
    ctx.arcTo(x,     y,     x + w, y,     rr);
    ctx.closePath();
  }

  /* Formatting */
  function formatNumber(n) {
    return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function formatDistance(metres) {
    if (metres >= 1000) return (metres / 1000).toFixed(2) + ' km';
    return Math.floor(metres) + ' m';
  }
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  EcoDash.Utils = {
    TAU: TAU,
    clamp: clamp, clamp01: clamp01, lerp: lerp,
    rand: rand, randInt: randInt, pick: pick,
    dist: dist, dist2: dist2,
    smoothstep: smoothstep, circleRect: circleRect, mulberry32: mulberry32,
    hexToRgb: hexToRgb, lerpColor: lerpColor, rgb: rgb, rgba: rgba,
    roundRect: roundRect,
    formatNumber: formatNumber, formatDistance: formatDistance, formatTime: formatTime
  };
})(window.EcoDash);

/* ==========================================================================
   Storage — localStorage persistence
   ========================================================================== */
(function (EcoDash) {
  'use strict';

  var MAX_ENTRIES = 5;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }

  EcoDash.Storage = {

    getScores: function () {
      try {
        var list = safeParse(localStorage.getItem(EcoDash.Config.storageKey), []);
        return Array.isArray(list) ? list : [];
      } catch (e) { return []; }
    },

    saveScore: function (entry) {
      var list = EcoDash.Storage.getScores();
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score; });
      list = list.slice(0, MAX_ENTRIES);
      try {
        localStorage.setItem(EcoDash.Config.storageKey, JSON.stringify(list));
      } catch (e) {}
      return list;
    },

    best: function () {
      var list = EcoDash.Storage.getScores();
      return list.length ? list[0].score : 0;
    },

    clearScores: function () {
      try { localStorage.removeItem(EcoDash.Config.storageKey); } catch (e) {}
    },

    getPref: function (key, fallback) {
      try {
        var prefs = safeParse(localStorage.getItem(EcoDash.Config.prefKey), {});
        return (key in prefs) ? prefs[key] : fallback;
      } catch (e) { return fallback; }
    },

    setPref: function (key, value) {
      try {
        var prefs = safeParse(localStorage.getItem(EcoDash.Config.prefKey), {});
        prefs[key] = value;
        localStorage.setItem(EcoDash.Config.prefKey, JSON.stringify(prefs));
      } catch (e) {}
    }
  };
})(window.EcoDash);