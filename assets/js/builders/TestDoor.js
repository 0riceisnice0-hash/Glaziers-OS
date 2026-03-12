// assets/js/builders/TestDoor.js
console.log('⚙️ TestDoor builder loaded');
window.GOSBuilders = window.GOSBuilders || {};

/**
 * Build and return a parametric "Test Door" with frame, glass panel, and handle.
 * @param {Object} opts
 * @param {Number} opts.width       Total width in meters
 * @param {Number} opts.height      Total height in meters
 * @param {Number} opts.frameDepth  Frame extrusion depth in meters
 * @param {Number} opts.frameThk    Frame thickness in meters
 * @param {Number} opts.frameColor  Hex color of the frame
 * @param {Number} opts.glassColor  Hex tint color of the glass
 * @param {Number} opts.handleColor Hex color of the handle
 */
window.GOSBuilders.testdoor = function makeTestDoor(opts) {
  const {
    width, height,
    frameDepth, frameThk,
    frameColor, glassColor, handleColor
  } = opts;

  const group = new THREE.Group();

  // OUTER FRAME (visual surround)
  const outerThk   = frameThk * 0.5;
  const outerDepth = frameDepth + 0.02;
  const matOuter   = new THREE.MeshStandardMaterial({ color: frameColor || 0xffffff, metalness: 0.2, roughness: 0.7 });
  const geoOuterH  = new THREE.BoxGeometry(width + 2 * outerThk, outerThk, outerDepth);
  const geoOuterV  = new THREE.BoxGeometry(outerThk, height + 2 * outerThk, outerDepth);

  // top outer rail
  const outTop = new THREE.Mesh(geoOuterH, matOuter);
  outTop.position.set(0, (height / 2) + outerThk / 2, 0);
  group.add(outTop);

  // bottom outer rail (threshold)
  const outBot = outTop.clone();
  outBot.position.set(0, -(height / 2) - outerThk / 2, 0);
  group.add(outBot);

  // left outer stile
  const outLeft = new THREE.Mesh(geoOuterV, matOuter);
  outLeft.position.set(-(width / 2) - outerThk / 2, 0, 0);
  group.add(outLeft);

  // right outer stile
  const outRight = outLeft.clone();
  outRight.position.set((width / 2) + outerThk / 2, 0, 0);
  group.add(outRight);

  // INNER FRAME: top & bottom rails
  const matFrame = new THREE.MeshStandardMaterial({ color: frameColor || 0xffffff, metalness: 0.3, roughness: 0.6 });
  [(height - frameThk) / 2, -(height - frameThk) / 2].forEach(y => {
    const geo = new THREE.BoxGeometry(width, frameThk, frameDepth);
    const m = new THREE.Mesh(geo, matFrame);
    m.position.set(0, y, 0);
    group.add(m);
  });

  // INNER FRAME: left & right stiles
  [-(width - frameThk) / 2, (width - frameThk) / 2].forEach(x => {
    const geo = new THREE.BoxGeometry(frameThk, height, frameDepth);
    const m = new THREE.Mesh(geo, matFrame);
    m.position.set(x, 0, 0);
    group.add(m);
  });

  // MID RAIL (horizontal bar across the door, separating upper glass from lower panel)
  const midRailY = -(height * 0.1);
  const geoMidRail = new THREE.BoxGeometry(width - 2 * frameThk, frameThk, frameDepth);
  const midRail = new THREE.Mesh(geoMidRail, matFrame);
  midRail.position.set(0, midRailY, 0);
  group.add(midRail);

  // UPPER GLASS PANEL
  const inset = 0.02;
  const glassW = width - 2 * frameThk - inset;
  const glassH = (height / 2 - frameThk) + midRailY - frameThk / 2 - inset;
  const glassY = midRailY + frameThk / 2 + glassH / 2 + inset / 2;

  const matGlass = new THREE.MeshPhysicalMaterial({
    color: glassColor || 0xADD8E6,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    roughness: 0,
    metalness: 0,
    ior: 1.5
  });

  const geoGlass = new THREE.PlaneGeometry(glassW, glassH);
  const meshGlass = new THREE.Mesh(geoGlass, matGlass);
  meshGlass.position.set(0, glassY, frameDepth / 2 + 0.001);
  group.add(meshGlass);

  // LOWER SOLID PANEL (opaque)
  const panelH = Math.abs(-(height / 2) + frameThk - midRailY + frameThk / 2) - inset;
  const panelY = midRailY - frameThk / 2 - panelH / 2 - inset / 2;
  const matPanel = new THREE.MeshStandardMaterial({ color: frameColor || 0xffffff, metalness: 0.1, roughness: 0.8 });
  const geoPanel = new THREE.BoxGeometry(glassW, panelH, frameDepth * 0.8);
  const meshPanel = new THREE.Mesh(geoPanel, matPanel);
  meshPanel.position.set(0, panelY, 0);
  group.add(meshPanel);

  // DOOR HANDLE (lever-style)
  const matHandle = new THREE.MeshStandardMaterial({ color: handleColor || 0x808080, metalness: 0.6, roughness: 0.3 });

  // Handle base plate
  const geoBase = new THREE.BoxGeometry(0.03, 0.12, 0.015);
  const meshBase = new THREE.Mesh(geoBase, matHandle);
  meshBase.position.set((width / 2) - frameThk - 0.06, 0, frameDepth / 2 + 0.015);
  group.add(meshBase);

  // Handle lever
  const geoLever = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8);
  const meshLever = new THREE.Mesh(geoLever, matHandle);
  meshLever.rotation.z = Math.PI / 2;
  meshLever.position.set((width / 2) - frameThk - 0.06 + 0.05, 0.02, frameDepth / 2 + 0.03);
  group.add(meshLever);

  // Keyhole cylinder
  const geoKey = new THREE.CylinderGeometry(0.01, 0.01, 0.015, 12);
  const meshKey = new THREE.Mesh(geoKey, matHandle);
  meshKey.rotation.x = Math.PI / 2;
  meshKey.position.set((width / 2) - frameThk - 0.06, -0.04, frameDepth / 2 + 0.015);
  group.add(meshKey);

  return group;
};
