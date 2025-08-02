// assets/js/builders/TestWindow.js

// Ensure the global registry exists
window.GOSBuilders = window.GOSBuilders || {};

/**
 * Build and return a parametric “Test Window” with frame, double-glazed glass, and handle.
 * The glass panes are double-sided so they’re visible from both sides.
 * Also includes an outer surround behind the main frame.
 * @param {Object} opts
 * @param {Number} opts.width       Total width in meters
 * @param {Number} opts.height      Total height in meters
 * @param {Number} opts.frameDepth  Frame extrusion depth in meters
 * @param {Number} opts.frameThk    Frame thickness in meters
 * @param {Number} opts.frameColor  Hex color of the frame
 * @param {Number} opts.glassColor  Hex tint color of the glass
 * @param {Number} opts.handleColor Hex color of the handle
 */
window.GOSBuilders.testwindow = function makeTestWindow(opts) {
  const {
    width, height,
    frameDepth, frameThk,
    frameColor, glassColor, handleColor
  } = opts;

  const group = new THREE.Group();

  // OUTER FRAME (visual surround)
  const outerThk   = frameThk * 0.5;
  const outerDepth = frameDepth + 0.02;
  const matOuter   = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.2, roughness: 0.7 });
  const geoOuterH  = new THREE.BoxGeometry(width + 2 * outerThk, outerThk, outerDepth);
  const geoOuterV  = new THREE.BoxGeometry(outerThk, height + 2 * outerThk, outerDepth);

  // top outer rail
  const outTop = new THREE.Mesh(geoOuterH, matOuter);
  outTop.position.set(0, (height/2) + outerThk/2, 0);
  group.add(outTop);
  // bottom outer rail
  const outBot = outTop.clone();
  outBot.position.set(0, -(height/2) - outerThk/2, 0);
  group.add(outBot);
  // left outer stile
  const outLeft = new THREE.Mesh(geoOuterV, matOuter);
  outLeft.position.set(-(width/2) - outerThk/2, 0, 0);
  group.add(outLeft);
  // right outer stile
  const outRight = outLeft.clone();
  outRight.position.set((width/2) + outerThk/2, 0, 0);
  group.add(outRight);

  // INNER FRAME: top & bottom rails
  const matFrame = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.3, roughness: 0.6 });
  [ (height - frameThk) / 2, -(height - frameThk) / 2 ].forEach(y => {
    const geo = new THREE.BoxGeometry(width, frameThk, frameDepth);
    const m   = new THREE.Mesh(geo, matFrame);
    m.position.set(0, y, 0);
    group.add(m);
  });

  // INNER FRAME: left & right stiles
  [ -(width - frameThk) / 2, (width - frameThk) / 2 ].forEach(x => {
    const geo = new THREE.BoxGeometry(frameThk, height, frameDepth);
    const m   = new THREE.Mesh(geo, matFrame);
    m.position.set(x, 0, 0);
    group.add(m);
  });

  // DOUBLE-GLAZED: two glass panes with air gap
  const inset = 0.02;
  const gap   = 0.01;
  const gW    = width - 2 * frameThk - inset;
  const gH    = height - 2 * frameThk - inset;

  const matGlass = new THREE.MeshPhysicalMaterial({
    color: glassColor,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    roughness: 0,
    metalness: 0,
    ior: 1.5
  });

  // Outer pane
  const geoGlassOuter = new THREE.PlaneGeometry(gW, gH);
  const meshGlassOuter = new THREE.Mesh(geoGlassOuter, matGlass);
  meshGlassOuter.position.set(0, 0, frameDepth/2 + 0.001);
  group.add(meshGlassOuter);

  // Inner pane
  const geoGlassInner = new THREE.PlaneGeometry(gW, gH);
  const meshGlassInner = new THREE.Mesh(geoGlassInner, matGlass);
  meshGlassInner.position.set(0, 0, frameDepth/2 - gap - 0.001);
  group.add(meshGlassInner);

  // HANDLE (center-right)
  const matHandle = new THREE.MeshStandardMaterial({ color: handleColor, metalness: 0.2, roughness: 0.4 });
  const geoHandle = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 12);
  const meshHandle = new THREE.Mesh(geoHandle, matHandle);
  meshHandle.rotation.z = Math.PI / 2;
  meshHandle.position.set((width/2) - frameThk - 0.05, 0, frameDepth/2 + 0.02);
  group.add(meshHandle);

  return group;
};
