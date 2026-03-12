// assets/js/dashboard/audit-logs.js
console.log('⚙️ audit-logs.js loaded');

jQuery(function($) {
    const $panel = $('#gsa-audit-logs');

    function render(logs) {
        let tableHtml = `
            <table class="gsa-table">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>User</th>
                        <th>Object ID</th>
                        <th>Object Type</th>
                        <th>IP Address</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        logs.forEach(log => {
            tableHtml += `
                <tr>
                    <td>${log.action}</td>
                    <td>${log.user}</td>
                    <td>${log.object_id}</td>
                    <td>${log.object_type}</td>
                    <td>${log.ip_address}</td>
                    <td>${new Date(log.date).toLocaleString()}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';

        $panel.html(`
            <div class="gsa-reports-header">
                <h2 class="gsa-panel-title">Audit Logs</h2>
            </div>
            <div class="gsa-table-container">
                ${tableHtml}
            </div>
        `);
    }

    function loadLogs() {
        $panel.html('<p>Loading audit logs...</p>');
        // DataStore fetch interceptor handles /wp-json/glazieros/v1/audit-logs
        fetch('/wp-json/glazieros/v1/audit-logs')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load audit logs.');
                return res.json();
            })
            .then(logs => {
                render(logs);
            })
            .catch(err => {
                $panel.html(`<p class="gos-error">Error loading audit logs: ${err.message}</p>`);
            });
    }

    function injectCSS() {
        const css = `
            .gsa-table-container { padding: 1.5rem; }
            .gsa-table { width: 100%; border-collapse: collapse; }
            .gsa-table th, .gsa-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
            .gsa-table th { background-color: #f0f2f5; }
        `;
        if (!$('#gsa-audit-logs-styles').length) {
            $('<style id="gsa-audit-logs-styles"></style>').text(css).appendTo('head');
        }
    }

    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'audit-logs') return;
        if (!$panel.data('init')) {
            $panel.data('init', true);
            injectCSS();
        }
        loadLogs();
    });
});
