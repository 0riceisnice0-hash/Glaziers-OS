// ⚙️ reports.js loaded
jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'reports') return;

  const $panel = jQuery('#gsa-reports');
  if ($panel.data('init')) return;
  $panel.data('init', true);

  $panel.html('<p>Loading analytics…</p>');
  fetch('/wp-json/glazieros/v1/stats') // This endpoint returns data directly, not in a 'data' property.
    .then(r => r.json())
    .then(data => { // Changed 'd' to 'data' for clarity
      $panel.html(`
        <h3>Overall Statistics</h3>
        <p>Total Quotes: <strong>${data.total_jobs}</strong></p>
        <h4>Lead Status Breakdown:</h4>
        <ul>
          ${Object.entries(data.by_lead_status).map(([status, count]) => `<li>${status}: ${count}</li>`).join('')}
        </ul>
        <h4>Install Status Breakdown:</h4>
        <ul>
          ${Object.entries(data.by_install_status).map(([status, count]) => `<li>${status}: ${count}</li>`).join('')}
        </ul>
      `);
    });
});
