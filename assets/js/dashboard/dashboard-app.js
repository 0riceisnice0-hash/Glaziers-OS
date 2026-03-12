// assets/js/dashboard/dashboard-app.js
console.log('⚙️ dashboard-app.js loaded');

jQuery(function($) {
  const appContainer = document.getElementById('gos-dashboard-app');
  if (!appContainer) return;

  /* ============================================================
     TAB DEFINITIONS — order matters for sidebar rendering
     ============================================================ */
  const tabs = [
    'dashboard','quotes','customers','diary','team','settings',
    'invoices','reports','audit-logs','branches','quote-detail'
  ];
  let current = 'dashboard';
  let sidebarCollapsed = false;

  /* ============================================================
     SVG ICONS  (20×20, stroke-based for clarity at small sizes)
     ============================================================ */
  const icons = {
    'dashboard':   '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    'quotes':      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>',
    'customers':   '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'diary':       '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'team':        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'settings':    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'invoices':    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>',
    'reports':     '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'audit-logs':  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'branches':    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'quote-detail':'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };

  // Glazing-related logo SVG (diamond / glass pane)
  const logoIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2" opacity="0.9"/><line x1="2" y1="12" x2="22" y2="12" opacity="0.5"/><line x1="12" y1="2" x2="12" y2="22" opacity="0.5"/><path d="M2 2l20 20" opacity="0.25"/></svg>';

  const collapseIcon  = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  const bellIcon      = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const searchIcon    = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const chevronIcon   = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  const userIcon      = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  /* ============================================================
     FRIENDLY TAB LABELS
     ============================================================ */
  const labels = {
    'dashboard':'Dashboard','quotes':'Quotes','customers':'Customers',
    'diary':'Diary','team':'Team','settings':'Settings',
    'invoices':'Invoices','reports':'Reports','audit-logs':'Audit Logs',
    'branches':'Branches','quote-detail':'Quote Detail'
  };

  /* ============================================================
     BUILD SIDEBAR HTML
     ============================================================ */
  let navItems = '';
  tabs.forEach(tab => {
    const hidden = tab === 'quote-detail' ? ' style="display:none;"' : '';
    const badge  = tab === 'invoices' ? '<span class="gsa-tab-badge">3</span>' : '';
    navItems += `<a href="#" class="gsa-tab" data-tab="${tab}"${hidden}>
      <span class="gsa-tab-icon">${icons[tab]}</span>
      <span class="gsa-tab-label">${labels[tab]}</span>${badge}
    </a>`;
  });

  const sidebarHtml = `
    <div class="gsa-sidebar-header">
      <span class="gsa-logo-icon">${logoIcon}</span>
      <span class="gsa-logo-text">GlazierOS</span>
      <button class="gsa-collapse-btn" title="Toggle sidebar">${collapseIcon}</button>
    </div>
    <div class="gsa-sidebar-nav">${navItems}</div>
    <div class="gsa-sidebar-profile">
      <div class="gsa-profile-avatar">AU</div>
      <div class="gsa-profile-info">
        <span class="gsa-profile-name">Admin User</span>
        <span class="gsa-profile-role">Administrator</span>
      </div>
    </div>
  `;

  /* ============================================================
     BUILD PANEL HTML  (includes "customers" panel)
     ============================================================ */
  let panelHtml = '';
  tabs.forEach(tab => {
    panelHtml += `<div id="gsa-${tab}" class="gsa-panel"></div>`;
  });

  /* ============================================================
     BUILD TOP BAR HTML
     ============================================================ */
  const topBarHtml = `
    <header class="gsa-topbar">
      <div class="gsa-topbar-left">
        <button class="gsa-topbar-collapse-btn" title="Toggle sidebar">${collapseIcon}</button>
        <nav class="gsa-breadcrumbs">
          <span class="gsa-breadcrumb-home">Home</span>
          ${chevronIcon}
          <span class="gsa-breadcrumb-current">Dashboard</span>
        </nav>
      </div>
      <div class="gsa-topbar-right">
        <div class="gsa-topbar-search">
          ${searchIcon}
          <input type="text" id="gsa-global-search" class="gsa-topbar-search-input" placeholder="Search quotes, customers…">
        </div>
        <button class="gsa-topbar-notif" title="Notifications">
          ${bellIcon}
          <span class="gsa-notif-badge">3</span>
        </button>
        <div class="gsa-topbar-user" id="gsa-user-menu-trigger">
          <div class="gsa-topbar-avatar">AU</div>
          <span class="gsa-topbar-user-name">Admin</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;opacity:0.5"><polyline points="6 9 12 15 18 9"/></svg>
          <div class="gsa-user-dropdown" id="gsa-user-dropdown">
            <div class="gsa-user-dropdown-header">
              <div class="gsa-topbar-avatar" style="width:40px;height:40px;font-size:14px;">AU</div>
              <div>
                <div style="font-weight:600;color:#1e293b;">Admin User</div>
                <div style="font-size:0.75rem;color:#64748b;">admin@glazieros.co.uk</div>
              </div>
            </div>
            <div class="gsa-user-dropdown-divider"></div>
            <a href="#" class="gsa-user-dropdown-item" data-action="profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Profile
            </a>
            <a href="#" class="gsa-user-dropdown-item" data-action="settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
            <div class="gsa-user-dropdown-divider"></div>
            <a href="#" class="gsa-user-dropdown-item gsa-user-dropdown-item--danger" data-action="logout">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </a>
          </div>
        </div>
      </div>
    </header>
  `;

  /* ============================================================
     MOUNT THE APP
     ============================================================ */
  const $c = $(appContainer);
  $c.html(`
    <div class="gsa-main-layout">
      <nav class="gsa-sidebar">${sidebarHtml}</nav>
      <div class="gsa-content-wrapper">
        ${topBarHtml}
        <main class="gsa-content">${panelHtml}</main>
      </div>
      <div id="gsa-search-results-container"></div>
    </div>
  `);

  /* ============================================================
     INJECT CSS — PREMIUM QUALITY
     ============================================================ */
  const css = `
    /* =============================================
       FOUNDATION
       ============================================= */
    #gos-dashboard-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f0f2f7;
    }
    .gsa-main-layout {
      position: relative;
      flex-grow: 1;
      height: 100%;
    }

    /* =============================================
       PREMIUM GRADIENT SIDEBAR
       ============================================= */
    .gsa-sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 260px;
      display: flex;
      flex-direction: column;
      background: linear-gradient(160deg, #5b6abf 0%, #764ba2 50%, #6b3fa0 100%);
      box-shadow: 4px 0 30px rgba(91, 106, 191, 0.30);
      z-index: 1000;
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: width;
    }
    .gsa-sidebar::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.08) 0%, transparent 60%),
        url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23g)"/></svg>');
      pointer-events: none;
    }
    .gsa-sidebar::after {
      content: '';
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 1px;
      background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
      pointer-events: none;
    }

    /* Sidebar text elements fade smoothly */
    .gsa-logo-text,
    .gsa-tab-label,
    .gsa-tab-badge,
    .gsa-profile-info {
      transition: opacity 0.2s ease, max-width 0.3s ease;
      opacity: 1;
      max-width: 200px;
      overflow: hidden;
      white-space: nowrap;
    }

    /* Collapsed state */
    .gsa-sidebar.collapsed { width: 68px; }
    .gsa-sidebar.collapsed .gsa-logo-text,
    .gsa-sidebar.collapsed .gsa-tab-label,
    .gsa-sidebar.collapsed .gsa-tab-badge,
    .gsa-sidebar.collapsed .gsa-profile-info { opacity: 0; max-width: 0; pointer-events: none; }
    .gsa-sidebar.collapsed .gsa-collapse-btn { margin-left: 0; }
    .gsa-sidebar.collapsed .gsa-sidebar-header { justify-content: center; padding: 1.25rem 0.5rem; }
    .gsa-sidebar.collapsed .gsa-tab { justify-content: center; padding: 0.75rem; margin: 0.2rem 0.5rem; }
    .gsa-sidebar.collapsed .gsa-tab-icon { margin-right: 0; }
    .gsa-sidebar.collapsed .gsa-sidebar-profile { justify-content: center; padding: 1rem 0.5rem; }

    /* Content wrapper shifts with sidebar */
    .gsa-content-wrapper {
      position: absolute;
      top: 0; bottom: 0; right: 0;
      left: 260px;
      display: flex;
      flex-direction: column;
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: left;
    }
    .gsa-sidebar.collapsed ~ .gsa-content-wrapper { left: 68px; }

    /* =============================================
       SIDEBAR HEADER / BRAND
       ============================================= */
    .gsa-sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 1.35rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      position: relative;
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%);
      flex-shrink: 0;
    }
    .gsa-logo-icon { display: flex; color: rgba(255,255,255,0.95); flex-shrink: 0; }
    .gsa-logo-text {
      font-size: 1.35rem; font-weight: 800; color: #fff;
      letter-spacing: -0.02em;
      text-shadow: 0 1px 8px rgba(0,0,0,0.18);
      white-space: nowrap;
    }
    .gsa-collapse-btn {
      margin-left: auto;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      padding: 0.35rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .gsa-collapse-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }

    /* =============================================
       SIDEBAR NAVIGATION
       ============================================= */
    .gsa-sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    .gsa-sidebar-nav::-webkit-scrollbar { width: 4px; }
    .gsa-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

    .gsa-tab {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 0.7rem 1.1rem;
      margin: 2px 0.6rem;
      color: rgba(255,255,255,0.78);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      position: relative;
      overflow: hidden;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
    }
    .gsa-tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 22px; height: 22px;
      margin-right: 0.75rem;
      opacity: 0.85;
      transition: opacity 0.2s ease;
    }
    .gsa-tab-label { transition: opacity 0.2s ease; }
    .gsa-tab-badge {
      margin-left: auto;
      background: #ef4444;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      min-width: 18px; height: 18px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 5px;
      box-shadow: 0 2px 6px rgba(239,68,68,0.4);
    }

    .gsa-tab::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      transform: translateX(-100%);
      transition: transform 0.45s ease;
    }
    .gsa-tab:hover::before { transform: translateX(100%); }
    .gsa-tab:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
      border-color: rgba(255,255,255,0.1);
    }
    .gsa-tab:hover .gsa-tab-icon { opacity: 1; }

    .gsa-tab.active {
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #fff;
      font-weight: 600;
      border-color: rgba(255,255,255,0.22);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .gsa-tab.active .gsa-tab-icon { opacity: 1; }
    .gsa-tab.active::after {
      content: '';
      position: absolute;
      left: 0; top: 4px; bottom: 4px;
      width: 3px;
      background: #fff;
      border-radius: 0 3px 3px 0;
      box-shadow: 0 0 10px rgba(255,255,255,0.5);
    }

    /* =============================================
       SIDEBAR USER PROFILE
       ============================================= */
    .gsa-sidebar-profile {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 1rem 1.1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,0,0,0.08);
      flex-shrink: 0;
      position: relative;
    }
    .gsa-profile-avatar {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
      border: 1px solid rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 0.75rem; font-weight: 700;
      flex-shrink: 0;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .gsa-profile-info { display: flex; flex-direction: column; overflow: hidden; }
    .gsa-profile-name {
      color: #fff; font-size: 0.8rem; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .gsa-profile-role {
      color: rgba(255,255,255,0.55); font-size: 0.7rem;
      white-space: nowrap;
    }

    /* =============================================
       TOP BAR
       ============================================= */
    .gsa-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e8eaf0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      flex-shrink: 0;
      z-index: 100;
      gap: 1rem;
    }
    .gsa-topbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .gsa-topbar-collapse-btn {
      display: none;
      background: none; border: 1px solid #e5e7eb; border-radius: 8px;
      color: #6b7280; cursor: pointer; padding: 0.3rem;
      transition: all 0.2s ease;
    }
    .gsa-topbar-collapse-btn:hover { background: #f3f4f6; color: #374151; }

    .gsa-breadcrumbs {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.8125rem; color: #9ca3af;
    }
    .gsa-breadcrumb-home { cursor: pointer; }
    .gsa-breadcrumb-home:hover { color: #667eea; }
    .gsa-breadcrumb-current { color: #374151; font-weight: 600; text-transform: capitalize; }

    .gsa-topbar-right { display: flex; align-items: center; gap: 0.75rem; }

    .gsa-topbar-search {
      display: flex; align-items: center; gap: 0.5rem;
      background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 0.4rem 0.75rem;
      transition: all 0.2s ease;
      color: #9ca3af;
    }
    .gsa-topbar-search:focus-within {
      background: #fff;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
    }
    .gsa-topbar-search-input {
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      font-size: 0.8125rem !important;
      color: #374151 !important;
      width: 200px;
      outline: none !important;
      box-shadow: none !important;
    }
    .gsa-topbar-search-input::placeholder { color: #9ca3af; }

    .gsa-topbar-notif {
      position: relative;
      background: none; border: none; cursor: pointer;
      color: #6b7280; padding: 0.35rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .gsa-topbar-notif:hover { background: #f3f4f6; color: #374151; }
    .gsa-notif-badge {
      position: absolute; top: -2px; right: -2px;
      background: #ef4444; color: #fff;
      font-size: 0.6rem; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(239,68,68,0.4);
      border: 2px solid #fff;
    }

    .gsa-topbar-user {
      display: flex; align-items: center; gap: 0.5rem;
      cursor: pointer; padding: 0.3rem 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .gsa-topbar-user:hover { background: #f3f4f6; }
    .gsa-topbar-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff; font-size: 0.7rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .gsa-topbar-user-name { font-size: 0.8125rem; font-weight: 600; color: #374151; }
    .gsa-topbar-user { position: relative; }
    .gsa-user-dropdown {
      display: none; position: absolute; top: calc(100% + 8px); right: 0;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12); min-width: 220px; z-index: 2000;
      padding: 0.5rem 0; animation: gsaFadeIn 0.15s ease-out;
    }
    .gsa-user-dropdown.active { display: block; }
    .gsa-user-dropdown-header {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; margin-bottom: 0.25rem;
    }
    .gsa-user-dropdown-divider { height: 1px; background: #f3f4f6; margin: 0.25rem 0; }
    .gsa-user-dropdown-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.6rem 1rem; color: #374151; text-decoration: none;
      font-size: 0.875rem; transition: all 0.15s ease; cursor: pointer;
    }
    .gsa-user-dropdown-item:hover { background: #f8f9fa; color: #667eea; }
    .gsa-user-dropdown-item--danger { color: #ef4444; }
    .gsa-user-dropdown-item--danger:hover { background: #fef2f2; color: #dc2626; }

    /* =============================================
       CONTENT AREA & PANELS
       ============================================= */
    .gsa-content {
      flex: 1;
      overflow-y: auto;
      background-color: #f0f2f7;
    }
    .gsa-panel {
      display: none;
      min-height: 100%;
      flex-direction: column;
      animation: gsaFadeIn 0.25s ease-out;
    }
    .gsa-panel.active { display: flex; }
    @keyframes gsaFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .gsa-panel .gsa-quotes-header,
    .gsa-panel .gsa-detail-header { flex-shrink: 0; }
    .gsa-panel .gsa-quotes-list-container,
    .gsa-panel .gsa-detail-layout { flex-grow: 1; overflow-y: auto; }

    /* =============================================
       SEARCH RESULTS OVERLAY
       ============================================= */
    #gsa-search-results-container {
      position: fixed;
      top: 56px; right: 260px;
      width: 320px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.15);
      max-height: 400px;
      overflow-y: auto;
      z-index: 1100;
      display: none;
    }
    .gsa-search-result {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.15s ease;
      font-size: 0.875rem; color: #374151;
    }
    .gsa-search-result:last-child { border-bottom: none; }
    .gsa-search-result:hover {
      background: linear-gradient(90deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06));
    }
    .gsa-search-result small { color: #9ca3af; font-size: 0.75rem; margin-left: 0.35rem; }

    /* =============================================
       BUTTONS — PREMIUM
       ============================================= */
    .gos-button {
      display: inline-flex; align-items: center; justify-content: center;
      font-weight: 600; color: #fff; cursor: pointer;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none; padding: 0.625rem 1.25rem;
      font-size: 0.9375rem; line-height: 1.5;
      border-radius: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(102,126,234,0.3);
      position: relative; overflow: hidden;
    }
    .gos-button::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transform: translateX(-100%);
      transition: transform 0.5s ease;
    }
    .gos-button:hover::before { transform: translateX(100%); }
    .gos-button:hover { box-shadow: 0 6px 20px rgba(102,126,234,0.4); transform: translateY(-2px); }
    .gos-button:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(102,126,234,0.3); }

    /* =============================================
       SITE-WIDE GRADIENT PANEL HEADERS
       ============================================= */
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
      box-shadow: 0 4px 20px rgba(102,126,234,0.2) !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .gsa-settings-header::before,
    .gsa-invoices-header::before,
    .gsa-reports-header::before,
    .gsa-detail-header::before {
      content: '';
      position: absolute; inset: 0;
      background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23g)"/></svg>');
      opacity: 0.3; pointer-events: none;
    }
    .gsa-settings-header h2, .gsa-settings-header h3,
    .gsa-invoices-header h2, .gsa-reports-header h2,
    .gsa-detail-header h2 {
      color: #fff !important;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
      position: relative; z-index: 1; margin: 0 !important; font-weight: 700 !important;
    }

    /* =============================================
       PREMIUM INPUTS SITE-WIDE
       ============================================= */
    .gos-input,
    input[type="text"], input[type="email"], input[type="number"], input[type="search"],
    select, textarea {
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.9375rem !important;
      transition: all 0.2s ease !important;
      background: #fff !important;
    }
    .gos-input:focus,
    input[type="text"]:focus, input[type="email"]:focus, input[type="number"]:focus,
    input[type="search"]:focus, select:focus, textarea:focus {
      outline: none !important;
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.1) !important;
    }

    /* =============================================
       PREMIUM TABLES SITE-WIDE
       ============================================= */
    .gsa-table {
      width: 100%; border-collapse: collapse;
      background: #fff; border-radius: 12px;
      overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .gsa-table thead { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .gsa-table th {
      color: #fff !important; font-weight: 600 !important;
      text-transform: uppercase; font-size: 0.75rem;
      letter-spacing: 0.5px; padding: 1rem !important; text-align: left;
    }
    .gsa-table td { padding: 1rem !important; border-bottom: 1px solid #f3f4f6; }
    .gsa-table tbody tr:hover {
      background: linear-gradient(90deg, rgba(102,126,234,0.04), rgba(118,75,162,0.04));
    }

    /* =============================================
       RESPONSIVE — small screens
       ============================================= */
    @media (max-width: 1024px) {
      .gsa-sidebar { width: 68px; }
      .gsa-sidebar .gsa-logo-text,
      .gsa-sidebar .gsa-tab-label,
      .gsa-sidebar .gsa-tab-badge,
      .gsa-sidebar .gsa-profile-info { opacity: 0; max-width: 0; pointer-events: none; }
      .gsa-sidebar .gsa-collapse-btn { display: none; }
      .gsa-sidebar .gsa-sidebar-header { justify-content: center; padding: 1.25rem 0.5rem; }
      .gsa-sidebar .gsa-tab { justify-content: center; padding: 0.75rem; margin: 0.2rem 0.5rem; }
      .gsa-sidebar .gsa-tab-icon { margin-right: 0; }
      .gsa-sidebar .gsa-sidebar-profile { justify-content: center; padding: 1rem 0.5rem; }
      .gsa-content-wrapper { left: 68px; }
      .gsa-topbar-collapse-btn { display: flex; }
    }
  `;
  $('<style id="gsa-dashboard-styles"></style>').text(css).appendTo('head');

  /* ============================================================
     TAB ACTIVATION — preserves exact same event contract
     ============================================================ */
  function activate(tab) {
    const prev = current;
    current = tab;

    // Fire deactivated for previous panel so modules can clean up
    if (prev && prev !== tab) {
      $(document).trigger('gsa:panel:deactivated', [prev]);
    }

    // Update sidebar
    $c.find('.gsa-tab').removeClass('active');
    $c.find('.gsa-tab[data-tab="' + tab + '"]').addClass('active');

    // Update panels
    $c.find('.gsa-panel').removeClass('active');
    $c.find('#gsa-' + tab).addClass('active');

    // Update breadcrumbs
    $c.find('.gsa-breadcrumb-current').text(labels[tab] || tab);

    // Notify all modules
    $(document).trigger('gsa:panel:activated', [tab]);
  }

  /* ============================================================
     EVENT BINDINGS
     ============================================================ */
  // External activation (used by other modules)
  $(document).on('gsa:activate:panel', function(e, tabName) { activate(tabName); });

  // Sidebar tab clicks
  $c.on('click', '.gsa-tab', function(e) {
    e.preventDefault();
    activate(this.dataset.tab);
  });

  // Sidebar collapse toggle
  $c.on('click', '.gsa-collapse-btn, .gsa-topbar-collapse-btn', function() {
    sidebarCollapsed = !sidebarCollapsed;
    $c.find('.gsa-sidebar').toggleClass('collapsed', sidebarCollapsed);
  });

  // Breadcrumb home click
  $c.on('click', '.gsa-breadcrumb-home', function() { activate('dashboard'); });

  // Admin user dropdown (top-right)
  $c.on('click', '#gsa-user-menu-trigger', function(e) {
    e.stopPropagation();
    $('#gsa-user-dropdown').toggleClass('active');
  });
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#gsa-user-menu-trigger').length) {
      $('#gsa-user-dropdown').removeClass('active');
    }
  });
  $c.on('click', '.gsa-user-dropdown-item', function(e) {
    e.preventDefault();
    var action = $(this).data('action');
    $('#gsa-user-dropdown').removeClass('active');
    if (action === 'settings') activate('settings');
    if (action === 'profile') activate('settings');
    if (action === 'logout') {
      if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('gos_seeded');
        location.reload();
      }
    }
  });

  // Sidebar profile click
  $c.on('click', '.gsa-sidebar-profile', function() { activate('settings'); });

  /* ============================================================
     GLOBAL SEARCH  (moved to top-bar input)
     ============================================================ */
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
    searchTimeout = setTimeout(function() {
      fetch('/wp-json/glazieros/v1/search?term=' + encodeURIComponent(term))
        .then(function(res) { return res.json(); })
        .then(function(results) { renderSearchResults(results); });
    }, 500);
  });

  function renderSearchResults(results) {
    if (!results || results.length === 0) {
      $searchResultsContainer.hide().empty();
      return;
    }
    var html = '';
    results.forEach(function(r) {
      html += '<div class="gsa-search-result" data-id="' + r.id + '" data-type="' + r.type + '">'
            + r.title + ' <small>(' + r.type + ')</small></div>';
    });
    $searchResultsContainer.html(html).show();
  }

  $(document).on('click', function(e) {
    if (!$(e.target).closest('#gsa-global-search, #gsa-search-results-container').length) {
      $searchResultsContainer.hide();
    }
  });

  $c.on('click', '.gsa-search-result', function() {
    var id   = $(this).data('id');
    var type = $(this).data('type');
    if (type === 'Job' || type === 'Quote') {
      activate('quote-detail');
      $(document).trigger('gsa:quote:load', id);
    }
    $searchResultsContainer.hide().empty();
  });

  /* ============================================================
     BOOT — activate default tab after other scripts bind
     ============================================================ */
  setTimeout(function() { activate(current); }, 0);
});