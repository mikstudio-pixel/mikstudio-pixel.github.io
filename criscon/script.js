(function () {
  'use strict';

  /* ─── Shared constants ────────────────────────────────────── */

  var PIXEL_SIZE   = 9;
  var GAP          = 0;
  var MIN_BRIGHT   = 0.008;
  var COLOR_LEVELS = 32;

  var DIRECTIONS = [
    { dc:  1, dr:  0 },
    { dc: -1, dr:  0 },
    { dc:  0, dr:  1 },
    { dc:  0, dr: -1 },
  ];

  /* ─── PixelGrid class ─────────────────────────────────────── */

  function PixelGrid(canvas, opts) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this.colorBright    = opts.colorBright;
    this.colorDim       = opts.colorDim;
    this.maxAlpha       = opts.maxAlpha       || 0.72;
    this.snakeCount     = opts.snakeCount     || 0;
    this.snakeSpeed     = opts.snakeSpeed     || 6;
    this.snakeTurnChance = opts.snakeTurnChance || 0.2;
    this.snakeBrightness = opts.snakeBrightness || 0.85;
    this.enableCursor   = opts.enableCursor   || false;
    this.isGlobal       = opts.isGlobal       || false;
    this.persistence    = opts.persistence    || 0.978;

    this.cols = 0;
    this.rows = 0;
    this.activeCells = new Map();
    this.snakes   = [];
    this.colorLUT = [];

    this.mouseX     = -1;
    this.mouseY     = -1;
    this.prevMouseX = -1;
    this.prevMouseY = -1;

    this._buildColorLUT();
    this.resize();

    if (this.enableCursor) {
      this._setupMouse();
    }
  }

  /* ── Colour LUT ────────────────────────────────────────────── */

  PixelGrid.prototype._buildColorLUT = function () {
    var hi = this.colorBright;
    var lo = this.colorDim;
    var n  = COLOR_LEVELS;
    this.colorLUT.length = 0;

    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var r = Math.round(lo.r + (hi.r - lo.r) * t);
      var g = Math.round(lo.g + (hi.g - lo.g) * t);
      var b = Math.round(lo.b + (hi.b - lo.b) * t);
      var a = (t * this.maxAlpha).toFixed(3);
      this.colorLUT.push('rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
    }
  };

  /* ── Resize ────────────────────────────────────────────────── */

  PixelGrid.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w, h;

    if (this.isGlobal) {
      w = window.innerWidth;
      h = window.innerHeight;
    } else {
      var rect = this.canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }

    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cols = Math.ceil(w / PIXEL_SIZE);
    this.rows = Math.ceil(h / PIXEL_SIZE);
    this.activeCells.clear();
    this._initSnakes();
  };

  /* ── Grid operations ───────────────────────────────────────── */

  PixelGrid.prototype.lightCell = function (col, row, brightness) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    var key = col + row * this.cols;
    var cur = this.activeCells.get(key);
    if (cur === undefined || brightness > cur) {
      this.activeCells.set(key, brightness);
    }
  };

  PixelGrid.prototype._lightAt = function (x, y) {
    this.lightCell(Math.floor(x / PIXEL_SIZE), Math.floor(y / PIXEL_SIZE), 1);
  };

  PixelGrid.prototype._interpolateAndLight = function (x0, y0, x1, y1) {
    var dx   = x1 - x0;
    var dy   = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var step = PIXEL_SIZE * 0.4;
    var n    = Math.max(1, Math.ceil(dist / step));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      this._lightAt(x0 + dx * t, y0 + dy * t);
    }
  };

  /* ── Snakes ────────────────────────────────────────────────── */

  PixelGrid.prototype._randomDir = function () {
    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  };

  PixelGrid.prototype._randomSpeed = function () {
    return this.snakeSpeed * (0.67 + Math.random() * 0.67);
  };

  PixelGrid.prototype._createSnake = function () {
    return {
      col: Math.floor(Math.random() * this.cols),
      row: Math.floor(Math.random() * this.rows),
      dir: this._randomDir(),
      speed: this._randomSpeed(),
      acc: Math.random() * 2,
    };
  };

  PixelGrid.prototype._initSnakes = function () {
    this.snakes.length = 0;
    for (var i = 0; i < this.snakeCount; i++) {
      this.snakes.push(this._createSnake());
    }
  };

  PixelGrid.prototype._turnSnake = function (s) {
    var perp = DIRECTIONS.filter(function (d) {
      return d.dc !== s.dir.dc && d.dc !== -s.dir.dc;
    });
    s.dir = perp[Math.floor(Math.random() * perp.length)];
  };

  PixelGrid.prototype._updateSnakes = function (dt) {
    var turn  = this.snakeTurnChance;
    var bri   = this.snakeBrightness;

    for (var i = 0; i < this.snakes.length; i++) {
      var s = this.snakes[i];
      s.acc += s.speed * dt;

      while (s.acc >= 1) {
        s.acc -= 1;
        s.col += s.dir.dc;
        s.row += s.dir.dr;

        if (s.col < 0 || s.col >= this.cols || s.row < 0 || s.row >= this.rows) {
          var fresh = this._createSnake();
          s.col = fresh.col;
          s.row = fresh.row;
          s.dir = fresh.dir;
          s.acc = 0;
          break;
        }

        this.lightCell(s.col, s.row, bri);

        if (Math.random() < turn) {
          this._turnSnake(s);
          s.speed = this._randomSpeed();
        }
      }
    }
  };

  /* ── Mouse tracking ────────────────────────────────────────── */

  PixelGrid.prototype._setupMouse = function () {
    var self = this;

    if (this.isGlobal) {
      window.addEventListener('mousemove', function (e) {
        self.mouseX = e.clientX;
        self.mouseY = e.clientY;
      });
      document.addEventListener('mouseleave', function () {
        self.mouseX     = -1;
        self.mouseY     = -1;
        self.prevMouseX = -1;
        self.prevMouseY = -1;
      });
    } else {
      var parent = this.canvas.parentElement;
      parent.addEventListener('mousemove', function (e) {
        var rect = parent.getBoundingClientRect();
        self.mouseX = e.clientX - rect.left;
        self.mouseY = e.clientY - rect.top;
      });
      parent.addEventListener('mouseleave', function () {
        self.mouseX     = -1;
        self.mouseY     = -1;
        self.prevMouseX = -1;
        self.prevMouseY = -1;
      });
    }
  };

  /* ── Fade ──────────────────────────────────────────────────── */

  PixelGrid.prototype._fade = function () {
    var del = [];
    for (var entry of this.activeCells) {
      var next = entry[1] * this.persistence;
      if (next < MIN_BRIGHT) {
        del.push(entry[0]);
      } else {
        this.activeCells.set(entry[0], next);
      }
    }
    for (var i = 0; i < del.length; i++) this.activeCells.delete(del[i]);
  };

  /* ── Render ────────────────────────────────────────────────── */

  PixelGrid.prototype._render = function () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    var ps       = PIXEL_SIZE;
    var cellSize = ps - GAP;
    var offset   = GAP * 0.5;
    var levels   = COLOR_LEVELS;
    var cols     = this.cols;

    for (var entry of this.activeCells) {
      var key   = entry[0];
      var bri   = entry[1];
      var col   = key % cols;
      var row   = (key - col) / cols;
      var level = Math.min(levels, Math.round(bri * levels));
      if (level === 0) continue;

      this.ctx.fillStyle = this.colorLUT[level];
      this.ctx.fillRect(
        col * ps + offset,
        row * ps + offset,
        cellSize,
        cellSize
      );
    }
  };

  /* ── Update (called each frame) ────────────────────────────── */

  PixelGrid.prototype.update = function (dt) {
    if (this.enableCursor && this.mouseX >= 0) {
      if (this.prevMouseX >= 0) {
        this._interpolateAndLight(this.prevMouseX, this.prevMouseY, this.mouseX, this.mouseY);
      } else {
        this._lightAt(this.mouseX, this.mouseY);
      }
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
    }

    if (this.snakeCount > 0) {
      this._updateSnakes(dt);
    }

    this._fade();
    this._render();
  };

  /* ─── Gallery scroll ────────────────────────────────────────── */

  var galleryOffset   = 0;
  var galleryBaseSpeed = 30;       // px/s idle drift
  var galleryScrollBoost = 0;      // extra speed from scrolling
  var galleryStripWidth = 0;
  var galleryTrack = null;
  var gallerySection = null;
  var galleryStrips = [];
  var galleryItems = [];
  var lastScrollY = 0;
  var gallerySpeedPattern = [0.72, 0.94, 1.26, 1.08, 0.84];
  var galleryMaxScrollBoost = 220;
  var galleryIsVisible = true;
  var lastGalleryTransform = '';
  var lastGalleryParallaxBase = '';

  function applyGalleryImageStyles() {
    if (galleryItems.length === 0) return;

    var minArea = Infinity;
    var maxArea = 0;

    for (var i = 0; i < galleryItems.length; i++) {
      var item = galleryItems[i];
      var rect = item.getBoundingClientRect();
      var area = rect.width * rect.height;
      item._galleryArea = area;
      if (area < minArea) minArea = area;
      if (area > maxArea) maxArea = area;
    }

    var areaRange = Math.max(1, maxArea - minArea);

    for (var j = 0; j < galleryItems.length; j++) {
      var img = galleryItems[j];
      var sizeRatio = (img._galleryArea - minArea) / areaRange;
      var shadowAlpha = 0.18 + sizeRatio * 0.12;
      img.style.setProperty('--gallery-shadow-alpha', shadowAlpha.toFixed(3));
    }
  }

  function initGallery() {
    var track = document.querySelector('.gallery-track');
    if (!track) return;
    galleryTrack = track;
    gallerySection = track.closest('.bottom') || track;
    galleryStrips = track.querySelectorAll('.gallery-strip');
    galleryItems = [];
    if (galleryStrips.length > 0) {
      galleryStripWidth = galleryStrips[0].scrollWidth;
    }

    galleryStrips.forEach(function (strip) {
      var imgs = strip.querySelectorAll('img');
      var seamFactor = null;
      imgs.forEach(function (img, idx) {
        var speed = gallerySpeedPattern[idx % gallerySpeedPattern.length];
        var shiftFactor = 1 - speed;
        if (idx === 0) seamFactor = shiftFactor;
        if (idx === imgs.length - 1 && seamFactor !== null) {
          shiftFactor = seamFactor;
        }
        img.style.setProperty('--gallery-shift-factor', shiftFactor.toFixed(3));
        galleryItems.push(img);
      });
    });

    applyGalleryImageStyles();
    lastScrollY = window.scrollY;

    if ('IntersectionObserver' in window && gallerySection) {
      var galleryObserver = new IntersectionObserver(function (entries) {
        if (entries.length === 0) return;
        galleryIsVisible = entries[0].isIntersecting || entries[0].intersectionRatio > 0;
      }, {
        threshold: 0
      });
      galleryObserver.observe(gallerySection);
    }

    window.addEventListener('scroll', function () {
      var delta = Math.abs(window.scrollY - lastScrollY);
      galleryScrollBoost = Math.min(galleryMaxScrollBoost, galleryScrollBoost + delta * 3);
      lastScrollY = window.scrollY;
    }, { passive: true });
  }

  function updateGallery(dt) {
    if (galleryStripWidth === 0) return;

    galleryScrollBoost *= 0.92;
    if (galleryScrollBoost < 0.5) galleryScrollBoost = 0;

    var speed = galleryBaseSpeed + Math.min(galleryScrollBoost, galleryMaxScrollBoost);
    galleryOffset = (galleryOffset + speed * dt) % galleryStripWidth;

    if (!galleryIsVisible) {
      lastGalleryTransform = '';
      lastGalleryParallaxBase = '';
      return;
    }

    var tx = 'translate3d(' + (-galleryOffset).toFixed(2) + 'px, 0, 0)';
    if (tx !== lastGalleryTransform) {
      for (var i = 0; i < galleryStrips.length; i++) {
        galleryStrips[i].style.transform = tx;
      }
      lastGalleryTransform = tx;
    }

    var parallaxBase = galleryOffset.toFixed(2) + 'px';
    if (galleryTrack && parallaxBase !== lastGalleryParallaxBase) {
      galleryTrack.style.setProperty('--gallery-parallax-base', parallaxBase);
      lastGalleryParallaxBase = parallaxBase;
    }
  }

  /* ─── Photo gallery strip ──────────────────────────────────── */

  var photoOffset = 0;
  var photoStripWidth = 0;
  var photoStrips = [];

  function initPhotoStrip() {
    var track = document.querySelector('.photo-strip-track');
    if (!track) return;
    photoStrips = track.querySelectorAll('.photo-strip');
    if (photoStrips.length > 0) {
      photoStripWidth = photoStrips[0].scrollWidth;
    }
  }

  function updatePhotoStrip(dt) {
    if (photoStripWidth === 0) return;
    photoOffset = (photoOffset + 40 * dt) % photoStripWidth;
    var tx = 'translateX(' + (-photoOffset) + 'px)';
    for (var i = 0; i < photoStrips.length; i++) {
      photoStrips[i].style.transform = tx;
    }
  }

  /* ─── Speaker hover preview ─────────────────────────────────── */

  var speakerPhotos = [
    'JS1_5356','JS1_5391','JS1_5421','JS1_5460','JS1_5497',
    'JS1_5533','JS1_5572','JS1_5613','JS1_5656','JS1_5706',
    'JS1_5757','JS1_5813','JS1_5876','JS1_5952','JS1_6034',
    'JS1_5367','JS1_5412','JS1_5465','JS1_5509','JS1_5553',
    'JS1_5598','JS1_5641','JS1_5685','JS1_5731','JS1_5779',
  ];

  function initSpeakerPreview() {
    var preview = document.getElementById('speaker-preview');
    if (!preview) return;
    var img = preview.querySelector('img');
    var speakers = document.querySelectorAll('.speaker');
    var active = false;

    speakers.forEach(function (el, idx) {
      var photo = 'assets/img-webp/' + speakerPhotos[idx % speakerPhotos.length] + '.webp';

      el.addEventListener('mouseenter', function () {
        img.src = photo;
        active = true;
        preview.classList.add('visible');
      });

      el.addEventListener('mouseleave', function () {
        active = false;
        preview.classList.remove('visible');
      });
    });

    window.addEventListener('mousemove', function (e) {
      if (!active) return;
      var gx = Math.floor(e.clientX / PIXEL_SIZE) * PIXEL_SIZE;
      var gy = Math.floor(e.clientY / PIXEL_SIZE) * PIXEL_SIZE;
      preview.style.transform = 'translate3d(' + (gx + 18) + 'px,' + (gy - 170) + 'px, 0)';
    });
  }

  /* ─── Full program: day tabs + click overlay detail ─────────── */

  function initFullProgram() {
    var tabs = document.querySelectorAll('.fp-tab');
    var dayLists = document.querySelectorAll('.fp-day-list');
    var detail = document.getElementById('fp-detail');
    var detailCol = document.getElementById('fp-detail-col');
    var detailClose = document.getElementById('fp-detail-close');
    var detailBackdrop = document.getElementById('fp-detail-backdrop');
    if (!detail || !detailCol || tabs.length === 0) return;

    var detailTitle    = detail.querySelector('.fp-detail-title');
    var detailImg      = detail.querySelector('.fp-detail-image img');
    var detailText     = detail.querySelector('.fp-detail-text');
    var detailLocation = detail.querySelector('.fp-detail-location-text');
    var detailTags     = detail.querySelector('.fp-detail-tags');
    var talks          = document.querySelectorAll('.fp-entry--talk');
    var activeEntry    = null;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var day = tab.getAttribute('data-fp-day');
        tabs.forEach(function (t) { t.classList.remove('fp-tab--active'); });
        tab.classList.add('fp-tab--active');
        dayLists.forEach(function (dl) {
          dl.classList.toggle('fp-day-list--active', dl.getAttribute('data-fp-day') === day);
        });
        closeDetail();
      });
    });

    function showDetail(entry) {
      if (activeEntry) activeEntry.classList.remove('fp-entry--active');
      activeEntry = entry;
      entry.classList.add('fp-entry--active');
      detail.classList.add('fp-detail--active');
      detailCol.classList.add('fp-detail-col--open');
      detailCol.setAttribute('aria-hidden', 'false');
      document.body.classList.add('fp-detail-open');

      detailTitle.textContent    = entry.getAttribute('data-title') || '';
      detailText.textContent     = entry.getAttribute('data-desc')  || '';
      detailLocation.textContent = entry.getAttribute('data-location') || '';

      var tags = (entry.getAttribute('data-tags') || '').split(',').filter(Boolean);
      detailTags.innerHTML = '';
      tags.forEach(function (t) {
        var span = document.createElement('span');
        span.className = 'fp-detail-tag';
        span.textContent = t.trim();
        detailTags.appendChild(span);
      });

      var rndPhoto = speakerPhotos[Math.floor(Math.random() * speakerPhotos.length)];
      detailImg.src = 'assets/img-webp/' + rndPhoto + '.webp';
      detailImg.alt = detailTitle.textContent;

      if (detailClose) detailClose.focus();
    }

    function closeDetail() {
      if (activeEntry) {
        activeEntry.classList.remove('fp-entry--active');
        activeEntry = null;
      }

      detail.classList.remove('fp-detail--active');
      detailCol.classList.remove('fp-detail-col--open');
      detailCol.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('fp-detail-open');
    }

    talks.forEach(function (entry) {
      entry.addEventListener('click', function () {
        if (activeEntry === entry && detailCol.classList.contains('fp-detail-col--open')) {
          closeDetail();
          return;
        }

        showDetail(entry);
      });
    });

    if (detailClose) {
      detailClose.addEventListener('click', closeDetail);
    }

    if (detailBackdrop) {
      detailBackdrop.addEventListener('click', closeDetail);
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && detailCol.classList.contains('fp-detail-col--open')) {
        closeDetail();
      }
    });
  }

  /* ─── Live ticket preview ──────────────────────────────────── */

  function initLiveTicket() {
    var fname      = document.getElementById('fname');
    var lname      = document.getElementById('lname');
    var email      = document.getElementById('email');
    var org        = document.getElementById('org');
    var tName      = document.getElementById('ticket-name');
    var tEmail     = document.getElementById('ticket-email');
    var tOrg       = document.getElementById('ticket-org');
    var rowName    = document.getElementById('ticket-row-name');
    var rowEmail   = document.getElementById('ticket-row-email');
    var rowOrg     = document.getElementById('ticket-row-org');
    var motivation = document.getElementById('ticket-motivation');
    var liveFields = document.getElementById('ticket-live-fields');

    if (!fname || !tName) return;

    function hasAnyInput() {
      return (fname.value + lname.value + email.value + org.value).trim().length > 0;
    }

    function toggleSections() {
      var filled = hasAnyInput();
      motivation.style.display = filled ? 'none' : '';
      if (filled) {
        liveFields.classList.add('is-active');
      } else {
        liveFields.classList.remove('is-active');
      }
    }

    function setField(el, row, value) {
      var v = value.trim();
      if (v) {
        el.textContent = v;
        row.style.display = '';
      } else {
        el.textContent = '';
        row.style.display = 'none';
      }
      toggleSections();
    }

    function updateName() {
      var full = ((fname.value || '') + ' ' + (lname.value || '')).trim();
      setField(tName, rowName, full);
    }

    fname.addEventListener('input', updateName);
    lname.addEventListener('input', updateName);
    email.addEventListener('input', function () { setField(tEmail, rowEmail, email.value); });
    org.addEventListener('input',   function () { setField(tOrg,   rowOrg,   org.value); });

    setField(tName,  rowName,  '');
    setField(tEmail, rowEmail, '');
    setField(tOrg,   rowOrg,   '');
    toggleSections();
  }

  /* ─── Bootstrap ────────────────────────────────────────────── */

  var grids    = [];
  var lastTime = 0;

  function loop(time) {
    var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    for (var i = 0; i < grids.length; i++) grids[i].update(dt);
    updateGallery(dt);
    updatePhotoStrip(dt);
    requestAnimationFrame(loop);
  }

  function init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.documentElement.style.setProperty('--pixel-size', PIXEL_SIZE + 'px');

    /* Dark zones → autonomous snakes */
    var darkCanvases = document.querySelectorAll('.dark-zone .zone-canvas');
    for (var i = 0; i < darkCanvases.length; i++) {
      grids.push(new PixelGrid(darkCanvases[i], {
        colorBright:    { r: 201, g: 221, b: 3 },
        colorDim:       { r: 80,  g: 90,  b: 2 },
        maxAlpha:       0.72,
        snakeCount:     10,
        snakeSpeed:     5.5,
        snakeTurnChance: 0.2,
        snakeBrightness: 0.85,
        persistence:    0.982,
        enableCursor:   false,
      }));
    }

    /* Global canvas → cursor trail across the whole viewport */
    var globalCanvas = document.getElementById('global-canvas');
    if (globalCanvas) {
      grids.push(new PixelGrid(globalCanvas, {
        colorBright:  { r: 201, g: 221, b: 3 },
        colorDim:     { r: 80,  g: 90,  b: 2 },
        maxAlpha:     0.55,
        snakeCount:   0,
        persistence:  0.955,
        enableCursor: true,
        isGlobal:     true,
      }));
    }

    initGallery();
    initPhotoStrip();
    initSpeakerPreview();
    initFullProgram();
    initLiveTicket();

    window.addEventListener('resize', function () {
      for (var k = 0; k < grids.length; k++) grids[k].resize();
      if (galleryStrips.length > 0) {
        galleryStripWidth = galleryStrips[0].scrollWidth;
        applyGalleryImageStyles();
      }
      if (photoStrips.length > 0) {
        photoStripWidth = photoStrips[0].scrollWidth;
      }
    });

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
