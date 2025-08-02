// ⚙️ new.js loaded
jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'new') return;

  const $panel = jQuery('#gsa-new');
  if ($panel.data('init')) return;
  $panel.data('init', true);

  $panel.html('<div id="glazieros-pricing-tool"></div>');
  // pricing-app.js is enqueued and will auto-render into this div if it's loaded
});
