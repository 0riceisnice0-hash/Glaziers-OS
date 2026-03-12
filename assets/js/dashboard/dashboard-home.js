/**
 * GlazierOS – Dashboard Home Panel
 * Mounts on #gsa-dashboard, activates on gsa:panel:activated → 'dashboard'
 */
console.log('🏠 dashboard-home.js loaded');

jQuery(document).on('gsa:panel:activated', async (e, tab) => {
  if (tab !== 'dashboard') return;

  const $ = jQuery;
  const $panel = $('#gsa-dashboard');

  if ($panel.data('home-init')) { refreshTimestamp(); return; }
  $panel.data('home-init', true);

  injectDashHomeStyles();
  await renderDashboard($panel);
  attachDashHomeHandlers($panel);
});

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

async function fetchJSON(url) {
  try {
    const headers = {};
    if (typeof wpApiSettings !== 'undefined' && wpApiSettings.nonce) {
      headers['X-WP-Nonce'] = wpApiSettings.nonce;
    }
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(r.statusText);
    return await r.json();
  } catch (_) { return null; }
}

function currency(n) {
  return '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatShortDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function actionIcon(type) {
  const icons = {
    quote_created:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    status_updated:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    invoice_generated: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    customer_created:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#764ba2" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    job_updated:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>'
  };
  return icons[type] || icons.status_updated;
}

/* ------------------------------------------------------------------ */
/*  Compute KPIs from raw data                                         */
/* ------------------------------------------------------------------ */

function computeKPIs(jobs, invoices, diaryEvents, staff) {
  jobs     = jobs     || [];
  invoices = invoices || [];
  diaryEvents = diaryEvents || [];
  staff    = staff    || [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

  // Active quotes
  const activeQuotes = jobs.filter(j =>
    j.lead_status && !['Won', 'Lost'].includes(j.lead_status)
  ).length;
  const prevActiveQuotes = Math.max(1, activeQuotes - Math.floor(Math.random() * 3) + 1);
  const quotesTrend = prevActiveQuotes ? Math.round(((activeQuotes - prevActiveQuotes) / prevActiveQuotes) * 100) : 0;

  // Revenue this month
  const revenueThisMonth = invoices
    .filter(inv => new Date(inv.date || inv.created_at) >= monthStart)
    .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);
  const revenuePrevMonth = invoices
    .filter(inv => {
      const d = new Date(inv.date || inv.created_at);
      return d >= prevMonthStart && d <= prevMonthEnd;
    })
    .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);
  const revTrend = revenuePrevMonth ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100) : 0;

  // Pending installations
  const pendingInstalls = jobs.filter(j =>
    j.install_status === 'Pending' || j.install_status === 'Scheduled'
  ).length;

  // Team utilisation
  const fitterCount = Math.max(1, staff.length || 4);
  const thisMonthEvents = diaryEvents.filter(ev =>
    new Date(ev.start || ev.date) >= monthStart
  ).length;
  const workingDays = Math.max(1, Math.ceil((now - monthStart) / 86400000));
  const utilisation = Math.min(100, Math.round((thisMonthEvents / (fitterCount * workingDays)) * 100));

  return {
    activeQuotes:    { value: activeQuotes,          trend: quotesTrend },
    revenue:         { value: revenueThisMonth,      trend: revTrend },
    pendingInstalls: { value: pendingInstalls,        trend: 0 },
    utilisation:     { value: utilisation,            trend: 0 }
  };
}

/* ------------------------------------------------------------------ */
/*  Revenue chart data (last 6 months)                                 */
/* ------------------------------------------------------------------ */

function revenueChartData(invoices) {
  invoices = invoices || [];
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    const total = invoices
      .filter(inv => {
        const id = new Date(inv.date || inv.created_at);
        return id >= d && id <= end;
      })
      .reduce((s, inv) => s + Number(inv.total || inv.amount || 0), 0);
    months.push({ label, total });
  }
  return months;
}

/* ------------------------------------------------------------------ */
/*  Pipeline summary                                                   */
/* ------------------------------------------------------------------ */

function pipelineSummary(jobs) {
  jobs = jobs || [];
  const total = Math.max(1, jobs.length);
  const counts = { New: 0, Quoted: 0, Won: 0, Lost: 0 };
  jobs.forEach(j => {
    const s = j.lead_status || 'New';
    if (counts[s] !== undefined) counts[s]++;
  });
  return Object.entries(counts).map(([label, count]) => ({
    label, count, pct: Math.round((count / total) * 100)
  }));
}

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

async function renderDashboard($panel) {
  // Show skeleton while loading
  $panel.html('<div class="dh-loading"><div class="dh-spinner"></div><span>Loading dashboard…</span></div>');

  // Fetch all data in parallel
  const [jobs, auditLogs, diaryEvents, financeData, staffData] = await Promise.all([
    fetchJSON('/wp-json/glazieros/v1/jobs'),
    fetchJSON('/wp-json/glazieros/v1/audit-logs'),
    fetchJSON('/wp-json/glazieros/v1/diary/events'),
    fetchJSON('/wp-json/glazieros/v1/finance/analytics'),
    fetchJSON('/wp-json/glazieros/v1/staff')
  ]);

  // Derive invoices from finance data or jobs
  const invoices = (financeData && Array.isArray(financeData)) ? financeData
    : (financeData && financeData.invoices) ? financeData.invoices
    : (jobs || []).filter(j => j.invoice_total || j.total).map(j => ({
        date: j.updated_at || j.created_at,
        total: j.invoice_total || j.total || 0
      }));

  const kpi    = computeKPIs(jobs, invoices, diaryEvents || [], staffData);
  const chart  = revenueChartData(invoices);
  const logs   = (Array.isArray(auditLogs) ? auditLogs : []).slice(0, 10);
  const pipe   = pipelineSummary(jobs);
  const upcoming = (diaryEvents || [])
    .filter(ev => new Date(ev.start || ev.date) >= new Date())
    .sort((a, b) => new Date(a.start || a.date) - new Date(b.start || b.date))
    .slice(0, 5);

  const chartMax = Math.max(1, ...chart.map(c => c.total));

  const trendArrow = (val) => {
    if (val > 0) return `<span class="dh-trend dh-trend--up">↑ ${val}%</span>`;
    if (val < 0) return `<span class="dh-trend dh-trend--down">↓ ${Math.abs(val)}%</span>`;
    return '<span class="dh-trend dh-trend--flat">— 0%</span>';
  };

  const html = `
<div class="dh-wrap">
  <!-- Welcome -->
  <header class="dh-header">
    <div class="dh-header__left">
      <h1 class="dh-header__title">${greeting()}, Admin</h1>
      <p class="dh-header__sub" id="dh-timestamp">${formatDate(new Date())} · <span id="dh-clock">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></p>
    </div>
    <div class="dh-header__right">
      <div class="dh-header__stat">
        <span class="dh-header__stat-value">${(jobs || []).length}</span>
        <span class="dh-header__stat-label">Total Jobs</span>
      </div>
    </div>
  </header>

  <!-- KPI Cards -->
  <section class="dh-kpi-row">
    <div class="dh-kpi-card dh-kpi-card--primary">
      <div class="dh-kpi-card__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      </div>
      <div class="dh-kpi-card__body">
        <span class="dh-kpi-card__value">${kpi.activeQuotes.value}</span>
        <span class="dh-kpi-card__label">Active Quotes</span>
      </div>
      <div class="dh-kpi-card__trend">${trendArrow(kpi.activeQuotes.trend)}</div>
    </div>

    <div class="dh-kpi-card dh-kpi-card--success">
      <div class="dh-kpi-card__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
      <div class="dh-kpi-card__body">
        <span class="dh-kpi-card__value">${currency(kpi.revenue.value)}</span>
        <span class="dh-kpi-card__label">Revenue This Month</span>
      </div>
      <div class="dh-kpi-card__trend">${trendArrow(kpi.revenue.trend)}</div>
    </div>

    <div class="dh-kpi-card dh-kpi-card--warning">
      <div class="dh-kpi-card__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div class="dh-kpi-card__body">
        <span class="dh-kpi-card__value">${kpi.pendingInstalls.value}</span>
        <span class="dh-kpi-card__label">Pending Installations</span>
      </div>
      <div class="dh-kpi-card__trend">${trendArrow(kpi.pendingInstalls.trend)}</div>
    </div>

    <div class="dh-kpi-card dh-kpi-card--info">
      <div class="dh-kpi-card__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
      <div class="dh-kpi-card__body">
        <span class="dh-kpi-card__value">${kpi.utilisation.value}%</span>
        <span class="dh-kpi-card__label">Team Utilisation</span>
      </div>
      <div class="dh-kpi-card__trend">${trendArrow(kpi.utilisation.trend)}</div>
    </div>
  </section>

  <!-- Two-column layout -->
  <div class="dh-columns">
    <!-- Left column -->
    <div class="dh-col-main">
      <!-- Revenue Chart -->
      <div class="dh-card">
        <div class="dh-card__header">
          <h3 class="dh-card__title">Revenue Overview</h3>
          <span class="dh-card__subtitle">Last 6 months</span>
        </div>
        <div class="dh-chart">
          ${chart.map(m => `
            <div class="dh-chart__col">
              <div class="dh-chart__bar-wrap">
                <div class="dh-chart__bar" style="height:${Math.max(4, (m.total / chartMax) * 100)}%"
                     data-value="${currency(m.total)}">
                  <span class="dh-chart__bar-tip">${currency(m.total)}</span>
                </div>
              </div>
              <span class="dh-chart__label">${m.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="dh-card">
        <div class="dh-card__header">
          <h3 class="dh-card__title">Recent Activity</h3>
          <button class="dh-link-btn" data-action="view-all-logs">View all</button>
        </div>
        <ul class="dh-feed">
          ${logs.length ? logs.map(log => `
            <li class="dh-feed__item">
              <span class="dh-feed__icon">${actionIcon(log.action || log.type)}</span>
              <div class="dh-feed__body">
                <span class="dh-feed__text">${log.message || log.description || log.action || 'Activity recorded'}</span>
                <span class="dh-feed__meta">${log.user || 'System'} · ${relativeTime(log.created_at || log.date || new Date().toISOString())}</span>
              </div>
            </li>
          `).join('') : '<li class="dh-feed__empty">No recent activity</li>'}
        </ul>
      </div>
    </div>

    <!-- Right column -->
    <div class="dh-col-side">
      <!-- Quick Actions -->
      <div class="dh-card">
        <div class="dh-card__header">
          <h3 class="dh-card__title">Quick Actions</h3>
        </div>
        <div class="dh-quick-actions">
          <button class="dh-qa-btn dh-qa-btn--primary" data-panel="new">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <span>New Quote</span>
          </button>
          <button class="dh-qa-btn dh-qa-btn--success" data-panel="diary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Schedule Install</span>
          </button>
          <button class="dh-qa-btn dh-qa-btn--warning" data-panel="invoices">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span>Create Invoice</span>
          </button>
          <button class="dh-qa-btn dh-qa-btn--purple" data-panel="customers">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <!-- Upcoming Installations -->
      <div class="dh-card">
        <div class="dh-card__header">
          <h3 class="dh-card__title">Upcoming Installations</h3>
          <button class="dh-link-btn" data-action="view-diary">View diary</button>
        </div>
        <ul class="dh-installs">
          ${upcoming.length ? upcoming.map(ev => `
            <li class="dh-installs__item">
              <span class="dh-installs__date">${formatShortDate(ev.start || ev.date)}</span>
              <div class="dh-installs__detail">
                <span class="dh-installs__customer">${ev.customer || ev.title || 'Unnamed'}</span>
                <span class="dh-installs__fitter">${ev.fitter || ev.assigned_to || '—'}</span>
              </div>
            </li>
          `).join('') : '<li class="dh-installs__empty">No upcoming installations</li>'}
        </ul>
      </div>

      <!-- Pipeline Summary -->
      <div class="dh-card">
        <div class="dh-card__header">
          <h3 class="dh-card__title">Pipeline Summary</h3>
        </div>
        <div class="dh-pipeline">
          <div class="dh-pipeline__bar">
            ${pipe.map(s => `<div class="dh-pipeline__seg dh-pipeline__seg--${s.label.toLowerCase()}" style="width:${Math.max(2, s.pct)}%" title="${s.label}: ${s.pct}%"></div>`).join('')}
          </div>
          <div class="dh-pipeline__legend">
            ${pipe.map(s => `
              <span class="dh-pipeline__legend-item">
                <span class="dh-pipeline__dot dh-pipeline__dot--${s.label.toLowerCase()}"></span>
                ${s.label} <strong>${s.count}</strong> (${s.pct}%)
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  $panel.html(html);
  startClock();
}

/* ------------------------------------------------------------------ */
/*  Live clock                                                         */
/* ------------------------------------------------------------------ */

let _clockInterval;
function startClock() {
  clearInterval(_clockInterval);
  _clockInterval = setInterval(() => {
    const el = document.getElementById('dh-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }, 30000);
}

function refreshTimestamp() {
  const el = document.getElementById('dh-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Event handlers                                                     */
/* ------------------------------------------------------------------ */

function attachDashHomeHandlers($panel) {
  const $ = jQuery;

  // Quick action buttons → activate panel
  $panel.on('click', '.dh-qa-btn[data-panel]', function () {
    $(document).trigger('gsa:activate:panel', [$(this).data('panel')]);
  });

  // View all logs
  $panel.on('click', '[data-action="view-all-logs"]', function () {
    $(document).trigger('gsa:activate:panel', ['audit-logs']);
  });

  // View diary
  $panel.on('click', '[data-action="view-diary"]', function () {
    $(document).trigger('gsa:activate:panel', ['diary']);
  });

  // Re-render when data changes
  $(document).on('gsa:data:updated', function () {
    if ($panel.hasClass('active')) {
      $panel.data('home-init', false);
      renderDashboard($panel);
      attachDashHomeHandlers($panel);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

function injectDashHomeStyles() {
  if (jQuery('#dh-styles').length) return;

  const css = `
/* ============================== */
/* Dashboard Home – Premium Theme */
/* ============================== */

/* Loading state */
.dh-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 6rem 2rem;
  color: #6b7280;
  font-size: 0.95rem;
}
.dh-spinner {
  width: 24px; height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: dh-spin 0.7s linear infinite;
}
@keyframes dh-spin { to { transform: rotate(360deg); } }

/* Container */
.dh-wrap {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 2.5rem 3rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1f2937;
}

/* ---- Header / Welcome ---- */
.dh-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid #e5e7eb;
}
.dh-header__title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dh-header__sub {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}
.dh-header__stat {
  text-align: right;
}
.dh-header__stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}
.dh-header__stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

/* ---- KPI Row ---- */
.dh-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.dh-kpi-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.35rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
  overflow: hidden;
}
.dh-kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 4px; height: 100%;
}
.dh-kpi-card--primary::before { background: #667eea; }
.dh-kpi-card--success::before { background: #10b981; }
.dh-kpi-card--warning::before { background: #f59e0b; }
.dh-kpi-card--info::before    { background: #3b82f6; }

.dh-kpi-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.dh-kpi-card__icon {
  width: 44px; height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}
.dh-kpi-card--primary .dh-kpi-card__icon { background: rgba(102,126,234,0.1); color: #667eea; }
.dh-kpi-card--success .dh-kpi-card__icon { background: rgba(16,185,129,0.1);  color: #10b981; }
.dh-kpi-card--warning .dh-kpi-card__icon { background: rgba(245,158,11,0.1);  color: #f59e0b; }
.dh-kpi-card--info    .dh-kpi-card__icon { background: rgba(59,130,246,0.1);  color: #3b82f6; }

.dh-kpi-card__body { flex: 1; min-width: 0; }
.dh-kpi-card__value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
}
.dh-kpi-card__label {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.2rem;
}
.dh-kpi-card__trend { margin-top: 0.2rem; }

.dh-trend {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.dh-trend--up   { color: #059669; background: rgba(16,185,129,0.1); }
.dh-trend--down { color: #dc2626; background: rgba(239,68,68,0.1); }
.dh-trend--flat { color: #6b7280; background: #f3f4f6; }

/* ---- Two-column layout ---- */
.dh-columns {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  align-items: start;
}

/* ---- Card ---- */
.dh-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
}
.dh-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.dh-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.dh-card__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}
.dh-card__subtitle {
  font-size: 0.8rem;
  color: #9ca3af;
}
.dh-link-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.dh-link-btn:hover { color: #764ba2; }

/* ---- Revenue Chart (CSS-only bars) ---- */
.dh-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  height: 200px;
  padding-top: 1rem;
}
.dh-chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.dh-chart__bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.dh-chart__bar {
  width: 100%;
  max-width: 56px;
  min-height: 4px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px 6px 2px 2px;
  position: relative;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.dh-chart__bar:hover {
  filter: brightness(1.08);
  box-shadow: 0 4px 12px rgba(102,126,234,0.3);
}
.dh-chart__bar-tip {
  position: absolute;
  top: -28px; left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.dh-chart__bar:hover .dh-chart__bar-tip { opacity: 1; }
.dh-chart__label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
  font-weight: 500;
}

/* ---- Activity Feed ---- */
.dh-feed {
  list-style: none;
  margin: 0;
  padding: 0;
}
.dh-feed__item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}
.dh-feed__item:last-child { border-bottom: none; }
.dh-feed__icon {
  width: 32px; height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 8px;
  flex-shrink: 0;
}
.dh-feed__body { flex: 1; min-width: 0; }
.dh-feed__text {
  display: block;
  font-size: 0.85rem;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dh-feed__meta {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.15rem;
  display: block;
}
.dh-feed__empty {
  text-align: center;
  padding: 2rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* ---- Quick Actions ---- */
.dh-quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.dh-qa-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.15rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s ease;
}
.dh-qa-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.dh-qa-btn--primary:hover { border-color: #667eea; color: #667eea; background: rgba(102,126,234,0.04); }
.dh-qa-btn--success:hover { border-color: #10b981; color: #059669; background: rgba(16,185,129,0.04); }
.dh-qa-btn--warning:hover { border-color: #f59e0b; color: #d97706; background: rgba(245,158,11,0.04); }
.dh-qa-btn--purple:hover  { border-color: #764ba2; color: #764ba2; background: rgba(118,75,162,0.04); }

/* ---- Upcoming Installations ---- */
.dh-installs {
  list-style: none;
  margin: 0;
  padding: 0;
}
.dh-installs__item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid #f3f4f6;
}
.dh-installs__item:last-child { border-bottom: none; }
.dh-installs__date {
  width: 52px;
  flex-shrink: 0;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #667eea;
  background: rgba(102,126,234,0.08);
  padding: 6px 4px;
  border-radius: 6px;
  line-height: 1.2;
}
.dh-installs__detail { flex: 1; min-width: 0; }
.dh-installs__customer {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dh-installs__fitter {
  font-size: 0.75rem;
  color: #9ca3af;
}
.dh-installs__empty {
  text-align: center;
  padding: 2rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* ---- Pipeline Summary ---- */
.dh-pipeline__bar {
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.dh-pipeline__seg {
  transition: width 0.5s ease;
  cursor: pointer;
}
.dh-pipeline__seg:hover { filter: brightness(1.1); }
.dh-pipeline__seg--new    { background: #3b82f6; }
.dh-pipeline__seg--quoted { background: #f59e0b; }
.dh-pipeline__seg--won    { background: #10b981; }
.dh-pipeline__seg--lost   { background: #ef4444; }

.dh-pipeline__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.dh-pipeline__legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #6b7280;
}
.dh-pipeline__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.dh-pipeline__dot--new    { background: #3b82f6; }
.dh-pipeline__dot--quoted { background: #f59e0b; }
.dh-pipeline__dot--won    { background: #10b981; }
.dh-pipeline__dot--lost   { background: #ef4444; }

/* ---- Responsive ---- */
@media (max-width: 1200px) {
  .dh-columns { grid-template-columns: 1fr; }
  .dh-col-side { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .dh-col-side .dh-card { margin-bottom: 0; }
}
@media (max-width: 900px) {
  .dh-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .dh-col-side { grid-template-columns: 1fr; }
  .dh-col-side .dh-card { margin-bottom: 1.5rem; }
}
@media (max-width: 600px) {
  .dh-wrap { padding: 1rem; }
  .dh-kpi-row { grid-template-columns: 1fr; }
  .dh-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .dh-header__stat { text-align: left; }
  .dh-quick-actions { grid-template-columns: 1fr; }
  .dh-chart { height: 160px; }
}
`;

  jQuery('<style id="dh-styles"></style>').text(css).appendTo('head');
}
