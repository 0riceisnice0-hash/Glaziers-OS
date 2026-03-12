// assets/js/builders/ProductBuilders.js
// Extended Three.js builders for all WindowCAD-style product types
window.GOSBuilders = window.GOSBuilders || {};

(function() {
  'use strict';

  /* ── helpers ──────────────────────────────────────────── */
  function frameMat(color, metalness) {
    return new THREE.MeshStandardMaterial({
      color: color || 0xffffff,
      metalness: metalness || 0.3,
      roughness: 0.6
    });
  }

  function glassMat(color) {
    return new THREE.MeshPhysicalMaterial({
      color: color || 0xADD8E6,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0,
      metalness: 0,
      ior: 1.5
    });
  }

  function panelMat(color) {
    return new THREE.MeshStandardMaterial({
      color: color || 0xffffff,
      metalness: 0.1,
      roughness: 0.8
    });
  }

  function handleMat(color) {
    return new THREE.MeshStandardMaterial({
      color: color || 0x808080,
      metalness: 0.6,
      roughness: 0.3
    });
  }

  function addFrame(group, w, h, thk, depth, mat) {
    // top rail
    var geo = new THREE.BoxGeometry(w, thk, depth);
    var m = new THREE.Mesh(geo, mat);
    m.position.set(0, (h - thk) / 2, 0);
    group.add(m);
    // bottom rail
    m = new THREE.Mesh(geo, mat);
    m.position.set(0, -(h - thk) / 2, 0);
    group.add(m);
    // left stile
    geo = new THREE.BoxGeometry(thk, h, depth);
    m = new THREE.Mesh(geo, mat);
    m.position.set(-(w - thk) / 2, 0, 0);
    group.add(m);
    // right stile
    m = new THREE.Mesh(geo, mat);
    m.position.set((w - thk) / 2, 0, 0);
    group.add(m);
  }

  function addOuterFrame(group, w, h, thk, depth, mat) {
    var ot = thk * 0.5;
    var od = depth + 0.02;
    var gH = new THREE.BoxGeometry(w + 2 * ot, ot, od);
    var gV = new THREE.BoxGeometry(ot, h + 2 * ot, od);
    var t = new THREE.Mesh(gH, mat);
    t.position.set(0, h / 2 + ot / 2, 0);
    group.add(t);
    var b = new THREE.Mesh(gH, mat);
    b.position.set(0, -h / 2 - ot / 2, 0);
    group.add(b);
    var l = new THREE.Mesh(gV, mat);
    l.position.set(-w / 2 - ot / 2, 0, 0);
    group.add(l);
    var r = new THREE.Mesh(gV, mat);
    r.position.set(w / 2 + ot / 2, 0, 0);
    group.add(r);
  }

  function addGlass(group, w, h, depth, gMat) {
    var inset = 0.02;
    var gW = w - inset;
    var gH = h - inset;
    var outer = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gMat);
    outer.position.set(0, 0, depth / 2 + 0.001);
    group.add(outer);
    var inner = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gMat);
    inner.position.set(0, 0, depth / 2 - 0.01);
    group.add(inner);
  }

  function addHandle(group, x, y, z, hMat) {
    // base plate
    var base = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.015), hMat);
    base.position.set(x, y, z);
    group.add(base);
    // lever
    var lever = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8), hMat);
    lever.rotation.z = Math.PI / 2;
    lever.position.set(x + 0.04, y + 0.02, z + 0.01);
    group.add(lever);
  }

  function defaultOpts(opts) {
    return {
      width: opts.width || 0.9,
      height: opts.height || 1.2,
      frameDepth: opts.frameDepth || 0.07,
      frameThk: opts.frameThk || 0.045,
      frameColor: opts.frameColor != null ? opts.frameColor : 0xffffff,
      glassColor: opts.glassColor != null ? opts.glassColor : 0xADD8E6,
      handleColor: opts.handleColor != null ? opts.handleColor : 0x808080
    };
  }

  /* ── uPVC Window (casement) ───────────────────────────── */
  window.GOSBuilders.upvcWindow = function(opts) {
    var o = defaultOpts(opts);
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    var mO = frameMat(o.frameColor, 0.2);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mO);
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // mullion
    var mul = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.8, o.height - 2 * o.frameThk, o.frameDepth), mF);
    g.add(mul);
    // glass L & R
    var gW = (o.width - 2 * o.frameThk - o.frameThk * 0.8) / 2 - 0.02;
    var gH = o.height - 2 * o.frameThk - 0.02;
    var gM = glassMat(o.glassColor);
    var gl = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gl.position.set(-(gW / 2 + o.frameThk * 0.4 + 0.01), 0, o.frameDepth / 2 + 0.001);
    g.add(gl);
    var gr = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gr.position.set(gW / 2 + o.frameThk * 0.4 + 0.01, 0, o.frameDepth / 2 + 0.001);
    g.add(gr);
    addHandle(g, o.width / 2 - o.frameThk - 0.04, 0, o.frameDepth / 2 + 0.02, handleMat(o.handleColor));
    return g;
  };

  /* ── Sash Window ──────────────────────────────────────── */
  window.GOSBuilders.sashWindow = function(opts) {
    var o = defaultOpts(opts);
    o.height = o.height || 1.4;
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    var mO = frameMat(o.frameColor, 0.2);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mO);
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // horizontal meeting rail
    var railY = -o.height * 0.05;
    var rail = new THREE.Mesh(new THREE.BoxGeometry(o.width - 2 * o.frameThk, o.frameThk * 0.8, o.frameDepth + 0.01), mF);
    rail.position.set(0, railY, 0);
    g.add(rail);
    // horizontal glazing bars in each sash
    var barThk = o.frameThk * 0.4;
    // upper sash bar
    var uBarY = railY + (o.height / 2 - o.frameThk - railY) / 2;
    var uBar = new THREE.Mesh(new THREE.BoxGeometry(o.width - 2 * o.frameThk, barThk, o.frameDepth * 0.8), mF);
    uBar.position.set(0, uBarY, 0.005);
    g.add(uBar);
    // glass upper top
    var gM = glassMat(o.glassColor);
    var gW = o.width - 2 * o.frameThk - 0.02;
    var topH = (o.height / 2 - o.frameThk) - railY - o.frameThk * 0.4 - 0.02;
    var gTop = new THREE.Mesh(new THREE.PlaneGeometry(gW, topH / 2), gM);
    gTop.position.set(0, uBarY + topH / 4 + barThk / 2, o.frameDepth / 2 + 0.001);
    g.add(gTop);
    var gMid = new THREE.Mesh(new THREE.PlaneGeometry(gW, topH / 2), gM);
    gMid.position.set(0, uBarY - topH / 4 - barThk / 2, o.frameDepth / 2 + 0.001);
    g.add(gMid);
    // glass lower
    var botH = Math.abs(railY - (-o.height / 2 + o.frameThk)) - o.frameThk * 0.4 - 0.02;
    var botY = railY - o.frameThk * 0.4 - botH / 2 - 0.01;
    var gBot = new THREE.Mesh(new THREE.PlaneGeometry(gW, botH), gM);
    gBot.position.set(0, botY, o.frameDepth / 2 + 0.001);
    g.add(gBot);
    // crescent lock
    var lk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 12), handleMat(o.handleColor));
    lk.rotation.x = Math.PI / 2;
    lk.position.set(0, railY, o.frameDepth / 2 + 0.015);
    g.add(lk);
    return g;
  };

  /* ── Aluminium Window ─────────────────────────────────── */
  window.GOSBuilders.aluminiumWindow = function(opts) {
    var o = defaultOpts(opts);
    var g = new THREE.Group();
    var darkFrame = 0x3a3a3a;
    var mF = frameMat(darkFrame, 0.5);
    var mO = frameMat(darkFrame, 0.4);
    addOuterFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mO);
    addFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mF);
    // thinner mullion
    var mul = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.5, o.height - 2 * o.frameThk * 0.8, o.frameDepth), mF);
    g.add(mul);
    var gM = glassMat(o.glassColor);
    var gW = (o.width - 2 * o.frameThk * 0.8 - o.frameThk * 0.5) / 2 - 0.02;
    var gH = o.height - 2 * o.frameThk * 0.8 - 0.02;
    var gL = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gL.position.set(-(gW / 2 + o.frameThk * 0.25 + 0.01), 0, o.frameDepth / 2 + 0.001);
    g.add(gL);
    var gR = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gR.position.set(gW / 2 + o.frameThk * 0.25 + 0.01, 0, o.frameDepth / 2 + 0.001);
    g.add(gR);
    addHandle(g, o.width / 2 - o.frameThk * 0.8 - 0.04, 0, o.frameDepth / 2 + 0.02, handleMat(0x333333));
    return g;
  };

  /* ── Composite Door ───────────────────────────────────── */
  window.GOSBuilders.compositeDoor = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 0.9;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    var mO = frameMat(o.frameColor, 0.2);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mO);
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // door panel (solid with raised sections)
    var pW = o.width - 2 * o.frameThk - 0.02;
    var pH = o.height - 2 * o.frameThk - 0.02;
    // main panel
    var panel = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, o.frameDepth * 0.8), panelMat(o.frameColor));
    g.add(panel);
    // upper glass insert (small window)
    var glW = pW * 0.5;
    var glH = pH * 0.25;
    var glY = pH * 0.25;
    var gM = glassMat(o.glassColor);
    var glassInsert = new THREE.Mesh(new THREE.PlaneGeometry(glW, glH), gM);
    glassInsert.position.set(0, glY, o.frameDepth * 0.4 + 0.001);
    g.add(glassInsert);
    // glass frame around insert
    var gfMat = frameMat(o.frameColor);
    var gfThk = 0.02;
    // top
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(glW + gfThk * 2, gfThk, 0.02), gfMat), { position: new THREE.Vector3(0, glY + glH / 2 + gfThk / 2, o.frameDepth * 0.4) }));
    // bottom
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(glW + gfThk * 2, gfThk, 0.02), gfMat), { position: new THREE.Vector3(0, glY - glH / 2 - gfThk / 2, o.frameDepth * 0.4) }));
    // left
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(gfThk, glH, 0.02), gfMat), { position: new THREE.Vector3(-glW / 2 - gfThk / 2, glY, o.frameDepth * 0.4) }));
    // right
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(gfThk, glH, 0.02), gfMat), { position: new THREE.Vector3(glW / 2 + gfThk / 2, glY, o.frameDepth * 0.4) }));
    // raised lower panels
    var rpH = pH * 0.2;
    var rp1 = new THREE.Mesh(new THREE.BoxGeometry(pW * 0.7, rpH, 0.01), frameMat(o.frameColor, 0.15));
    rp1.position.set(0, -pH * 0.1, o.frameDepth * 0.4 + 0.005);
    g.add(rp1);
    var rp2 = new THREE.Mesh(new THREE.BoxGeometry(pW * 0.7, rpH, 0.01), frameMat(o.frameColor, 0.15));
    rp2.position.set(0, -pH * 0.35, o.frameDepth * 0.4 + 0.005);
    g.add(rp2);
    addHandle(g, o.width / 2 - o.frameThk - 0.06, 0, o.frameDepth / 2 + 0.02, handleMat(o.handleColor));
    return g;
  };

  /* ── uPVC Door ────────────────────────────────────────── */
  window.GOSBuilders.upvcDoor = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 0.9;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, frameMat(o.frameColor, 0.2));
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // mid rail
    var midY = -o.height * 0.1;
    var midRail = new THREE.Mesh(new THREE.BoxGeometry(o.width - 2 * o.frameThk, o.frameThk, o.frameDepth), mF);
    midRail.position.set(0, midY, 0);
    g.add(midRail);
    // upper glass
    var gW = o.width - 2 * o.frameThk - 0.02;
    var glassH = (o.height / 2 - o.frameThk) - midY - o.frameThk / 2 - 0.02;
    var glassY = midY + o.frameThk / 2 + glassH / 2 + 0.01;
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(gW, glassH), glassMat(o.glassColor));
    glass.position.set(0, glassY, o.frameDepth / 2 + 0.001);
    g.add(glass);
    // lower panel
    var panelH = Math.abs(-o.height / 2 + o.frameThk - midY + o.frameThk / 2) - 0.02;
    var panelY = midY - o.frameThk / 2 - panelH / 2 - 0.01;
    var panel = new THREE.Mesh(new THREE.BoxGeometry(gW, panelH, o.frameDepth * 0.8), panelMat(o.frameColor));
    panel.position.set(0, panelY, 0);
    g.add(panel);
    addHandle(g, o.width / 2 - o.frameThk - 0.06, 0, o.frameDepth / 2 + 0.02, handleMat(o.handleColor));
    return g;
  };

  /* ── uPVC French Doors ────────────────────────────────── */
  window.GOSBuilders.frenchDoors = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 1.5;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    var mO = frameMat(o.frameColor, 0.2);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mO);
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // central mullion
    var mul = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk, o.height - 2 * o.frameThk, o.frameDepth), mF);
    g.add(mul);
    // mid rail on each door leaf
    var midY = -o.height * 0.15;
    var leafW = (o.width - 2 * o.frameThk - o.frameThk) / 2;
    [-1, 1].forEach(function(side) {
      var cx = side * (leafW / 2 + o.frameThk / 2);
      // mid rail
      var rail = new THREE.Mesh(new THREE.BoxGeometry(leafW, o.frameThk * 0.6, o.frameDepth), mF);
      rail.position.set(cx, midY, 0);
      g.add(rail);
      // upper glass
      var gW = leafW - 0.02;
      var glH = (o.height / 2 - o.frameThk) - midY - o.frameThk * 0.3 - 0.02;
      var glY = midY + o.frameThk * 0.3 + glH / 2 + 0.01;
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(gW, glH), glassMat(o.glassColor));
      gl.position.set(cx, glY, o.frameDepth / 2 + 0.001);
      g.add(gl);
      // lower glass
      var lH = Math.abs(-o.height / 2 + o.frameThk - midY + o.frameThk * 0.3) - 0.04;
      var lY = midY - o.frameThk * 0.3 - lH / 2 - 0.01;
      var lG = new THREE.Mesh(new THREE.PlaneGeometry(gW, lH), glassMat(o.glassColor));
      lG.position.set(cx, lY, o.frameDepth / 2 + 0.001);
      g.add(lG);
      // handle
      addHandle(g, cx + side * (leafW / 2 - 0.06), 0, o.frameDepth / 2 + 0.02, handleMat(o.handleColor));
    });
    return g;
  };

  /* ── uPVC Sliding Patio Doors ─────────────────────────── */
  window.GOSBuilders.slidingPatioDoors = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 1.8;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var mF = frameMat(o.frameColor);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, frameMat(o.frameColor, 0.2));
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // vertical divider
    var mul = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.6, o.height - 2 * o.frameThk, o.frameDepth + 0.01), mF);
    g.add(mul);
    // glass panels (left fixed, right sliding)
    var gM = glassMat(o.glassColor);
    var gW = (o.width - 2 * o.frameThk - o.frameThk * 0.6) / 2 - 0.02;
    var gH = o.height - 2 * o.frameThk - 0.02;
    // left glass
    var gL = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gL.position.set(-(gW / 2 + o.frameThk * 0.3 + 0.01), 0, o.frameDepth / 2 + 0.001);
    g.add(gL);
    // right glass (slightly offset Z to show it's sliding)
    var gR = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    gR.position.set(gW / 2 + o.frameThk * 0.3 + 0.01, 0, o.frameDepth / 2 + 0.008);
    g.add(gR);
    // right panel outer frame (shows it's a separate sliding panel)
    var rpf = frameMat(o.frameColor, 0.35);
    var rpTop = new THREE.Mesh(new THREE.BoxGeometry(gW + 0.01, o.frameThk * 0.4, o.frameDepth * 0.5), rpf);
    rpTop.position.set(gW / 2 + o.frameThk * 0.3 + 0.01, gH / 2 + 0.005, 0.01);
    g.add(rpTop);
    var rpBot = new THREE.Mesh(new THREE.BoxGeometry(gW + 0.01, o.frameThk * 0.4, o.frameDepth * 0.5), rpf);
    rpBot.position.set(gW / 2 + o.frameThk * 0.3 + 0.01, -gH / 2 - 0.005, 0.01);
    g.add(rpBot);
    // sliding handle (D handle)
    var hM = handleMat(o.handleColor);
    var hx = o.frameThk * 0.3 + 0.03;
    var hBase = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), hM);
    hBase.position.set(hx, 0, o.frameDepth / 2 + 0.02);
    g.add(hBase);
    return g;
  };

  /* ── Aluminium Bifolding Doors ────────────────────────── */
  window.GOSBuilders.bifoldingDoors = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 2.4;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var darkFrame = 0x3a3a3a;
    var mF = frameMat(darkFrame, 0.5);
    addOuterFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, frameMat(darkFrame, 0.4));
    addFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mF);
    // 4 folding panels
    var panels = 4;
    var leafW = (o.width - 2 * o.frameThk * 0.8) / panels;
    var gM = glassMat(o.glassColor);
    var gH = o.height - 2 * o.frameThk * 0.8 - 0.02;
    for (var i = 0; i < panels; i++) {
      var cx = -o.width / 2 + o.frameThk * 0.8 + leafW * (i + 0.5);
      // vertical divider (thinner mullion between panels)
      if (i > 0) {
        var div = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.4, o.height - 2 * o.frameThk * 0.8, o.frameDepth), mF);
        div.position.set(cx - leafW / 2, 0, 0);
        g.add(div);
      }
      // glass
      var pGW = leafW - o.frameThk * 0.4 - 0.01;
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(pGW, gH), gM);
      gl.position.set(cx, 0, o.frameDepth / 2 + 0.001);
      g.add(gl);
    }
    // handle on 2nd panel
    addHandle(g, -o.width / 2 + o.frameThk * 0.8 + leafW * 1.5 + leafW / 2 - 0.05, 0, o.frameDepth / 2 + 0.02, handleMat(0x333333));
    return g;
  };

  /* ── Aluminium Sliding Patio Doors ────────────────────── */
  window.GOSBuilders.aluminiumSlidingPatio = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 2.0;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var darkFrame = 0x3a3a3a;
    var mF = frameMat(darkFrame, 0.5);
    addOuterFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, frameMat(darkFrame, 0.4));
    addFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mF);
    // 3 panels (left fixed, center sliding, right fixed)
    var panelCount = 3;
    var leafW = (o.width - 2 * o.frameThk * 0.8) / panelCount;
    var gM = glassMat(o.glassColor);
    var gH = o.height - 2 * o.frameThk * 0.8 - 0.02;
    for (var i = 0; i < panelCount; i++) {
      var cx = -o.width / 2 + o.frameThk * 0.8 + leafW * (i + 0.5);
      if (i > 0) {
        var div = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.4, o.height - 2 * o.frameThk * 0.8, o.frameDepth), mF);
        div.position.set(cx - leafW / 2, 0, 0);
        g.add(div);
      }
      var pGW = leafW - o.frameThk * 0.4 - 0.01;
      var zOff = (i === 1) ? 0.008 : 0;
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(pGW, gH), gM);
      gl.position.set(cx, 0, o.frameDepth / 2 + 0.001 + zOff);
      g.add(gl);
    }
    // handle on center panel
    var hM = handleMat(0x333333);
    var hBase = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), hM);
    hBase.position.set(leafW * 0.3, 0, o.frameDepth / 2 + 0.025);
    g.add(hBase);
    return g;
  };

  /* ── Heritage Aluminium Doors ─────────────────────────── */
  window.GOSBuilders.heritageDoor = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 0.9;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var darkFrame = 0x2d2d2d;
    var mF = frameMat(darkFrame, 0.5);
    addOuterFrame(g, o.width, o.height, o.frameThk, o.frameDepth, frameMat(darkFrame, 0.4));
    addFrame(g, o.width, o.height, o.frameThk, o.frameDepth, mF);
    // Georgian bars (3x3 grid)
    var gW = o.width - 2 * o.frameThk;
    var gH = o.height - 2 * o.frameThk;
    var barThk = 0.015;
    // vertical bars
    for (var v = 1; v <= 2; v++) {
      var bx = -gW / 2 + (gW / 3) * v;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(barThk, gH, o.frameDepth * 0.5), mF);
      bar.position.set(bx, 0, 0.005);
      g.add(bar);
    }
    // horizontal bars
    for (var h = 1; h <= 2; h++) {
      var by = -gH / 2 + (gH / 3) * h;
      var hbar = new THREE.Mesh(new THREE.BoxGeometry(gW, barThk, o.frameDepth * 0.5), mF);
      hbar.position.set(0, by, 0.005);
      g.add(hbar);
    }
    // glass behind bars
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(gW - 0.02, gH - 0.02), glassMat(o.glassColor));
    glass.position.set(0, 0, o.frameDepth / 2 + 0.001);
    g.add(glass);
    addHandle(g, o.width / 2 - o.frameThk - 0.06, -o.height * 0.05, o.frameDepth / 2 + 0.02, handleMat(0x333333));
    return g;
  };

  /* ── Aluminium Door ───────────────────────────────────── */
  window.GOSBuilders.aluminiumDoor = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 0.9;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var darkFrame = 0x3a3a3a;
    var mF = frameMat(darkFrame, 0.5);
    addOuterFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, frameMat(darkFrame, 0.4));
    addFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mF);
    // full glass panel
    var gW = o.width - 2 * o.frameThk * 0.8 - 0.02;
    var gH = o.height - 2 * o.frameThk * 0.8 - 0.02;
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), glassMat(o.glassColor));
    glass.position.set(0, 0, o.frameDepth / 2 + 0.001);
    g.add(glass);
    // horizontal mid bar
    var midBar = new THREE.Mesh(new THREE.BoxGeometry(gW + 0.01, o.frameThk * 0.5, o.frameDepth * 0.6), mF);
    midBar.position.set(0, -o.height * 0.1, 0.005);
    g.add(midBar);
    addHandle(g, o.width / 2 - o.frameThk * 0.8 - 0.06, 0, o.frameDepth / 2 + 0.02, handleMat(0x333333));
    return g;
  };

  /* ── Slide & Fold Doors ───────────────────────────────── */
  window.GOSBuilders.slideFoldDoors = function(opts) {
    var o = defaultOpts(opts);
    o.width = o.width || 2.4;
    o.height = o.height || 2.1;
    var g = new THREE.Group();
    var darkFrame = 0x3a3a3a;
    var mF = frameMat(darkFrame, 0.5);
    addOuterFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, frameMat(darkFrame, 0.4));
    addFrame(g, o.width, o.height, o.frameThk * 0.8, o.frameDepth, mF);
    // 5 fold panels
    var panels = 5;
    var leafW = (o.width - 2 * o.frameThk * 0.8) / panels;
    var gM = glassMat(o.glassColor);
    var gH = o.height - 2 * o.frameThk * 0.8 - 0.02;
    for (var i = 0; i < panels; i++) {
      var cx = -o.width / 2 + o.frameThk * 0.8 + leafW * (i + 0.5);
      if (i > 0) {
        var div = new THREE.Mesh(new THREE.BoxGeometry(o.frameThk * 0.35, o.height - 2 * o.frameThk * 0.8, o.frameDepth), mF);
        div.position.set(cx - leafW / 2, 0, 0);
        g.add(div);
      }
      var pGW = leafW - o.frameThk * 0.35 - 0.01;
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(pGW, gH), gM);
      gl.position.set(cx, 0, o.frameDepth / 2 + 0.001);
      g.add(gl);
    }
    addHandle(g, 0, 0, o.frameDepth / 2 + 0.02, handleMat(0x333333));
    return g;
  };

  /* ── Replacement Glazed Unit ──────────────────────────── */
  window.GOSBuilders.replacementGlazedUnit = function(opts) {
    var o = defaultOpts(opts);
    var g = new THREE.Group();
    // Simple sealed unit: spacer bar + two glass panes
    var gW = o.width - 0.02;
    var gH = o.height - 0.02;
    var gM = glassMat(o.glassColor);
    // outer pane
    var outer = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    outer.position.set(0, 0, 0.01);
    g.add(outer);
    // inner pane
    var inner = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), gM);
    inner.position.set(0, 0, -0.01);
    g.add(inner);
    // spacer bar around edge
    var sMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.7, roughness: 0.3 });
    var sThk = 0.015;
    // top
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(gW, sThk, 0.02), sMat), { position: new THREE.Vector3(0, gH / 2, 0) }));
    // bottom
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(gW, sThk, 0.02), sMat), { position: new THREE.Vector3(0, -gH / 2, 0) }));
    // left
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(sThk, gH, 0.02), sMat), { position: new THREE.Vector3(-gW / 2, 0, 0) }));
    // right
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(sThk, gH, 0.02), sMat), { position: new THREE.Vector3(gW / 2, 0, 0) }));
    return g;
  };

  /* ── Convenience map ──────────────────────────────────── */
  window.GOSBuilders.productMap = {
    'Composite Doors':              'compositeDoor',
    'uPVC Windows':                 'upvcWindow',
    'Sash Windows':                 'sashWindow',
    'Aluminium Windows':            'aluminiumWindow',
    'uPVC Doors':                   'upvcDoor',
    'uPVC French Doors':            'frenchDoors',
    'uPVC Sliding Patio Doors':     'slidingPatioDoors',
    'Aluminium Bifolding Doors':    'bifoldingDoors',
    'Aluminium Sliding Patio Doors':'aluminiumSlidingPatio',
    'Heritage Aluminium Doors':     'heritageDoor',
    'Aluminium Doors':              'aluminiumDoor',
    'Slide & Fold Doors':           'slideFoldDoors',
    'Replacement Glazed Units':     'replacementGlazedUnit',
    // Legacy aliases
    'Window':                       'upvcWindow',
    'Door':                         'upvcDoor',
    'Bifold Doors':                 'bifoldingDoors',
    'Patio Doors':                  'slidingPatioDoors',
    'Conservatory':                 'upvcWindow'
  };

  /**
   * Get a builder by product name.
   * @param {string} productName
   * @returns {Function|null}
   */
  window.GOSBuilders.getBuilder = function(productName) {
    var key = window.GOSBuilders.productMap[productName];
    return key ? window.GOSBuilders[key] : null;
  };

  /**
   * Create a small static Three.js thumbnail for a product card.
   * Returns an HTMLCanvasElement.
   */
  window.GOSBuilders.renderThumbnail = function(productName, size) {
    size = size || 180;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // lighting
    var dLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dLight.position.set(3, 4, 5);
    scene.add(dLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    var builder = window.GOSBuilders.getBuilder(productName);
    if (!builder) return renderer.domElement;

    // default dimensions per product type for nice thumbnails
    var isDoor = productName.toLowerCase().indexOf('door') !== -1;
    var isWide = productName.indexOf('Sliding') !== -1 || productName.indexOf('Bifold') !== -1 || productName.indexOf('Fold') !== -1;
    var w = isWide ? 1.8 : (isDoor ? 0.9 : 0.9);
    var h = isDoor ? 2.0 : 1.2;

    var mesh = builder({
      width: w, height: h,
      frameDepth: 0.07, frameThk: 0.045,
      frameColor: isDoor && productName.indexOf('Aluminium') !== -1 ? 0x3a3a3a : 0xffffff,
      glassColor: 0xADD8E6,
      handleColor: 0x808080
    });

    // Slight rotation for 3D effect
    mesh.rotation.y = -0.3;
    mesh.rotation.x = 0.05;
    scene.add(mesh);

    // Auto-fit camera
    var box = new THREE.Box3().setFromObject(mesh);
    var center = box.getCenter(new THREE.Vector3());
    var bSize = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(bSize.x, bSize.y, bSize.z);
    camera.position.set(center.x, center.y, center.z + maxDim * 1.8);
    camera.lookAt(center);

    renderer.render(scene, camera);
    renderer.dispose();
    return renderer.domElement;
  };

  console.log('⚙️ ProductBuilders loaded (' + Object.keys(window.GOSBuilders.productMap).length + ' products)');
})();
