// assets/js/dashboard/reports.js
console.log('⚙️ reports.js loaded');

jQuery(function($) {
    const $panel = $('#gsa-reports');

    function render(stats) {
        const revenueForecast = (stats.by_lead_status['Won'] || 0) * 1500; // Placeholder average
        const conversionRate = stats.total_jobs > 0 ? ((stats.by_lead_status['Won'] || 0) / stats.total_jobs) * 100 : 0;

        let leadStatusHtml = '<ul>';
        for (const status in stats.by_lead_status) {
            leadStatusHtml += `<li><strong>${status}:</strong> ${stats.by_lead_status[status]}</li>`;
        }
        leadStatusHtml += '</ul>';

        let installStatusHtml = '<ul>';
        for (const status in stats.by_install_status) {
            installStatusHtml += `<li><strong>${status}:</strong> ${stats.by_install_status[status]}</li>`;
        }
        installStatusHtml += '</ul>';

        $panel.html(`
            <div class="gsa-reports-header">
                <h2 class="gsa-panel-title">Reports & Analytics</h2>
                <div class="gsa-reports-controls">
                    <label>Date Range:
                        <select id="gsa-report-daterange" class="gos-input">
                            <option value="all">All Time</option>
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                        </select>
                    </label>
                </div>
            </div>
            <div class="gsa-reports-grid">
                <div class="gsa-report-card">
                    <h3>Total Leads</h3>
                    <p class="gsa-report-stat">${stats.total_leads}</p>
                </div>
                <div class="gsa-report-card">
                    <h3>Total Quotes</h3>
                    <p class="gsa-report-stat">${stats.total_quotes}</p>
                </div>
                <div class="gsa-report-card">
                    <h3>Active Jobs</h3>
                    <p class="gsa-report-stat">${stats.active_jobs}</p>
                </div>
                <div class="gsa-report-card">
                    <h3>Overdue Invoices</h3>
                    <p class="gsa-report-stat">${stats.overdue_invoices}</p>
                </div>
                <div class="gsa-report-card">
                    <h3>Conversion Rate</h3>
                    <p class="gsa-report-stat">${conversionRate.toFixed(1)}%</p>
                    <small>Based on 'Won' status</small>
                </div>
                <div class="gsa-report-card">
                    <h3>Revenue (Won)</h3>
                    <p class="gsa-report-stat">£${calculateRevenue(stats.won_jobs_prices)}</p>
                    <small>Sum of prices for all 'Won' jobs</small>
                </div>
                <div class="gsa-report-card gsa-report-card-large">
                    <h3>Quotes by Lead Status</h3>
                    ${leadStatusHtml}
                </div>
                <div class="gsa-report-card gsa-report-card-large">
                    <h3>Jobs by Install Status</h3>
                    ${installStatusHtml}
                </div>
            </div>
        `);
    }

    function calculateRevenue(prices) {
        if (!prices || prices.length === 0) return '0.00';
        const total = prices.reduce((sum, price) => sum + parseFloat(price), 0);
        return total.toFixed(2);
    }

    function loadStats() {
        $panel.html('<p>Loading reports...</p>');
        fetch('/wp-json/glazieros/v1/stats', {
            headers: { 'X-WP-Nonce': wpApiSettings.nonce }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load stats.');
                return res.json();
            })
            .then(stats => {
                render(stats);
            })
            .catch(err => {
                $panel.html(`<p class="gos-error">Error loading reports: ${err.message}</p>`);
            });
    }

    function injectCSS() {
        const css = `
            .gsa-reports-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
            .gsa-reports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; padding: 1.5rem; }
            .gsa-report-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .gsa-report-card h3 { margin-top: 0; font-size: 1.1rem; color: #333; }
            .gsa-report-stat { font-size: 2.5rem; font-weight: 600; color: #06b6d4; margin: 0.5rem 0; }
            .gsa-report-card-large { grid-column: span 2; }
            .gsa-report-card ul { padding-left: 20px; margin: 0; }
        `;
        if (!$('#gsa-reports-styles').length) {
            $('<style id="gsa-reports-styles"></style>').text(css).appendTo('head');
        }
    }

    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'reports') return;
        if (!$panel.data('init')) {
            $panel.data('init', true);
            injectCSS();
        }
        loadStats();
    });
});