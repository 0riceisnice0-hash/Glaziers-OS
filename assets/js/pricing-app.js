// assets/js/pricing-app.js
console.log('⚙️ pricing-app.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const originalContainer = document.getElementById('glazieros-pricing-tool');
  if (!originalContainer) return;

  // --- Fullscreen wrapper (as per dashboard-app) ---
  const appWrap = document.createElement('div');
  appWrap.id = 'gos-pricing-app';
  Object.assign(appWrap.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '99999', overflow: 'hidden'
  });
  document.body.appendChild(appWrap);
  appWrap.appendChild(originalContainer);
  Array.from(document.body.children).forEach(ch => {
    if (ch !== appWrap) ch.style.display = 'none';
  });
  document.body.style.overflow = 'hidden';

  // State
  let step = 1, type = 'window', widthM = 1, heightM = 1, price = 0, savedJobId = null;
  const settings = { window: 0, door: 0 };
  let formFields = [];

  // THREE.js vars
  let scene, camera, renderer, mesh, animationFrameId;

  // Inject CSS
  const css = document.createElement('style');
  css.textContent = `
    #gos-pricing-app { display:flex; flex-direction:column; height:100%; background:#f0f2f5; }
    #gos-pricing-app #glazieros-pricing-tool { display:flex; flex-direction:column; flex:1; overflow:hidden; }
    .gos-wizard-step-container { display:flex; flex:1; overflow:hidden; }
    .gos-controls-panel { flex:1; min-width:350px; max-width:500px; padding:2rem; background:#fff; overflow-y:auto; box-shadow:0 0 15px rgba(0,0,0,0.1); z-index:10;}
    .gos-viewer-panel { flex:2; display:flex; align-items:center; justify-content:center; position:relative;}
    #gos-3d-placeholder { width:100%; height:100%; }
    .gos-step1-container { width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;}
    .gos-button { margin:.5rem; padding:.75rem 1.5rem; background:#2eac66; color:#fff; border:none; border-radius:4px; cursor:pointer;}
    .gos-input { width:100%; padding:.5rem; margin:.25rem 0; box-sizing:border-box;}
    .gos-form-field { margin-bottom:1rem; text-align:left; }
    .gos-form-field-checkbox { margin-top:1rem; }
    .gos-center { text-align:center; }
    .gos-error { color:red; text-align:center; padding:2rem; }
  `;
  document.head.appendChild(css);

  // 3D init
  const threeDContainer = document.createElement('div');
  threeDContainer.id = 'gos-3d-canvas-wrapper';

  function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, originalContainer.clientWidth/originalContainer.clientHeight, 0.1, 1000);
    camera.position.z = 2;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(originalContainer.clientWidth, originalContainer.clientHeight);
    const light = new THREE.DirectionalLight(0xffffff,1);
    light.position.set(5,5,5);
    scene.add(light, new THREE.AmbientLight(0x404040));
    startAnimation();
  }
  function startAnimation() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    (function loop(){
      if(mesh) mesh.rotation.y += 0.005;
      renderer.render(scene,camera);
      animationFrameId = requestAnimationFrame(loop);
    })();
  }
  function stopAnimation(){
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
  }

  // Fetch pricing + form settings
  Promise.all([
    fetch(GlazierOS.settingsUrl).then(r=>r.json()),
    fetch('/wp-json/glazieros/v1/settings/form').then(r=>r.json())
  ])
  .then(([pricingSettings, formSettings])=>{
    settings.window = Number(pricingSettings.window);
    settings.door   = Number(pricingSettings.door);
    formFields      = Array.isArray(formSettings) ? formSettings : [];
    init3D();
    renderWizard();
  })
  .catch(err=>{
    console.error(err);
    originalContainer.innerHTML = '<div class="gos-error">Unable to load quoting tool.</div>';
  });

  function renderWizard(){
    originalContainer.innerHTML = '';

    // Step 1
    if(step===1){
      originalContainer.innerHTML = `
        <div class="gos-step1-container">
          <div class="gos-center">
            <h2>New Quote</h2>
            <label>
              Type:
              <select id="gos-type" class="gos-input">
                <option value="window">Window</option>
                <option value="door">Door</option>
              </select>
            </label>
            <button id="btn-start" class="gos-button">Start</button>
          </div>
        </div>`;
      const sel = originalContainer.querySelector('#gos-type');
      sel.value = type;
      sel.addEventListener('change', e=>type=e.target.value);
      originalContainer.querySelector('#btn-start')
        .addEventListener('click', ()=>{
          step=2; renderWizard();
        });
      return;
    }

    // Step 2
    if(step===2){
      originalContainer.innerHTML = `
        <div class="gos-wizard-step-container">
          <div class="gos-controls-panel">
            <h2 class="gos-center">Step 2: Dimensions</h2>
            <label>Width (mm)<input id="gos-width" class="gos-input" type="number" value="${widthM*1000}"></label>
            <label>Height (mm)<input id="gos-height" class="gos-input" type="number" value="${heightM*1000}"></label>
            <div class="gos-center">
              <button id="btn-back" class="gos-button">Back</button>
              <button id="btn-next" class="gos-button">Next</button>
            </div>
          </div>
          <div class="gos-viewer-panel"><div id="gos-3d-placeholder"></div></div>
        </div>`;
      const wEl = originalContainer.querySelector('#gos-width');
      const hEl = originalContainer.querySelector('#gos-height');
      wEl.addEventListener('input', ()=>{
        widthM=(parseFloat(wEl.value)||0)/1000;
        price=(widthM*heightM*settings[type]).toFixed(2);
        update3D();
      });
      hEl.addEventListener('input', ()=>{
        heightM=(parseFloat(hEl.value)||0)/1000;
        price=(widthM*heightM*settings[type]).toFixed(2);
        update3D();
      });
      originalContainer.querySelector('#btn-back')
        .addEventListener('click', ()=>{
          step=1; renderWizard();
        });
      originalContainer.querySelector('#btn-next')
        .addEventListener('click', ()=>{
          widthM=(parseFloat(wEl.value)||0)/1000;
          heightM=(parseFloat(hEl.value)||0)/1000;
          price=(widthM*heightM*settings[type]).toFixed(2);
          step=3;
          stopAnimation();
          renderWizard();
        });
      update3D();
      return;
    }

    // Step 3: dynamic form
    const detailsFormHtml = formFields.map(field => {
      const req = field.required ? 'required' : '';
      const id  = `gos-${field.id}`;
      const label = `<label for="${id}">${field.label}${field.required?' *':''}</label>`;
      switch(field.type){
        case 'textarea':
          return `<div class="gos-form-field">${label}<textarea id="${id}" name="${field.id}" class="gos-input" rows="3" ${req}></textarea></div>`;
        case 'dropdown':
          const opts = (field.options||'').split(',').map(o=>`<option>${o.trim()}</option>`).join('');
          return `<div class="gos-form-field">${label}<select id="${id}" name="${field.id}" class="gos-input" ${req}>${opts}</select></div>`;
        case 'checkbox':
          return `<div class="gos-form-field-checkbox"><label><input type="checkbox" id="${id}" name="${field.id}" ${req}>${field.label}</label></div>`;
        default:
          return `<div class="gos-form-field">${label}<input type="${field.type}" id="${id}" name="${field.id}" class="gos-input" ${req}></div>`;
      }
    }).join('');

    originalContainer.innerHTML = `
      <div class="gos-wizard-step-container">
        <div class="gos-controls-panel">
          <h2 class="gos-center">Your Details</h2>
          <form id="gos-details-form">
            ${detailsFormHtml}
            <div class="gos-center">
              <button type="submit" class="gos-button">Submit Details</button>
            </div>
          </form>
          <div id="gos-thanks" class="gos-center" style="display:none">
            <h3>Thank you! 🎉</h3>
          </div>
        </div>
        <div class="gos-viewer-panel"><div id="gos-3d-placeholder"></div></div>
      </div>`;

    // submit handler
    const form = originalContainer.querySelector('#gos-details-form');
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const payload = {};
      formFields.forEach(f=>{
        if(f.type==='checkbox') payload[f.id] = form[f.id].checked;
        else payload[f.id] = form[f.id].value.trim();
      });

      const doSaveDetails = ()=>{
        fetch(`${GlazierOS.detailsUrl}${savedJobId}/details`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        })
        .then(r=>r.json())
        .then(j=>{
          if(j.saved){
            form.style.display='none';
            originalContainer.querySelector('#gos-thanks').style.display='block';
          } else throw new Error('Save failed');
        })
        .catch(err=>alert('Error: '+err.message));
      };

      if(savedJobId){
        doSaveDetails();
      } else {
        fetch(GlazierOS.quoteUrl,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({type, width:widthM, height:heightM, price})
        })
        .then(r=>r.json())
        .then(j=>{
          if(j.job_id){
            savedJobId=j.job_id;
            doSaveDetails();
          } else throw new Error('Quote create failed');
        })
        .catch(err=>alert('Error: '+err.message));
      }
    });

    update3D();
  }

  // Rebuild and resize 3D model
  function update3D(){
    const ph = originalContainer.querySelector('#gos-3d-placeholder');
    if(!ph||!renderer) return;
    const w=ph.clientWidth, h=ph.clientHeight;
    if(!w||!h) return;
    ph.innerHTML='';
    renderer.setSize(w,h);
    camera.aspect=w/h; camera.updateProjectionMatrix();
    threeDContainer.innerHTML='';
    threeDContainer.appendChild(renderer.domElement);
    ph.appendChild(threeDContainer);
    if(mesh) scene.remove(mesh);
    const builder = type==='door'? window.GOSBuilders.testdoor : window.GOSBuilders.testwindow;
    mesh = builder({ width:widthM, height:heightM, frameDepth:0.1, frameThk:0.05, frameColor:0xffffff });
    scene.add(mesh);
    startAnimation();
  }
});
