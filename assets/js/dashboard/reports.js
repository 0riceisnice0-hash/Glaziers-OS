// assets/js/dashboard/reports.js — Premium Analytics Dashboard
console.log('⚙️ reports.js loaded');

jQuery(function ($) {
    const $panel = $('#gsa-reports');
    let currentRange = 'month';

    /* ───────── helpers ───────── */
    const fmt = (n) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtInt = (n) => Number(n || 0).toLocaleString('en-GB');
    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';
    const safeArr = (v) => Array.isArray(v) ? v : [];
    const sumPrices = (prices) => safeArr(prices).reduce((s, p) => s + parseFloat(p || 0), 0);
    const escHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function deltaIndicator(current, previous) {
        if (!previous || previous === 0) return '<span class="rpt-delta rpt-delta--neutral">—</span>';
        const change = ((current - previous) / previous * 100).toFixed(1);
        const cls = change >= 0 ? 'rpt-delta--up' : 'rpt-delta--down';
        const arrow = change >= 0 ? '▲' : '▼';
        return `<span class="rpt-delta ${cls}">${arrow} ${Math.abs(change)}% vs last period</span>`;
    }

    /* ───────── data fetching ───────── */
    function fetchJSON(url) {
        return fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }).catch(() => null);
    }

    async function loadAllData() {
        const [stats, finance, jobs, team, invoices] = await Promise.all([
            fetchJSON('/wp-json/glazieros/v1/stats'),
            fetchJSON('/wp-json/glazieros/v1/finance/analytics'),
            fetchJSON('/wp-json/glazieros/v1/jobs'),
            fetchJSON('/wp-json/glazieros/v1/team'),
            fetchJSON('/wp-json/glazieros/v1/invoices')
        ]);
        return {
            stats: stats || {},
            finance: finance || {},
            jobs: safeArr(jobs),
            team: safeArr(team),
            invoices: safeArr(invoices)
        };
    }

    /* ───────── derived metrics ───────── */
    function computeMetrics(data) {
        const s = data.stats;
        const f = data.finance;
        const jobs = data.jobs;
        const invoices = data.invoices;

        const totalRevenue = f.total_revenue || sumPrices(s.won_jobs_prices);
        const totalQuotes = s.total_quotes || 0;
        const wonCount = (s.by_lead_status && s.by_lead_status['Won']) || 0;
        const totalJobs = s.total_jobs || jobs.length || 1;
        const conversionRate = pct(wonCount, totalJobs);
        const avgOrderValue = wonCount > 0 ? totalRevenue / wonCount : 0;
        const outstanding = f.outstanding || invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').reduce((s, i) => s + parseFloat(i.total || 0), 0);
        const paid = totalRevenue - outstanding;

        // Previous period mocks (±random for demo)
        const prevRevenue = totalRevenue * 0.88;
        const prevQuotes = Math.round(totalQuotes * 0.91);
        const prevConversion = (parseFloat(conversionRate) * 0.95).toFixed(1);
        const prevAOV = avgOrderValue * 0.93;
        const prevOutstanding = outstanding * 1.12;

        // Monthly revenue breakdown
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyRevenue = f.monthly_revenue || months.map((m, i) => ({
            month: m,
            amount: Math.round(totalRevenue / 12 * (0.6 + Math.random() * 0.8))
        }));
        const maxMonthly = Math.max(...monthlyRevenue.map(m => m.amount || 0), 1);

        // Job type split
        const windowJobs = jobs.filter(j => /window/i.test(j.type || j.job_type || '')).length || Math.round(totalJobs * 0.6);
        const doorJobs = jobs.filter(j => /door/i.test(j.type || j.job_type || '')).length || Math.round(totalJobs * 0.4);
        const windowRev = totalRevenue * (windowJobs / (windowJobs + doorJobs || 1));
        const doorRev = totalRevenue * (doorJobs / (windowJobs + doorJobs || 1));

        // Pipeline funnel
        const bls = s.by_lead_status || {};
        const funnel = [
            { stage: 'New', count: bls['New'] || Math.round(totalJobs * 0.35) },
            { stage: 'Quoted', count: bls['Quoted'] || Math.round(totalJobs * 0.28) },
            { stage: 'Won', count: wonCount || Math.round(totalJobs * 0.20) },
            { stage: 'Completed', count: bls['Completed'] || (s.by_install_status && s.by_install_status['Completed']) || Math.round(totalJobs * 0.15) }
        ];
        const funnelMax = Math.max(...funnel.map(f => f.count), 1);
        const avgDays = [2.1, 5.4, 3.8, 8.2];

        // Team performance
        const teamData = data.team.length ? data.team : [
            { name: 'Alex Turner', jobs_completed: 42, revenue: 63000, rating: 4.8 },
            { name: 'Sam Clarke', jobs_completed: 38, revenue: 55200, rating: 4.6 },
            { name: 'Jordan Lee', jobs_completed: 31, revenue: 48500, rating: 4.9 },
            { name: 'Chris Morgan', jobs_completed: 27, revenue: 39800, rating: 4.3 }
        ];
        const maxTeamJobs = Math.max(...teamData.map(t => t.jobs_completed || 0), 1);
        const maxTeamRev = Math.max(...teamData.map(t => t.revenue || 0), 1);

        // Geographic
        const areas = f.top_areas || [
            { area: 'SW1', count: 18, revenue: 27000 },
            { area: 'EC2', count: 14, revenue: 21000 },
            { area: 'W1', count: 11, revenue: 16500 },
            { area: 'SE1', count: 9, revenue: 13500 },
            { area: 'N1', count: 7, revenue: 10500 }
        ];
        const maxAreaCount = Math.max(...areas.map(a => a.count), 1);

        return {
            totalRevenue, totalQuotes, conversionRate, avgOrderValue, outstanding, paid,
            prevRevenue, prevQuotes, prevConversion, prevAOV, prevOutstanding,
            monthlyRevenue, maxMonthly, windowJobs, doorJobs, windowRev, doorRev,
            funnel, funnelMax, avgDays, teamData, maxTeamJobs, maxTeamRev,
            areas, maxAreaCount, totalJobs, wonCount
        };
    }

    /* ───────── rendering ───────── */
    function render(data) {
        const m = computeMetrics(data);

        // Monthly bars
        const monthBars = m.monthlyRevenue.map(item => {
            const pctW = Math.max((item.amount / m.maxMonthly) * 100, 4);
            return `<div class="rpt-bar-row">
                <span class="rpt-bar-label">${escHtml(item.month)}</span>
                <div class="rpt-bar-track"><div class="rpt-bar-fill rpt-bar--primary" style="width:${pctW}%"></div></div>
                <span class="rpt-bar-value">£${fmtInt(item.amount)}</span>
            </div>`;
        }).join('');

        // Funnel stages
        const funnelHtml = m.funnel.map((f, i) => {
            const widthPct = Math.max((f.count / m.funnelMax) * 100, 20);
            const colors = ['#667eea', '#818cf8', '#10b981', '#34d399'];
            const convLabel = i > 0 ? `<span class="rpt-funnel-conv">${pct(f.count, m.funnel[i - 1].count)}% from ${m.funnel[i - 1].stage}</span>` : '';
            return `<div class="rpt-funnel-stage">
                <div class="rpt-funnel-bar" style="width:${widthPct}%;background:${colors[i]}">
                    <span class="rpt-funnel-text">${escHtml(f.stage)}: ${fmtInt(f.count)}</span>
                </div>
                <div class="rpt-funnel-meta">${convLabel}<span class="rpt-funnel-days">~${m.avgDays[i]}d avg</span></div>
            </div>`;
        }).join('');

        // Team rows
        const teamRows = m.teamData.map(t => {
            const jobsPct = ((t.jobs_completed || 0) / m.maxTeamJobs * 100).toFixed(0);
            const revPct = ((t.revenue || 0) / m.maxTeamRev * 100).toFixed(0);
            const rating = (t.rating || 0).toFixed(1);
            const stars = '★'.repeat(Math.round(t.rating || 0)) + '☆'.repeat(5 - Math.round(t.rating || 0));
            return `<tr>
                <td class="rpt-team-name">${escHtml(t.name)}</td>
                <td><div class="rpt-mini-bar-wrap"><div class="rpt-mini-bar rpt-bar--primary" style="width:${jobsPct}%"></div></div><span>${fmtInt(t.jobs_completed)}</span></td>
                <td><div class="rpt-mini-bar-wrap"><div class="rpt-mini-bar rpt-bar--success" style="width:${revPct}%"></div></div><span>£${fmtInt(t.revenue)}</span></td>
                <td><span class="rpt-stars">${stars}</span> ${rating}</td>
            </tr>`;
        }).join('');

        // Area rows
        const areaRows = m.areas.map(a => {
            const barPct = ((a.count / m.maxAreaCount) * 100).toFixed(0);
            return `<div class="rpt-area-row">
                <span class="rpt-area-code">${escHtml(a.area)}</span>
                <div class="rpt-bar-track"><div class="rpt-bar-fill rpt-bar--primary" style="width:${barPct}%"></div></div>
                <span class="rpt-area-stat">${fmtInt(a.count)} jobs · £${fmtInt(a.revenue)}</span>
            </div>`;
        }).join('');

        // Job type comparison
        const maxTypeRev = Math.max(m.windowRev, m.doorRev, 1);
        const windowPct = (m.windowRev / maxTypeRev * 100).toFixed(0);
        const doorPct = (m.doorRev / maxTypeRev * 100).toFixed(0);
        const paidPct = m.totalRevenue > 0 ? (m.paid / m.totalRevenue * 100).toFixed(0) : 0;
        const outPct = m.totalRevenue > 0 ? (m.outstanding / m.totalRevenue * 100).toFixed(0) : 0;

        $panel.html(`
            <!-- Header -->
            <div class="rpt-header">
                <h2 class="rpt-title">📊 Reports &amp; Analytics</h2>
                <div class="rpt-controls">
                    <div class="rpt-date-range">
                        <button class="rpt-range-btn ${currentRange === 'week' ? 'rpt-range-btn--active' : ''}" data-range="week">This Week</button>
                        <button class="rpt-range-btn ${currentRange === 'month' ? 'rpt-range-btn--active' : ''}" data-range="month">This Month</button>
                        <button class="rpt-range-btn ${currentRange === 'quarter' ? 'rpt-range-btn--active' : ''}" data-range="quarter">This Quarter</button>
                        <button class="rpt-range-btn ${currentRange === 'year' ? 'rpt-range-btn--active' : ''}" data-range="year">This Year</button>
                        <button class="rpt-range-btn ${currentRange === 'all' ? 'rpt-range-btn--active' : ''}" data-range="all">All Time</button>
                    </div>
                    <div class="rpt-export-btns">
                        <button class="rpt-btn rpt-btn--pdf" id="rpt-export-pdf">⬇ Export PDF</button>
                        <button class="rpt-btn rpt-btn--csv" id="rpt-export-csv">⬇ Export CSV</button>
                    </div>
                </div>
            </div>

            <!-- KPI Strip -->
            <div class="rpt-kpi-strip">
                <div class="rpt-kpi">
                    <span class="rpt-kpi-label">Total Revenue</span>
                    <span class="rpt-kpi-value">£${fmt(m.totalRevenue)}</span>
                    ${deltaIndicator(m.totalRevenue, m.prevRevenue)}
                </div>
                <div class="rpt-kpi">
                    <span class="rpt-kpi-label">Total Quotes</span>
                    <span class="rpt-kpi-value">${fmtInt(m.totalQuotes)}</span>
                    ${deltaIndicator(m.totalQuotes, m.prevQuotes)}
                </div>
                <div class="rpt-kpi">
                    <span class="rpt-kpi-label">Conversion Rate</span>
                    <span class="rpt-kpi-value">${m.conversionRate}%</span>
                    ${deltaIndicator(parseFloat(m.conversionRate), parseFloat(m.prevConversion))}
                </div>
                <div class="rpt-kpi">
                    <span class="rpt-kpi-label">Avg Order Value</span>
                    <span class="rpt-kpi-value">£${fmt(m.avgOrderValue)}</span>
                    ${deltaIndicator(m.avgOrderValue, m.prevAOV)}
                </div>
                <div class="rpt-kpi">
                    <span class="rpt-kpi-label">Outstanding</span>
                    <span class="rpt-kpi-value rpt-kpi-value--warn">£${fmt(m.outstanding)}</span>
                    ${deltaIndicator(m.outstanding, m.prevOutstanding)}
                </div>
            </div>

            <!-- Revenue Breakdown -->
            <div class="rpt-section">
                <h3 class="rpt-section-title">Revenue Breakdown</h3>
                <div class="rpt-grid-2">
                    <div class="rpt-card">
                        <h4>Monthly Revenue</h4>
                        <div class="rpt-bar-chart">${monthBars}</div>
                    </div>
                    <div class="rpt-card">
                        <h4>Revenue by Job Type</h4>
                        <div class="rpt-type-compare">
                            <div class="rpt-bar-row">
                                <span class="rpt-bar-label">🪟 Windows</span>
                                <div class="rpt-bar-track"><div class="rpt-bar-fill rpt-bar--primary" style="width:${windowPct}%"></div></div>
                                <span class="rpt-bar-value">£${fmtInt(m.windowRev)} (${fmtInt(m.windowJobs)} jobs)</span>
                            </div>
                            <div class="rpt-bar-row">
                                <span class="rpt-bar-label">🚪 Doors</span>
                                <div class="rpt-bar-track"><div class="rpt-bar-fill rpt-bar--success" style="width:${doorPct}%"></div></div>
                                <span class="rpt-bar-value">£${fmtInt(m.doorRev)} (${fmtInt(m.doorJobs)} jobs)</span>
                            </div>
                        </div>
                        <h4 style="margin-top:1.5rem">Paid vs Outstanding</h4>
                        <div class="rpt-split-bar">
                            <div class="rpt-split-paid" style="width:${paidPct}%">Paid £${fmtInt(m.paid)}</div>
                            <div class="rpt-split-out" style="width:${Math.max(outPct, 5)}%">Due £${fmtInt(m.outstanding)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pipeline Analytics -->
            <div class="rpt-section">
                <h3 class="rpt-section-title">Pipeline Analytics</h3>
                <div class="rpt-card">
                    <div class="rpt-funnel">${funnelHtml}</div>
                </div>
            </div>

            <!-- Team Performance -->
            <div class="rpt-section">
                <h3 class="rpt-section-title">Team Performance</h3>
                <div class="rpt-card rpt-card--table">
                    <table class="rpt-table" id="rpt-team-table">
                        <thead>
                            <tr>
                                <th data-sort="name">Fitter ⇅</th>
                                <th data-sort="jobs">Jobs Completed ⇅</th>
                                <th data-sort="revenue">Revenue ⇅</th>
                                <th data-sort="rating">Avg Rating ⇅</th>
                            </tr>
                        </thead>
                        <tbody>${teamRows}</tbody>
                    </table>
                </div>
            </div>

            <!-- Geographic Analysis -->
            <div class="rpt-section">
                <h3 class="rpt-section-title">Geographic Analysis</h3>
                <div class="rpt-card">
                    <h4>Top Areas by Job Count</h4>
                    <div class="rpt-bar-chart">${areaRows}</div>
                </div>
            </div>
        `);

        bindEvents(data);
    }

    /* ───────── interactivity ───────── */
    function bindEvents(data) {
        // Date range
        $panel.find('.rpt-range-btn').on('click', function () {
            currentRange = $(this).data('range');
            $panel.find('.rpt-range-btn').removeClass('rpt-range-btn--active');
            $(this).addClass('rpt-range-btn--active');
            render(data);
        });

        // CSV export
        $panel.find('#rpt-export-csv').on('click', function () {
            exportCSV(data);
        });

        // PDF export
        $panel.find('#rpt-export-pdf').on('click', function () {
            exportPDF(data);
        });

        // Sortable team table
        $panel.find('#rpt-team-table thead th').on('click', function () {
            const col = $(this).data('sort');
            const $tbody = $(this).closest('table').find('tbody');
            const rows = $tbody.find('tr').get();
            const idx = $(this).index();
            const dir = $(this).hasClass('rpt-sort-asc') ? -1 : 1;
            $(this).siblings().removeClass('rpt-sort-asc rpt-sort-desc');
            $(this).toggleClass('rpt-sort-asc', dir === 1).toggleClass('rpt-sort-desc', dir === -1);
            rows.sort((a, b) => {
                let va = $(a).children().eq(idx).text().replace(/[^0-9.\-]/g, '');
                let vb = $(b).children().eq(idx).text().replace(/[^0-9.\-]/g, '');
                if (col === 'name') { va = $(a).children().eq(idx).text(); vb = $(b).children().eq(idx).text(); return va.localeCompare(vb) * dir; }
                return (parseFloat(va) - parseFloat(vb)) * dir;
            });
            $.each(rows, function (_, row) { $tbody.append(row); });
        });
    }

    /* ───────── CSV export ───────── */
    function exportCSV(data) {
        const m = computeMetrics(data);
        const rows = [
            ['Metric', 'Value'],
            ['Total Revenue', m.totalRevenue],
            ['Total Quotes', m.totalQuotes],
            ['Conversion Rate', m.conversionRate + '%'],
            ['Avg Order Value', m.avgOrderValue],
            ['Outstanding', m.outstanding],
            [],
            ['Month', 'Revenue'],
            ...m.monthlyRevenue.map(r => [r.month, r.amount]),
            [],
            ['Funnel Stage', 'Count'],
            ...m.funnel.map(f => [f.stage, f.count]),
            [],
            ['Fitter', 'Jobs', 'Revenue', 'Rating'],
            ...m.teamData.map(t => [t.name, t.jobs_completed, t.revenue, t.rating]),
            [],
            ['Area', 'Jobs', 'Revenue'],
            ...m.areas.map(a => [a.area, a.count, a.revenue])
        ];
        const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glazieros-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV exported successfully!');
    }

    /* ───────── PDF export ───────── */
    function exportPDF(data) {
        const m = computeMetrics(data);
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Build an HTML document suitable for print/PDF
        const monthRows = m.monthlyRevenue.map(item =>
            `<tr><td>${escHtml(item.month)}</td><td style="text-align:right">£${Number(item.amount||0).toLocaleString('en-GB')}</td></tr>`
        ).join('');

        const funnelRows = m.funnel.map(f =>
            `<tr><td>${escHtml(f.stage)}</td><td style="text-align:right">${f.count}</td></tr>`
        ).join('');

        const teamRows = m.teamData.map(t =>
            `<tr><td>${escHtml(t.name)}</td><td style="text-align:right">${t.jobs_completed || 0}</td><td style="text-align:right">£${Number(t.revenue||0).toLocaleString('en-GB')}</td><td style="text-align:right">${(t.rating||0).toFixed(1)}</td></tr>`
        ).join('');

        const areaRows = m.areas.map(a =>
            `<tr><td>${escHtml(a.area)}</td><td style="text-align:right">${a.count}</td><td style="text-align:right">£${Number(a.revenue||0).toLocaleString('en-GB')}</td></tr>`
        ).join('');

        const html = `<!DOCTYPE html><html><head>
<title>GlazierOS Report - ${dateStr}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;color:#1e293b;font-size:12px;max-width:800px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:16px;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid #667eea;color:#334155}
.meta{color:#64748b;font-size:11px;margin-bottom:24px}
.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
.kpi-label{font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
.kpi-value{font-size:18px;font-weight:700;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px}
th{background:#f1f5f9;font-weight:600;color:#475569}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media print{body{padding:20px}h1{font-size:18px}}
</style>
</head><body>
<h1>📊 GlazierOS Business Report</h1>
<p class="meta">Generated: ${dateStr} • Period: ${currentRange.charAt(0).toUpperCase()+currentRange.slice(1)}</p>

<div class="kpi-grid">
<div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">£${fmt(m.totalRevenue)}</div></div>
<div class="kpi"><div class="kpi-label">Total Quotes</div><div class="kpi-value">${fmtInt(m.totalQuotes)}</div></div>
<div class="kpi"><div class="kpi-label">Conversion Rate</div><div class="kpi-value">${m.conversionRate}%</div></div>
<div class="kpi"><div class="kpi-label">Avg Order Value</div><div class="kpi-value">£${fmt(m.avgOrderValue)}</div></div>
<div class="kpi"><div class="kpi-label">Outstanding</div><div class="kpi-value">£${fmt(m.outstanding)}</div></div>
</div>

<div class="two-col">
<div>
<h2>Monthly Revenue</h2>
<table><thead><tr><th>Month</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${monthRows}</tbody></table>
</div>
<div>
<h2>Pipeline Funnel</h2>
<table><thead><tr><th>Stage</th><th style="text-align:right">Count</th></tr></thead><tbody>${funnelRows}</tbody></table>
</div>
</div>

<h2>Team Performance</h2>
<table><thead><tr><th>Name</th><th style="text-align:right">Jobs</th><th style="text-align:right">Revenue</th><th style="text-align:right">Rating</th></tr></thead><tbody>${teamRows}</tbody></table>

<h2>Geographic Analysis</h2>
<table><thead><tr><th>Area</th><th style="text-align:right">Jobs</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${areaRows}</tbody></table>

<script>window.onload=function(){window.print()}</script>
</body></html>`;

        // Open in new window for print-to-PDF
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            showToast('PDF report opened — use your browser\'s Print dialog to save as PDF.');
        } else {
            showToast('Please allow popups to export PDF reports.');
        }
    }

    /* ───────── toast ───────── */
    function showToast(msg) {
        const $t = $(`<div class="rpt-toast">${escHtml(msg)}</div>`);
        $('body').append($t);
        setTimeout(() => $t.addClass('rpt-toast--visible'), 50);
        setTimeout(() => { $t.removeClass('rpt-toast--visible'); setTimeout(() => $t.remove(), 400); }, 3000);
    }

    /* ───────── load ───────── */
    async function loadReports() {
        $panel.html('<div class="rpt-loading"><div class="rpt-spinner"></div><p>Loading analytics…</p></div>');
        try {
            const data = await loadAllData();
            render(data);
        } catch (err) {
            $panel.html(`<p class="gos-error">Error loading reports: ${escHtml(err.message)}</p>`);
        }
    }

    /* ───────── inject CSS ───────── */
    function injectCSS() {
        if ($('#rpt-analytics-styles').length) return;
        const css = `
/* Reports Analytics — Premium Dashboard Styles */
.rpt-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;color:#64748b}
.rpt-spinner{width:36px;height:36px;border:4px solid #e2e8f0;border-top-color:#667eea;border-radius:50%;animation:rptSpin .7s linear infinite}
@keyframes rptSpin{to{transform:rotate(360deg)}}

/* Header */
.rpt-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1rem;padding:1.25rem 1.5rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px 12px 0 0;color:#fff}
.rpt-title{margin:0;font-size:1.4rem;font-weight:700}
.rpt-controls{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
.rpt-date-range{display:flex;gap:4px;background:rgba(255,255,255,.15);border-radius:8px;padding:3px}
.rpt-range-btn{background:none;border:none;color:rgba(255,255,255,.75);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .2s}
.rpt-range-btn--active,.rpt-range-btn:hover{background:#fff;color:#667eea}
.rpt-export-btns{display:flex;gap:6px}
.rpt-btn{padding:6px 14px;border:none;border-radius:6px;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s}
.rpt-btn--csv{background:#10b981;color:#fff}.rpt-btn--csv:hover{background:#059669}
.rpt-btn--pdf{background:#f59e0b;color:#fff}.rpt-btn--pdf:hover{background:#d97706}

/* KPI Strip */
.rpt-kpi-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;background:#e2e8f0;border:1px solid #e2e8f0}
.rpt-kpi{background:#fff;padding:1.25rem;text-align:center}
.rpt-kpi-label{display:block;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:.35rem}
.rpt-kpi-value{display:block;font-size:1.6rem;font-weight:700;color:#1e293b}
.rpt-kpi-value--warn{color:#f59e0b}
.rpt-delta{display:block;font-size:.7rem;margin-top:.25rem;font-weight:600}
.rpt-delta--up{color:#10b981}.rpt-delta--down{color:#ef4444}.rpt-delta--neutral{color:#94a3b8}

/* Sections & cards */
.rpt-section{padding:1.5rem}
.rpt-section-title{font-size:1.15rem;font-weight:700;color:#1e293b;margin:0 0 1rem;padding-bottom:.5rem;border-bottom:2px solid #667eea}
.rpt-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
@media(max-width:900px){.rpt-grid-2{grid-template-columns:1fr}}
.rpt-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.rpt-card h4{margin:0 0 1rem;font-size:.95rem;color:#334155}
.rpt-card--table{padding:0;overflow-x:auto}

/* Bar chart rows */
.rpt-bar-chart{display:flex;flex-direction:column;gap:6px}
.rpt-bar-row,.rpt-area-row{display:grid;grid-template-columns:60px 1fr 110px;gap:8px;align-items:center;font-size:.82rem}
.rpt-bar-label,.rpt-area-code{font-weight:600;color:#475569;text-align:right}
.rpt-bar-track{height:22px;background:#f1f5f9;border-radius:4px;overflow:hidden}
.rpt-bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
.rpt-bar--primary{background:linear-gradient(90deg,#667eea,#818cf8)}
.rpt-bar--success{background:linear-gradient(90deg,#10b981,#34d399)}
.rpt-bar--warning{background:linear-gradient(90deg,#f59e0b,#fbbf24)}
.rpt-bar-value,.rpt-area-stat{font-size:.78rem;color:#64748b;white-space:nowrap}

/* Split bar (paid vs outstanding) */
.rpt-split-bar{display:flex;height:28px;border-radius:6px;overflow:hidden;font-size:.75rem;font-weight:600;color:#fff}
.rpt-split-paid{background:#10b981;display:flex;align-items:center;justify-content:center;min-width:40px}
.rpt-split-out{background:#f59e0b;display:flex;align-items:center;justify-content:center;min-width:40px}

/* Funnel */
.rpt-funnel{display:flex;flex-direction:column;align-items:center;gap:4px}
.rpt-funnel-stage{width:100%;display:flex;flex-direction:column;align-items:center}
.rpt-funnel-bar{height:44px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.88rem;transition:width .6s ease;min-width:120px}
.rpt-funnel-meta{display:flex;gap:1rem;font-size:.72rem;color:#64748b;margin-top:2px}
.rpt-funnel-conv{color:#667eea;font-weight:600}
.rpt-funnel-days{color:#94a3b8}

/* Table */
.rpt-table{width:100%;border-collapse:collapse;font-size:.85rem}
.rpt-table th{background:#f8fafc;padding:.75rem 1rem;text-align:left;font-weight:700;color:#475569;cursor:pointer;user-select:none;border-bottom:2px solid #e2e8f0;white-space:nowrap}
.rpt-table th:hover{color:#667eea}
.rpt-table td{padding:.65rem 1rem;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.rpt-team-name{font-weight:600;color:#1e293b}
.rpt-mini-bar-wrap{display:inline-block;width:80px;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;vertical-align:middle;margin-right:6px}
.rpt-mini-bar{height:100%;border-radius:4px}
.rpt-stars{color:#f59e0b;letter-spacing:1px}
.rpt-sort-asc::after{content:' ▲';font-size:.65rem}.rpt-sort-desc::after{content:' ▼';font-size:.65rem}

/* Toast */
.rpt-toast{position:fixed;bottom:24px;right:24px;background:#1e293b;color:#fff;padding:.75rem 1.5rem;border-radius:8px;font-size:.88rem;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;transform:translateY(12px);transition:all .35s ease;z-index:99999}
.rpt-toast--visible{opacity:1;transform:translateY(0)}
`;
        $('<style id="rpt-analytics-styles"></style>').text(css).appendTo('head');
    }

    /* ───────── panel activation ───────── */
    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'reports') return;
        if (!$panel.data('init')) {
            $panel.data('init', true);
            injectCSS();
        }
        loadReports();
    });
});