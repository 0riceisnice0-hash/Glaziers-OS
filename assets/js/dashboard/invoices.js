console.log('⚙️ invoices.js loaded');
jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'invoices') return;

  const $panel = jQuery('#gsa-invoices');
  if ($panel.data('init')) return;
  $panel.data('init', true);
  $panel.html('<p>Invoice generator coming soon.</p>');
});
