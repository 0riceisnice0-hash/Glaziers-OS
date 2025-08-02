// assets/js/dashboard/pricing.js
console.log('⚙️ pricing-settings.js loaded');

jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'pricing') return;

  const $panel = jQuery('#gsa-pricing');
  if ($panel.data('init')) return;
  $panel.data('init', true);

  $panel.html('<p>Loading…</p>');

  fetch('/wp-json/glazieros/v1/pricing') // This endpoint returns data directly, not in a 'data' property.
    .then(r => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    })
    .then(data => { // data is { window: X, door: Y }
      console.log('Pricing payload:', data); // This console log is useful for debugging
      $panel.html(`
        <label>Window price (£/m²):
          <input id="price-window" type="number" value="${data.window}">
        </label>
        <label>Door price (£/m²):
          <input id="price-door"   type="number" value="${data.door}">
        </label>
        <button id="save-pricing" class="gos-button">Save</button>
        <div id="pricing-feedback"></div>
      `);

      jQuery('#save-pricing').on('click', () => { // Attach event listener to the button within the panel
        const body = {
          window: Number(jQuery('#price-window').val()),
          door:   Number(jQuery('#price-door').val())
        };
        console.log('Saving pricing:', body);
        fetch('/wp-json/glazieros/v1/pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
          .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(() => jQuery('#pricing-feedback').text('✅ Saved'))
          .catch(err => jQuery('#pricing-feedback').text(`⚠️ ${err.message}`));
      });
    })
    .catch(err => {
      console.error('Pricing load failed:', err);
      $panel.html('<p style="color:red">Failed to load pricing.</p>');
    });
});
