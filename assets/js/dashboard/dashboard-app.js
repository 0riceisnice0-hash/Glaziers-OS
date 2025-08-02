// assets/js/dashboard/dashboard-app.js
console.log('⚙️ dashboard-app.js loaded');

jQuery(function($) {
  // 1) Grab the original dashboard container
  const dash = document.getElementById('gos-dashboard-app');
  if (!dash) return;

  // --- Fullscreen Logic ---
  const appContainer = document.createElement('div');
  appContainer.id = 'gos-dashboard-app'; // reuse same ID so our CSS kicks in
  Object.assign(appContainer.style, {
    position: 'fixed',
    top:       '0',
    left:      '0',
    width:     '100%',
    height:    '100%',
    zIndex:    '99999',
    overflow:  'hidden',
  });

  document.body.appendChild(appContainer);
  Array.from(document.body.children).forEach(child => {
    if (child !== appContainer) child.style.display = 'none';
  });
  document.body.style.overflow = 'hidden';

  // Tabs
  const tabs = ['quotes','new','diary','fitters','settings','invoices','reports','quote-detail'];
  let current = 'quotes';

  let sidebarHtml = '<div class="gsa-sidebar-header">GlazierOS</div>';
  tabs.forEach(tab => {
    const isHidden = tab === 'quote-detail' ? 'style="display:none;"' : '';
    sidebarHtml += `<a href="#" class="gsa-tab" data-tab="${tab}" ${isHidden}>${tab.replace('-', ' ')}</a>`;
  });

  let panelHtml = '';
  tabs.forEach(tab => {
    panelHtml += `<div id="gsa-${tab}" class="gsa-panel"></div>`;
  });

  const appHtml = `
    <div class="gsa-main-layout">
      <nav class="gsa-sidebar">${sidebarHtml}</nav>
      <main class="gsa-content">${panelHtml}</main>
    </div>
  `;
  const $c = $(appContainer);
  $c.html(appHtml);

  // Inject new styles
  const css = `
    /* make the whole app a column flex so our absolute/fixed children fill it */
    #gos-dashboard-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f0f2f5;
    }

    .gsa-main-layout {
      position: relative;
      flex-grow: 1;
    }

    /* pin the sidebar to the viewport */
    .gsa-sidebar {
      position: fixed;       /* was absolute */
      top: 0;
      left: 0;
      bottom: 0;
      width: 220px;
      background-color: #2c3e50;
      color: #ecf0f1;
      display: flex;
      flex-direction: column;
      z-index: 1000;
    }

    .gsa-sidebar-header {
      padding: 1.2rem 1.5rem;
      font-size: 1.6rem;
      font-weight: 700;
      color: #fff;
      text-align: center;
      border-bottom: 1px solid #34495e;
      margin-bottom: .5rem;
    }

    .gsa-tab {
      display: block;
      padding: .9rem 1.5rem;
      color: #bdc3c7;
      text-decoration: none;
      font-size: .95rem;
      font-weight: 500;
      border-left: 4px solid transparent;
      transition: all .2s ease-in-out;
      text-transform: capitalize;
      cursor: pointer;
    }
    .gsa-tab:hover { background-color: #34495e; color: #fff; }
    .gsa-tab.active { background-color: #34495e; color: #fff; font-weight: 600; border-left-color: #3498db; }

    /* push content over and force it to fit in the gap */
    .gsa-content {
      position: absolute;
      top: 0;
      left: 220px;                     /* match sidebar width */
      right: 0;
      bottom: 0;
      overflow-y: auto;
      background-color: #f0f2f5;
    }

    .gsa-panel {
      display: none;
      height: 100%;
      flex-direction: column;
    }
    .gsa-panel.active { display: flex; }

    /* keep list headers fixed and lists scrollable */
    .gsa-panel .gsa-quotes-header,
    .gsa-panel .gsa-detail-header {
      flex-shrink: 0;
    }
    .gsa-panel .gsa-quotes-list-container,
    .gsa-panel .gsa-detail-layout {
      flex-grow: 1;
      overflow-y: auto;
    }

    /* button reset */
    .gos-button {
      display: inline-block;
      font-weight: 400;
      color: #fff;
      text-align: center;
      cursor: pointer;
      background-color: #4e73df;
      border: 1px solid #4e73df;
      padding: .375rem .75rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: .35rem;
      transition: .15s ease-in-out;
    }
    .gos-button:hover { background-color: #2e59d9; border-color: #2653d4; }
  `;
  $('<style id="gsa-dashboard-styles"></style>').text(css).appendTo('head');

  function activate(tab) {
    current = tab;
    $c.find('.gsa-tab').removeClass('active');
    $c.find(`.gsa-tab[data-tab=${tab}]`).addClass('active');
    $c.find('.gsa-panel').removeClass('active');
    $c.find(`#gsa-${tab}`).addClass('active');
    $(document).trigger('gsa:panel:activated', [tab]);
  }

  $(document).on('gsa:activate:panel', (e, tabName) => activate(tabName));
  $c.on('click', '.gsa-tab', function(e) {
    e.preventDefault();
    activate(this.dataset.tab);
  });

  // initial activation with a tiny delay to let other scripts bind
  setTimeout(() => activate(current), 0);
});
