/* IWAI homepage motion: living network in the hero, parallax, scroll reveals.
   No dependencies. Does nothing for visitors who ask for reduced motion, and the
   page is complete without it. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js');

  var hero = document.querySelector('.hero');
  var heroWrap = hero.querySelector('.wrap');
  var motif = hero.querySelector('.motif');
  var canvas = hero.querySelector('.field');
  var ctx = canvas.getContext('2d');
  var progress = document.querySelector('.bar .progress');
  var kyoto = document.querySelector('.kyoto');
  var kyotoImg = kyoto.querySelector('.kyoto-img');
  var kyotoWrap = kyoto.querySelector('.wrap');

  /* ---------- Scroll reveals ---------- */
  var revealItems = document.querySelectorAll(
    '.block .eyebrow, .statement, .note, .person, .past .eyebrow, .past h2, .edition, .follow .wrap > *, .kyoto .wrap > *'
  );
  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add('in');
      revealer.unobserve(el);
      /* Hand the element back to its own hover transitions afterwards */
      setTimeout(function () {
        el.classList.remove('reveal', 'in');
        el.style.transitionDelay = '';
      }, 1500);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

  revealItems.forEach(function (el) {
    var index = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(index * 70, 420) + 'ms';
    el.classList.add('reveal');
    revealer.observe(el);
  });

  /* ---------- Kyoto photo: each depth layer moves at its own speed ---------- */
  var scene = { p: 0, tp: 0, h: 0, mx: 0, my: 0, tmx: 0, tmy: 0, visible: false, running: false, first: true };
  var layers = Array.prototype.map.call(kyotoImg.querySelectorAll('i'), function (el) {
    return { el: el, y: parseFloat(el.getAttribute('data-y')), x: parseFloat(el.getAttribute('data-x')) };
  });

  function sceneFrame() {
    if (!scene.visible) { scene.running = false; return; }
    /* Jump to the right position the first time, then glide */
    scene.p = scene.first ? scene.tp : scene.p + (scene.tp - scene.p) * 0.12;
    scene.first = false;
    scene.mx += (scene.tmx - scene.mx) * 0.06;
    scene.my += (scene.tmy - scene.my) * 0.06;
    layers.forEach(function (l) {
      var x = -scene.mx * l.x;
      var y = scene.p * scene.h * l.y - scene.my * l.x * 0.5;
      l.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
    });
    kyotoWrap.style.transform = 'translate3d(0,' + (scene.p * 26).toFixed(1) + 'px,0)';
    requestAnimationFrame(sceneFrame);
  }

  new IntersectionObserver(function (entries) {
    scene.visible = entries[0].isIntersecting;
    if (scene.visible && !scene.running) {
      scene.running = true;
      requestAnimationFrame(sceneFrame);
    }
  }, { rootMargin: '80px 0px' }).observe(kyoto);

  kyoto.addEventListener('mousemove', function (ev) {
    var rect = kyoto.getBoundingClientRect();
    scene.tmx = (ev.clientX - rect.left) / rect.width * 2 - 1;
    scene.tmy = (ev.clientY - rect.top) / rect.height * 2 - 1;
  });
  kyoto.addEventListener('mouseleave', function () {
    scene.tmx = 0;
    scene.tmy = 0;
  });

  /* ---------- Scroll: progress line, hero drift, Kyoto depth ---------- */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset;
    var doc = document.documentElement;
    var range = doc.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (range > 0 ? y / range : 0) + ')';

    var heroH = hero.offsetHeight;
    if (y < heroH) {
      heroWrap.style.transform = 'translate3d(0,' + (y * 0.1).toFixed(1) + 'px,0)';
      heroWrap.style.opacity = Math.max(0, 1 - (y / heroH) * 0.85).toFixed(3);
      motif.style.setProperty('--sy', (y * 0.3).toFixed(1) + 'px');
    }

    var rect = kyoto.getBoundingClientRect();
    var mid = rect.top + rect.height / 2 - window.innerHeight / 2;
    scene.tp = Math.max(-1, Math.min(1, mid / (window.innerHeight / 2 + rect.height / 2)));
    scene.h = rect.height;
  }
  function requestScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);
  onScroll();

  /* ---------- Hero field: drifting nodes, links, signals along the links ---------- */
  var GOLD = '205,170,76';
  var W = 0, H = 0, dpr = 1, linkDist = 150;
  var nodes = [], links = [], signals = [];
  var mouse = { x: 0, y: 0, on: false, glow: 0 };
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  function fade(x) {
    /* Quieter behind the headline, stronger towards the right */
    var floor = W < 700 ? 0.42 : 0.14;
    var t = Math.max(0, Math.min(1, (x / W - 0.2) / 0.42));
    return floor + (1 - floor) * t * t * (3 - 2 * t);
  }

  function makeNode() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.34,
      r: 1 + Math.random() * 1.7,
      ox: 0,
      oy: 0
    };
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    linkDist = W < 700 ? 110 : 150;
    var count = W < 700 ? 34 : W < 1100 ? 56 : 80;
    while (nodes.length < count) nodes.push(makeNode());
    nodes.length = count;
    signals = [];
    nodes.forEach(function (n) {
      if (n.x > W) n.x = Math.random() * W;
      if (n.y > H) n.y = Math.random() * H;
    });
  }

  function step(dt) {
    var reach = 190;
    nodes.forEach(function (n) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;

      /* Nodes lean towards the cursor and settle back when it leaves */
      var tx = 0, ty = 0;
      if (mouse.on) {
        var dx = mouse.x - n.x, dy = mouse.y - n.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < reach) {
          var pull = (1 - d / reach) * 0.3;
          tx = dx * pull;
          ty = dy * pull;
        }
      }
      n.ox += (tx - n.ox) * 0.07 * dt;
      n.oy += (ty - n.oy) * 0.07 * dt;
    });

    links.length = 0;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var ddx = a.x + a.ox - b.x - b.ox, ddy = a.y + a.oy - b.y - b.oy;
        var dist2 = ddx * ddx + ddy * ddy;
        if (dist2 < linkDist * linkDist) links.push({ a: a, b: b, d: Math.sqrt(dist2) });
      }
    }

    if (signals.length < 7 && links.length && Math.random() < 0.05 * dt) {
      var l = links[Math.floor(Math.random() * links.length)];
      signals.push({ from: l.a, to: l.b, t: 0, s: 0.016 + Math.random() * 0.014 });
    }
    for (var k = signals.length - 1; k >= 0; k--) {
      var sig = signals[k];
      sig.t += sig.s * dt;
      if (sig.t < 1) continue;
      /* A signal passes on to a neighbouring node about half the time */
      var next = Math.random() < 0.55 ? links.filter(function (e) {
        return (e.a === sig.to && e.b !== sig.from) || (e.b === sig.to && e.a !== sig.from);
      }) : [];
      if (next.length) {
        var e = next[Math.floor(Math.random() * next.length)];
        sig.to = e.a === sig.to ? e.b : e.a;
        sig.from = e.a === sig.to ? e.b : e.a;
        sig.t = 0;
      } else {
        signals.splice(k, 1);
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* Soft light under the cursor */
    mouse.glow += ((mouse.on ? 1 : 0) - mouse.glow) * 0.06;
    if (mouse.glow > 0.01) {
      var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 340);
      g.addColorStop(0, 'rgba(' + GOLD + ',' + (0.13 * mouse.glow).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + GOLD + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(mouse.x - 340, mouse.y - 340, 680, 680);
    }

    ctx.lineWidth = 1;
    links.forEach(function (l) {
      var alpha = (1 - l.d / linkDist) * 0.42 * Math.min(fade(l.a.x), fade(l.b.x));
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(l.a.x + l.a.ox, l.a.y + l.a.oy);
      ctx.lineTo(l.b.x + l.b.ox, l.b.y + l.b.oy);
      ctx.stroke();
    });

    if (mouse.glow > 0.01) {
      nodes.forEach(function (n) {
        var dx = mouse.x - n.x - n.ox, dy = mouse.y - n.y - n.oy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 170) return;
        ctx.strokeStyle = 'rgba(226,198,117,' + ((1 - d / 170) * 0.55 * mouse.glow).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(n.x + n.ox, n.y + n.oy);
        ctx.stroke();
      });
    }

    nodes.forEach(function (n) {
      ctx.fillStyle = 'rgba(' + GOLD + ',' + (0.85 * fade(n.x)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(n.x + n.ox, n.y + n.oy, n.r, 0, 6.2832);
      ctx.fill();
    });

    signals.forEach(function (s) {
      var x = s.from.x + s.from.ox + (s.to.x + s.to.ox - s.from.x - s.from.ox) * s.t;
      var y = s.from.y + s.from.oy + (s.to.y + s.to.oy - s.from.y - s.from.oy) * s.t;
      var f = fade(x);
      ctx.fillStyle = 'rgba(226,198,117,' + (0.22 * f).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,' + f.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, 6.2832);
      ctx.fill();
    });

    /* The large logo network sits deeper and moves against the cursor */
    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;
    motif.style.setProperty('--mx', tilt.x.toFixed(1) + 'px');
    motif.style.setProperty('--my', tilt.y.toFixed(1) + 'px');
  }

  var running = false, visible = true, last = 0;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    var dt = Math.min((now - last) / 16.67, 3) || 1;
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  hero.addEventListener('mousemove', function (ev) {
    var rect = hero.getBoundingClientRect();
    mouse.x = ev.clientX - rect.left;
    mouse.y = ev.clientY - rect.top;
    mouse.on = true;
    tilt.tx = (mouse.x / W - 0.5) * -34;
    tilt.ty = (mouse.y / H - 0.5) * -24;
  });
  hero.addEventListener('mouseleave', function () {
    mouse.on = false;
    tilt.tx = 0;
    tilt.ty = 0;
  });

  /* Stop drawing whenever the hero is off screen or the tab is hidden */
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    start();
  }).observe(hero);
  document.addEventListener('visibilitychange', start);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  start();
})();
