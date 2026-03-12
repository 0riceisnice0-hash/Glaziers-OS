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

  // Tabs (removed 'new' - quote creation now happens in modal from quotes panel)
  const tabs = ['quotes','diary','team','settings','invoices','reports','audit-logs','branches','quote-detail'];
  let current = 'quotes';

  let sidebarHtml = `
    <div class="gsa-sidebar-header">GlazierOS</div>
  `;
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
      <div id="gsa-search-results-container"></div>
    </div>
  `;
  const $c = $(appContainer);
  $c.html(appHtml);

  // Inject new styles - PREMIUM GRADIENT SIDEBAR (Analytics Card Style)
  const css = `
    /* Modern App Container */
    #gos-dashboard-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f6fa;
    }

    .gsa-main-layout {
      position: relative;
      flex-grow: 1;
    }

    /* ========================================
       PREMIUM GRADIENT SIDEBAR
       Inspired by Analytics Cards
       ======================================== */
    .gsa-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 260px;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      box-shadow: 4px 0 24px rgba(102, 126, 234, 0.25);
      z-index: 1000;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    /* Subtle pattern overlay */
    .gsa-sidebar::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
      opacity: 0.5;
      pointer-events: none;
    }

    /* Brand Header with Icon */
    .gsa-sidebar-header {
      padding: 2rem 1.5rem;
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      margin-bottom: 0.75rem;
      letter-spacing: -0.03em;
      position: relative;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
      backdrop-filter: blur(10px);
    }

    /* ========================================
       NAVIGATION TABS - Glass Morphism Style
       ======================================== */
    .gsa-tab {
      display: flex;
      align-items: center;
      padding: 0.875rem 1.25rem;
      margin: 0.25rem 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      border-radius: 10px;
      transition: all 0.2s ease;
      text-transform: capitalize;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      position: relative;
      overflow: hidden;
    }
    
    .gsa-tab::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transition: left 0.5s ease;
    }
    
    .gsa-tab:hover::before {
      left: 100%;
    }
    
    .gsa-tab:hover {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .gsa-tab.active {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
      backdrop-filter: blur(10px);
      color: #ffffff;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transform: translateX(4px);
    }
    
    .gsa-tab.active::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%);
      border-radius: 0 4px 4px 0;
      box-shadow: 0 0 12px rgba(255,255,255,0.5);
    }

    /* Content Area */
    .gsa-content {
      position: absolute;
      top: 0;
      left: 260px;
      right: 0;
      bottom: 0;
      overflow-y: auto;
      background-color: #f5f6fa;
    }

    .gsa-panel {
      display: none;
      height: 100%;
      flex-direction: column;
    }
    
    .gsa-panel.active {
      display: flex;
    }

    /* Panel Layout */
    .gsa-panel .gsa-quotes-header,
    .gsa-panel .gsa-detail-header {
      flex-shrink: 0;
    }
    
    .gsa-panel .gsa-quotes-list-container,
    .gsa-panel .gsa-detail-layout {
      flex-grow: 1;
      overflow-y: auto;
    }

    /* Modern Button Styles (Updated to match gradient theme) */
    .gos-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
      cursor: pointer;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 0.625rem 1.25rem;
      font-size: 0.9375rem;
      line-height: 1.5;
      border-radius: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    .gos-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .gos-button:hover::before {
      left: 100%;
    }
    
    .gos-button:hover {
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
    
    .gos-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    /* ========================================
       SITE-WIDE PREMIUM GRADIENT HEADERS
       Applied to ALL panel headers
       ======================================== */
    .gsa-settings-header,
    .gsa-invoices-header,
    .gsa-reports-header,
    .gsa-detail-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 1.5rem 2rem !important;
      border-bottom: none !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2) !important;
      position: relative !important;
      overflow: hidden !important;
    }
    
    .gsa-settings-header::before,
    .gsa-invoices-header::before,
    .gsa-reports-header::before,
    .gsa-detail-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
      opacity: 0.3;
      pointer-events: none;
    }
    
    .gsa-settings-header h2,
    .gsa-settings-header h3,
    .gsa-invoices-header h2,
    .gsa-reports-header h2,
    .gsa-detail-header h2 {
      color: #ffffff !important;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
      position: relative;
      z-index: 1;
      margin: 0 !important;
      font-weight: 700 !important;
    }
    
    /* Premium Input Fields Site-Wide */
    .gos-input,
    input[type="text"],
    input[type="email"],
    input[type="number"],
    input[type="search"],
    select,
    textarea {
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.9375rem !important;
      transition: all 0.2s ease !important;
      background: #ffffff !important;
    }
    
    .gos-input:focus,
    input[type="text"]:focus,
    input[type="email"]:focus,
    input[type="number"]:focus,
    input[type="search"]:focus,
    select:focus,
    textarea:focus {
      outline: none !important;
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
    }
    
    /* Premium Tables Site-Wide */
    .gsa-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    .gsa-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .gsa-table th {
      color: #ffffff !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      padding: 1rem !important;
      text-align: left;
    }
    
    .gsa-table td {
      padding: 1rem !important;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .gsa-table tbody tr:hover {
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    }
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

  // Global Search
  const $searchInput = $('#gsa-global-search');
  const $searchResultsContainer = $('#gsa-search-results-container');

  let searchTimeout;
  $searchInput.on('input', function() {
      clearTimeout(searchTimeout);
      const term = $(this).val();

      if (term.length < 3) {
          $searchResultsContainer.hide().empty();
          return;
      }

      searchTimeout = setTimeout(() => {
          fetch(`/wp-json/glazieros/v1/search?term=${term}`)
              .then(res => res.json())
              .then(results => {
                  renderSearchResults(results);
              });
      }, 500);
  });

  function renderSearchResults(results) {
      if (results.length === 0) {
          $searchResultsContainer.hide().empty();
          return;
      }

      let resultsHtml = '';
      results.forEach(result => {
          resultsHtml += `<div class="gsa-search-result" data-id="${result.id}" data-type="${result.type}">${result.title} <small>(${result.type})</small></div>`;
      });

      $searchResultsContainer.html(resultsHtml).show();
  }

  // Hide search results when clicking outside
  $(document).on('click', function(e) {
      if (!$(e.target).closest('#gsa-global-search, #gsa-search-results-container').length) {
          $searchResultsContainer.hide();
      }
  });
  
  // Handle click on search result
    $c.on('click', '.gsa-search-result', function() {
        const id = $(this).data('id');
        const type = $(this).data('type');

        // This is a simple implementation. A more robust solution would be to
        // navigate to the correct panel and load the item.
        if (type === 'Job' || type === 'Quote') {
            activate('quote-detail');
            $(document).trigger('gsa:quote:load', id);
        }
        
        $searchResultsContainer.hide().empty();
    });


  // initial activation with a tiny delay to let other scripts bind
  setTimeout(() => activate(current), 0);
});