console.log('⚙️ TestDoor builder loaded');
window.GOSBuilders=window.GOSBuilders||{};
window.GOSBuilders.testdoor=function(opts){
  const {width,height,frameDepth,frameThk,frameColor}=opts;
  const g=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color:frameColor});
  // simple door panel
  const geo=new THREE.BoxGeometry(width, height, frameDepth);
  const mesh=new THREE.Mesh(geo,m);
  g.add(mesh);
  return g;
};
